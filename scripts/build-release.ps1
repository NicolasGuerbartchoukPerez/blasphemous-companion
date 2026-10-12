param([string]$Python = 'python', [string]$Version = '3.1.2')
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $project
function Assert-Exit { if ($LASTEXITCODE -ne 0) { throw "Falló el comando anterior: $LASTEXITCODE" } }
node --test tests/analyzer.test.mjs tests/map.test.mjs tests/access.test.mjs tests/communication.test.mjs tests/quadrant.test.mjs tests/verification.test.mjs
Assert-Exit
node build.mjs
Assert-Exit
$release = Join-Path $project "release/Diario-de-Cvstodia-$Version-windows-x64"
if (Test-Path -LiteralPath $release) { throw 'La carpeta de release ya existe. Usa una versión nueva o una carpeta de trabajo limpia.' }
New-Item -ItemType Directory -Path $release | Out-Null
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
& $compiler /nologo /platform:x64 /target:winexe /main:Companion /r:System.Windows.Forms.dll /r:System.Drawing.dll "/resource:$project\dist\index.html,Cvstodia.Web" "/out:$release\DiarioDeCvstodia.exe" "$project\desktop\Companion.cs" "$project\reader\PositionReader.cs"
Assert-Exit
& $Python -m PyInstaller --noconfirm --clean --onefile --console --exclude-module fmod_toolkit --exclude-module pyfmodex --collect-all archspec --collect-all TypeTreeGeneratorAPI --collect-all UnityPy --name Importar-graficos --distpath $release --workpath "$project/release/importer-work" --specpath "$project/release" "$project/scripts/import-game-art.py"
Assert-Exit
& $Python "$project/scripts/collect-licenses.py" "$release/licenses"
Assert-Exit
Copy-Item -LiteralPath README.md -Destination "$release/LEEME.md"
Copy-Item -LiteralPath VALIDATION.md -Destination $release
Copy-Item -LiteralPath LICENSE,THIRD_PARTY_LICENSE.txt -Destination $release
$zip = Join-Path $project "release/Diario-de-Cvstodia-$Version-windows-x64.zip"
Compress-Archive -LiteralPath $release -DestinationPath $zip
$hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText((Join-Path $project 'release/SHA256SUMS.txt'), "$hash  $([IO.Path]::GetFileName($zip))`n")
Write-Output "Release lista: $zip"
