$ErrorActionPreference = 'Stop'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw '未找到 Docker，请先安装 Docker Desktop 并确保 docker compose 可用。'
}
$envFile = if (Test-Path .env.docker) { '.env.docker' } else { 'docker-compose.env.example' }
docker compose --env-file $envFile up -d --build
Write-Host '企业智能服务平台已启动：http://localhost:5173'