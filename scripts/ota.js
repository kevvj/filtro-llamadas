// Arma una actualización OTA (solo JS) a partir de `npx expo export -p android --output-dir dist`.
// Uso: node scripts/ota.js <carpeta-salida>   → escribe <salida>/ota/<versión>/manifest.json + archivos
// El manifest sigue el protocolo de expo-updates; GitHub Pages lo sirve como archivo estático.
const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

const OUT = process.argv[2] || "site"
const BASE = "https://kevvj.github.io/filtro-llamadas/ota"
const config = require("../app.config.js")({ config: JSON.parse(fs.readFileSync("app.json", "utf8")).expo })
const runtime = config.runtimeVersion
const meta = JSON.parse(fs.readFileSync("dist/metadata.json", "utf8")).fileMetadata.android
const dir = path.join(OUT, "ota", runtime)
fs.mkdirSync(path.join(dir, "assets"), { recursive: true })

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("base64url")
const md5 = (buf) => crypto.createHash("md5").update(buf).digest("hex")

function asset(src, ext, contentType) {
  const buf = fs.readFileSync(path.join("dist", src))
  const key = md5(buf)
  fs.writeFileSync(path.join(dir, "assets", `${key}.${ext}`), buf)
  return { hash: sha256(buf), key, contentType, fileExtension: `.${ext}`, url: `${BASE}/${runtime}/assets/${key}.${ext}` }
}

const launchAsset = asset(meta.bundle, path.extname(meta.bundle).slice(1) || "bundle", "application/javascript")
const assets = meta.assets.map((a) => asset(a.path, a.ext, "application/octet-stream"))

// id estable: el mismo código da el mismo id, y la app no vuelve a bajar lo que ya tiene
const hex = crypto.createHash("sha256").update(JSON.stringify([launchAsset.hash, assets.map((a) => a.hash)])).digest("hex")
const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`

const manifest = {
  id,
  createdAt: new Date().toISOString(),
  runtimeVersion: runtime,
  launchAsset,
  assets,
  metadata: {},
  extra: { expoClient: config },
}
fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest))
fs.writeFileSync(path.join(OUT, ".nojekyll"), "")
process.stdout.write(`OTA ${runtime} · ${id} · ${assets.length} assets\n`)
