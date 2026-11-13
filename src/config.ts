import CallFilter, { Sim } from "../modules/call-filter"
import { byIso, countryFromNumber, Country } from "./countries"

export type Mode = "all" | "contacts" | "none"

export type Rule = {
  mode: Mode
  countryOnly: boolean
  countries: string[] // indicativos permitidos, ej. ["57"]
  homeCode: string // indicativo del país de la SIM (llamadas sin "+" se toman como de aquí)
  homeIso: string
}

export type Entry = { number: string; note?: string; added: number }

export type Config = {
  enabled: boolean
  blockPrivate: boolean
  quiet: { enabled: boolean; from: number; to: number } // minutos desde 00:00
  spam: Entry[]
  allow: Entry[]
  prefixes: string[]
  sims: Record<string, Rule>
  defaultRule: Rule
}

export type LogItem = { number: string; sim: string; reason: string; time: number }

export const REASONS: Record<string, string> = {
  spam: "Marcado como spam",
  unknown: "Número desconocido",
  line_off: "Línea sin llamadas",
  country: "País no permitido",
  prefix: "Prefijo bloqueado",
  private: "Número oculto",
  quiet: "No molestar",
  ok: "Se permitiría",
  allowlist: "En lista de permitidos",
  "filtro apagado": "El filtro está apagado",
}

// País de una SIM: por su número (+57...), por la SIM o por el teléfono.
export function detectCountry(sim: Sim | null, deviceIso: string): Country {
  return (
    (sim?.number ? countryFromNumber(sim.number) : undefined) ??
    (sim?.countryIso ? byIso(sim.countryIso) : undefined) ??
    byIso(deviceIso) ??
    byIso("CO")!
  )
}

export function newRule(country: Country): Rule {
  return { mode: "all", countryOnly: false, countries: [country.code], homeCode: country.code, homeIso: country.iso }
}

export function defaultConfig(deviceIso: string): Config {
  return {
    enabled: true,
    blockPrivate: false,
    quiet: { enabled: false, from: 22 * 60, to: 7 * 60 },
    spam: [],
    allow: [],
    prefixes: [],
    sims: {},
    defaultRule: newRule(detectCountry(null, deviceIso)),
  }
}

let memory = "" // respaldo si no hay módulo nativo (Expo Go / web)

export function loadConfig(deviceIso: string): Config {
  const raw = CallFilter?.getConfig() ?? memory
  if (!raw) return defaultConfig(deviceIso)
  try {
    return { ...defaultConfig(deviceIso), ...JSON.parse(raw) }
  } catch {
    return defaultConfig(deviceIso)
  }
}

export function saveConfig(cfg: Config) {
  const json = JSON.stringify(cfg)
  if (CallFilter) CallFilter.setConfig(json)
  else memory = json
}

export function loadLog(): LogItem[] {
  try {
    return JSON.parse(CallFilter?.getLog() ?? "[]")
  } catch {
    return []
  }
}

export const digits = (n: string) => n.replace(/\D/g, "")

export function sameNumber(a: string, b: string) {
  const x = digits(a).replace(/^00/, "")
  const y = digits(b).replace(/^00/, "")
  if (!x || !y) return false
  if (x === y) return true
  const [s, l] = x.length <= y.length ? [x, y] : [y, x]
  return s.length >= 7 && l.endsWith(s)
}

export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
