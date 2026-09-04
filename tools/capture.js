/**
 * Captures d'écran de l'application réellement en fonctionnement.
 *
 * Pilote Chrome par son protocole de débogage : ouvre les pages, installe la
 * session de démonstration, clique « Générer le QR », puis photographie. Rien
 * n'est simulé — ce sont les composants de l'application, avec le registre
 * réel, dans le navigateur.
 *
 * Client WebSocket minimal écrit ici même : le paquet `ws` n'est pas une
 * dépendance du projet et une capture d'écran ne justifie pas d'en ajouter une.
 *
 *   node tools/capture.js <url-de-base> <dossier-de-sortie>
 */
const http = require("http");
const https = require("https");
const net = require("net");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function get(url) {
  return new Promise((resolve, reject) => {
    (url.startsWith("https") ? https : http)
      .get(url, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

/** Poignée de main puis trames texte masquées : le strict nécessaire du RFC 6455. */
class Socket {
  constructor(url) {
    const u = new URL(url);
    this.pending = new Map();
    this.id = 0;
    this.buffer = Buffer.alloc(0);
    this.ready = new Promise((resolve, reject) => {
      this.sock = net.connect(Number(u.port), u.hostname, () => {
        const key = crypto.randomBytes(16).toString("base64");
        this.sock.write(
          `GET ${u.pathname} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\n` +
            `Connection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
        );
      });
      this.sock.on("error", reject);
      this.sock.once("data", (chunk) => {
        const head = chunk.toString("latin1");
        const end = head.indexOf("\r\n\r\n");
        if (!head.startsWith("HTTP/1.1 101")) return reject(new Error(head.split("\r\n")[0]));
        this.buffer = chunk.subarray(end + 4);
        this.sock.on("data", (d) => this.onData(d));
        this.drain();
        resolve();
      });
    });
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.drain();
  }

  drain() {
    while (this.buffer.length >= 2) {
      const fin = (this.buffer[0] & 0x80) !== 0;
      const opcode = this.buffer[0] & 0x0f;
      let len = this.buffer[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (this.buffer.length < 4) return; len = this.buffer.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buffer.length < 10) return; len = Number(this.buffer.readBigUInt64BE(2)); off = 10; }
      if (this.buffer.length < off + len) return;
      const payload = this.buffer.subarray(off, off + len);
      this.buffer = this.buffer.subarray(off + len);

      // Une capture d'écran dépasse la taille d'une trame : Chrome la découpe
      // en un fragment texte suivi de continuations (opcode 0). Sans ce
      // recollage la réponse n'arrive jamais et le script reste suspendu.
      if (opcode !== 1 && opcode !== 0) continue;
      this.fragments = opcode === 1 ? [payload] : [...(this.fragments || []), payload];
      if (!fin) continue;
      const msg = JSON.parse(Buffer.concat(this.fragments).toString());
      this.fragments = [];
      const w = this.pending.get(msg.id);
      if (w) {
        this.pending.delete(msg.id);
        msg.error ? w.reject(new Error(JSON.stringify(msg.error))) : w.resolve(msg.result);
      }
    }
  }

  send(method, params = {}) {
    const id = ++this.id;
    const body = Buffer.from(JSON.stringify({ id, method, params }));
    const mask = crypto.randomBytes(4);
    const masked = Buffer.from(body.map((b, i) => b ^ mask[i % 4]));
    let header;
    if (body.length < 126) header = Buffer.from([0x81, 0x80 | body.length]);
    else if (body.length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81; header[1] = 0xfe; header.writeUInt16BE(body.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81; header[1] = 0xff; header.writeBigUInt64BE(BigInt(body.length), 2);
    }
    this.sock.write(Buffer.concat([header, mask, masked]));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const base = process.argv[2] || "http://localhost:3000";
  const out = process.argv[3] || "brandbook/captures";
  fs.mkdirSync(out, { recursive: true });

  const targets = JSON.parse(await get("http://127.0.0.1:9222/json/list"));
  const page = targets.find((t) => t.type === "page");
  const cdp = new Socket(page.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  /** Le thème est une media query : Chrome sans écran répond « sombre ». */
  async function theme(scheme) {
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: scheme }],
    });
  }

  async function go(url) {
    await cdp.send("Page.navigate", { url });
    await wait(2600);
  }
  async function evaluate(expression) {
    const r = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    return r.result && r.result.value;
  }
  async function shot(name, clip) {
    const r = await cdp.send("Page.captureScreenshot", {
      format: "png",
      ...(clip ? { clip: { ...clip, scale: 2 } } : {}),
      captureBeyondViewport: Boolean(clip),
    });
    const file = path.join(out, name);
    fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    console.log("  écrit", file, fs.statSync(file).size, "octets");
  }
  /** Rectangle d'un élément, pour cadrer sur lui plutôt que sur la fenêtre. */
  async function box(selector) {
    return await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
    })()`);
  }

  // La session de démonstration : le compte employé et un registre neuf.
  await go(base);
  await evaluate(`localStorage.setItem("ticket-tout.profile", JSON.stringify({
    audience: "employee", username: "Camille Fontaine", email: "employe@tickettout.fr",
    partner: { raisonSociale: "", siren: "", objetSocial: "", categorie: "", adresse: "", ville: "", codePostal: "", nomRepresentant: "" },
    cardStyle: { color: "#1b3a6b", text: "#ffffff", pattern: "waves", metalness: 45 }
  })); localStorage.removeItem("ticket-tout.ledger"); "ok"`);

  // Les deux thèmes : le book présente le thème clair, le sombre est montré
  // comme déclinaison — et les deux doivent être vérifiables.
  for (const scheme of ["light", "dark"]) {
    const suffix = scheme === "light" ? "" : "-sombre";
    await theme(scheme);

    // 1. La carte au repos, dans l'espace salarié.
    await go(`${base}/espace`);
    const rest = await box("#solde .hover-3d");
    await shot(`carte-au-repos${suffix}.png`, rest ? { x: rest.x - 24, y: rest.y - 24, width: rest.width + 48, height: rest.height + 48 } : null);

    // 2. La carte au moment du paiement : on clique réellement le bouton.
    await go(`${base}/espace/partenaire/glaces-correze`);
    const clicked = await evaluate(`(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /Générer le QR/i.test(x.textContent));
      if (!b) return "bouton introuvable";
      b.click();
      return "cliqué";
    })()`);
    console.log(`  [${scheme}] bouton :`, clicked);
    await wait(1600);
    const paying = await box("main");
    await shot(`carte-au-paiement${suffix}.png`, paying ? { x: paying.x, y: paying.y, width: paying.width, height: Math.min(paying.height, 1150) } : null);

    // 3. Le QR seul, tel qu'il vient de se matérialiser.
    const qr = await box(".qr-materialise");
    if (qr) await shot(`qr-materialise${suffix}.png`, { x: qr.x - 12, y: qr.y - 12, width: qr.width + 24, height: qr.height + 24 });

    // 4. L'accueil public, l'historique et le catalogue.
    await go(base);
    await shot(`accueil-public${suffix}.png`);
    await go(`${base}/espace`);
    await evaluate(`document.getElementById("historique").scrollIntoView(); "ok"`);
    await wait(1000);
    await shot(`historique${suffix}.png`);
    await evaluate(`document.getElementById("reseau").scrollIntoView(); "ok"`);
    await wait(1000);
    await shot(`reseau${suffix}.png`);
    // 5. Le bloc-marque en haut à gauche, pour la page logotype.
    await go(base);
    const brand = await box("nav");
    if (brand) await shot(`bloc-marque${suffix}.png`, { x: 0, y: 0, width: 620, height: 76 });
  }

  await cdp.send("Browser.close").catch(() => {});
  console.log("captures terminées");
}

main().catch((e) => {
  console.error("échec :", e.message);
  process.exit(1);
});
