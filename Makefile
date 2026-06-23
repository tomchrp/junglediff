# ==============================================================================
# FICHIER : Makefile
# PROJET  : JungleDiff
# AUTEUR  : Tom & Assistant IA
# DATE    : Juin 2026
#
# DESCRIPTION :
# Ce fichier centralise toutes les commandes d'orchestration du projet. 
# Il permet de démarrer l'infrastructure complète (PostgreSQL, Redis, Backend, 
# Worker Arq) en une seule instruction, d'appliquer les migrations de base de 
# données, et de lancer les scripts d'utilitaires comme le cartographe API.
#
# UTILISATION :
# - 'make up'      : Démarre tout le projet via Docker Compose.
# - 'make down'    : Arrête et supprime les conteneurs du projet.
# - 'make mapper'  : Lance le script de cartographie de l'API Match V5.
# ==============================================================================

.PHONY: up down logs migrate mapper

up:
	@echo "Démarrage de l'infrastructure JungleDiff..."
	docker-compose --env-file .env.docker up -d --build

down:
	@echo "Arrêt de l'infrastructure..."
	docker-compose down

logs:
	docker-compose logs -f

migrate:
	@echo "Application des migrations de schéma de base de données..."
	docker-compose exec backend alembic upgrade head

mapper:
	@echo "Lancement du Cartographe API Match V5..."
	docker-compose exec backend python -m app.services.mapper