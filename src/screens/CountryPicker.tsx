import { useState } from "react"
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { COUNTRIES, flag } from "../countries"
import { c, f } from "../theme"
import { Button, Input, Sub } from "../ui"

type Props = { visible: boolean; selected: string[]; onClose: () => void; onSave: (codes: string[]) => void }

// Selección múltiple de países (se guardan los indicativos).
// El contenido se monta al abrir, así la selección y la búsqueda arrancan limpias cada vez.
export default function CountryPicker(p: Props) {
  return (
    <Modal visible={p.visible} animationType="slide" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={p.onClose}>
      {p.visible ? <PickerBody {...p} /> : null}
    </Modal>
  )
}

function PickerBody({ selected, onClose, onSave }: Props) {
  const [sel, setSel] = useState<string[]>(selected)
  const [q, setQ] = useState("")
  // el modal llega hasta el borde: se deja espacio para la barra de navegación de Android
  const insets = useSafeAreaInsets()

  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  const list = COUNTRIES.filter((x) => norm(x.name).includes(norm(q)) || x.code.startsWith(q.replace("+", "")))
  const toggle = (code: string) => setSel((p) => (p.includes(code) ? p.filter((k) => k !== code) : [...p, code]))

  return (
      <View style={{ flex: 1, backgroundColor: "rgba(10,10,18,0.6)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 20 + insets.bottom, height: "85%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 22, fontFamily: f.regular }}>Países permitidos</Text>
              <Sub>{sel.length} seleccionado{sel.length === 1 ? "" : "s"}</Sub>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.glass, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={18} color={c.text} />
            </Pressable>
          </View>
          <Input placeholder="Buscar país o indicativo" value={q} onChangeText={setQ} />
          <FlatList
            style={{ marginTop: 8, flex: 1 }}
            data={list}
            keyExtractor={(x) => x.iso}
            renderItem={({ item }) => {
              const on = sel.includes(item.code)
              return (
                <Pressable onPress={() => toggle(item.code)} style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }}>
                  {flag(item.iso) ? <Text style={{ fontSize: 20 }}>{flag(item.iso)}</Text> : null}
                  <Text style={{ color: c.text, fontSize: 15, flex: 1, fontFamily: f.regular }}>{item.name}</Text>
                  <Text style={{ color: c.mute, fontSize: 13, fontFamily: f.regular, marginRight: 4 }}>+{item.code}</Text>
                  <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={22} color={on ? c.peri : c.cardAlt} />
                </Pressable>
              )
            }}
          />
          <View style={{ marginTop: 14 }}>
            <Button label="Guardar" onPress={() => sel.length && onSave(sel)} />
            {!sel.length && <Sub style={{ textAlign: "center", marginTop: 8 }}>Elige al menos un país</Sub>}
          </View>
        </View>
      </View>
  )
}
