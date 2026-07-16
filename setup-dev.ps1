$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

function Test-Command($name) {
  $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

Write-Host "== Medicilio dev setup =="

if (-not (Test-Command "node")) {
  throw "Node.js no esta instalado o no esta en PATH. Instala Node.js 20+ y vuelve a ejecutar este script."
}

if (-not (Test-Command "npm")) {
  throw "npm no esta instalado o no esta en PATH."
}

if (-not (Test-Path "backend/.env")) {
  Copy-Item "backend/.env.example" "backend/.env"
  Write-Host "Creado backend/.env desde backend/.env.example"
}

Write-Host "Instalando dependencias raiz..."
npm install

Write-Host "Instalando dependencias backend..."
Push-Location "backend"
npm install
Pop-Location

Write-Host "Instalando dependencias frontend..."
Push-Location "frontend"
npm install
Pop-Location

$dockerAvailable = $false
if (Test-Command "docker") {
  try {
    docker compose version | Out-Null
    $dockerAvailable = $true
  } catch {
    $dockerAvailable = $false
  }
}

if ($dockerAvailable) {
  Write-Host "Levantando PostgreSQL con Docker..."
  docker compose up -d postgres

  Write-Host "Esperando PostgreSQL..."
  $postgresReady = $false
  for ($i = 1; $i -le 30; $i++) {
    docker compose exec -T postgres pg_isready -U salud -d salud_domicilio | Out-Null
    if ($LASTEXITCODE -eq 0) {
      $postgresReady = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $postgresReady) {
    throw "PostgreSQL no quedo listo despues de 30 segundos. Revisa Docker Desktop y vuelve a ejecutar el script."
  }
} else {
  Write-Warning "Docker no esta disponible. Asegurate de tener PostgreSQL en localhost:5432 con usuario salud, password salud123 y DB salud_domicilio."
}

Write-Host "Preparando Prisma..."
Push-Location "backend"
npx prisma generate
npx prisma db push
npm run db:seed
Pop-Location

Write-Host ""
Write-Host "Setup completo. Para arrancar frontend y backend ejecuta:"
Write-Host "  .\start-dev.ps1"
