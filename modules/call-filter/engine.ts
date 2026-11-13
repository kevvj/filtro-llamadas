// Lógica del filtro en JavaScript: espejo de FilterEngine.kt (Android).
// La usa la vista previa web (demo.ts) y las pruebas (tests/engine.test.ts).
// Si cambia una, cambiar la otra.

export type Decision = { blocked: boolean; reason: string }

export const digits = (n: string) => {
  const d = n.replace(/\D/g, "")
  return n.trim().startsWith("00") ? d.replace(/^00/, "") : d
}

// Mismo número aunque uno venga con indicativo (+57 300...) y el otro sin él (300...).
export const sameNumber = (a: string, b: string) => {
  const x = digits(a)
  const y = digits(b)
  if (!x || !y) return false
  if (x === y) return true
  const [s, l] = x.length <= y.length ? [x, y] : [y, x]
  return s.length >= 7 && l.endsWith(s)
}

const inList = (arr: unknown[] | undefined, n: string) =>
  (arr ?? []).some((e) => sameNumber(typeof e === "string" ? e : String((e as { number?: string })?.number ?? ""), n))

export function inQuietHours(quiet: { enabled?: boolean; from?: number; to?: number } | undefined, nowMinutes: number) {
  if (!quiet?.enabled) return false
  const from = quiet.from ?? 22 * 60
  const to = quiet.to ?? 7 * 60
  return from <= to ? nowMinutes >= from && nowMinutes < to : nowMinutes >= from || nowMinutes < to
}

// cfg: la configuración guardada (JSON). isContact: si el número está en los contactos.
// countRecent(n, min): veces que n fue bloqueado en los últimos min minutos (insistencia).
const RANK: Record<string, number> = { all: 0, contacts: 1, none: 2 }
function strictest(sims: Record<string, any> | undefined) {
  const list = Object.values(sims ?? {})
  if (!list.length) return undefined
  return list.reduce((a, b) => ((RANK[b.mode ?? "all"] ?? 0) > (RANK[a.mode ?? "all"] ?? 0) ? b : a))
}

export function decide(
  cfg: any,
  raw: string | null | undefined,
  simId: string,
  isContact: (n: string) => boolean,
  nowMinutes: number,
  countRecent: (n: string, minutes: number) => number = () => 0
): Decision {
  if (!cfg) return { blocked: false, reason: "sin configurar" }
  if (cfg.enabled === false) return { blocked: false, reason: "filtro apagado" }
  // SIM desconocida: la regla más estricta de las SIMs (igual que FilterEngine.kt)
  const rule = cfg.sims?.[simId] ?? strictest(cfg.sims) ?? cfg.defaultRule ?? {}
  const mode = rule.mode ?? "all"
  const n = (raw ?? "").trim()

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
  const needContact = mode === "contacts" || inQuietHours(cfg.quiet, nowMinutes)
  if (needContact && !isContact(n)) {
    const rep = cfg.repeat
    if (rep?.enabled && countRecent(n, rep.minutes ?? 3) >= (rep.calls ?? 2) - 1) return { blocked: false, reason: "repeat" }
    return { blocked: true, reason: mode === "contacts" ? "unknown" : "quiet" }
  }
  return { blocked: false, reason: "ok" }
}
