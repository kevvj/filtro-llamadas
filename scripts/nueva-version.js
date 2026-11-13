// Sube la versión de app.json. Uso: npm run nueva-version -- patch | minor | major | 1.4.0
// Al subir ese cambio a main, GitHub Actions compila y publica la APK de esa versión.
const fs = require("fs")
const path = require("path")

const file = path.resolve("app.json") // npm run corre en la raíz del proyecto
const json = JSON.parse(fs.readFileSync(file, "utf8"))
const actual = json.expo.version
const [major, minor, patch] = actual.split(".").map(Number)
const arg = process.argv[2] || "patch"

const next =
  { patch: `${major}.${minor}.${patch + 1}`, minor: `${major}.${minor + 1}.0`, major: `${major + 1}.0.0` }[arg] ?? arg

if (!/^\d+\.\d+\.\d+$/.test(next)) {
  process.stderr.write("Uso: npm run nueva-version -- patch | minor | major | x.y.z\n")
  process.exit(1)
}
json.expo.version = next
fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
process.stdout.write(`Versión ${actual} → ${next}. Sube el cambio a main para publicar la APK.\n`)
