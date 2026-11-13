import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import * as DocumentPicker from "expo-document-picker"
import { Config } from "./config"

// Copia manual de la configuración en un archivo JSON. Con "Guardar" se abre el menú de compartir de
// Android (elegir Drive, correo, etc.); con "Restaurar" se elige el archivo. Además Android guarda
// la app sola en la cuenta de Google (allowBackup en app.json).

const APP = "filtro-llamadas"

export async function exportBackup(cfg: Config): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false
  const day = new Date().toISOString().slice(0, 10)
  const file = new File(Paths.cache, `${APP}-copia-${day}.json`)
  if (file.exists) file.delete()
  file.create()
  file.write(JSON.stringify({ app: APP, version: 1, date: new Date().toISOString(), config: cfg }, null, 2))
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Guardar copia de seguridad" })
  return true
}

// La configuración del archivo elegido; null si se canceló. Lanza error si el archivo no es una copia válida.
export async function pickBackup(): Promise<Partial<Config> | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ["application/json", "*/*"], copyToCacheDirectory: true })
  if (res.canceled || !res.assets?.length) return null
  const text = await new File(res.assets[0].uri).text()
  let data: { app?: string; config?: Partial<Config> }
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("El archivo no es una copia de esta app.")
  }
  if (data?.app !== APP || typeof data.config !== "object" || !data.config) throw new Error("El archivo no es una copia de esta app.")
  return data.config
}
