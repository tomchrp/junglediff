<#
===============================================================================
FICHIER : reset_db.ps1
PROJET  : JungleDiff

DESCRIPTION :
Automatise la destruction et la recréation complète de la base de données 
locale. Assure la purge des volumes Docker, le redémarrage propre des services, 
et attend que le moteur PostgreSQL soit opérationnel avant de déclencher 
les migrations Alembic.
===============================================================================
#>

Write-Host "Destruction de l'infrastructure Docker et des volumes existants..." -ForegroundColor Cyan
docker-compose down -v

Write-Host "Demarrage d'une infrastructure Docker vierge..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "Attente de l'initialisation de PostgreSQL (5 secondes)..." -ForegroundColor Yellow
# Pause indispensable pour éviter le crash d'Alembic sur une base en cours de création
Start-Sleep -Seconds 5

Write-Host "Application des migrations de base de donnees (Alembic)..." -ForegroundColor Cyan
Set-Location -Path "backend"

# Activation de l'environnement virtuel et exécution des migrations
if (Test-Path "..\venv\Scripts\Activate.ps1") {
    . "..\venv\Scripts\Activate.ps1"
    alembic upgrade head
} else {
    Write-Host "ERREUR : Impossible de trouver l'environnement virtuel (venv)." -ForegroundColor Red
}

Set-Location -Path ".."
Write-Host "Réinitialisation de la base de donnees terminee avec succes." -ForegroundColor Green