import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Sim } from "../../modules/call-filter"
import { Config, LogItem, REASONS, sameNumber } from "../config"
import { c } from "../theme"
import { Button, Card, Empty, Sub, Title } from "../ui"
import { confirm } from "./Lists"
import Stats from "./Stats"

type Props = { cfg: Config; sims: Sim[]; log: LogItem[]; update: (fn: (x: Config) => Config) => void; onClear: () => void }

const when = (t: number) => {
  const d = new Date(t)
  const today = new Date().toDateString() === d.toDateString()
  const h = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return today ? h : `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${h}`
}

const PAGE = 5

// Llamadas bloqueadas por el filtro, con acciones rápidas.
export default function HistoryScreen({ cfg, sims, log, update, onClear }: Props) {
  // se muestran de a 10: con "Ver más" se cargan otras, sin una lista infinita
  const [shown, setShown] = useState(PAGE)
  if (!log.length) return <Empty text={"Aún no se ha bloqueado ninguna llamada.\nAquí verás cada una y el motivo."} />

  const simName = (id: string) => {
    const s = sims.find((k) => k.id === id)
    return s ? s.name : ""
  }

  return (
    <View>
      <Card style={{ paddingVertical: 6 }}>
        {log.slice(0, shown).map((l, i) => {
          const isSpam = cfg.spam.some((e) => sameNumber(e.number, l.number))
          const isAllowed = cfg.allow.some((e) => sameNumber(e.number, l.number))
          return (
            <View key={l.time + l.number + i} style={{ paddingVertical: 14, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: c.line }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Title>{l.number || "Número oculto"}</Title>
                <Sub style={{ color: c.mute }}>{when(l.time)}</Sub>
              </View>
              <Sub style={{ marginTop: 2 }}>{[REASONS[l.reason] ?? l.reason, simName(l.sim)].filter(Boolean).join(" · ")}</Sub>
              {!!l.number && !isSpam && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <Button small kind="danger" label="Es spam" onPress={() => update((x) => ({ ...x, spam: [{ number: l.number, added: Date.now() }, ...x.spam], allow: x.allow.filter((e) => !sameNumber(e.number, l.number)) }))} />
                  {!isAllowed && <Button small kind="glass" label="Permitir siempre" onPress={() => update((x) => ({ ...x, allow: [{ number: l.number, added: Date.now() }, ...x.allow] }))} />}
                </View>
              )}
              {isSpam && <Sub style={{ marginTop: 6, color: c.danger }}>En spam</Sub>}
            </View>
          )
        })}
      </Card>
      {log.length > shown && (
        <View style={{ marginBottom: 12 }}>
          <Button kind="glass" label={`Ver más (${log.length - shown})`} onPress={() => setShown((n) => n + PAGE)} />
        </View>
      )}
      <Button kind="glass" label="Borrar historial" onPress={() => confirm("Borrar historial", "Se borra la lista de llamadas bloqueadas (no el spam).", "Borrar", onClear)} />
      <Stats log={log} />
    </View>
  )
}
