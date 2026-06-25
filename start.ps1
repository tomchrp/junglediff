<#
===============================================================================
FICHIER : start.ps1
PROJET  : JungleDiff

DESCRIPTION :
Script d'orchestration global pour l'environnement de developpement sous Windows.
Automatise le lancement de l'infrastructure Docker, du backend (FastAPI), 
du worker asynchrone (ARQ), et desormais du frontend (Vite/React).
===============================================================================
#>

Write-Host "Demarrage de l'infrastructure Docker (PostgreSQL, Redis)..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "Lancement du Worker ARQ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; ..\venv\Scripts\Activate.ps1; `$env:PYTHONPATH='.'; arq app.worker.worker_settings.WorkerSettings"

Write-Host "Lancement de l'API FastAPI..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; ..\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"

Write-Host "Lancement du Frontend React (Vite)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Tous les services sont en cours de lancement." -ForegroundColor Green