import { NativeModule, requireOptionalNativeModule } from "expo"
import { Platform } from "react-native"
import { demoModule } from "./demo"

export type Sim = {
  id: string
  slot: number
  name: string
  carrier: string
  countryIso: string
  number: string
}

// type: 1 entrante, 2 saliente, 3 perdida, 5 rechazada, 6 bloqueada
export type RecentCall = { number: string; name: string; date: number; type: number }

export type SimToolkit = { pkg: string; sim: number; enabled: boolean }

declare class CallFilterModule extends NativeModule {
  hasScreeningRole(): boolean
  requestScreeningRole(): boolean
  openAppSettings(): void
  addTile(kind: "filter" | "quiet"): boolean
  getDeviceCountry(): string
  getSims(): Sim[]
  getConfig(): string
  setConfig(json: string): void
  getLog(): string
  clearLog(): void
  test(number: string, simId: string): { blocked: boolean; reason: string }
  simToolkits(): SimToolkit[]
  recentCalls(limit: number): RecentCall[]
  openPackageSettings(pkg: string): void
}

// En web se usa un demo (vista previa); en Expo Go o iOS queda null: ahí no hay filtro nativo
const CallFilter: CallFilterModule | null =
  Platform.OS === "web" ? (demoModule as unknown as CallFilterModule) : requireOptionalNativeModule<CallFilterModule>("CallFilter")

export default CallFilter
