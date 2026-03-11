param(
  [string]$NodePath,
  [string]$ExtensionId,
  [string]$OutFile
)

if (-not $NodePath) {
  try { $node = (Get-Command node -ErrorAction SilentlyContinue).Source } catch { $node = $null }
  if ($node) { $NodePath = $node }
}

if (-not $NodePath) {
  Write-Error "Node executable not found. Provide -NodePath 'C:\\Program Files\\nodejs\\node.exe'"
  exit 2
}

if (-not $ExtensionId) {
  $ExtensionId = Read-Host "Enter your extension ID (chrome-extension://<id>/) - just the ID part"
}

if (-not $ExtensionId) {
  Write-Error "Extension ID is required"
  exit 2
}

if (-not $OutFile) {
  $outDir = Join-Path $env:LOCALAPPDATA "DigYellowdig"
  if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
  $OutFile = Join-Path $outDir "com.dig.yellowdig.proxy.json"
}

$templatePath = Join-Path $PSScriptRoot "com.dig.yellowdig.proxy.json"
if (-not (Test-Path $templatePath)) {
  Write-Error "Template manifest not found at $templatePath"
  exit 2
}

$json = Get-Content -Raw -Path $templatePath | ConvertFrom-Json
$json.path = $NodePath
$json.allowed_origins = @("chrome-extension://$ExtensionId/")

Set-Content -Path $OutFile -Value ($json | ConvertTo-Json -Depth 5)

Write-Host "Wrote native messaging manifest to: $OutFile"

# Register for Chrome
$chromeKey = "HKCU:\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.dig.yellowdig.proxy"
if (-not (Test-Path $chromeKey)) { New-Item -Path $chromeKey -Force | Out-Null }
Set-ItemProperty -Path $chromeKey -Name '(Default)' -Value $OutFile

# Register for Edge
$edgeKey = "HKCU:\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.dig.yellowdig.proxy"
if (-not (Test-Path $edgeKey)) { New-Item -Path $edgeKey -Force | Out-Null }
Set-ItemProperty -Path $edgeKey -Name '(Default)' -Value $OutFile

Write-Host "Registered native messaging host for Chrome and Edge (HKCU)."
