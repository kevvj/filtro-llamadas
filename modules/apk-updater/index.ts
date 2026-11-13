import { NativeModule, requireOptionalNativeModule } from "expo"

export type InstallStatus = { status: "pending" | "success" | "failure", message: string | null }

type Events = {
  onInstallStatus(event: InstallStatus): void
}

declare class ApkUpdaterModule extends NativeModule<Events> {
  versionCode(): number
  versionName(): string
  canInstall(): boolean
  openInstallSettings(): void
  install(fileUri: string): Promise<void>
}

// null en Expo Go, iOS o web: ahí no hay actualizador
export default requireOptionalNativeModule<ApkUpdaterModule>("ApkUpdater")
