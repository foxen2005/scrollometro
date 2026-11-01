# Publica una versión nueva de Scrollómetro en GitHub Releases.
#   .\scripts\release.ps1 -Version 0.3.1 -Notes "Arreglos varios"
#   .\scripts\release.ps1 -Version 0.4.0 -NotesFile notas.md
# Qué hace: sube versión + versionCode en app.json, compila el APK arm64 firmado con la llave propia,
# verifica la firma, commitea, crea el tag vX.Y.Z, pushea y publica el release con Scrollometro.apk.
# La app busca ese asset (nombre fijo) para auto-actualizarse.
# Ojo: este archivo va guardado en UTF-8 CON BOM para que Windows PowerShell 5.1 lea bien los acentos.
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [string]$Notes = '',
  [string]$NotesFile = ''
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$utf8 = New-Object System.Text.UTF8Encoding($false)

# Huella SHA-256 del certificado de scrollometro-release.jks (D:\SandBox\scrollometro-keys)
$EXPECTED_CERT = '52f709c8cb9099e007893e04afd45e495a42ea330385f59c1cf90e9707953847'

# Los comandos nativos (git, npx, gh) no cortan el script por sí solos: se revisa su código de salida
function Invoke-Checked([string]$what, [scriptblock]$cmd) {
  & $cmd
  if ($LASTEXITCODE -ne 0) { throw "Falló: $what (código $LASTEXITCODE)" }
}

if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Versión inválida: $Version (usa X.Y.Z)" }
if (-not $env:ANDROID_HOME) { throw 'Falta la variable ANDROID_HOME' }
if (git status --porcelain) { throw 'Hay cambios sin commitear. Commitea o descarta antes de publicar.' }
if (git tag --list "v$Version") { throw "El tag v$Version ya existe." }
if ($NotesFile) { $Notes = Get-Content -Raw -Encoding UTF8 $NotesFile }
if (-not $Notes) { throw 'Faltan notas de versión (-Notes o -NotesFile).' }

$published = $false
try {
  # 1) Versión y versionCode en app.json (reemplazo de texto en UTF-8 para no romper "Scrollómetro")
  $appJson = [IO.File]::ReadAllText("$root\app.json", $utf8)
  $code = [int]([regex]::Match($appJson, '"versionCode":\s*(\d+)').Groups[1].Value) + 1
  $appJson = [regex]::Replace($appJson, '"version":\s*"[^"]+"', "`"version`": `"$Version`"")
  $appJson = [regex]::Replace($appJson, '"versionCode":\s*\d+', "`"versionCode`": $code")
  [IO.File]::WriteAllText("$root\app.json", $appJson, $utf8)
  Write-Host "-> versión $Version (versionCode $code)"

  # 2) Compilar
  $env:CI = '1'
  Invoke-Checked 'expo prebuild' { npx expo prebuild -p android --clean --no-install | Out-Null }
  Push-Location android
  try { Invoke-Checked 'gradle assembleRelease' { .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain -q } }
  finally { Pop-Location }
  $apk = "android\app\build\outputs\apk\release\app-release.apk"

  # 3) Verificar que va firmado con la llave propia (si no, las actualizaciones fallarían)
  $bt = Get-ChildItem "$env:ANDROID_HOME\build-tools" -Directory | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
  $certs = & "$($bt.FullName)\apksigner.bat" verify --print-certs $apk 2>&1 | Out-String
  if ($certs -notmatch "SHA-256 digest: $EXPECTED_CERT") { throw "El APK NO está firmado con la llave de release. ¿Falta ~/.gradle/gradle.properties?`n$certs" }
  Write-Host '-> firma verificada'

  New-Item -ItemType Directory -Force dist | Out-Null
  Copy-Item $apk dist\Scrollometro.apk -Force

  # 4) Commit, tag, push y release (si el push falla, no se crea el release)
  Invoke-Checked 'git add' { git add app.json }
  Invoke-Checked 'git commit' { git commit -m "Release v$Version" -m "Co-Authored-By: Felix <felix@pudutecnologia.cl>" | Out-Null }
  Invoke-Checked 'git tag' { git tag "v$Version" }
  $published = $true # desde aquí el commit existe: no se revierte app.json
  Invoke-Checked 'git push' { git push origin HEAD --tags }
  Invoke-Checked 'gh release create' { gh release create "v$Version" dist\Scrollometro.apk --title "Scrollómetro $Version" --notes $Notes }
  Write-Host "OK Publicado: https://github.com/foxen2005/scrollometro/releases/tag/v$Version"
}
catch {
  # Si falló antes del commit, se deja app.json como estaba para poder reintentar
  if (-not $published) { git checkout -- app.json 2>$null }
  throw
}
