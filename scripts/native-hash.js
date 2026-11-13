// Huella de la parte nativa: si cambia, el cambio no puede llegar por OTA y hace falta APK nueva
// (npm run nueva-version). Incluye dependencias, config de Expo y el código Android de modules/.
const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== "build" && e.name !== ".gradle") walk(p, out)
    } else out.push(p)
  }
  return out
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))
const parts = [
  ["dependencies", JSON.stringify(pkg.dependencies)],
  ["app.json", fs.readFileSync("app.json", "utf8")],
  ["app.config.js", fs.readFileSync("app.config.js", "utf8")],
]
const files = walk("modules")
  .map((f) => f.split(path.sep).join("/"))
  .filter((f) => f.includes("/android/") || f.endsWith("expo-module.config.json"))
  .sort()
for (const f of files) parts.push([f, fs.readFileSync(f, "utf8")])

const h = crypto.createHash("sha256")
// sin \r para que dé igual en Windows y en Linux
for (const [name, text] of parts) h.update(name + "\n" + text.replace(/\r\n/g, "\n") + "\n")
process.stdout.write(h.digest("hex") + "\n")
