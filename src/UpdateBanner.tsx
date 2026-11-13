import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, Text, View } from "react-native"
import { ApkRelease, canInstall, checkUpdate, installUpdate, onInstallStatus, openInstallSettings, updaterAvailable } from "./update"
import { c, f } from "./theme"
import { Button } from "./ui"

type State =
  | { kind: "idle" }
  | { kind: "permission"; rel: ApkRelease }
  | { kind: "downloading"; rel: ApkRelease; progress: number }
  | { kind: "installing"; rel: ApkRelease }
  | { kind: "confirm"; rel: ApkRelease }
  | { kind: "error"; rel: ApkRelease; message: string }

const CHECK_EVERY_MS = 30 * 60 * 1000

// Busca versiones nuevas al abrir la app y al volver a ella (máximo cada 30 min).
// Si hay una, la descarga e instala sola; Android reemplaza la app y la vuelve a abrir.
export default function UpdateBanner() {
  const [state, setState] = useState<State>({ kind: "idle" })
  const busy = useRef(false)
  const lastCheck = useRef(0)
  const waitingPermission = useRef(false)

  const run = useCallback(async (force = false) => {
    if (busy.current || !updaterAvailable()) return
    if (!force && Date.now() - lastCheck.current < CHECK_EVERY_MS) return
    busy.current = true
    lastCheck.current = Date.now()
    try {
      const rel = await checkUpdate()
      if (!rel) return
      // la primera vez Android pide permitir que esta app instale actualizaciones
      waitingPermission.current = !canInstall()
      if (waitingPermission.current) {
        setState({ kind: "permission", rel })
        return
      }
      setState({ kind: "downloading", rel, progress: 0 })
      await installUpdate(rel, (p) => setState({ kind: "downloading", rel, progress: p }))
      setState({ kind: "installing", rel })
    } catch (e) {
      setState((s) => ("rel" in s ? { kind: "error", rel: s.rel, message: String((e as Error)?.message ?? e) } : s))
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    run(true)
    const app = AppState.addEventListener("change", (st) => {
      if (st !== "active") return
      // al volver de dar el permiso, seguir sin esperar los 30 min
      run(waitingPermission.current)
    })
    const sub = onInstallStatus((e) =>
      setState((s) => {
        if (!("rel" in s)) return s
        if (e.status === "pending") return { kind: "confirm", rel: s.rel }
        if (e.status === "failure") return { kind: "error", rel: s.rel, message: e.message ?? "La instalación falló" }
        return s
      })
    )
    return () => {
      app.remove()
      sub?.remove()
    }
  }, [run])

  if (state.kind === "idle") return null
  const v = state.rel.version

  return (
    <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 20, marginBottom: 12, gap: 12 }}>
      <Text style={{ color: c.text, fontSize: 15, fontFamily: f.medium }}>Versión {v} disponible</Text>

      {state.kind === "permission" && (
        <>
          <Text style={{ color: c.sub, fontSize: 13, lineHeight: 19, fontFamily: f.regular }}>
            Permite que la app se actualice sola. Solo hay que hacerlo una vez.
          </Text>
          <Button label="Permitir actualizaciones" onPress={openInstallSettings} />
        </>
      )}

      {state.kind === "downloading" && (
        <>
          <Text style={{ color: c.sub, fontSize: 13, fontFamily: f.regular }}>Descargando… {Math.round(state.progress * 100)}%</Text>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: c.bg, overflow: "hidden" }}>
            <View style={{ height: 4, width: `${Math.round(state.progress * 100)}%`, backgroundColor: c.accent }} />
          </View>
        </>
      )}

      {state.kind === "installing" && (
        <Text style={{ color: c.sub, fontSize: 13, fontFamily: f.regular }}>Instalando. La app se cerrará y volverá a abrirse sola.</Text>
      )}

      {state.kind === "confirm" && (
        <Text style={{ color: c.sub, fontSize: 13, lineHeight: 19, fontFamily: f.regular }}>
          Android pide confirmar esta primera actualización. Las siguientes serán automáticas.
        </Text>
      )}

      {state.kind === "error" && (
        <>
          <Text style={{ color: c.danger, fontSize: 13, fontFamily: f.regular }}>No se pudo actualizar: {state.message}</Text>
          <Button kind="glass" label="Reintentar" onPress={() => run(true)} />
        </>
      )}
    </View>
  )
}
