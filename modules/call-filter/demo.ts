// Solo para la vista previa en el navegador (expo start --web): imita al módulo nativo
// con 2 SIMs de ejemplo, guarda en localStorage y usa engine.ts (misma lógica que FilterEngine.kt).
import type { Sim } from "./index"
import { decide, sameNumber } from "./engine"

const SIMS: Sim[] = [
  { id: "1", slot: 0, name: "Personal", carrier: "Claro", countryIso: "CO", number: "+57 300 555 0101" },
  { id: "2", slot: 1, name: "Trabajo", carrier: "Movistar", countryIso: "CO", number: "+57 315 555 0202" },
]
const CONTACTS = ["+573001112233", "+573104445566"]

const store = {
  get: (k: string, d: string) => {
    try { return localStorage.getItem("filtro_" + k) ?? d } catch { return d }
  },
  set: (k: string, v: string) => {
    try { localStorage.setItem("filtro_" + k, v) } catch {}
  },
}

const now = Date.now()
const SAMPLE_LOG = JSON.stringify([
  { number: "+573209998877", sim: "2", reason: "unknown", time: now - 12 * 60e3 },
  { number: "+525512345678", sim: "1", reason: "country", time: now - 2 * 3600e3 },
  { number: "", sim: "1", reason: "private", time: now - 5 * 3600e3 },
  { number: "+576015550000", sim: "1", reason: "prefix", time: now - 26 * 3600e3 },
])

function test(raw: string, simId: string) {
  let cfg = null
  try { cfg = JSON.parse(store.get("config", "") || "null") } catch {}
  const d = new Date()
  const log: { number: string; time: number; allowed?: boolean }[] = JSON.parse(store.get("log", SAMPLE_LOG))
  const recent = (n: string, min: number) => log.filter((l) => !l.allowed && l.time >= Date.now() - min * 60e3 && sameNumber(l.number, n)).length
  return decide(cfg, raw, simId, (n) => CONTACTS.some((k) => sameNumber(k, n)), d.getHours() * 60 + d.getMinutes(), recent)
}

export const demoModule = {
  hasScreeningRole: () => true,
  simToolkits: () => [{ pkg: "com.android.stk", sim: 1, enabled: true }, { pkg: "com.android.stk2", sim: 2, enabled: false }],
  openPackageSettings: () => {},
  requestScreeningRole: () => true,
  openAppSettings: () => {},
  addTile: () => false,
  getDeviceCountry: () => "CO",
  getSims: () => SIMS,
  getConfig: () => store.get("config", ""),
  setConfig: (j: string) => store.set("config", j),
  getLog: () => store.get("log", SAMPLE_LOG),
  clearLog: () => store.set("log", "[]"),
  test,
}
