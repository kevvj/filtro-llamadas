import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LogItem, REASONS } from "../config"
import { c, f } from "../theme"
import { Card, Eyebrow, Sub } from "../ui"

const DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]

const Row = ({ left, right }: { left: string; right: string }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
    <Text style={{ color: c.sub, fontSize: 14, fontFamily: f.regular }}>{left}</Text>
    <Text style={{ color: c.text, fontSize: 14, fontFamily: f.medium }}>{right}</Text>
  </View>
)

// Resumen discreto al final del historial, plegado por defecto. Solo cuenta las bloqueadas.
export default function Stats({ log }: { log: LogItem[] }) {
  const [open, setOpen] = useState(false)
  const blocked = log.filter((l) => !l.allowed)
  if (!blocked.length) return null

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    const from = d.getTime()
    return { label: DAYS[d.getDay()], n: blocked.filter((l) => l.time >= from && l.time < from + 86400e3).length }
  })
  const max = Math.max(1, ...days.map((d) => d.n))
  const week = days.reduce((a, d) => a + d.n, 0)

  const tally = (key: (l: LogItem) => string) =>
    Object.entries(blocked.reduce<Record<string, number>>((a, l) => ((a[key(l)] = (a[key(l)] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1])
  const reasons = tally((l) => l.reason)
  const top = tally((l) => l.number).filter(([num, n]) => num && n > 1).slice(0, 3)

  return (
    <View style={{ marginTop: 16 }}>
      <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 }}>
        <Text style={{ color: c.mute, fontSize: 13, fontFamily: f.medium }}>{open ? "Ocultar estadísticas" : "Ver estadísticas"}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={c.mute} />
      </Pressable>

      {open && (
        <>
          <Card>
            <Eyebrow>ÚLTIMOS 7 DÍAS · {week} BLOQUEADAS</Eyebrow>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 92, marginTop: 14 }}>
              {days.map((d, i) => (
                <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <Text style={{ color: c.mute, fontSize: 11, fontFamily: f.regular }}>{d.n || ""}</Text>
                  <View style={{ width: "100%", height: Math.max(3, (d.n / max) * 50), borderRadius: 4, backgroundColor: i === 6 ? c.peri : c.cardAlt }} />
                  <Text style={{ color: c.mute, fontSize: 11, fontFamily: f.regular }}>{d.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Eyebrow>POR MOTIVO</Eyebrow>
            <View style={{ marginTop: 10 }}>
              {reasons.map(([r, n]) => (
                <Row key={r} left={REASONS[r] ?? r} right={String(n)} />
              ))}
            </View>
          </Card>

          {top.length > 0 && (
            <Card>
              <Eyebrow>LOS QUE MÁS INSISTEN</Eyebrow>
              <View style={{ marginTop: 10 }}>
                {top.map(([num, n]) => (
                  <Row key={num} left={num} right={`${n} veces`} />
                ))}
              </View>
            </Card>
          )}
          <Sub style={{ textAlign: "center", color: c.mute }}>Solo se cuenta lo guardado en este teléfono.</Sub>
        </>
      )}
    </View>
  )
}
