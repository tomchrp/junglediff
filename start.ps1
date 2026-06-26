<#
===============================================================================
FICHIER : start.ps1
PROJET  : JungleDiff

DESCRIPTION :
Script d'orchestration global pour l'environnement de developpement sous Windows.
Lance désormais DEUX workers ARQ en parallèle pour respecter le routage
et la priorisation des files d'attente.
===============================================================================
#>

Write-Host "Demarrage de l'infrastructure Docker (PostgreSQL, Redis)..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "Lancement du Worker ARQ (Ingestion Massive - Default)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; ..\venv\Scripts\Activate.ps1; `$env:PYTHONPATH='.'; arq app.worker.worker_settings.WorkerSettingsDefault"

Write-Host "Lancement du Worker ARQ (Rapide - High Priority)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; ..\venv\Scripts\Activate.ps1; `$env:PYTHONPATH='.'; arq app.worker.worker_settings.WorkerSettingsHigh"

Write-Host "Lancement de l'API FastAPI..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; ..\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"

Write-Host "Lancement du Frontend React (Vite)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Tous les services sont en cours de lancement." -ForegroundColor Green