import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { installedVersion, otaId } from "../update"
import { exportBackup, pickBackup } from "../backup"
import { confirm } from "./Lists"
import CallFilter, { Sim } from "../../modules/call-filter"
import { Config, REASONS, hhmm } from "../config"
import { c, f } from "../theme"
import { Button, Card, Divider, Eyebrow, Input, Segmented, Sub, ToggleRow } from "../ui"

type Props = { cfg: Config; sims: Sim[]; update: (fn: (x: Config) => Config) => void }

function TimeStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const step = (d: number) => onChange((value + d + 1440) % 1440)
  const btn = { width: 32, height: 32, borderRadius: 16, backgroundColor: c.glass, alignItems: "center" as const, justifyContent: "center" as const }
  return (
    <View style={{ flex: 1, alignItems: "center", backgroundColor: c.bg, borderRadius: 14, paddingVertical: 14 }}>
      <Eyebrow>{label.toUpperCase()}</Eyebrow>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
        <Pressable onPress={() => step(-30)} hitSlop={6} style={btn}>
          <Ionicons name="remove" size={16} color={c.text} />
        </Pressable>
        <Text style={{ color: c.text, fontSize: 22, fontFamily: f.light, fontVariant: ["tabular-nums"] }}>{hhmm(value)}</Text>
        <Pressable onPress={() => step(30)} hitSlop={6} style={btn}>
          <Ionicons name="add" size={16} color={c.text} />
        </Pressable>
      </View>
    </View>
  )
}

export default function SettingsScreen({ cfg, sims, update }: Props) {
  const [num, setNum] = useState("")
  const [picked, setSim] = useState("")
  const sim = sims.some((s) => s.id === picked) ? picked : (sims[0]?.id ?? "default")
  const [result, setResult] = useState<{ blocked: boolean; reason: string } | null>(null)
  const [backupMsg, setBackupMsg] = useState("")
  const [tileMsg, setTileMsg] = useState(false)

  const saveBackup = async () => {
    try {
      setBackupMsg((await exportBackup(cfg)) ? "" : "Guardar copia no está disponible aquí.")
    } catch (e) {
      setBackupMsg(String((e as Error)?.message ?? e))
    }
  }

  const restoreBackup = async () => {
    try {
      const data = await pickBackup()
      if (!data) return
      confirm("Restaurar copia", "Se reemplaza la configuración actual (líneas, spam, permitidos y ajustes).", "Restaurar", () => {
        update((x) => ({ ...x, ...data }))
        setBackupMsg("Copia restaurada.")
      })
    } catch (e) {
      setBackupMsg(String((e as Error)?.message ?? e))
    }
  }

  const test = () => {
    if (!num.trim()) return
    setResult(CallFilter ? CallFilter.test(num.trim(), sim) : { blocked: false, reason: "sin módulo nativo" })
  }

  return (
    <View>
      <Card>
        <ToggleRow label="Filtro activado" hint="Apágalo para dejar entrar todas las llamadas" value={cfg.enabled} onChange={(v) => update((x) => ({ ...x, enabled: v }))} />
        <Divider />
        <ToggleRow label="Bloquear números ocultos" hint="Llamadas privadas o sin número" value={cfg.blockPrivate} onChange={(v) => update((x) => ({ ...x, blockPrivate: v }))} />
        <Divider />
        <ToggleRow label="Preguntar si era spam" hint="Al colgar con un desconocido, una notificación para marcarlo con un toque" value={cfg.askSpam} onChange={(v) => update((x) => ({ ...x, askSpam: v }))} />
        <Divider />
        <ToggleRow
          label="No molestar"
          hint="En este horario solo entran contactos y permitidos"
          value={cfg.quiet.enabled}
          onChange={(v) => update((x) => ({ ...x, quiet: { ...x.quiet, enabled: v } }))}
        />
        {cfg.quiet.enabled && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TimeStepper label="Desde" value={cfg.quiet.from} onChange={(v) => update((x) => ({ ...x, quiet: { ...x.quiet, from: v } }))} />
            <TimeStepper label="Hasta" value={cfg.quiet.to} onChange={(v) => update((x) => ({ ...x, quiet: { ...x.quiet, to: v } }))} />
          </View>
        )}
        <Divider />
        <ToggleRow
          label="Dejar pasar si insisten"
          hint={`Si un desconocido llama ${cfg.repeat.calls} veces en ${cfg.repeat.minutes} min, puede ser urgente y entra`}
          value={cfg.repeat.enabled}
          onChange={(v) => update((x) => ({ ...x, repeat: { ...x.repeat, enabled: v } }))}
        />
        {cfg.repeat.enabled && (
          <View style={{ gap: 8, marginTop: 10 }}>
            <Segmented
              value={String(cfg.repeat.calls)}
              onChange={(v) => update((x) => ({ ...x, repeat: { ...x.repeat, calls: Number(v) } }))}
              options={[{ value: "2", label: "2 llamadas" }, { value: "3", label: "3 llamadas" }]}
            />
            <Segmented
              value={String(cfg.repeat.minutes)}
              onChange={(v) => update((x) => ({ ...x, repeat: { ...x.repeat, minutes: Number(v) } }))}
              options={[{ value: "3", label: "3 min" }, { value: "5", label: "5 min" }, { value: "10", label: "10 min" }]}
            />
          </View>
        )}
      </Card>

      <Card>
        <Text style={{ color: c.text, fontSize: 22, fontFamily: f.regular }}>Probar un número</Text>
        <Sub style={{ marginTop: 4, marginBottom: 16 }}>Mira si una llamada entraría con tu configuración actual.</Sub>
        <Input placeholder="+57 300 123 4567" keyboardType="phone-pad" value={num} onChangeText={(t) => { setNum(t); setResult(null) }} />
        {sims.length > 1 && (
          <View style={{ marginTop: 10 }}>
            <Segmented value={sim} onChange={(v) => { setSim(v); setResult(null) }} options={sims.map((s) => ({ value: s.id, label: s.name }))} />
          </View>
        )}
        <View style={{ marginTop: 14 }}>
          <Button label="Probar" onPress={test} />
        </View>
        {result && (
          <View style={{ marginTop: 14, padding: 16, borderRadius: 14, backgroundColor: result.blocked ? c.dangerSoft : c.periSoft }}>
            <Text style={{ color: result.blocked ? c.danger : c.peri, fontFamily: f.medium, fontSize: 15 }}>{result.blocked ? "Se bloquearía" : "Entraría"}</Text>
            <Sub style={{ marginTop: 2 }}>{REASONS[result.reason] ?? result.reason}</Sub>
          </View>
        )}
      </Card>

      <SimAds />

      <Card>
        <Text style={{ color: c.text, fontSize: 15, fontFamily: f.regular }}>Atajos rápidos</Text>
        <Sub style={{ marginTop: 4, marginBottom: 14 }}>
          Enciende o apaga el filtro y No molestar desde el panel de notificaciones, sin abrir la app.
        </Sub>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button kind="glass" label="+ Filtro" onPress={() => { if (!CallFilter?.addTile("filter")) setTileMsg(true) }} />
          </View>
          <View style={{ flex: 1 }}>
            <Button kind="glass" label="+ No molestar" onPress={() => { if (!CallFilter?.addTile("quiet")) setTileMsg(true) }} />
          </View>
        </View>
        {tileMsg ? <Sub style={{ marginTop: 10 }}>Desliza el panel de notificaciones, toca el lápiz (editar) y arrastra los atajos de Filtro de llamadas.</Sub> : null}
      </Card>

      <Card>
        <Text style={{ color: c.text, fontSize: 15, fontFamily: f.regular }}>Copia de seguridad</Text>
        <Sub style={{ marginTop: 4, marginBottom: 14 }}>
          Android la guarda sola en tu cuenta de Google y la recupera si reinstalas la app o cambias de celular. También puedes guardar un archivo en Drive.
        </Sub>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button kind="glass" label="Guardar copia" onPress={saveBackup} />
          </View>
          <View style={{ flex: 1 }}>
            <Button kind="glass" label="Restaurar" onPress={restoreBackup} />
          </View>
        </View>
        {backupMsg ? <Sub style={{ marginTop: 10 }}>{backupMsg}</Sub> : null}
      </Card>

      <Card>
        <Text style={{ color: c.text, fontSize: 15, fontFamily: f.regular }}>Permisos</Text>
        <Sub style={{ marginTop: 4, marginBottom: 14 }}>Si no ves tus SIMs o no se reconocen tus contactos, revisa los permisos.</Sub>
        <Button kind="glass" label="Abrir ajustes de la app" onPress={() => CallFilter?.openAppSettings()} />
      </Card>

      <Sub style={{ textAlign: "center", color: c.mute, marginTop: 4 }}>
        {installedVersion() ? `Versión ${installedVersion()}${otaId() ? ` · OTA ${otaId()}` : ""} · se actualiza sola` : "Vista previa"}
      </Sub>
    </View>
  )
}

