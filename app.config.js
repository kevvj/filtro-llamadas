// La versión sale de app.json ("version": "1.2.3"). El versionCode (lo que compara el actualizador de APK)
// se calcula de ella: 1.2.3 → 10203. Así cada versión nueva tiene un número mayor que la anterior.
// runtimeVersion = versión: las actualizaciones OTA (solo JS) llegan a las APK de esa misma versión.
const OTA_BASE = "https://kevvj.github.io/filtro-llamadas/ota"

module.exports = ({ config }) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(config.version)
  if (!m || +m[2] > 99 || +m[3] > 99) throw new Error(`Versión inválida en app.json: ${config.version} (usa x.y.z, y y z menores a 100)`)
  const versionCode = +m[1] * 10000 + +m[2] * 100 + +m[3]
  return {
    ...config,
    android: { ...config.android, versionCode },
    runtimeVersion: config.version,
    updates: {
      url: `${OTA_BASE}/${config.version}/manifest.json`,
      // al abrir, espera hasta 3 s por un cambio nuevo; si tarda más, lo aplica la próxima vez
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 3000,
    },
  }
}
