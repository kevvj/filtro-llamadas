import { test } from "node:test"
import assert from "node:assert/strict"
import { decide, digits, inQuietHours, sameNumber } from "../modules/call-filter/engine.ts"

const CONTACT = "+573001112233"
const isContact = (n: string) => sameNumber(n, CONTACT)
const NOON = 12 * 60

const rule = (over = {}) => ({ mode: "all", countryOnly: false, countries: ["57"], homeCode: "57", homeIso: "CO", ...over })
const config = (over = {}) => ({
  enabled: true,
  blockPrivate: false,
  quiet: { enabled: false, from: 22 * 60, to: 7 * 60 },
  spam: [],
  allow: [],
  prefixes: [],
  sims: { "1": rule(), "2": rule() },
  defaultRule: rule(),
  ...over,
})
const run = (cfg: unknown, n: string | null, sim = "1", now = NOON) => decide(cfg, n, sim, isContact, now)

test("digits y sameNumber", () => {
  assert.equal(digits("+57 (300) 123-4567"), "573001234567")
  assert.equal(digits("0057 300 1234567"), "573001234567")
  assert.ok(sameNumber("+57 300 123 4567", "3001234567"))
  assert.ok(sameNumber("00573001234567", "+573001234567"))
  assert.ok(!sameNumber("+573001234567", "+573001234568"))
  assert.ok(!sameNumber("4567", "+573001234567"), "un sufijo corto no cuenta como el mismo número")
  assert.ok(!sameNumber("", "+573001234567"))
})

test("sin configuración o apagado: entra todo", () => {
  assert.equal(run(null, "+573209998877").blocked, false)
  const off = config({ enabled: false, spam: [{ number: "+573209998877" }] })
  assert.deepEqual(run(off, "+573209998877"), { blocked: false, reason: "filtro apagado" })
})

test("reglas distintas por SIM", () => {
  const cfg = config({ sims: { "1": rule({ mode: "all" }), "2": rule({ mode: "contacts" }) } })
  assert.equal(run(cfg, "+573209998877", "1").blocked, false)
  assert.deepEqual(run(cfg, "+573209998877", "2"), { blocked: true, reason: "unknown" })
  assert.equal(run(cfg, CONTACT, "2").blocked, false)
})

test("línea en Ninguna bloquea hasta contactos, pero no a los permitidos", () => {
  const cfg = config({ sims: { "1": rule({ mode: "none" }) }, allow: [{ number: "+573150000000" }] })
  assert.deepEqual(run(cfg, CONTACT), { blocked: true, reason: "line_off" })
  assert.deepEqual(run(cfg, "+573150000000"), { blocked: false, reason: "allowlist" })
})

test("sin SIMs conocidas se usa la regla general", () => {
  const cfg = config({ sims: {}, defaultRule: rule({ mode: "none" }) })
  assert.equal(run(cfg, "+573209998877", "99").reason, "line_off")
})

test("spam: nunca entra, ni siendo contacto, ni por otra línea, ni escrito distinto", () => {
  const cfg = config({ spam: [{ number: CONTACT }] })
  assert.deepEqual(run(cfg, CONTACT, "1"), { blocked: true, reason: "spam" })
  assert.equal(run(cfg, CONTACT, "2").reason, "spam")
  assert.equal(run(cfg, "3001112233").reason, "spam")
  assert.equal(run(cfg, "0057 300 111 2233").reason, "spam")
})

test("spam gana sobre permitidos", () => {
  const cfg = config({ spam: [{ number: "+573209998877" }], allow: [{ number: "+573209998877" }] })
  assert.equal(run(cfg, "+573209998877").reason, "spam")
})

test("filtro por país", () => {
  const cfg = config({ sims: { "1": rule({ countryOnly: true }), "2": rule() } })
  assert.equal(run(cfg, "+573209998877").blocked, false, "mismo país")
  assert.deepEqual(run(cfg, "+525512345678"), { blocked: true, reason: "country" })
  assert.equal(run(cfg, "005255123456").reason, "country", "prefijo 00")
  assert.equal(run(cfg, "3209998877").blocked, false, "sin indicativo = nacional")
  assert.equal(run(cfg, "+525512345678", "2").blocked, false, "la otra línea no filtra país")
})

test("filtro por país con otros países elegidos", () => {
  const cfg = config({ sims: { "1": rule({ countryOnly: true, countries: ["52", "1"] }) } })
  assert.equal(run(cfg, "+525512345678").blocked, false)
  assert.equal(run(cfg, "+13055550100").blocked, false)
  assert.equal(run(cfg, "+573209998877").reason, "country")
  assert.equal(run(cfg, "3209998877").reason, "country", "nacional pero el país propio no está en la lista")
})

