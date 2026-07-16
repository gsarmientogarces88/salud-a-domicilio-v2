$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "== Medicilio dev server =="
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:4000"
Write-Host ""

npm run dev
