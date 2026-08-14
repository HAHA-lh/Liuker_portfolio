[CmdletBinding()]
param(
  [string]$ProjectRoot,
  [string]$ShortcutRoot,
  [switch]$Force,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try {
  if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot = Join-Path $PSScriptRoot "..\..\.." }
  $projectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
  $stopScript = Join-Path $projectRoot "tools\media-studio\windows\Stop-MediaStudio.ps1"
  if ([string]::IsNullOrWhiteSpace($ShortcutRoot)) {
    $desktopDirectory = [Environment]::GetFolderPath("Desktop")
    $startMenuDirectory = Join-Path ([Environment]::GetFolderPath("Programs")) "LIUKER Media Studio"
  } else {
    $shortcutRootPath = [IO.Path]::GetFullPath($ShortcutRoot)
    $desktopDirectory = Join-Path $shortcutRootPath "Desktop"
    $startMenuDirectory = Join-Path $shortcutRootPath "StartMenu\LIUKER Media Studio"
  }
  $desktopLauncher = Join-Path $desktopDirectory "LIUKER Media Studio.cmd"
  $runtimeDirectory = Join-Path $projectRoot ".media-studio\runtime"
  $runtimeConfigPath = Join-Path $projectRoot ".media-studio\windows-runtime.json"
  $iconPath = Join-Path $projectRoot ".media-studio\LIUKER-Media-Studio.ico"

  if (-not $Force -and -not $DryRun) {
    $shell = New-Object -ComObject WScript.Shell
    $answer = $shell.Popup(
      "Remove LIUKER Media Studio shortcuts and its private Node runtime?`n`nYour website, videos, CSV and job data will not be deleted.",
      0,
      "Uninstall LIUKER Media Studio",
      36
    )
    if ($answer -ne 6) { exit 0 }
  }

  if ($DryRun) {
    Write-Host "Dry run: would stop the launcher-managed server and remove:"
    Write-Host $desktopLauncher
    Write-Host $startMenuDirectory
    Write-Host $runtimeDirectory
    Write-Host $runtimeConfigPath
    Write-Host $iconPath
    exit 0
  }

  if (Test-Path -LiteralPath $stopScript -PathType Leaf) {
    & $stopScript -ProjectRoot $projectRoot
  }
  Remove-Item -LiteralPath $desktopLauncher -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $startMenuDirectory -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $runtimeDirectory -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $runtimeConfigPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $iconPath -Force -ErrorAction SilentlyContinue
  Write-Host "LIUKER Media Studio shortcuts and local runtime were removed."
  Write-Host "The website, source files, videos, CSV and job data were kept."
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
