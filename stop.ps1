<#
===============================================================================
FICHIER : stop.ps1
PROJET  : JungleDiff

DESCRIPTION :
Script d'arrêt d'urgence et de nettoyage de l'environnement de développement.
Arrête proprement les conteneurs Docker et force la fermeture (Kill) de tous 
les processus liés à l'application (Node.js et Python) pour libérer les ports.
===============================================================================
#>

Write-Host "Arret de l'infrastructure Docker..." -ForegroundColor Cyan
docker-compose down

Write-Host "Fermeture des processus serveurs (FastAPI, ARQ, Vite)..." -ForegroundColor Cyan
# On force l'arrêt des exécutables. ErrorAction SilentlyContinue empêche le script de planter si aucun processus n'est trouvé.
Stop-Process -Name "python", "node" -Force -ErrorAction SilentlyContinue

Write-Host "Tous les processus JungleDiff ont ete arretes et les ports sont liberes." -ForegroundColor Green
Write-Host "Note : Les fenetres PowerShell orphelines peuvent maintenant etre fermees manuellement." -ForegroundColor Yellow