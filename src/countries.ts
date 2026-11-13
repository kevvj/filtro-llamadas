export type Country = { iso: string; name: string; code: string }

// Indicativo internacional (sin +). Latinoamérica primero, luego el resto más común.
export const COUNTRIES: Country[] = [
  { iso: "CO", name: "Colombia", code: "57" },
  { iso: "MX", name: "México", code: "52" },
  { iso: "VE", name: "Venezuela", code: "58" },
  { iso: "EC", name: "Ecuador", code: "593" },
  { iso: "PE", name: "Perú", code: "51" },
  { iso: "AR", name: "Argentina", code: "54" },
  { iso: "CL", name: "Chile", code: "56" },
  { iso: "BO", name: "Bolivia", code: "591" },
  { iso: "PY", name: "Paraguay", code: "595" },
  { iso: "UY", name: "Uruguay", code: "598" },
  { iso: "BR", name: "Brasil", code: "55" },
  { iso: "PA", name: "Panamá", code: "507" },
  { iso: "CR", name: "Costa Rica", code: "506" },
  { iso: "NI", name: "Nicaragua", code: "505" },
  { iso: "HN", name: "Honduras", code: "504" },
  { iso: "SV", name: "El Salvador", code: "503" },
  { iso: "GT", name: "Guatemala", code: "502" },
  { iso: "CU", name: "Cuba", code: "53" },
  { iso: "DO", name: "República Dominicana", code: "1" },
  { iso: "PR", name: "Puerto Rico", code: "1" },
  { iso: "US", name: "Estados Unidos", code: "1" },
  { iso: "CA", name: "Canadá", code: "1" },
  { iso: "ES", name: "España", code: "34" },
  { iso: "PT", name: "Portugal", code: "351" },
  { iso: "FR", name: "Francia", code: "33" },
  { iso: "IT", name: "Italia", code: "39" },
  { iso: "DE", name: "Alemania", code: "49" },
  { iso: "GB", name: "Reino Unido", code: "44" },
  { iso: "NL", name: "Países Bajos", code: "31" },
  { iso: "BE", name: "Bélgica", code: "32" },
  { iso: "CH", name: "Suiza", code: "41" },
  { iso: "SE", name: "Suecia", code: "46" },
  { iso: "NO", name: "Noruega", code: "47" },
  { iso: "IE", name: "Irlanda", code: "353" },
  { iso: "PL", name: "Polonia", code: "48" },
  { iso: "RU", name: "Rusia", code: "7" },
  { iso: "TR", name: "Turquía", code: "90" },
  { iso: "IL", name: "Israel", code: "972" },
  { iso: "AE", name: "Emiratos Árabes", code: "971" },
  { iso: "SA", name: "Arabia Saudita", code: "966" },
  { iso: "IN", name: "India", code: "91" },
  { iso: "PK", name: "Pakistán", code: "92" },
  { iso: "CN", name: "China", code: "86" },
  { iso: "JP", name: "Japón", code: "81" },
  { iso: "KR", name: "Corea del Sur", code: "82" },
  { iso: "PH", name: "Filipinas", code: "63" },
  { iso: "ID", name: "Indonesia", code: "62" },
  { iso: "VN", name: "Vietnam", code: "84" },
  { iso: "TH", name: "Tailandia", code: "66" },
  { iso: "AU", name: "Australia", code: "61" },
  { iso: "NG", name: "Nigeria", code: "234" },
  { iso: "ZA", name: "Sudáfrica", code: "27" },
  { iso: "EG", name: "Egipto", code: "20" },
  { iso: "MA", name: "Marruecos", code: "212" },
]

export const byIso = (iso: string) => COUNTRIES.find((x) => x.iso === iso.toUpperCase())

// País a partir de un número con indicativo (+57 300...). El indicativo más largo gana.
export function countryFromNumber(num: string): Country | undefined {
  const t = num.trim()
  if (!t.startsWith("+") && !t.startsWith("00")) return undefined
  const d = t.replace(/\D/g, "").replace(/^00/, "")
  return [...COUNTRIES].sort((a, b) => b.code.length - a.code.length).find((x) => d.startsWith(x.code))
}

// Bandera emoji a partir del código ISO.
export const flag = (iso: string) =>
  iso.length === 2 ? String.fromCodePoint(...[...iso.toUpperCase()].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : "🌐"
