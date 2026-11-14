import { useEffect, useMemo, useState } from "react"
import { Alert, PermissionsAndroid, Platform, StyleSheet, Text, View } from "react-native"
import CallFilter, { RecentCall } from "../../modules/call-filter"
import { Config, Entry, digits, sameNumber } from "../config"
import { c, f } from "../theme"
import { Button, Card, Chip, Empty, Eyebrow, Input, Segmented, Sub, Title } from "../ui"
import { when } from "./History"

type Props = { cfg: Config; update: (fn: (x: Config) => Config) => void }
type Kind = "spam" | "allow" | "prefix"

// Pregunta antes de una acción destructiva (en web, Alert con botones no funciona).
export function confirm(title: string, msg: string, ok: string, onOk: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${msg}`)) onOk()
    return
  }
  Alert.alert(title, msg, [{ text: "Cancelar", style: "cancel" }, { text: ok, style: "destructive", onPress: onOk }])
}

export default function ListsScreen({ cfg, update }: Props) {
  const [kind, setKind] = useState<Kind>("spam")
  const [num, setNum] = useState("")
  const [note, setNote] = useState("")
  const [showNote, setShowNote] = useState(false)

  const put = (k: "spam" | "allow", n: string, noteText?: string) =>
    update((x) => {
      // un número no puede estar en spam y en permitidos a la vez
      const other = k === "spam" ? "allow" : "spam"
      if (x[k].some((e) => sameNumber(e.number, n))) return x
      const entry: Entry = { number: n, note: noteText || undefined, added: Date.now() }
      return { ...x, [k]: [entry, ...x[k]], [other]: x[other].filter((e) => !sameNumber(e.number, n)) }
    })

  const add = () => {
    const n = num.trim()
    if (digits(n).length < (kind === "prefix" ? 1 : 3)) return
    if (kind === "prefix") {
      update((x) => (x.prefixes.includes(n) ? x : { ...x, prefixes: [...x.prefixes, n] }))
    } else {
      put(kind, n, note.trim())
    }
    setNum("")
    setNote("")
    setShowNote(false)
  }

  const remove = (e: Entry) =>
    kind === "spam"
      ? confirm("Quitar de spam", `${e.number} podrá volver a llamarte.`, "Quitar", () => update((x) => ({ ...x, spam: x.spam.filter((k) => k !== e) })))
      : update((x) => ({ ...x, allow: x.allow.filter((k) => k !== e) }))

  const list = kind === "spam" ? cfg.spam : cfg.allow

  return (
    <View>
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: "spam", label: "Spam" },
          { value: "allow", label: "Permitidos" },
          { value: "prefix", label: "Prefijos" },
        ]}
      />
      <Sub style={{ marginTop: 14, marginBottom: 14, paddingHorizontal: 4 }}>
        {kind === "spam" && "Un número en spam no puede volver a llamarte nunca, por ninguna línea."}
        {kind === "allow" && "Siempre entran, aunque la línea filtre desconocidos, países o esté en No molestar."}
        {kind === "prefix" && "Bloquea todos los números que empiecen así, por ejemplo +57601 o 900."}
      </Sub>

      <Card>
        <Input
          placeholder={kind === "prefix" ? "Prefijo, ej. +57601" : "Número, ej. +57 300 123 4567"}
          keyboardType="phone-pad"
          value={num}
          onChangeText={setNum}
        />
        {kind !== "prefix" && showNote && <Input placeholder="Nota (opcional)" value={note} onChangeText={setNote} style={{ marginTop: 8 }} />}
        {kind !== "prefix" && !showNote && (
          <Text onPress={() => setShowNote(true)} style={{ color: c.mute, fontSize: 13, fontFamily: f.medium, marginTop: 10 }}>
            + Agregar nota
          </Text>
        )}
        <View style={{ marginTop: 14 }}>
          <Button label={kind === "spam" ? "Marcar como spam" : kind === "allow" ? "Permitir siempre" : "Bloquear prefijo"} onPress={add} />
        </View>
      </Card>

      {kind === "prefix" ? (
        cfg.prefixes.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {cfg.prefixes.map((p) => (
              <Chip key={p} label={p} onRemove={() => update((x) => ({ ...x, prefixes: x.prefixes.filter((k) => k !== p) }))} />
            ))}
          </View>
        ) : (
          <Empty text="Sin prefijos bloqueados" />
        )
      ) : list.length ? (
        <Card style={{ paddingVertical: 6 }}>
          {list.map((e, i) => (
            <View key={e.number + e.added} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: c.line }}>
              <View style={{ flex: 1 }}>
                <Title>{e.number}</Title>
                <Sub>{[e.note, new Date(e.added).toLocaleDateString()].filter(Boolean).join(" · ")}</Sub>
              </View>
              <Text onPress={() => remove(e)} style={{ color: c.sub, fontSize: 13, fontFamily: f.medium, padding: 6 }}>
                Quitar
              </Text>
            </View>
          ))}
        </Card>
      ) : (
        <Empty text={kind === "spam" ? "Ningún número marcado como spam" : "Sin números permitidos"} />
      )}

      {kind !== "prefix" && <Recent kind={kind} cfg={cfg} onPick={(r) => put(kind, r.number, r.name)} />}
    </View>
  )
}

const TYPES: Record<number, string> = { 1: "Entró", 2: "Saliente", 3: "Perdida", 5: "Rechazada", 6: "Bloqueada" }

// Últimas llamadas del teléfono, para marcar un número con un toque sin escribirlo.
function Recent(p: { kind: "spam" | "allow"; cfg: Config; onPick: (r: RecentCall) => void }) {
  const [granted, setGranted] = useState<boolean | null>(Platform.OS === "web" ? true : null)
  const [shown, setShown] = useState(5)

  useEffect(() => {
    if (Platform.OS !== "android") return
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG).then(setGranted)
  }, [])
  // se vuelve a leer cuando cambia la config (al marcar uno, o al volver a la app)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calls = useMemo(() => (granted ? CallFilter?.recentCalls(50) ?? [] : []), [granted, p.cfg])

  const ask = async () => {
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG)
    if (r === "granted") setGranted(true)
    else if (r === "never_ask_again") CallFilter?.openAppSettings()
  }

  if (granted === null || !CallFilter) return null
  if (!granted)
    return (
      <Card>
        <Eyebrow>Llamadas recientes</Eyebrow>
        <Sub style={{ marginTop: 8, marginBottom: 14 }}>Marca un número de tus últimas llamadas sin tener que escribirlo.</Sub>
        <Button kind="glass" label="Ver llamadas recientes" onPress={ask} />
      </Card>
    )

  const list = p.kind === "spam" ? p.cfg.spam : p.cfg.allow
  const all = calls.filter((r) => r.type !== 2 && !list.some((e) => sameNumber(e.number, r.number)))
  const rows = all.slice(0, shown)
  if (!rows.length) return null
  return (
    <Card style={{ paddingVertical: 6 }}>
      <Eyebrow style={{ marginTop: 12 }}>Llamadas recientes</Eyebrow>
      {rows.map((r, i) => (
        <View key={r.number} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: c.line }}>
          <View style={{ flex: 1 }}>
            <Title>{r.name || r.number}</Title>
            <Sub>{[r.name ? r.number : "", TYPES[r.type] ?? "", when(r.date)].filter(Boolean).join(" · ")}</Sub>
          </View>
          <Text
            onPress={() => p.onPick(r)}
            style={{ color: p.kind === "spam" ? c.danger : c.text, backgroundColor: p.kind === "spam" ? c.dangerSoft : c.glass, fontSize: 13, fontFamily: f.medium, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: "hidden" }}
          >
            {p.kind === "spam" ? "Spam" : "Permitir"}
          </Text>
        </View>
      ))}
      {all.length > shown && (
        <View style={{ marginVertical: 10 }}>
          <Button kind="glass" label={`Ver más (${all.length - shown})`} onPress={() => setShown((n) => n + 5)} />
        </View>
      )}
    </Card>
  )
}
