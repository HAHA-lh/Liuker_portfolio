[CmdletBinding()]
param(
  [string]$ProjectRoot,
  [string]$ShortcutRoot,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ExecutablePath {
  param([string]$Name)
  $command = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $command) { return $null }
  return $command.Source
}

function Get-NodeVersion {
  param([string]$Path)
  try {
    $text = (& $Path -p "process.versions.node" 2>$null | Select-Object -First 1)
    if ([string]::IsNullOrWhiteSpace($text)) { return $null }
    return [version]($text.Trim().Split("-")[0])
  } catch {
    return $null
  }
}

function Find-CompatibleNode {
  param([string]$ProjectPath)
  $candidates = New-Object System.Collections.Generic.List[string]
  $configured = [Environment]::GetEnvironmentVariable("MEDIA_STUDIO_NODE_PATH", "Process")
  if (-not [string]::IsNullOrWhiteSpace($configured)) { $candidates.Add($configured) }
  $portable = Join-Path $ProjectPath ".media-studio\runtime\node.exe"
  $candidates.Add($portable)
  $pathNode = Get-ExecutablePath -Name "node.exe"
  if ($null -ne $pathNode) { $candidates.Add($pathNode) }
  foreach ($candidate in @(
      (Join-Path $env:ProgramFiles "nodejs\node.exe"),
      (Join-Path $env:LOCALAPPDATA "Programs\nodejs\node.exe")
    )) {
    $candidates.Add($candidate)
  }
  $codexRuntimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes"
  if (Test-Path -LiteralPath $codexRuntimeRoot -PathType Container) {
    Get-ChildItem -LiteralPath $codexRuntimeRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      if ($null -ne $_) { $candidates.Add((Join-Path $_.FullName "dependencies\node\bin\node.exe")) }
    }
  }
  $minimum = [version]"22.13.0"
  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate) -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
    $resolved = (Resolve-Path -LiteralPath $candidate).Path
    $version = Get-NodeVersion -Path $resolved
    Write-Verbose "Node candidate: $resolved ($version)"
    if ($null -ne $version -and $version -ge $minimum) {
      return [pscustomobject]@{ Path = $resolved; Version = $version }
    }
  }
  throw "Node.js 22.13.0 or newer was not found. Install Node 22+ and run the installer again."
}

