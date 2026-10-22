# Installs Spark for the current user (no admin rights needed).
#   irm https://vuongnm.github.io/spark/install.ps1 | iex
# Downloads the latest installer from https://github.com/VuongNM/spark/releases and runs it silently.
# Run it again to update.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$url = 'https://github.com/VuongNM/spark/releases/latest/download/Spark-win-x64.exe'
$setup = Join-Path $env:TEMP 'Spark-setup.exe'

Write-Host 'Downloading Spark...'
Invoke-WebRequest $url -OutFile $setup -UseBasicParsing
Unblock-File $setup

Write-Host 'Installing...'
Start-Process $setup -ArgumentList '/S' -Wait
Remove-Item $setup

$exe = Join-Path $env:LOCALAPPDATA 'Programs\Spark\Spark.exe'
Write-Host "Installed to $exe"
Start-Process $exe
