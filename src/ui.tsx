import { ReactNode } from "react"
import { Pressable, StyleSheet, Switch, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { c, f } from "./theme"

export const Card = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
)

export const Title = ({ children, style }: { children: ReactNode; style?: object }) => <Text style={[s.title, style]}>{children}</Text>
export const Sub = ({ children, style }: { children: ReactNode; style?: object }) => <Text style={[s.sub, style]}>{children}</Text>
export const Eyebrow = ({ children, style }: { children: ReactNode; style?: object }) => <Text style={[s.eyebrow, style]}>{children}</Text>
export const Divider = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginVertical: 14 }} />

export function ToggleRow(p: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable style={s.row} onPress={() => p.onChange(!p.value)}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{p.label}</Text>
        {p.hint ? <Text style={[s.sub, { marginTop: 3 }]}>{p.hint}</Text> : null}
      </View>
      <Switch
        value={p.value}
        onValueChange={p.onChange}
        trackColor={{ false: c.cardAlt, true: c.accent }}
        thumbColor={p.value ? "#FFFFFF" : c.sub}
        {...({ activeThumbColor: "#FFFFFF" } as object)}
      />
    </Pressable>
  )
}

// Píldoras: la elegida se rellena con periwinkle translúcido.
export function Segmented<T extends string>(p: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={s.seg}>
      {p.options.map((o) => {
        const on = o.value === p.value
        return (
          <Pressable key={o.value} onPress={() => p.onChange(o.value)} style={[s.segItem, on && { backgroundColor: c.periSoft }]}>
            <Text style={[s.segText, on && { color: c.text }]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// primary = único botón índigo de la vista; glass = secundario translúcido; danger = quitar/spam.
export function Button(p: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; kind?: "primary" | "glass" | "danger"; small?: boolean }) {
  const kind = p.kind ?? "primary"
  const bg = kind === "primary" ? c.accent : kind === "danger" ? c.dangerSoft : c.glass
  const fg = kind === "danger" ? c.danger : kind === "primary" ? "#FFFFFF" : c.text
  return (
    <Pressable
      onPress={p.onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: pressed ? 0.75 : 1 }, p.small && { height: 34, paddingHorizontal: 14 }]}
    >
      {p.icon ? <Ionicons name={p.icon} size={p.small ? 14 : 16} color={fg} /> : null}
      <Text style={[s.btnText, { color: fg }, p.small && { fontSize: 13 }]}>{p.label}</Text>
    </Pressable>
  )
}

export function Chip(p: { label: string; onRemove?: () => void; danger?: boolean }) {
  const col = p.danger ? c.danger : c.text
  return (
    <View style={[s.chip, { backgroundColor: p.danger ? c.dangerSoft : c.glass }]}>
      <Text style={[s.chipText, { color: col }]}>{p.label}</Text>
      {p.onRemove ? (
        <Pressable onPress={p.onRemove} hitSlop={8}>
          <Ionicons name="close" size={13} color={c.sub} />
        </Pressable>
      ) : null}
    </View>
  )
}

export const Input = (p: TextInputProps) => <TextInput placeholderTextColor={c.mute} {...p} style={[s.input, p.style]} />

export function Empty({ text }: { text: string }) {
  return <Text style={[s.sub, { textAlign: "center", paddingVertical: 40, color: c.mute }]}>{text}</Text>
}

export const s = StyleSheet.create({
  card: { backgroundColor: c.card, borderRadius: 16, padding: 20, marginBottom: 12 },
  title: { color: c.text, fontSize: 16, fontFamily: f.medium, letterSpacing: 0.1 },
  sub: { color: c.sub, fontSize: 13, lineHeight: 19, fontFamily: f.regular },
  eyebrow: { color: c.mute, fontSize: 12, fontFamily: f.medium, letterSpacing: 0.3 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 4, minHeight: 44 },
  rowLabel: { color: c.text, fontSize: 15, fontFamily: f.regular },
  seg: { flexDirection: "row", gap: 4, backgroundColor: c.bg, borderRadius: 40, padding: 4 },
  segItem: { flex: 1, height: 36, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  segText: { color: c.sub, fontSize: 13, fontFamily: f.medium },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, paddingHorizontal: 20, borderRadius: 40 },
  btnText: { fontSize: 14, fontFamily: f.medium },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, height: 32, paddingHorizontal: 14, borderRadius: 40 },
  chipText: { fontSize: 13, fontFamily: f.regular },
  input: { backgroundColor: c.bg, color: c.text, borderRadius: 12, paddingHorizontal: 16, height: 46, fontSize: 15, fontFamily: f.regular },
})
