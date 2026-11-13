import { useCallback, useEffect, useState } from "react"
import { AppState, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useFonts, Inter_300Light, Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter"
import CallFilter, { Sim } from "../modules/call-filter"
import { Config, LogItem, detectCountry, loadConfig, loadLog, newRule, saveConfig } from "./config"
import { c, f } from "./theme"
import { Button } from "./ui"
import LinesScreen from "./screens/Lines"
import ListsScreen from "./screens/Lists"
import HistoryScreen from "./screens/History"
import SettingsScreen from "./screens/Settings"

type Tab = "lines" | "lists" | "history" | "settings"

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "lines", label: "Líneas", icon: "call-outline" },
  { key: "lists", label: "Listas", icon: "ban-outline" },
  { key: "history", label: "Historial", icon: "time-outline" },
  { key: "settings", label: "Ajustes", icon: "options-outline" },
]

async function askPermissions() {
  if (Platform.OS !== "android") return
  const P = PermissionsAndroid.PERMISSIONS
  const list = [P.READ_PHONE_STATE, P.READ_CONTACTS, P.READ_PHONE_NUMBERS].filter(Boolean)
  await PermissionsAndroid.requestMultiple(list as any)
}

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_300Light, Inter_400Regular, Inter_500Medium })
  const deviceIso = CallFilter?.getDeviceCountry() || "CO"
  const [cfg, setCfg] = useState<Config>(() => loadConfig(deviceIso))
  const [sims, setSims] = useState<Sim[]>([])
  const [log, setLog] = useState<LogItem[]>([])
  const [hasRole, setHasRole] = useState(true)
  const [tab, setTab] = useState<Tab>("lines")

  const update = useCallback((fn: (x: Config) => Config) => {
    setCfg((prev) => {
      const next = fn(prev)
      saveConfig(next)
      return next
    })
  }, [])

  // Lee SIMs, rol y bloqueos; crea reglas para SIMs nuevas con su país detectado.
  const refresh = useCallback(() => {
    const list = CallFilter?.getSims() ?? []
    setSims(list)
    setHasRole(CallFilter ? CallFilter.hasScreeningRole() : false)
    setLog(loadLog())
    update((x) => {
      const missing = list.filter((s) => !x.sims[s.id])
      if (!missing.length) return x
      const simsCfg = { ...x.sims }
      missing.forEach((s) => (simsCfg[s.id] = newRule(detectCountry(s, deviceIso))))
      return { ...x, sims: simsCfg }
    })
  }, [deviceIso, update])

  useEffect(() => {
    saveConfig(cfg)
    askPermissions().then(refresh)
    const sub = AppState.addEventListener("change", (st) => st === "active" && refresh())
    return () => sub.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: c.bg }} />

  const blockedToday = log.filter((l) => new Date(l.time).toDateString() === new Date().toDateString()).length
  const active = cfg.enabled && hasRole

  return (
    <SafeAreaProvider>
      <SafeAreaView style={st.root} edges={["top", "bottom"]}>
        <StatusBar style="light" />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <View style={st.header}>
            <View style={st.status}>
              <View style={[st.dot, { backgroundColor: active ? c.peri : c.mute }]} />
              <Text style={st.statusText}>{active ? "Protección activa" : cfg.enabled ? "Falta un permiso" : "Filtro apagado"}</Text>
            </View>
            <Text style={st.stat}>{blockedToday}</Text>
            <Text style={st.statLabel}>
              {blockedToday === 1 ? "llamada bloqueada hoy" : "llamadas bloqueadas hoy"} · {cfg.spam.length} en spam
            </Text>
          </View>

          {!hasRole && (
            <View style={st.banner}>
              <Text style={st.bannerText}>Para bloquear llamadas, elige esta app como filtro de llamadas del teléfono.</Text>
              <Button label="Activar filtro" onPress={() => CallFilter?.requestScreeningRole()} />
            </View>
          )}

          {tab === "lines" && <LinesScreen cfg={cfg} sims={sims} update={update} />}
          {tab === "lists" && <ListsScreen cfg={cfg} update={update} />}
          {tab === "history" && <HistoryScreen cfg={cfg} sims={sims} log={log} update={update} onClear={() => { CallFilter?.clearLog(); setLog([]) }} />}
          {tab === "settings" && <SettingsScreen cfg={cfg} sims={sims} update={update} />}
        </ScrollView>

        <View style={st.tabs}>
          {TABS.map((t) => {
            const on = t.key === tab
            return (
              <Pressable key={t.key} style={st.tab} onPress={() => { setTab(t.key); refresh() }}>
                <Ionicons name={(on ? t.icon.replace("-outline", "") : t.icon) as any} size={20} color={on ? c.text : c.mute} />
                <Text style={[st.tabText, on && { color: c.text }]}>{t.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  header: { paddingTop: 18, paddingBottom: 26 },
  status: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: c.sub, fontSize: 13, fontFamily: f.medium, letterSpacing: 0.3 },
  stat: { color: c.text, fontSize: 56, fontFamily: f.light, lineHeight: 64, marginTop: 14, letterSpacing: 0.5 },
  statLabel: { color: c.sub, fontSize: 15, fontFamily: f.regular },
  banner: { backgroundColor: c.card, borderRadius: 16, padding: 20, marginBottom: 12, gap: 14 },
  bannerText: { color: c.text, fontSize: 15, lineHeight: 21, fontFamily: f.regular },
  tabs: { flexDirection: "row", backgroundColor: c.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, paddingTop: 10, paddingBottom: 8 },
  tab: { flex: 1, alignItems: "center", gap: 4 },
  tabText: { color: c.mute, fontSize: 11, fontFamily: f.medium, letterSpacing: 0.2 },
})
