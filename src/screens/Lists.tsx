import { useState } from "react"
import { Alert, Platform, StyleSheet, Text, View } from "react-native"
import { Config, Entry, digits, sameNumber } from "../config"
import { c, f } from "../theme"
import { Button, Card, Chip, Empty, Input, Segmented, Sub, Title } from "../ui"

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

  const add = () => {
    const n = num.trim()
    if (digits(n).length < (kind === "prefix" ? 1 : 3)) return
    if (kind === "prefix") {
      update((x) => (x.prefixes.includes(n) ? x : { ...x, prefixes: [...x.prefixes, n] }))
    } else {
      const entry: Entry = { number: n, note: note.trim() || undefined, added: Date.now() }
      update((x) => {
        // un número no puede estar en spam y en permitidos a la vez
        const other = kind === "spam" ? "allow" : "spam"
        if (x[kind].some((e) => sameNumber(e.number, n))) return x
        return { ...x, [kind]: [entry, ...x[kind]], [other]: x[other].filter((e) => !sameNumber(e.number, n)) }
      })
    }
    setNum("")
    setNote("")
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
        {kind !== "prefix" && <Input placeholder="Nota (opcional)" value={note} onChangeText={setNote} style={{ marginTop: 8 }} />}
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
    </View>
  )
}
