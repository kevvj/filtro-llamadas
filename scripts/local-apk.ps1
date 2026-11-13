# Compila la APK en esta PC e (opcional) la instala por cable. Uso:
#   powershell -File scripts/local-apk.ps1            # compila
#   powershell -File scripts/local-apk.ps1 -Install   # compila e instala con adb
# Windows no deja rutas de más de 260 caracteres y la compilación nativa las supera: por eso se compila en
# una copia en C:\fl (solo se copian los cambios). Necesita Java 17 y el SDK de Android.
param([switch]$Install, [string]$Dest = "C:\fl")
$ErrorActionPreference = "Stop"
$src = (Resolve-Path "$PSScriptRoot\..").Path
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = (Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory | Where-Object Name -like "jdk-17*" | Select-Object -First 1).FullName }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

# copia solo lo que cambió; no toca node_modules ni android de la copia
# (solo la carpeta android de la raíz: las de modules/*/android son el código nativo del filtro y sí se copian)
robocopy $src $Dest /MIR /XD node_modules "$src\android" "$Dest\android" .git graphify-out dist .expo .claude /XF build.log /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy fallo ($LASTEXITCODE)" }
Set-Location $Dest

# npm ci solo si cambió package-lock.json
$lock = (Get-FileHash package-lock.json).Hash
# (la marca va dentro de node_modules: robocopy /MIR borraría un archivo suelto en la raíz)
if ((Get-Content node_modules\.lockhash -ErrorAction SilentlyContinue) -ne $lock) {
  # Gradle tiene archivos de node_modules abiertos: se detiene antes de reinstalar
  if (Test-Path android\gradlew.bat) { & android\gradlew.bat -p android --stop | Out-Null }
  npm ci; if ($LASTEXITCODE) { throw "npm ci fallo" }
  Set-Content node_modules\.lockhash $lock
}

# prebuild solo si cambió la config nativa (dependencias, app.json...); el código de modules/ se toma directo
$native = node scripts/native-hash.js
if (-not (Test-Path android\gradlew.bat) -or (Get-Content android\.nativehash -ErrorAction SilentlyContinue) -ne $native) {
  if (Test-Path android\gradlew.bat) { & android\gradlew.bat -p android --stop | Out-Null }
  npx expo prebuild -p android --no-install | Out-Null
  if ($LASTEXITCODE) { throw "prebuild fallo" }
  Set-Content android\.nativehash $native
}
# la carpeta temporal de C++ va en una ruta corta (dentro de android\app\.cxx se pasa de 260 caracteres)
$gradle = "android\app\build.gradle"
if (-not (Select-String -Path $gradle -Pattern "buildStagingDirectory" -Quiet)) {
  Add-Content $gradle "`nandroid.externalNativeBuild.cmake.buildStagingDirectory = file('C:/flc')"
}
# local: más memoria para Gradle (R8 la necesita); sin lint, que es lento
$props = "android\gradle.properties"
$extra = @(
  "org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=1g"
)
$lines = Get-Content $props | Where-Object { $_ -notmatch "^org\.gradle\.jvmargs=" }
Set-Content $props ($lines + $extra)
Push-Location android
.\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a" -x lintVitalRelease -x lintVitalAnalyzeRelease
$code = $LASTEXITCODE
Pop-Location
if ($code) { throw "gradle fallo" }

$apk = "$Dest\android\app\build\outputs\apk\release\app-release.apk"
Write-Host "APK: $apk"
if ($Install) {
  adb install -r $apk
  if ($LASTEXITCODE) { throw "adb install fallo (¿celular conectado?)" }
}