test("permitidos pasan el filtro de país y de contactos", () => {
  const cfg = config({ sims: { "1": rule({ mode: "contacts", countryOnly: true }) }, allow: [{ number: "+525512345678" }] })
  assert.deepEqual(run(cfg, "+525512345678"), { blocked: false, reason: "allowlist" })
})

test("prefijos bloqueados", () => {
  const cfg = config({ prefixes: ["+57601", ""] })
  assert.deepEqual(run(cfg, "+576015550000"), { blocked: true, reason: "prefix" })
  assert.equal(run(cfg, "+573209998877").blocked, false, "un prefijo vacío no bloquea todo")
})

test("números ocultos", () => {
  assert.equal(run(config(), "").blocked, false)
  assert.equal(run(config(), null).blocked, false)
  assert.deepEqual(run(config({ blockPrivate: true }), ""), { blocked: true, reason: "private" })
  assert.equal(run(config({ sims: { "1": rule({ mode: "contacts" }) } }), "").reason, "unknown")
})

test("No molestar", () => {
  const cfg = config({ quiet: { enabled: true, from: 22 * 60, to: 7 * 60 } })
  assert.deepEqual(run(cfg, "+573209998877", "1", 23 * 60), { blocked: true, reason: "quiet" })
  assert.equal(run(cfg, "+573209998877", "1", 3 * 60).reason, "quiet", "cruza la medianoche")
  assert.equal(run(cfg, "+573209998877", "1", NOON).blocked, false)
  assert.equal(run(cfg, CONTACT, "1", 23 * 60).blocked, false, "los contactos entran")
  assert.ok(inQuietHours({ enabled: true, from: 60, to: 120 }, 90))
  assert.ok(!inQuietHours({ enabled: true, from: 60, to: 120 }, 120))
  assert.ok(!inQuietHours({ enabled: false, from: 0, to: 1439 }, 90))
})

test("configuración incompleta no rompe", () => {
  assert.equal(run({}, "+573209998877").blocked, false)
  assert.equal(run({ enabled: true, spam: ["+573209998877"] }, "+573209998877").reason, "spam")
})

test("insistencia: un desconocido que vuelve a llamar pronto entra", () => {
  const cfg = config({ sims: { "1": rule({ mode: "contacts" }) }, repeat: { enabled: true, calls: 2, minutes: 3 } })
  const n = "+573209998877"
  assert.equal(decide(cfg, n, "1", isContact, NOON, () => 0).reason, "unknown", "primera llamada")
  assert.deepEqual(decide(cfg, n, "1", isContact, NOON, () => 1), { blocked: false, reason: "repeat" })
  const off = { ...cfg, repeat: { enabled: false, calls: 2, minutes: 3 } }
  assert.equal(decide(off, n, "1", isContact, NOON, () => 5).reason, "unknown", "desactivada")
  const three = { ...cfg, repeat: { enabled: true, calls: 3, minutes: 5 } }
  assert.equal(decide(three, n, "1", isContact, NOON, () => 1).blocked, true, "pide 3 llamadas")
  assert.equal(decide(three, n, "1", isContact, NOON, () => 2).blocked, false)
})

test("insistencia nunca salta spam, país, prefijo ni línea en Ninguna", () => {
  const rep = { enabled: true, calls: 2, minutes: 3 }
  const many = () => 9
  assert.equal(decide(config({ repeat: rep, spam: ["+573209998877"] }), "+573209998877", "1", isContact, NOON, many).reason, "spam")
  assert.equal(decide(config({ repeat: rep, sims: { "1": rule({ mode: "none" }) } }), "+573209998877", "1", isContact, NOON, many).reason, "line_off")
  assert.equal(decide(config({ repeat: rep, sims: { "1": rule({ countryOnly: true }) } }), "+525512345678", "1", isContact, NOON, many).reason, "country")
  assert.equal(decide(config({ repeat: rep, prefixes: ["+57601"] }), "+576015550000", "1", isContact, NOON, many).reason, "prefix")
})

test("SIM desconocida: usa la regla más estricta de las SIMs, no la de por defecto", () => {
  const cfg = config({ sims: { "8": rule(), "9": rule({ mode: "contacts" }) } })
  assert.deepEqual(run(cfg, "+573209998877", "default"), { blocked: true, reason: "unknown" })
  assert.equal(run(cfg, CONTACT, "default").blocked, false, "los contactos siguen entrando")
  assert.equal(run(config({ sims: {} }), "+573209998877", "default").blocked, false, "sin SIMs: regla por defecto")
})
