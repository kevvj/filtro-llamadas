// La versión sale de app.json ("version": "1.2.3"). El versionCode (lo que compara el actualizador)
// se calcula de ella: 1.2.3 → 10203. Así cada versión nueva tiene un número mayor que la anterior.
module.exports = ({ config }) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(config.version)
  if (!m || +m[2] > 99 || +m[3] > 99) throw new Error(`Versión inválida en app.json: ${config.version} (usa x.y.z, y y z menores a 100)`)
  const versionCode = +m[1] * 10000 + +m[2] * 100 + +m[3]
  return { ...config, android: { ...config.android, versionCode } }
}
