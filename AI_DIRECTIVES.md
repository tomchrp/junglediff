# Directives Architecturales pour Assistants IA (JungleDiff)

Tu es un développeur expert travaillant sur JungleDiff, une application d'analyse experte pour League of Legends. Ton objectif est de produire du code strictement aligné avec l'architecture existante. Tu as l'interdiction de dévier des règles ci-dessous.

## 1. Philosophie Frontend : Configuration-Driven UI
Le frontend de JungleDiff n'utilise pas de composants React codés en dur pour afficher les statistiques. Il utilise un moteur de rendu central (`DynamicExpertView.jsx`) qui ingère des fichiers de configuration JSON/JS (Layouts).
- **Règle absolue :** Ne crée jamais de nouveaux composants React pour afficher des grilles de données. Contente-toi de créer ou modifier les fichiers de layout dans `frontend/src/core/configs/layouts/` sauf si demande explicite du développeur.

## 2. La Source Unique de Vérité (Single Source of Truth)
Pour éviter les dérives sémantiques (hallucinations de textes, clés JSON ou couleurs), l'application repose sur un registre centralisé des métriques.
- **Règle absolue :** Tu as l'interdiction stricte de coder en dur des textes, des clés backend (`valueKey`), des couleurs ou des noms de widgets directement dans les fichiers de layout.
- Tu dois utiliser exclusivement les références définies dans le fichier généré `METRICS_DICTIONARY.md`.
- L'appel dans un layout doit se faire ainsi : `{ metric: METRICS.NOM_DE_LA_METRIQUE }`.
- Si une métrique métier manque pour accomplir ta tâche, tu dois refuser de générer le layout et demander à l'utilisateur d'ajouter la métrique dans `metricsRegistry.js` en premier.

## 3. Topologie des Layouts
Les configurations de vues sont segmentées de manière stricte :
- `layouts/shared/` : Contient les blocs de vues universels à un rôle complet (ex: la vision d'un Support est identique qu'il soit Tank ou Enchanteur).
- `layouts/roles/[role]/[archetype].js` : Contient l'assemblage final spécifique à une façon de jouer. 
- **Règle absolue :** Maximise la réutilisation. Si tu crées la vue pour un Toplaner "Tank", vérifie si sa gestion de la vision n'est pas identique à un autre archétype Toplane avant de dupliquer la configuration.

## 4. Archétypes et Asymétrie (Mismatch)
JungleDiff analyse les parties selon des "archétypes" (ex: un Assassin affrontant un Tank).
- Le moteur de rendu possède une variable `isMismatch`. Si elle est vraie, les statistiques de l'adversaire sont masquées pour éviter de comparer des choses incomparables (ex: les dégâts d'un assassin vs le soin d'un enchanteur).
- **Règle absolue :** N'ajoute jamais de logique conditionnelle complexe dans les layouts pour gérer l'adversaire. Laisse le moteur `DynamicExpertView` gérer l'asymétrie automatiquement.

## 5. Architecture Backend : Inversion de Contrôle
Les modules d'analyse backend (ex: `jungle_vision.py`) héritent de `BaseMetricModule`.
- L'orchestrateur appelle uniquement la méthode publique `compute()`.
- **Règle absolue :** Toutes les sous-fonctions d'un module d'analyse doivent être privées (préfixées par un underscore, ex: `_process_timeline`).
- **Règle absolue :** Les clés du dictionnaire retourné par `compute()` doivent être standardisées (nomenclature officielle Riot Games) et agnostiques du rôle. Utilise `controlWardsBought` et non des termes argotiques ou spécifiques.