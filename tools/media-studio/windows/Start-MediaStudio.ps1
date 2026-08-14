[CmdletBinding()]
param(
  [string]$ProjectRoot,
  [ValidateRange(1, 65535)]
  [int]$Port = 4178,
  [switch]$NoBrowser,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Show-LauncherError {
  param([string]$Message)
  Write-Error $Message
  try {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
    [void][System.Windows.Forms.MessageBox]::Show(
      $Message,
      "LIUKER Media Studio",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    )
  } catch {
    # The terminal error remains available when Windows Forms is unavailable.
  }
}

function Resolve-Executable {
  param(
    [string]$EnvironmentName,
    [string]$DefaultName
  )
  $configured = [Environment]::GetEnvironmentVariable($EnvironmentName, "Process")
  $candidate = if ([string]::IsNullOrWhiteSpace($configured)) { $DefaultName } else { $configured }
  if ([IO.Path]::IsPathRooted($candidate)) {
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
    throw "$EnvironmentName points to a missing executable: $candidate"
  }
  $command = Get-Command $candidate -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $command) {
    throw "Required executable was not found: $candidate"
  }
  return $command.Source
}

function Test-TcpPort {
  param([int]$TargetPort)
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $pending = $client.BeginConnect("127.0.0.1", $TargetPort, $null, $null)
    if (-not $pending.AsyncWaitHandle.WaitOne(500, $false)) { return $false }
    $client.EndConnect($pending)
    return $client.Connected
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Test-MediaStudioPage {
  param([string]$Url)
  try {
    $page = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return $page.StatusCode -eq 200 -and
      $page.Content.Contains("window.__MEDIA_STUDIO_TOKEN__=") -and
      $page.Content.Contains("LIUKER")
  } catch {
    return $false
  }
}

function Find-AppBrowser {
  $candidates = New-Object System.Collections.Generic.List[string]
  foreach ($name in @("msedge.exe", "chrome.exe")) {
    $command = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $command) { $candidates.Add($command.Source) }
  }
  foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA)) {
    if ([string]::IsNullOrWhiteSpace($base)) { continue }
    $candidates.Add((Join-Path $base "Microsoft\Edge\Application\msedge.exe"))
    $candidates.Add((Join-Path $base "Google\Chrome\Application\chrome.exe"))
  }
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
  }
  return $null
}

function Open-MediaStudioWindow {
  param([string]$Url)
  $browser = Find-AppBrowser
  if ($null -ne $browser) {
    Start-Process -FilePath $browser -ArgumentList @("--app=$Url", "--new-window") | Out-Null
    return
  }
  Start-Process -FilePath $Url | Out-Null
}

