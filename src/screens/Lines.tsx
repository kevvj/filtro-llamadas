import { useState } from "react"
import { Text, View } from "react-native"
import { Sim } from "../../modules/call-filter"
import { Config, Mode, Rule } from "../config"
import { COUNTRIES, byIso, flag } from "../countries"
import { c, f } from "../theme"
import { Button, Card, Chip, Divider, Eyebrow, Segmented, Sub, ToggleRow } from "../ui"
import CountryPicker from "./CountryPicker"

type Props = { cfg: Config; sims: Sim[]; update: (fn: (x: Config) => Config) => void }

const MODES: { value: Mode; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "contacts", label: "Contactos" },
  { value: "none", label: "Ninguna" },
]

const MODE_HINT: Record<Mode, string> = {
  all: "Entran todas, salvo spam y lo que bloquees.",
  contacts: "Solo tus contactos y los permitidos. Los desconocidos no entran.",
  none: "No entra ninguna llamada por esta línea, salvo los permitidos.",
}

const countryLabel = (code: string, homeIso: string) => {
  const home = byIso(homeIso)
  const x = home?.code === code ? home : COUNTRIES.find((k) => k.code === code)
  return x ? [flag(x.iso), x.name].filter(Boolean).join("  ") : `+${code}`
}

export default function LinesScreen({ cfg, sims, update }: Props) {
  const [picker, setPicker] = useState<string | null>(null)

  const lines: { id: string; sim: Sim | null; rule: Rule }[] = sims.length
    ? sims.map((s) => ({ id: s.id, sim: s, rule: cfg.sims[s.id] ?? cfg.defaultRule }))
    : [{ id: "default", sim: null, rule: cfg.defaultRule }]

  const setRule = (id: string, patch: Partial<Rule>) =>
    update((x) =>
      id === "default"
        ? { ...x, defaultRule: { ...x.defaultRule, ...patch } }
        : { ...x, sims: { ...x.sims, [id]: { ...(x.sims[id] ?? x.defaultRule), ...patch } } }
    )

  const pickerRule = lines.find((l) => l.id === picker)?.rule

  return (
    <View>
      {!sims.length && (
        <Sub style={{ marginBottom: 12 }}>No se detectaron SIMs. La regla general aplica a todas las líneas.</Sub>
      )}
      {lines.map(({ id, sim, rule }) => {
        const home = byIso(rule.homeIso)
        return (
          <Card key={id}>
            <Eyebrow>{sim ? [`SIM ${sim.slot + 1}`, sim.carrier].filter(Boolean).join(" · ").toUpperCase() : "TODAS LAS LÍNEAS"}</Eyebrow>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 8, marginBottom: 18 }}>
              <Text style={{ color: c.text, fontSize: 22, fontFamily: f.regular, letterSpacing: 0.3 }}>{sim ? sim.name : "Regla general"}</Text>
              <Sub>{sim?.number || ""}</Sub>
            </View>

            <Segmented value={rule.mode} options={MODES} onChange={(m) => setRule(id, { mode: m })} />
            <Sub style={{ marginTop: 10 }}>{MODE_HINT[rule.mode]}</Sub>

            <Divider />

            <ToggleRow
              label="Solo de ciertos países"
              hint={home ? `Detectado: ${home.name} (+${home.code})` : undefined}
              value={rule.countryOnly}
              onChange={(v) => setRule(id, { countryOnly: v, countries: rule.countries.length ? rule.countries : [rule.homeCode] })}
            />
            {rule.countryOnly && (
              <View style={{ marginTop: 12, gap: 12 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {rule.countries.map((code) => (
                    <Chip
                      key={code}
                      label={countryLabel(code, rule.homeIso)}
                      onRemove={rule.countries.length > 1 ? () => setRule(id, { countries: rule.countries.filter((k) => k !== code) }) : undefined}
                    />
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button small kind="glass" label="Cambiar países" onPress={() => setPicker(id)} />
                  {(rule.countries.length !== 1 || rule.countries[0] !== rule.homeCode) && (
                    <Button small kind="glass" label="Solo el detectado" onPress={() => setRule(id, { countries: [rule.homeCode] })} />
                  )}
                </View>
              </View>
            )}
          </Card>
        )
      })}

      <CountryPicker
        visible={!!picker}
        selected={pickerRule?.countries ?? []}
        onClose={() => setPicker(null)}
        onSave={(codes) => {
          if (picker) setRule(picker, { countries: codes })
          setPicker(null)
        }}
      />
    </View>
  )
}