// Publicidad emergente de la SIM ("SmartApp", "Claro te informa"...): la muestra el SIM Toolkit, no es una llamada.
// Ninguna app puede bloquearla; se guía al usuario a desactivar el SIM Toolkit desde Ajustes del sistema.
function SimAds() {
  const kits = CallFilter?.simToolkits?.() ?? []
  if (!kits.length) return null
  return (
    <Card>
      <Text style={{ color: c.text, fontSize: 15, fontFamily: f.regular }}>Publicidad de la SIM</Text>
      <Sub style={{ marginTop: 4, marginBottom: 14 }}>
        Los avisos emergentes de publicidad los manda la SIM de la operadora, no son llamadas, y ninguna app puede
        bloquearlos. Se quitan desactivando el SIM Toolkit: toca Abrir y luego Desactivar.
      </Sub>
      {kits.map((k, i) => (
        <View key={k.pkg}>
          {i > 0 && <Divider />}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 15, fontFamily: f.regular }}>SIM {k.sim}</Text>
              <Sub style={{ color: k.enabled ? c.danger : c.peri }}>{k.enabled ? "Puede mostrar publicidad" : "Desactivado: sin publicidad"}</Sub>
            </View>
            <Button small kind="glass" label="Abrir" onPress={() => CallFilter?.openPackageSettings(k.pkg)} />
          </View>
        </View>
      ))}
      <Sub style={{ marginTop: 12, color: c.mute }}>
        Si Desactivar sale en gris (pasa en Samsung), el celular no lo deja desde ahí: se hace desde una PC con el
        cable USB y depuración activada, con adb shell pm disable-user --user 0 com.android.stk (y com.android.stk2 para la
        SIM 2). Al desactivarlo solo dejas de ver el menú de la SIM; llamadas, SMS y datos siguen igual.
      </Sub>
    </Card>
  )
}
