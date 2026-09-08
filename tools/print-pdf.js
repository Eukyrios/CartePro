/**
 * Imprime docs/brand-book/brand-book.html en PDF A4, texte compris.
 *
 * Remplace l'assemblage par images. L'ancienne chaîne photographiait chaque
 * page à 192 dpi parce que Marianne portait `fsType = 4` — « Preview & Print »
 * — et que Chrome refuse d'embarquer une police ainsi restreinte : il la
 * remplaçait en silence par une Liberation Sans, ce qui aurait donné un brand
 * book composé dans une police que ses propres règles interdisent. Archivo est
 * sous licence ouverte, donc embarquable, et le texte du PDF est désormais
 * sélectionnable.
 *
 * Une subtilité mesurée en chemin : le fichier Archivo servi par le site est
 * **variable** (axe wght de 100 à 900), et Chrome n'embarque pas davantage une
 * police variable — il retombait sur Liberation Sans pour les titres alors que
 * Spectral, statique, s'embarquait. C'est pourquoi `build-brandbook.py` fige
 * trois instances statiques dans `docs/brand-book/fonts/` et que le document
 * déclare celles-là.
 *
 * Demande un Chrome déjà lancé avec un port de débogage :
 *
 *   google-chrome --headless=new --remote-debugging-port=9222 about:blank
 *   node tools/print-pdf.js [port]
 */
const http = require("http");
const net = require("net");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.argv[2] || 9222);
const RACINE = path.resolve(__dirname, "..");
const SOURCE = path.join(RACINE, "docs/brand-book/brand-book.html");
const SORTIE = path.join(RACINE, "docs/brand-book/cartepro-brand-book.pdf");

const get = (url) =>
  new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => resolve(b));
      })
      .on("error", reject);
  });

function connect(wsUrl) {
  const u = new URL(wsUrl);
  let buffer = Buffer.alloc(0);
  let frags = [];
  let id = 0;
  const pending = new Map();
  const sock = net.connect(Number(u.port), u.hostname, () => {
    const key = crypto.randomBytes(16).toString("base64");
    sock.write(
      `GET ${u.pathname} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\n` +
        `Connection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
    );
  });
  const send = (method, params = {}) => {
    const i = ++id;
    const body = Buffer.from(JSON.stringify({ id: i, method, params }));
    const mask = crypto.randomBytes(4);
    const masked = Buffer.from(body.map((x, j) => x ^ mask[j % 4]));
    let head;
    if (body.length < 126) head = Buffer.from([0x81, 0x80 | body.length]);
    else if (body.length < 65536) {
      head = Buffer.alloc(4);
      head[0] = 0x81;
      head[1] = 0xfe;
      head.writeUInt16BE(body.length, 2);
    } else {
      head = Buffer.alloc(10);
      head[0] = 0x81;
      head[1] = 0xff;
      head.writeBigUInt64BE(BigInt(body.length), 2);
    }
    sock.write(Buffer.concat([head, mask, masked]));
    return new Promise((r) => pending.set(i, r));
  };
  sock.on("data", (chunk) => {
    if (chunk.toString("latin1").startsWith("HTTP/1.1 101")) {
      buffer = chunk.subarray(chunk.indexOf("\r\n\r\n") + 4);
    } else {
      buffer = Buffer.concat([buffer, chunk]);
    }
    while (buffer.length >= 2) {
      const fin = (buffer[0] & 0x80) !== 0;
      const op = buffer[0] & 0x0f;
      let len = buffer[1] & 0x7f;
      let off = 2;
      if (len === 126) {
        if (buffer.length < 4) return;
        len = buffer.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (buffer.length < 10) return;
        len = Number(buffer.readBigUInt64BE(2));
        off = 10;
      }
      if (buffer.length < off + len) return;
      const payload = buffer.subarray(off, off + len);
      buffer = buffer.subarray(off + len);
      if (op !== 1 && op !== 0) continue;
      frags = op === 1 ? [payload] : [...frags, payload];
      if (!fin) continue;
      const msg = JSON.parse(Buffer.concat(frags).toString());
      frags = [];
      const waiter = pending.get(msg.id);
      if (waiter) {
        pending.delete(msg.id);
        waiter(msg.result);
      }
    }
  });
  return send;
}

(async () => {
  const targets = JSON.parse(await get(`http://127.0.0.1:${PORT}/json/list`));
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("aucun onglet : lancer Chrome avec --remote-debugging-port");
  const send = connect(page.webSocketDebuggerUrl);
  await new Promise((r) => setTimeout(r, 600));
  await send("Page.enable");
  // Le book présente le thème clair ; le sombre y figure en captures.
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "light" }],
  });
  await send("Page.navigate", { url: "file://" + SOURCE });
  // Les polices et la trentaine d'images doivent être chargées avant l'impression.
  await new Promise((r) => setTimeout(r, 6000));
  const pdf = await send("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    transferMode: "ReturnAsBase64",
  });
  fs.writeFileSync(SORTIE, Buffer.from(pdf.data, "base64"));
  const mo = (fs.statSync(SORTIE).size / 1024 / 1024).toFixed(2);
  console.log(`${path.relative(RACINE, SORTIE)} — ${mo} Mo, texte sélectionnable`);
  process.exit(0);
})().catch((e) => {
  console.error("échec :", e.message);
  process.exit(1);
});
