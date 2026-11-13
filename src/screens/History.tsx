import { StyleSheet, Text, View } from "react-native"
import { Sim } from "../../modules/call-filter"
import { Config, LogItem, REASONS, sameNumber } from "../config"
import { c, f } from "../theme"
import { Button, Card, Empty, Eyebrow, Sub, Title } from "../ui"
import { confirm } from "./Lists"

type Props = { cfg: Config; sims: Sim[]; log: LogItem[]; update: (fn: (x: Config) => Config) => void; onClear: () => void }

const when = (t: number) => {
  const d = new Date(t)
  const today = new Date().toDateString() === d.toDateString()
  const h = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return today ? h : `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${h}`
}

// Llamadas bloqueadas por el filtro, con acciones rápidas.
export default function HistoryScreen({ cfg, sims, log, update, onClear }: Props) {
  if (!log.length) return <Empty text={"Aún no se ha bloqueado ninguna llamada.\nAquí verás cada una y el motivo."} />

  const simName = (id: string) => {
    const s = sims.find((k) => k.id === id)
    return s ? s.name : ""
  }

  // resumen por motivo
  const counts = Object.entries(log.reduce<Record<string, number>>((a, l) => ((a[l.reason] = (a[l.reason] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1])

  return (
    <View>
      <Card>
        <Eyebrow>POR MOTIVO</Eyebrow>
        <View style={{ marginTop: 10 }}>
          {counts.map(([r, n]) => (
            <View key={r} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
              <Text style={{ color: c.sub, fontSize: 14, fontFamily: f.regular }}>{REASONS[r] ?? r}</Text>
              <Text style={{ color: c.text, fontSize: 14, fontFamily: f.medium }}>{n}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ paddingVertical: 6 }}>
        {log.map((l, i) => {
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
      <Button kind="glass" label="Borrar historial" onPress={() => confirm("Borrar historial", "Se borra la lista de llamadas bloqueadas (no el spam).", "Borrar", onClear)} />
    </View>
  )
}
