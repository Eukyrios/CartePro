/**
 * Photographie chaque bloc [data-shot] d'une page locale et l'exporte en PNG.
 *
 * Sert les planches de mockup du brand book : la mise en page est faite en
 * HTML/CSS avec les polices et le logotype du dépôt, et Chrome en fait l'image.
 * Réutilise le client CDP minimal de tools/capture.js.
 *
 *   node tools/shots.js <fichier.html> <dossier-de-sortie> [échelle]
 */
const path = require("path");
const fs = require("fs");
const http = require("http");
const net = require("net");
const crypto = require("crypto");

const get = (url) =>
  new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => resolve(b));
    }).on("error", reject);
  });

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
        if (!head.startsWith("HTTP/1.1 101")) return reject(new Error(head.split("\r\n")[0]));
        this.buffer = chunk.subarray(head.indexOf("\r\n\r\n") + 4);
        this.sock.on("data", (d) => {
          this.buffer = Buffer.concat([this.buffer, d]);
          this.drain();
        });
        this.drain();
        resolve();
      });
    });
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
    else if (body.length < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 0xfe; header.writeUInt16BE(body.length, 2); }
    else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 0xff; header.writeBigUInt64BE(BigInt(body.length), 2); }
    this.sock.write(Buffer.concat([header, mask, masked]));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Un chemin de fichier ou une URL : les polices de l'État ne se chargent
  // pas depuis file:// dans tous les cas, et le book est servi en http.
  const target = process.argv[2];
  const url = /^https?:\/\//.test(target) ? target : "file://" + path.resolve(target);
  const out = path.resolve(process.argv[3]);
  const scale = Number(process.argv[4] || 2);
  fs.mkdirSync(out, { recursive: true });

  const targets = JSON.parse(await get("http://127.0.0.1:9222/json/list"));
  const cdp = new Socket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "light" }],
  });
  await cdp.send("Page.navigate", { url });
  await wait(3000);

  const names = (
    await cdp.send("Runtime.evaluate", {
      expression: `JSON.stringify([...document.querySelectorAll("[data-shot]")].map((e) => e.dataset.shot))`,
      returnByValue: true,
    })
  ).result.value;

  for (const name of JSON.parse(names)) {
    const box = (
      await cdp.send("Runtime.evaluate", {
        expression: `(() => { const e = document.querySelector('[data-shot="${name}"]');
          const r = e.getBoundingClientRect();
          return JSON.stringify({ x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }); })()`,
        returnByValue: true,
      })
    ).result.value;
    const clip = JSON.parse(box);
    // Les grandes planches restent à l'échelle 1 : une affiche A3 doublée
    // pèserait plus que le PDF entier.
    const s = clip.width * clip.height > 1_500_000 ? 1 : scale;
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      clip: { ...clip, scale: s },
      captureBeyondViewport: true,
    });
    const dest = path.join(out, `${name}.png`);
    fs.writeFileSync(dest, Buffer.from(shot.data, "base64"));
    console.log(`  ${name}.png`.padEnd(30), `${Math.round(clip.width)}×${Math.round(clip.height)} @${s}x`, fs.statSync(dest).size, "octets");
  }
  console.log("planches terminées");
}

main().catch((e) => { console.error("échec :", e.message); process.exit(1); });
