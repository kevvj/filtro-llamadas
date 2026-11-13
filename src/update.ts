import { File, Paths } from "expo-file-system"
import * as Updates from "expo-updates"
import ApkUpdater, { InstallStatus } from "../modules/apk-updater"

// Lo publica el workflow CI junto a la APK, en el release de la última versión (vX.Y.Z).
const INFO_URL = "https://github.com/kevvj/filtro-llamadas/releases/latest/download/version.json"

export type ApkRelease = { versionCode: number; version: string; url: string; notes?: string }

export const updaterAvailable = () => !!ApkUpdater
export const installedVersion = () => ApkUpdater?.versionName() ?? ""
// Actualización OTA en uso (primeros caracteres del id); vacío si corre el JS que trae la APK
export const otaId = () => (Updates.isEnabled && !Updates.isEmbeddedLaunch && Updates.updateId ? Updates.updateId.slice(0, 8) : "")

// La versión nueva si hay una más reciente que la instalada; null si no (o sin internet, o en web).
export async function checkUpdate(): Promise<ApkRelease | null> {
  if (!ApkUpdater) return null
  try {
    const res = await fetch(`${INFO_URL}?t=${Date.now()}`)
    if (!res.ok) return null
    const rel: ApkRelease = await res.json()
    return rel.versionCode > ApkUpdater.versionCode() ? rel : null
  } catch {
    return null
  }
}

export const canInstall = () => ApkUpdater?.canInstall() ?? false
export const openInstallSettings = () => ApkUpdater?.openInstallSettings()

// Baja la APK y se la pasa al instalador de Android. Al terminar, Android cierra la app,
// la reemplaza y UpdatedReceiver la vuelve a abrir.
export async function installUpdate(rel: ApkRelease, onProgress: (p: number) => void) {
  if (!ApkUpdater) throw new Error("Sin actualizador")
  const file = new File(Paths.cache, "update.apk")
  if (file.exists) file.delete()
  const task = File.createDownloadTask(rel.url, file, {
    onProgress: ({ bytesWritten, totalBytes }) => totalBytes > 0 && onProgress(bytesWritten / totalBytes),
  })
  const done = await task.downloadAsync()
  if (!done) throw new Error("Descarga interrumpida")
  await ApkUpdater.install(done.uri)
}

export const onInstallStatus = (fn: (e: InstallStatus) => void) => ApkUpdater?.addListener("onInstallStatus", fn)
