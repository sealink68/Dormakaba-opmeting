@echo off
setlocal EnableExtensions
chcp 65001 >nul

title Opmeting Mesure - Desktop shortcut installer

echo.
echo ================================================
echo   Opmeting Mesure - Desktop shortcut installer
echo ================================================
echo.

set "APP_URL=%~1"
if not defined APP_URL (
  set /p "APP_URL=Paste the full GitHub Pages URL to index.html: "
)

if not defined APP_URL (
  echo ERROR: No GitHub Pages URL was supplied.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$appUrl='%APP_URL%'.Trim();" ^
  "try{$uri=[Uri]$appUrl}catch{throw 'The supplied URL is not valid.'};" ^
  "if($uri.Scheme -ne 'https'){throw 'Use an HTTPS GitHub Pages URL.'};" ^
  "$base=New-Object Uri($uri,'.');" ^
  "$preferred='C:\Dorma_icon';" ^
  "$fallback=Join-Path $env:USERPROFILE 'Dorma_icon';" ^
  "try{New-Item -ItemType Directory -Force -Path $preferred -ErrorAction Stop|Out-Null;$folder=$preferred}catch{New-Item -ItemType Directory -Force -Path $fallback|Out-Null;$folder=$fallback};" ^
  "$files=@('icon-180.png','icon-192.png','icon-512.png');" ^
  "foreach($file in $files){$source=[Uri]::new($base,$file);$destination=Join-Path $folder $file;Invoke-WebRequest -UseBasicParsing -Uri $source.AbsoluteUri -OutFile $destination};" ^
  "Add-Type -AssemblyName System.Drawing;" ^
  "$png=Join-Path $folder 'icon-512.png';$ico=Join-Path $folder 'icon-512.ico';" ^
  "$bitmap=[System.Drawing.Bitmap]::FromFile($png);try{$icon=[System.Drawing.Icon]::FromHandle($bitmap.GetHicon());$stream=[System.IO.File]::Create($ico);try{$icon.Save($stream)}finally{$stream.Dispose();$icon.Dispose()}}finally{$bitmap.Dispose()};" ^
  "$desktop=[Environment]::GetFolderPath('Desktop');" ^
  "$shortcutPath=Join-Path $desktop 'Opmeting  Mesure.url';" ^
  "$content=@('[InternetShortcut]','URL='+$appUrl,'IconFile='+$ico,'IconIndex=0');" ^
  "[System.IO.File]::WriteAllLines($shortcutPath,$content,[System.Text.Encoding]::Unicode);" ^
  "Write-Host '';Write-Host 'Installation completed.' -ForegroundColor Green;Write-Host ('Icon folder: '+$folder);Write-Host ('Desktop shortcut: '+$shortcutPath);"

if errorlevel 1 (
  echo.
  echo Installation failed. Check the GitHub Pages URL and network connection.
  pause
  exit /b 1
)

echo.
echo You can now open "Opmeting  Mesure" from the desktop.
pause
exit /b 0
