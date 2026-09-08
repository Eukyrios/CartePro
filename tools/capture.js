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

/*
 * Les comptes et les slugs de démonstration, tels que `backend/seed.py` les
 * écrit. Ils sont ici et non dispersés dans le script : un seed qui renomme un
 * partenaire casse toutes les captures qui le nomment, et il vaut mieux que ça
 * se corrige en un endroit.
 */
const MOT_DE_PASSE = "CartePro2026";
const SALARIE = "camille.durand@administration.example";
const ADMIN = "admin@administration.example";
const PARTENAIRE_SLUG = process.env.PARTENAIRE || "comptoir-du-midi";
const PARTENAIRE_REFUSE = process.env.PARTENAIRE_REFUSE || "spa-vosges";
const PARTENAIRE_EN_ATTENTE = process.env.PARTENAIRE_EN_ATTENTE || "kostumparty";

async function main() {
  const base = process.argv[2] || "http://localhost:3000";
  const out = process.argv[3] || "docs/brand-book/captures";
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

  /** Ouvre une session réelle : le profil seul ne suffit plus. */
  async function connecte(email) {
    /* Le proxy de l'application, et non le backend en direct : celui-ci
       n'autorise l'origine que du port 3000, donc une capture lancée contre
       une autre instance échouait en « Failed to fetch » et photographiait
       « Connexion requise » sur tous les écrans. */
    await evaluate(`fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ${JSON.stringify(email)}, password: ${JSON.stringify(MOT_DE_PASSE)} })
    }).then((r) => r.json()).then((d) => {
      localStorage.setItem("access_token", d.access_token);
      localStorage.setItem("cartepro.profile", JSON.stringify(Object.assign(
        { id: d.user.id, role: d.user.role, balanceCents: d.user.balanceCents }, d.user.profile)));
      return "ok";
    })`);
  }
  async function deconnecte() {
    await evaluate('try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} "ok"');
  }
  /** Amène une section à l'écran et laisse le défilement se poser. */
  async function versSection(id) {
    await evaluate(`(() => { const e = document.getElementById(${JSON.stringify(id)}); if (e) e.scrollIntoView(); return Boolean(e); })()`);
    await wait(1400);
  }
  /**
   * Attend que toutes les images soient chargées.
   *
   * `next/image` diffère le chargement : une capture prise juste après le
   * défilement montrait une tuile de partenaire cassée, dont il ne restait que
   * le voile dégradé. Constaté sur la section « coup de cœur ».
   */
  async function imagesPretes() {
    for (let i = 0; i < 30; i += 1) {
      const reste = await evaluate(
        '[...document.images].filter((im) => !im.complete || im.naturalWidth === 0).length',
      );
      if (Number(reste) === 0) return true;
      await wait(400);
    }
    return false;
  }

  // Les deux thèmes : le book présente le thème clair, le sombre est montré
  // comme déclinaison — et les deux doivent être vérifiables. Les écrans de
  // gestion n'ont qu'une version : le book ne les montre qu'en clair.
  for (const scheme of ["light", "dark"]) {
    const suffix = scheme === "light" ? "" : "-sombre";
    await theme(scheme);

    // ---------- La vitrine, non connecté ----------
    await go(base);
    await deconnecte();
    await go(base);
    await imagesPretes();
    await shot(`accueil-public${suffix}.png`);
    await shot(`bloc-marque${suffix}.png`, { x: 0, y: 0, width: 620, height: 76 });
    for (const id of ["fonctionnement", "coup-de-coeur", "confiance"]) {
      await versSection(id);
      await imagesPretes();
      await shot(`${id}${suffix}.png`);
    }

    // ---------- L'espace salarié ----------
    await connecte(SALARIE);
    await go(`${base}/espace`);
    await imagesPretes();
    await shot(`espace-salarie${suffix}.png`);
    const carte = (await box("#solde .hover-3d")) || (await box("#solde"));
    if (carte) {
      await shot(`carte-au-repos${suffix}.png`, {
        x: Math.max(0, carte.x - 24), y: Math.max(0, carte.y - 24),
        width: carte.width + 48, height: Math.min(carte.height + 48, 700),
      });
    }
    // Le QR se matérialise sur l'accueil du salarié, dans PaymentCodePanel.
    const clique = await evaluate(`(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /G(É|E)N(É|E)RER/i.test(x.textContent));
      if (!b) return "bouton introuvable";
      b.click();
      return "cliqué";
    })()`);
    console.log(`  [${scheme}] QR :`, clique);
    await wait(2600);
    const qr = await evaluate(`(() => {
      const e = [...document.querySelectorAll("svg")].find((x) => {
        const r = x.getBoundingClientRect();
        return r.width > 140 && Math.abs(r.width - r.height) < 30;
      });
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
    })()`);
    if (qr) {
      await shot(`qr-materialise${suffix}.png`, {
        x: Math.max(0, qr.x - 14), y: Math.max(0, qr.y - 14),
        width: qr.width + 28, height: qr.height + 28,
      });
    }
    for (const id of ["reseau", "historique"]) {
      await versSection(id);
      await imagesPretes();
      await shot(`${id}${suffix}.png`);
    }

    // La fiche d'un partenaire, telle qu'un salarié la lit.
    await go(`${base}/espace/partenaire/${PARTENAIRE_SLUG}`);
    await imagesPretes();
    await shot(`fiche-partenaire${suffix}.png`);
    await shot(`carte-au-paiement${suffix}.png`);

    if (scheme !== "light") continue;

    // ---------- Écrans que le book ne montre qu'en clair ----------
    await go(`${base}/parametres`);
    await shot("parametres.png");
    await go(`${base}/conditions`);
    await shot("conditions.png");
    await go(`${base}/cette-page-nexiste-pas`);
    await shot("page-404.png");

    // ---------- L'espace partenaire ----------
    await connecte(`contact@${PARTENAIRE_SLUG}.fr`);
    await go(`${base}/espace`);
    await shot("partenaire-encaissement.png");
    await versSection("recettes");
    await shot("partenaire-recettes.png");
    await go(`${base}/parametres`);
    await shot("partenaire-parametres.png");

    // Un établissement écarté : la décision, en premier écran.
    await connecte(`contact@${PARTENAIRE_REFUSE}.fr`);
    await go(`${base}/espace`);
    await shot("partenaire-refus.png");

    // ---------- L'espace d'administration ----------
    await connecte(ADMIN);
    await go(`${base}/espace`);
    await shot("admin-demandes.png");
    await versSection("recettes");
    await imagesPretes();
    await shot("admin-reseau.png");
    await go(`${base}/dossier/${PARTENAIRE_EN_ATTENTE}`);
    await imagesPretes();
    await shot("admin-dossier.png");
    await go(`${base}/recettes/${PARTENAIRE_SLUG}`);
    await shot("admin-recettes.png");

    // ---------- Le dialogue d'authentification ----------
    await deconnecte();
    await go(base);
    console.log("  dialogue :", await evaluate(`(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /^SE CONNECTER$/i.test(x.textContent.trim()));
      if (!b) return "bouton introuvable";
      b.click();
      return "ouvert";
    })()`));
    await wait(1600);
    await shot("dialogue-connexion.png");
  }

  await cdp.send("Browser.close").catch(() => {});
  console.log("captures terminées");
}

main().catch((e) => {
  console.error("échec :", e.message);
  process.exit(1);
});
