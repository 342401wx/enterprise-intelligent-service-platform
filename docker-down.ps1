$ErrorActionPreference = 'Stop'
$envFile = if (Test-Path .env.docker) { '.env.docker' } else { 'docker-compose.env.example' }
docker compose --env-file $envFile down