try {
  if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = Join-Path $PSScriptRoot "..\..\.."
  }
  $projectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
  $packagePath = Join-Path $projectRoot "package.json"
  $serverPath = Join-Path $projectRoot "tools\media-studio\server.mjs"
  if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf) -or
      -not (Test-Path -LiteralPath $serverPath -PathType Leaf)) {
    throw "This launcher is not inside a valid LIUKER project: $projectRoot"
  }

  $runtimeConfigPath = Join-Path $projectRoot ".media-studio\windows-runtime.json"
  $runtimeConfig = $null
  if (Test-Path -LiteralPath $runtimeConfigPath -PathType Leaf) {
    $runtimeConfig = Get-Content -LiteralPath $runtimeConfigPath -Raw | ConvertFrom-Json
  }
  $configuredNode = [Environment]::GetEnvironmentVariable("MEDIA_STUDIO_NODE_PATH", "Process")
  if ([string]::IsNullOrWhiteSpace($configuredNode) -and $null -ne $runtimeConfig) { $configuredNode = $runtimeConfig.nodePath }
  if (-not [string]::IsNullOrWhiteSpace($configuredNode)) { $env:MEDIA_STUDIO_NODE_PATH = $configuredNode }
  $configuredFfmpeg = [Environment]::GetEnvironmentVariable("FFMPEG_PATH", "Process")
  if ([string]::IsNullOrWhiteSpace($configuredFfmpeg) -and $null -ne $runtimeConfig) { $configuredFfmpeg = $runtimeConfig.ffmpegPath }
  if (-not [string]::IsNullOrWhiteSpace($configuredFfmpeg)) { $env:FFMPEG_PATH = $configuredFfmpeg }
  $configuredFfprobe = [Environment]::GetEnvironmentVariable("FFPROBE_PATH", "Process")
  if ([string]::IsNullOrWhiteSpace($configuredFfprobe) -and $null -ne $runtimeConfig) { $configuredFfprobe = $runtimeConfig.ffprobePath }
  if (-not [string]::IsNullOrWhiteSpace($configuredFfprobe)) { $env:FFPROBE_PATH = $configuredFfprobe }

  $nodePath = Resolve-Executable -EnvironmentName "MEDIA_STUDIO_NODE_PATH" -DefaultName "node.exe"
  $nodeVersionText = (& $nodePath -p "process.versions.node" 2>$null | Select-Object -First 1)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($nodeVersionText)) {
    throw "Node.js could not be started: $nodePath"
  }
  $nodeVersion = [version]($nodeVersionText.Trim().Split("-")[0])
  $minimumNodeVersion = [version]"22.13.0"
  if ($nodeVersion -lt $minimumNodeVersion) {
    throw "Node.js 22.13.0 or newer is required. Installed: $nodeVersion"
  }

  $ffmpegPath = Resolve-Executable -EnvironmentName "FFMPEG_PATH" -DefaultName "ffmpeg.exe"
  $ffprobePath = Resolve-Executable -EnvironmentName "FFPROBE_PATH" -DefaultName "ffprobe.exe"
  $url = "http://127.0.0.1:$Port/"

  $portInUse = Test-TcpPort -TargetPort $Port
  if ($portInUse) {
    if (-not (Test-MediaStudioPage -Url $url)) {
      throw "Port $Port is already used by another application. Stop it or launch Media Studio with a different -Port."
    }
    Write-Host "Reusing the LIUKER Media Studio already running at $url"
    if (-not $DryRun -and -not $NoBrowser) { Open-MediaStudioWindow -Url $url }
    exit 0
  }

  if ($DryRun) {
    Write-Host "Dry run passed."
    Write-Host "Project: $projectRoot"
    Write-Host "Node: $nodePath ($nodeVersion)"
    Write-Host "FFmpeg: $ffmpegPath"
    Write-Host "FFprobe: $ffprobePath"
    Write-Host "URL: $url"
    exit 0
  }

  $stateDirectory = Join-Path $projectRoot ".media-studio"
  [IO.Directory]::CreateDirectory($stateDirectory) | Out-Null
  $pidPath = Join-Path $stateDirectory "media-studio.pid.json"
  $logPath = Join-Path $stateDirectory "media-studio.log"
  $errorLogPath = Join-Path $stateDirectory "media-studio-error.log"
  foreach ($log in @($logPath, $errorLogPath)) {
    if (Test-Path -LiteralPath $log -PathType Leaf) {
      $previous = "$log.previous"
      Move-Item -LiteralPath $log -Destination $previous -Force
    }
  }

  $oldProjectRoot = $env:MEDIA_STUDIO_PROJECT_ROOT
  $oldPort = $env:MEDIA_STUDIO_PORT
  $oldFfmpeg = $env:FFMPEG_PATH
  $oldFfprobe = $env:FFPROBE_PATH
  try {
    $env:MEDIA_STUDIO_PROJECT_ROOT = $projectRoot
    $env:MEDIA_STUDIO_PORT = [string]$Port
    $env:FFMPEG_PATH = $ffmpegPath
    $env:FFPROBE_PATH = $ffprobePath
    $quotedServerPath = '"' + $serverPath + '"'
    $startOptions = @{
      FilePath = $nodePath
      ArgumentList = $quotedServerPath
      WorkingDirectory = $projectRoot
      WindowStyle = "Hidden"
      RedirectStandardOutput = $logPath
      RedirectStandardError = $errorLogPath
      PassThru = $true
    }
    $serverProcess = Start-Process @startOptions
  } finally {
    if ($null -eq $oldProjectRoot) { Remove-Item Env:MEDIA_STUDIO_PROJECT_ROOT -ErrorAction SilentlyContinue } else { $env:MEDIA_STUDIO_PROJECT_ROOT = $oldProjectRoot }
    if ($null -eq $oldPort) { Remove-Item Env:MEDIA_STUDIO_PORT -ErrorAction SilentlyContinue } else { $env:MEDIA_STUDIO_PORT = $oldPort }
    if ($null -eq $oldFfmpeg) { Remove-Item Env:FFMPEG_PATH -ErrorAction SilentlyContinue } else { $env:FFMPEG_PATH = $oldFfmpeg }
    if ($null -eq $oldFfprobe) { Remove-Item Env:FFPROBE_PATH -ErrorAction SilentlyContinue } else { $env:FFPROBE_PATH = $oldFfprobe }
  }

  $pidData = [ordered]@{
    pid = $serverProcess.Id
    projectRoot = $projectRoot
    serverPath = $serverPath
    nodePath = $nodePath
    port = $Port
    startedAt = [DateTime]::UtcNow.ToString("o")
    logPath = $logPath
    errorLogPath = $errorLogPath
  }
  $pidTempPath = "$pidPath.tmp"
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($pidTempPath, ($pidData | ConvertTo-Json), $utf8)
  Move-Item -LiteralPath $pidTempPath -Destination $pidPath -Force

  $ready = $false
  for ($attempt = 0; $attempt -lt 80; $attempt += 1) {
    $serverProcess.Refresh()
    if ($serverProcess.HasExited) { break }
    if (Test-MediaStudioPage -Url $url) {
      $ready = $true
      break
    }
    Start-Sleep -Milliseconds 250
  }
  if (-not $ready) {
    if (-not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
    $detail = ""
    if (Test-Path -LiteralPath $errorLogPath -PathType Leaf) {
      $detail = (Get-Content -LiteralPath $errorLogPath -Tail 20 -ErrorAction SilentlyContinue) -join [Environment]::NewLine
    }
    throw "Media Studio did not become ready.$([Environment]::NewLine)$detail"
  }

  Write-Host "LIUKER Media Studio is ready at $url (PID $($serverProcess.Id))."
  if (-not $NoBrowser) { Open-MediaStudioWindow -Url $url }
} catch {
  Show-LauncherError -Message $_.Exception.Message
  exit 1
}
