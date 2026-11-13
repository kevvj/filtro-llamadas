// Solo para la vista previa en el navegador (expo start --web): imita al módulo nativo
// con 2 SIMs de ejemplo, guarda en localStorage y replica la lógica de FilterEngine.kt.
import type { Sim } from "./index"

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

const digits = (n: string) => {
  const d = n.replace(/\D/g, "")
  return n.trim().startsWith("00") ? d.replace(/^00/, "") : d
}
const same = (a: string, b: string) => {
  const x = digits(a), y = digits(b)
  if (!x || !y) return false
  if (x === y) return true
  const [s, l] = x.length <= y.length ? [x, y] : [y, x]
  return s.length >= 7 && l.endsWith(s)
}
const inList = (arr: any[] | undefined, n: string) => (arr ?? []).some((e) => same(typeof e === "string" ? e : e.number, n))

function decide(raw: string, simId: string) {
  const cfg = JSON.parse(store.get("config", "{}") || "{}")
  if (cfg.enabled === false) return { blocked: false, reason: "filtro apagado" }
  const rule = cfg.sims?.[simId] ?? cfg.defaultRule ?? {}
  const mode = rule.mode ?? "all"
  const n = raw.trim()
  if (!digits(n)) {
    if (cfg.blockPrivate) return { blocked: true, reason: "private" }
    if (mode === "none") return { blocked: true, reason: "line_off" }
    if (mode === "contacts") return { blocked: true, reason: "unknown" }
    return { blocked: false, reason: "ok" }
  }
  if (inList(cfg.spam, n)) return { blocked: true, reason: "spam" }
  if (inList(cfg.allow, n)) return { blocked: false, reason: "allowlist" }
  if (mode === "none") return { blocked: true, reason: "line_off" }
  if ((cfg.prefixes ?? []).some((p: string) => digits(p) && digits(n).startsWith(digits(p)))) return { blocked: true, reason: "prefix" }
  if (rule.countryOnly) {
    const intl = n.startsWith("+") || n.startsWith("00")
    const codes: string[] = rule.countries ?? []
    const ok = intl ? codes.some((k) => k && digits(n).startsWith(k)) : codes.includes(rule.homeCode)
    if (!ok) return { blocked: true, reason: "country" }
  }
  const q = cfg.quiet
  let quiet = false
  if (q?.enabled) {
    const d = new Date(), m = d.getHours() * 60 + d.getMinutes()
    quiet = q.from <= q.to ? m >= q.from && m < q.to : m >= q.from || m < q.to
  }
  if ((mode === "contacts" || quiet) && !CONTACTS.some((k) => same(k, n))) return { blocked: true, reason: mode === "contacts" ? "unknown" : "quiet" }
  return { blocked: false, reason: "ok" }
}

export const demoModule = {
  hasScreeningRole: () => true,
  requestScreeningRole: () => true,
  openAppSettings: () => {},
  getDeviceCountry: () => "CO",
  getSims: () => SIMS,
  getConfig: () => store.get("config", ""),
  setConfig: (j: string) => store.set("config", j),
  getLog: () => store.get("log", SAMPLE_LOG),
  clearLog: () => store.set("log", "[]"),
  test: decide,
}
