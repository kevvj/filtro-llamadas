// En GitHub Actions, BUILD_NUMBER = número de ejecución del workflow: cada APK publicada tiene un
// versionCode mayor que la anterior, que es lo que compara el actualizador de la app.
module.exports = ({ config }) => {
  const build = Number(process.env.BUILD_NUMBER || 0)
  if (!build) return config
  return {
    ...config,
    version: `${config.version.split(".").slice(0, 2).join(".")}.${build}`,
    android: { ...config.android, versionCode: build },
  }
}