function New-MediaStudioIcon {
  param([string]$IconPath)
  Add-Type -AssemblyName System.Drawing
  $bitmap = New-Object System.Drawing.Bitmap 256, 256
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $background = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 8, 9, 16))
  $graphics.FillRectangle($background, 0, 0, 256, 256)
  $purple = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 182, 0, 168))
  $orange = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 106, 0))
  $graphics.FillEllipse($purple, 24, 22, 152, 152)
  $graphics.FillEllipse($orange, 111, 94, 126, 126)
  $panel = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(224, 12, 13, 22))
  $graphics.FillRectangle($panel, 42, 42, 172, 172)
  $font = New-Object System.Drawing.Font "Segoe UI", 100, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString("L", $font, $white, (New-Object System.Drawing.RectangleF 42, 38, 172, 172), $format)
  $hIcon = $bitmap.GetHicon()
  $icon = [System.Drawing.Icon]::FromHandle($hIcon)
  $stream = [IO.File]::Open($IconPath, [IO.FileMode]::Create)
  try { $icon.Save($stream) } finally {
    $stream.Dispose()
    $icon.Dispose()
    $format.Dispose()
    $white.Dispose()
    $font.Dispose()
    $panel.Dispose()
    $orange.Dispose()
    $purple.Dispose()
    $background.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

try {
  if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot = Join-Path $PSScriptRoot "..\..\.." }
  $projectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
  $startScript = Join-Path $projectRoot "tools\media-studio\windows\Start-MediaStudio.ps1"
  $stopScript = Join-Path $projectRoot "tools\media-studio\windows\Stop-MediaStudio.ps1"
  $uninstallScript = Join-Path $projectRoot "tools\media-studio\windows\Uninstall-MediaStudio.ps1"
  foreach ($required in @("package.json", "tools\media-studio\server.mjs")) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $required) -PathType Leaf)) {
      throw "This is not a valid LIUKER project: $projectRoot"
    }
  }

  $node = Find-CompatibleNode -ProjectPath $projectRoot
  $ffmpegPath = Get-ExecutablePath -Name "ffmpeg.exe"
  $ffprobePath = Get-ExecutablePath -Name "ffprobe.exe"
  if ($null -eq $ffmpegPath -or $null -eq $ffprobePath) {
    throw "FFmpeg and FFprobe are required. Install FFmpeg and run the installer again."
  }

  $stateDirectory = Join-Path $projectRoot ".media-studio"
  $runtimeDirectory = Join-Path $stateDirectory "runtime"
  $portableNodePath = Join-Path $runtimeDirectory "node.exe"
  $runtimeConfigPath = Join-Path $stateDirectory "windows-runtime.json"
  $iconPath = Join-Path $stateDirectory "LIUKER-Media-Studio.ico"
  if ([string]::IsNullOrWhiteSpace($ShortcutRoot)) {
    $desktopDirectory = [Environment]::GetFolderPath("Desktop")
    $startMenuDirectory = Join-Path ([Environment]::GetFolderPath("Programs")) "LIUKER Media Studio"
  } else {
    $shortcutRootPath = [IO.Path]::GetFullPath($ShortcutRoot)
    $desktopDirectory = Join-Path $shortcutRootPath "Desktop"
    $startMenuDirectory = Join-Path $shortcutRootPath "StartMenu\LIUKER Media Studio"
  }
  $powershellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  $desktopLauncher = Join-Path $desktopDirectory "LIUKER Media Studio.cmd"
  $startLauncher = Join-Path $startMenuDirectory "LIUKER Media Studio.cmd"
  $stopLauncher = Join-Path $startMenuDirectory "Stop LIUKER Media Studio.cmd"
  $uninstallLauncher = Join-Path $startMenuDirectory "Uninstall LIUKER Media Studio.cmd"

  if ($DryRun) {
    Write-Host "Dry run passed."
    Write-Host "Project: $projectRoot"
    Write-Host "Node source: $($node.Path) ($($node.Version))"
    Write-Host "Portable Node: $portableNodePath"
    Write-Host "FFmpeg: $ffmpegPath"
    Write-Host "FFprobe: $ffprobePath"
    Write-Host "Desktop launcher: $desktopLauncher"
    Write-Host "Start menu: $startMenuDirectory"
    exit 0
  }

  [IO.Directory]::CreateDirectory($runtimeDirectory) | Out-Null
  [IO.Directory]::CreateDirectory($desktopDirectory) | Out-Null
  [IO.Directory]::CreateDirectory($startMenuDirectory) | Out-Null
  if (-not ([IO.Path]::GetFullPath($node.Path)).Equals([IO.Path]::GetFullPath($portableNodePath), [StringComparison]::OrdinalIgnoreCase)) {
    Copy-Item -LiteralPath $node.Path -Destination $portableNodePath -Force
  }
  $runtimeConfig = [ordered]@{
    nodePath = $portableNodePath
    nodeVersion = [string]$node.Version
    ffmpegPath = $ffmpegPath
    ffprobePath = $ffprobePath
    projectRoot = $projectRoot
    installedAt = [DateTime]::UtcNow.ToString("o")
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($runtimeConfigPath, ($runtimeConfig | ConvertTo-Json), $utf8)
  New-MediaStudioIcon -IconPath $iconPath

  $common = '-NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File'
  $startArguments = "$common `"$startScript`" -ProjectRoot `"$projectRoot`""
  $stopArguments = "$common `"$stopScript`" -ProjectRoot `"$projectRoot`""
  $uninstallArguments = "$common `"$uninstallScript`" -ProjectRoot `"$projectRoot`""
  $desktopCommand = "@echo off`r`nstart `"`" `"$powershellPath`" $startArguments`r`n"
  $stopCommand = "@echo off`r`nstart `"`" `"$powershellPath`" $stopArguments`r`n"
  $uninstallCommand = "@echo off`r`nstart `"`" `"$powershellPath`" $uninstallArguments`r`n"
  [IO.File]::WriteAllText($desktopLauncher, $desktopCommand, [Text.Encoding]::Default)
  [IO.File]::WriteAllText($startLauncher, $desktopCommand, [Text.Encoding]::Default)
  [IO.File]::WriteAllText($stopLauncher, $stopCommand, [Text.Encoding]::Default)
  [IO.File]::WriteAllText($uninstallLauncher, $uninstallCommand, [Text.Encoding]::Default)
  Write-Host "LIUKER Media Studio was installed for this Windows account."
  Write-Host "Open it from the desktop or Start menu."
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
