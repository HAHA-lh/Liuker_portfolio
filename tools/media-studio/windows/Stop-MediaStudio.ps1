[CmdletBinding()]
param(
  [string]$ProjectRoot,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try {
  if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = Join-Path $PSScriptRoot "..\..\.."
  }
  $projectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
  $pidPath = Join-Path $projectRoot ".media-studio\media-studio.pid.json"
  if (-not (Test-Path -LiteralPath $pidPath -PathType Leaf)) {
    Write-Host "No launcher-managed LIUKER Media Studio process was found."
    exit 0
  }

  $pidData = Get-Content -LiteralPath $pidPath -Raw | ConvertFrom-Json
  $recordedRoot = [IO.Path]::GetFullPath([string]$pidData.projectRoot).TrimEnd("\")
  $expectedRoot = [IO.Path]::GetFullPath($projectRoot).TrimEnd("\")
  if (-not $recordedRoot.Equals($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "The PID file belongs to a different project and will not be used."
  }

  $processId = [int]$pidData.pid
  $process = Get-Process | Where-Object { $_.Id -eq $processId } | Select-Object -First 1
  if ($null -eq $process) {
    if (-not $DryRun) { Remove-Item -LiteralPath $pidPath -Force }
    Write-Host "The recorded process is no longer running."
    exit 0
  }

  $managed = $false
  try {
    $details = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction Stop
    $commandLine = [string]$details.CommandLine
    $serverPath = [IO.Path]::GetFullPath([string]$pidData.serverPath)
    $managed = $process.ProcessName -eq "node" -and
      -not [string]::IsNullOrWhiteSpace($commandLine) -and
      $commandLine.IndexOf($serverPath, [StringComparison]::OrdinalIgnoreCase) -ge 0
  } catch {
    $nodePath = [IO.Path]::GetFullPath([string]$pidData.nodePath)
    $processPath = try { [IO.Path]::GetFullPath($process.Path) } catch { "" }
    $managed = $process.ProcessName -eq "node" -and
      $processPath.Equals($nodePath, [StringComparison]::OrdinalIgnoreCase)
  }
  if (-not $managed) {
    throw "PID $processId is not the launcher-managed Media Studio process. Nothing was stopped."
  }

  if ($DryRun) {
    Write-Host "Dry run: launcher-managed process $processId would be stopped."
    exit 0
  }

  Stop-Process -Id $processId -ErrorAction Stop
  Wait-Process -Id $processId -Timeout 5 -ErrorAction SilentlyContinue
  $remaining = Get-Process | Where-Object { $_.Id -eq $processId } | Select-Object -First 1
  if ($null -ne $remaining) {
    Stop-Process -Id $processId -Force -ErrorAction Stop
  }
  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
  Write-Host "LIUKER Media Studio stopped (PID $processId)."
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
