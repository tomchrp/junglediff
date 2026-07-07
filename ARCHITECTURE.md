# Document d'Architecture et de Suivi - JungleDiff

## 1. Description Exhaustive de l'Application

JungleDiff est une application web analytique destinée aux joueurs de League of Legends. L'objectif est de fournir des métriques avancées et des analyses croisées en exploitant les API Riot Games (Account V1, Match V5). 

L'application est conçue pour fonctionner initialement en local, mais son architecture backend (Python/FastAPI) est dimensionnée avec une stack professionnelle pour supporter une future mise en production et une utilisation massive (Big Data).

### Fonctionnalités cibles (Vues Frontend)
* **Vue Historique :** Liste paginée (lazy loading) des matchs d'un joueur.
* **Vue Clear :** Analyse spécifique pour les Junglers (Pathing).
* **Vue Synergies et Matchups :** Analyse du winrate croisé d'un joueur en fonction des champions alliés ou ennemis rencontrés sur des positions spécifiques.
* **Outil de Draft (Cible) :** Recommandation en temps réel basée sur les métriques communautaires croisées avec les performances du joueur.

---

## 2. Stratégies de Conception Technique (Data Engineering)

Pour garantir la scalabilité et éviter les goulets d'étranglement (Rate Limits de Riot, temps de calcul SQL), l'architecture repose sur une séparation stricte des couches de stockage.

### 2.1. L'Approche "Data Lake" (MinIO) et les 3 Couches de Stockage
Le système a abandonné le stockage local sur disque dur et l'encombrement de la base de données relationnelle par des JSON massifs. La donnée suit un cycle de vie strict en 3 couches :
1.  **Absolute Cold Storage (MinIO / S3) :** Dès qu'une requête HTTP vers l'API Riot aboutit (Détails ou Timeline), le JSON brut et intégral (100% de la donnée) est poussé de manière asynchrone dans un Object Storage (MinIO). C'est la source de vérité absolue.
2.  **Warm Storage (PostgreSQL - JSONB) :** Le JSON brut passe dans un service `DataTrimmer` qui l'ampute de 80% de son volume inutile. Ce JSON élagué est inséré dans les tables `Match` et `MatchTimeline`. Il est utilisé par le frontend pour afficher le détail d'une partie.
3.  **Hot Storage (PostgreSQL - Relationnel) :** Le Trimmer extrait les statistiques clés (Kills, Dégâts, Économie ciblée) et les éclate en colonnes strictes dans la table `MatchParticipant`. C'est cette table, massivement indexée, qui encaisse les auto-jointures analytiques (Synergies, Big Data) sans jamais lire le JSONB.

### 2.2. Modèle Relationnel et Dédoublonnage
* **Dédoublonnage :** Une partie contenant 10 joueurs n'est enregistrée qu'une seule fois dans la table `Match`.
* **Table de Liaison :** La table `MatchParticipant` fait le pont entre `Match` et `Player`. C'est le cœur du système analytique.
* **Auto-jointures (Self-Join) :** Les vues d'analyse croisée exploitent le SGBD pour calculer les winrates de manière algorithmique, évitant la saturation de la RAM côté serveur Python.

### 2.3. Gestion du Rate Limit et Concurrence
L'API Riot impose une limite stricte.
* **Client HTTP Intelligent :** Intercepte le code HTTP 429 et met en pause de manière asynchrone le processus en lisant le header `Retry-After`.
* **Résolution des accès concurrents (Anti-Deadlock) :** Pour éviter les verrous mortels PostgreSQL lors des *Bulk Upserts* par de multiples workers ARQ en parallèle, le backend trie systématiquement les listes de joueurs par ordre alphabétique de `puuid` avant l'insertion en base.

### 2.4. Routage Géographique et Résilience
* **Routage Continental :** L'application interroge les endpoints continentaux (`europe`, `americas`). Le `match_id` natif (ex: `EUW1_...`) sert de clé primaire universelle.
* **Sécurité de Rétention Riot (Anti-404) :** Riot purge régulièrement les Timelines anciennes. La base de données intègre un champ `timeline_status` (`PENDING`, `FETCHED`, `UNAVAILABLE`) pour garantir que les workers n'essaient pas de télécharger à l'infini une ressource qui n'existe plus.

### 2.5. Orchestration de la Timeline (Les 3 Vitesses de l'Interface)
1.  **Vitesse 1 (Synchrone) :** Mise à jour immédiate de l'Historique (détails de base uniquement, ignore la timeline).
2.  **Vitesse 2 (Anticipation) :** L'ouverture d'une carte de match télécharge sa timeline en priorité absolue (P0), et place les timelines des matchs adjacents (N-1, N+1) en file d'attente (P1).
3.  **Vitesse 3 (Rattrapage Big Data) :** Mode spécifique du Crawler (Section 13) pour hydrater la base analytique globale.

### 2.6. Architecture LLM (Assistant Contextuel - POC)
Le système repose sur le motif **"Context Injection"** (RAG déterministe) couplé à un flux **Server-Sent Events (SSE)**.
* L'information brute est enrichie sémantiquement par le backend (traduction des IDs en texte).
* L'UI affiche immédiatement la donnée interceptée (SpellWidget) avant de l'envoyer encapsulée dans des balises XML strictes vers le modèle (Gemma), qui stream sa réponse en temps réel.

---

#### Le Cycle de la Donnée (Stateful SSE)
Le flux de communication entre le frontend et le backend est asynchrone et séquentiel pour garantir une UI réactive :

1. **Extraction et Enrichissement :** Le backend (via `MatchRepository`) extrait la donnée brute en base et l'enrichit sémantiquement (traduction des IDs de sorts d'invocateur en texte clair, nom du champion, rôle). Le LLM ne manipule jamais d'IDs bruts.
2. **Anticipation Visuelle (Widget) :** Avant même d'interroger l'IA, FastAPI envoie immédiatement la donnée structurée au frontend sous forme d'événement SSE (`widget_data`). Le frontend React intercepte ce paquet et monte instantanément le composant visuel (`SpellWidget`).
3. **Injection Stricte :** Le backend assemble un prompt strict encapsulé dans des balises XML (`<ROLE_ET_OBJECTIF>`, `<CONTEXTE_DONNEES>`, `<DIRECTIVES_DE_REDACTION>`). Les données extraites y sont injectées. L'appel est ensuite passé au client `google.genai` en désactivant toute réflexion interne pour minimiser la latence.
4. **Streaming :** Les tokens générés par le LLM sont streamés en temps réel vers le frontend via des événements SSE distincts (`text_chunk`).

#### Implémentation Frontend
* **Routage Scalable :** Le composant racine `App.jsx` a été refactorisé. L'opérateur ternaire de navigation a été remplacé par des évaluations logiques courtes (`&&`), permettant l'empilement de nouvelles vues comme la `ChatView`.
* **Consommateur SSE (`chatService.js`) :** Utilisation de l'API native `fetch` et `TextDecoder` pour lire le flux HTTP continu, implémentant un buffer manuel pour recomposer les paquets JSON potentiellement sectionnés par le réseau.
* **Autonomie Contextuelle :** La `ChatView` s'hydrate de manière autonome en requêtant les 15 dernières parties du joueur ciblé. L'interface lie les données JSON complexes (Optional Chaining sur `match.info.participants`) pour sécuriser le sélecteur de contexte et éviter les crashs React.

---

## 3. Bilan des Implémentations Réalisées

*   **Infrastructure (DevEx) :**
    *   Mise en place de `docker-compose.yml` (PostgreSQL, Redis).
    *   Variables d'environnement sécurisées (`.env` masqué du dépôt).
    *   Commandes d'orchestration (`Makefile`).
*   **Base de données :**
    *   Création du schéma SQLAlchemy asynchrone (`models.py`).
    *   Mise en place des migrations via Alembic.
*   **Client Riot :**
    *   Création de `riot_client.py` asynchrone et résilient (gestion 429/403).
*   **Pipeline d'Ingestion :**
    *   Script de moissonnage `seed_database.py`.
    *   Worker `tasks.py` avec Upsert idempotent en base de données.
*   **Cartographie (Mapper) :**
    *   Script hors-ligne `cartographe.py` analysant les colonnes `JSONB`.
    *   Génération de trois fichiers JSON exhaustifs et séparés (`schema_match_details.json`, `schema_timeline_events.json`, `schema_timeline_frames.json`) validant l'ingestion.

---

## 4. Ce qu'il reste à faire (Roadmap Technique)

Bien que l'ingestion soit fonctionnelle, l'API serveur pour le frontend doit être construite.

1.  **Création du Trimmer (Élagueur) :**
    *   Créer un service qui lit les payloads bruts entrants de l'API Riot et les ampute des nœuds inutiles en se basant sur le dictionnaire généré par le cartographe, afin d'optimiser le poids dans PostgreSQL.
2.  **Cœur de l'API (FastAPI) :**
    *   Écrire `app/main.py` et les routeurs d'endpoints (`matches.py`, `players.py`).
3.  **Rate Limiting Inbound :**
    *   Intégrer un middleware dans FastAPI (adossé à Redis) pour empêcher les utilisateurs de spammer les routes de mise à jour de profil.
4.  **Cache Applicatif :**
    *   Utiliser Redis pour stocker les résultats des requêtes SQL analytiques complexes (avec un TTL) afin de réduire la charge sur la base de données.
5.  **Observabilité :**
    *   Créer `app/core/logging.py` avec un formatage JSON strict et intégrer Sentry pour tracer les échecs silencieux des workers ARQ.
6.  **Orchestrateur à 3 Vitesses :**
    *   Remplacer l'ingestion monolithique actuelle par la logique de files d'attente priorisées dans ARQ.
7.  **Repositories SQL Métier :**
    *   Écrire les requêtes finalisées pour les vues (ex: l'auto-jointure pour la vue Synergies).


## 5. Evolutions architecturales récentes

Les points de la roadmap technique initiale ont été résolus avec la mise en place d'une infrastructure de production tolérante aux pannes, asynchrone et optimisée pour l'UX. 

### 5.1. Le triple appel léger

L'interaction entre le Frontend (React) et le Backend a été blindée pour prévenir les timeouts et les attaques DDOS (volontaires ou non).

* **Fire-and-Forget & Polling** : L'interface ne subit plus de timeouts HTTP. Elle interroge une route de statut (/timeline/status) qui déclenche le téléchargement en arrière-plan et répond 202 Accepted. Le frontend boucle ensuite toutes les 2 secondes.

* **Skeleton Loader** : Remplacement de l'interface par une structure "fantôme" pulsante (animate-pulse) pendant que la donnée est rapatriée.

* **Bouclier de Rafraîchissement (TTL)** : Bouton manuel bridé par un verrou local de 120 secondes (localStorage). Rafraîchissement automatique silencieux en arrière-plan si la donnée affichée a plus de 2 minutes.

### 5.2. L'Orchestration Temporelle et Spatiale (Worker ARQ)

La charge de travail asynchrone a été scindée pour garantir une réactivité immédiate de l'interface.

* **Tâches chirurgicales** : Le téléchargement lourd de la Timeline a été détaché du téléchargement des MatchDetails.
* **Prédiction par Localité Spatiale** : L'ouverture d'une carte de match (N) déclenche instantanément le téléchargement de sa Timeline en priorité absolue (P0), et place les Timelines des matchs adjacents (N-1, N+1) en file d'attente secondaire (P1) pour anticiper le comportement de l'utilisateur.

### 5.3. Le Contrat de Données (Trimmer)
Le service DataTrimmer a été implémenté pour filtrer les payloads massifs.

* **Détails** : Ne conserve que l'économie, la vision, le combat et le nœud challenges épuré.

* **Timeline** : Filtre strict appliqué sur les événements (CHAMPION_KILL, ELITE_MONSTER_KILL, achats, reventes et destructions d'items, évolutions de compétences, et destruction/pose de wards).

### 5.4. La Pagination Temporelle (endTime)
Le défilement infini (Lazy Loading) a abandonné la logique mathématique d'offset, inadaptée aux systèmes asynchrones.

* Le frontend lit le gameCreation de la dernière partie affichée et demande au backend les parties strictement antérieures à ce timestamp absolu.

* Bénéfice : Élimine totalement le risque de doublons ou de matchs sautés lorsque de nouvelles parties sont ingérées simultanément en arrière-plan.

# 6. Consolidation Architecturale (State Management & Résilience)
La logique d'orchestration a été repensée pour garantir l'intégrité visuelle et la fluidité lors de l'ingestion de volumes massifs de données par les workers ARQ.

### 6.1. Routage ARQ Isolé (Dual Workers) et Prévention des Deadlocks
* **Files d'attente étanches** : Mise en place de deux workers ARQ tournant en parallèle sur des instances distinctes (default pour le téléchargement massif en arrière-plan, high_priority pour les requêtes UI initiées par le joueur).

* **Résolution des accès concurrents** : Pour éviter les "Deadlocks" PostgreSQL lors des Bulk Upsert par plusieurs workers simultanés, le backend trie systématiquement la liste des joueurs par ordre alphabétique de puuid avant de requérir des verrous transactionnels.

### 6.2. Polling Progressif et "Lifting State Up"
* **Centralisation de l'état** : Le statut d'ingestion est remonté (Lifting State Up) dans le composant racine de l'application (App.jsx), propageant un refreshTrigger à tous les composants enfants pour une synchronisation parfaite (Patchs, Sidebar, Historique).

* **Libération précoce** : L'écran de chargement global n'attend plus la fin des 60 téléchargements. Il se retire dès que 5 parties sont ingérées, permettant la navigation pendant que le processus se termine silencieusement en arrière-plan.

### 6.3. Background Fetching et Protection Asynchrone
* **Élimination du Flickering** : Les requêtes API ne déclenchent plus la destruction visuelle des composants (setIsLoading(true)) si des données sont déjà affichées à l'écran, écrasant les anciens tableaux en toute transparence.

* **Race Conditions** : Intégration systématique d'un AbortController sur les requêtes filtrées pour détruire en vol les requêtes obsolètes si l'utilisateur change de filtre rapidement.

### 6.4. Soft Reset UX et Scroll Anchoring
* **Soft Reset (Filtres tolérants)** : Lors d'un changement de rôle (Lane), le champion sélectionné n'est conservé que s'il est logiquement présent dans le nouveau contexte. Dans le cas contraire, le filtre retombe gracieusement sur une vue globale au lieu de forcer arbitrairement une sélection.

* **Scroll Anchoring (Limite Dynamique)** : Lors d'un rafraîchissement d'historique déclenché par l'arrivée de nouvelles parties ARQ, la pagination calcule une limite dynamique (Math.max(limit, matches.length)) pour mettre à jour le volume exact de cartes actuellement lues par l'utilisateur, empêchant l'interface de s'effondrer vers le haut.

### 6.5. Deep Fetch Sémantique et Sécurisé
* **Routage Sémantique** : Le backend calcule l'existence de données résiduelles via un offset rapide (limit + 1) sans exécuter de COUNT() lourd. Le frontend adapte le texte de son bouton de pagination ("Afficher les parties suivantes" vs "Rechercher dans les archives Riot").

* **Verrou Asynchrone** : Lors d'un Deep Fetch, une promesse asynchrone stricte (await new Promise) gèle le comportement cliquable pendant 4 secondes pour empêcher l'épuisement du quota API Riot (Rate Limit).

# 7. Refonte Frontend, Modélisation Analytique et Design System
La transition du POC vers une application de production a nécessité une restructuration majeure de l'interface, la standardisation des composants visuels et le déport de la charge analytique vers la base de données.

### 7.1. Architecture Split-View et Composants Transverses
* **Routage par État (Lifting State Up)** : Le layout principal (App.jsx) a été refondu pour accueillir plusieurs vues analytiques (Historique, Synergies) tout en conservant une ossature commune. Les composants transverses (SideBar, FilterBar, PlayerStatCard) demeurent persistants lors de la navigation.

* **Auto-Déduction de Contexte (UX)** : Pour maintenir la rigueur statistique de la vue Synergies sans bloquer l'utilisateur avec un filtre global ("ALL"), l'application intercepte la navigation et force l'affichage sur la voie de prédilection (preferredLane) du joueur, calculée dynamiquement par le backend.

* **Scroll Unifié et Grid Stretch** : Utilisation avancée de CSS Grid pour permettre l'étirement naturel des colonnes de données (LaneGrid) et le report du défilement (scroll) sur le conteneur parent, garantissant une lecture fluide de bout en bout.

* **Sticky Headers** : Les séparateurs de patchs et de dates de l'historique utilisent l'ancrage natif CSS (position: sticky) pour préserver le contexte temporel lors du défilement sans recourir à une logique JavaScript coûteuse en performances.

### 7.2. Moteur Analytique (Auto-Jointures SQL)
* **Requêtes Croisées Hautes Performances** : La vue "Synergies & Matchups" repose sur un endpoint dédié effectuant des auto-jointures (Self-Join) directes sur la table MatchParticipant.

* **Délégation au SGBD** : Le croisement des taux de victoires (winrates) en fonction de la présence d'alliés ou d'adversaires est intégralement calculé par PostgreSQL, évitant la saturation de la RAM côté serveur Python.

* **Sous-requêtes Isolées** : Le calcul de la preferredLane s'effectue via une sous-requête limitant l'échantillon aux 60 dernières parties du joueur, offrant une photographie de ses habitudes récentes sans pollution par des historiques obsolètes.

### 7.3. Sanctuarisation du Design System (100% Tailwind)
Pour résoudre la dette technique et les conflits d'injection DOM, l'architecture hybride (Material-UI + Tailwind) a été totalement abandonnée au profit d'un environnement Tailwind exclusif et strictement paramétré.

* **Design Tokens Sémantiques** : Remplacement des couleurs arbitraires par des variables métier strictes (bg-app, surface-elevated, lol-win, lol-loss, lol-gold) intégrées dans la configuration Tailwind.

Typographie Mathématique** : Imposition de la propriété font-variant-numeric: tabular-nums sur tous les éléments textuels pour garantir l'alignement vertical rigoureux des statistiques (Winrates, compteurs de parties).

* **Glassmorphism Épuré** : Création d'une couche @layer components dans index.css exposant des classes utilitaires maîtrisées (.glass-panel) définissant un flou et une opacité constants, éradiquant les effets de biseau (inset) pour maximiser la lisibilité des données denses.

* **UI Kit Atomique** : Interdiction progressive de l'usage de classes Tailwind arbitraires dans les composants complexes au profit de primitives inflexibles (Dossier components/ui/ : Card, Avatar).

### 7.4. Implémentation du Thème "Dark Data-Viz" et Composants UI Purs
La dernière itération du frontend a éradiqué les vestiges du POC (couleurs opaques en dur, balises natives non stylisables) au profit d'un environnement visuel optimisé pour l'analyse de données.

* **Contraste Absolu (Dark Data-Viz)** : Remplacement des fonds bleus par un fond quasi-noir (`bg-app` : `#050505`). Les surfaces s'appuient sur des nuances de gris neutre (`surface-solid`, `surface-elevated`) pour réduire le bruit visuel et faire ressortir la donnée sémantique (victoire en vert `lol-win`, défaite en rouge `lol-loss`).
* **Remplacement des Composants Natifs** : Création d'une primitive `CustomSelect.jsx` (UI Kit) pour remplacer les balises `<select>` HTML natives de la barre de filtres, inadaptées au Glassmorphism.
* **Gestion Avancée du Modèle de Boîte (Box Model)** :
    * Modification de la structure de l'application pour permettre à la SideBar d'avoir une hauteur dynamique (`max-h-full`) tout en préservant le comportement de défilement interne de la liste des champions (`min-h-0`).
    * Optimisation des en-têtes collants (Patch et Date) dans l'historique : utilisation d'une hauteur stricte (`h-10`) et d'un fond `bg-app/90 backdrop-blur-md` pour créer un panneau hermétique occultant parfaitement les cartes lors du défilement.
* **Routage et Contexte (UX)** : Ajout d'une réinitialisation stricte des filtres (Lane et Patch à "ALL") lors de la navigation de retour vers la vue Historique, évitant l'enfermement de l'utilisateur dans un contexte analytique inadapté.

## 8. Architecture d'Analyse par Rôle (POC Support)

Afin de permettre une analyse fine de la performance selon la position jouée, une architecture modulaire a été mise en place. Elle suit le principe d'Inversion de Contrôle pour garantir la réutilisabilité des composants UI.

### 8.1. L'Inversion de Contrôle (Frontend)
L'affichage des analyses de rôle est structuré en trois couches étanches :
* **Couche 1 - Orchestrateurs Métier (`MatchCardRoleSupport.jsx`) :** Composant "intelligent" qui interroge l'API, normalise les statistiques sur une échelle de 100, génère le narratif (Insights) et configure les onglets disponibles.
* **Couche 2 - Hub Central Agnostique (`RoleAnalysisDashboard.jsx`) :** Coquille UI "stupide". Gère la disposition en triptyque (non encore finalisée), dessine le graphe Radar des performances, affiche les tags d'Insights et gère la navigation par pilules. Il ignore les règles métier.
* **Couche 3 - Vues Expertes (`SupportVisionView.jsx`, `SupportCombatView.jsx`) :** Composants détaillés affichant les graphiques temporels et les cartes de statistiques absolues ou conditionnelles.

### 8.2. Moteur Temporel Événementiel (Backend)
Pour garantir la justesse des séries temporelles (ex: Évolution de la vision), le backend a abandonné l'agrégation "minute par minute".
* **Précision :** Les événements de la timeline sont parsés en conservant leur timestamp exact en millisecondes. 

### 8.3. Analyse de Combat par Archétype
La sous-vue Combat du Support introduit le rendu conditionnel basé sur l'archétype du champion (via un dictionnaire statique `support_archetypes.json` côté client).
* **Statistiques Agnostiques :** Participation aux kills (KP%), Morts.
* **Statistiques Spécifiques :** Dégâts absorbés (Enchanteur), Temps de contrôle (Vanguard), Temps d'entrave (Catcher), Part des dégâts de l'équipe (Artilleur).
* **Cartes Dynamiques :** Des indicateurs n'apparaissent que si une condition d'exploit ou d'alerte est remplie (ex: "Carry Caché" si le support inflige plus de dégâts que son ADC, ou "Ange Gardien" s'il a 0 kill et plus de 15 assists).

### 8.4. Implémentation du Pattern Strategy (Scalabilité des Rôles)
Le POC Support a été consolidé vers une architecture définitive et scalable via le design pattern Strategy.

* **Backend** : Création d'une classe abstraite BaseRoleAnalyzer héritée par SupportAnalyzer et JungleAnalyzer. Le backend détermine dynamiquement le rôle d'un joueur, charge ses archétypes, et instancie la classe correspondante.

* **Frontend** : Remplacement des cartes spécifiques par un contrôleur agnostique (RoleAnalysisController) qui route dynamiquement les données vers les composants experts appropriés (SupportVisionView, SupportCombatView, JungleObjectivesView, etc.).

# 9. Standardisation du Design System et Ingénierie de Combat
Afin de garantir une interface professionnelle et lisible, un Design System strict a été imposé sur l'ensemble des vues expertes, couplé à une refonte de l'ingestion temporelle pour supporter les analyses de combat.

### 9.1. Composants UI Universels et Grille Stricte
* **Standardisation des Cartes** : Adoption d'un layout inflexible (Titre muté, Donnée primaire centrale, Donnée secondaire/Ratio en dessous, et Footer descriptif) sans aucun diviseur interne (border-t) pour réduire le bruit visuel et prioriser la donnée.

* **Composants Primitifs** : Création de StatDelta.jsx (calcul dynamique des écarts avec l'adversaire et application sémantique de couleurs de victoire/défaite selon la polarité de la stat) et de CircularGauge.jsx (jauges de proportion animées normalisées).

* **Charte Colorimétrique** : Suppression des couleurs arbitraires. Les métriques du joueur utilisent le bleu standard (text-lol-info), tandis que les couleurs d'alerte (lol-win, lol-loss) sont strictement réservées aux deltas de comparaison.

### 9.2. Ingénierie Temporelle et DataTrimmer
Le besoin de tracer la courbe de pression offensive (Dégâts) a nécessité une mise à jour du contrat de données.

* **Extraction des damageStats** : Le trimmer.py a été mis à jour pour extraire et conserver l'évolution des dégâts totaux à chaque minute (frame) de la timeline de Riot.

* **Filtrage des Achats** : Le trimmer conserve les événements ITEM_PURCHASED. Le backend les croise avec une liste blanche stricte (objets Légendaires et Mythiques) pour identifier les "Power Spikes" sans polluer les graphiques avec des composants mineurs ou consommables.

* **Réhydratation à Froid (Backfill)** : Exécution du script backfill_from_cold.py pour retraiter les payloads JSON bruts stockés sur le disque local et injecter rétroactivement les données de dégâts et d'objets dans les timelines PostgreSQL existantes, sans aucun appel réseau.

### 9.3. Graphes Augmentés (Data-Visualisation)
Les graphiques temporels (Recharts) ont été dotés de comportements personnalisés avancés.

* **Incrustation Contextuelle (CustomItemDot)** : Les achats d'objets majeurs sont incrustés directement sur la courbe des dégâts via des rendus SVG asynchrones (DataDragon) au timer exact de l'acquisition.

* **Zoom Mathématique** : L'utilisation de transform-origin au centre du SVG permet aux icônes d'objets de grossir au survol sans quitter le point d'ancrage de la courbe, garantissant une interaction visuelle fluide.

* **Hydratation des Deltas Adverses** : Le backend s'assure désormais de calculer toutes les statistiques adverses transverses (Part de dégâts de l'équipe adverse, Pénétration de vision adverse) absentes de l'API Riot d'origine pour alimenter le composant StatDelta de manière mathématiquement symétrique.


## Mise à jour : Architecture Archétype "VANGUARD" (Support)

### 1. Cycle de la donnée (Backend)
*   **DataTrimmer (`trimmer.py`) :** Élargissement de la liste d'inclusion (whitelist) pour le passage des données du "Cold Storage" (Riot API) au "Hot Storage" (Base de données). Ajout des clés `damageSelfMitigated` et `totalDamageTaken` vitales pour l'analyse des tanks. Les métriques avancées d'engagement issues du nœud `challenges` (`enemyChampionImmobilizations`, `immobilizeAndKillWithAlly`, `tookLargeDamageSurvived`) sont extraites dynamiquement.
*   **SupportAnalyzer (`support_analyzer.py`) :** Ajout d'une logique de traitement conditionnel basée sur l'archétype du champion analysé.
    *   Création de la méthode `_process_combat_vanguard_timeline` : Génère une timeline temporelle traçant l'évolution de l'encaissement (dégâts subis) croisée avec l'acquisition d'objets majeurs.
    *   Constitution d'un objet de données de combat spécifique aux Vanguards, centré sur la mitigation, l'entrave, et la résilience, remplaçant les statistiques offensives de l'archétype `ARTILLERY`.

### 2. System Design (Frontend)
*   **Composant Structurel (`StatCard.jsx`) :** Introduction d'un composant générique d'encapsulation. Il impose une disposition Flexbox stricte et extensible (`h-full`, `flex-1`), garantissant l'alignement vertical parfait de toutes les cartes d'une même grille, qu'elles contiennent un pied de page ou non. Élimine le besoin de marges codées en dur.
*   **Routage Visuel (`SupportCombatView.jsx`) :** Transformation du composant en routeur de rendu conditionnel basé sur `data.archetype`. 
    *   Implémentation de la vue experte Vanguard traduisant les concepts techniques (Mitigation, Aides létales sous contrôle) en interfaces claires pour l'utilisateur.
    *   Refonte complète du code pour consommer le nouveau composant `StatCard`, assurant la standardisation de l'affichage.


## 10. Pivot Architectural : Configuration-Driven UI & Inversion de Contrôle

Pour pallier l'explosion combinatoire du code liée à la multiplication des rôles et archétypes (fichiers redondants documentés en Section 9), l'application a subi une refonte complète de ses couches d'affichage et d'extraction de données.

### 10.1. Frontend : Configuration-Driven UI
L'approche des "Vues Hardcodées" (ex: `SupportCombatView.jsx`, `JungleResourcesView.jsx`) est totalement abandonnée. L'interface est désormais pilotée par la donnée via trois couches strictes :
* **Le Dictionnaire (`roleLayouts.js`) :** Configuration JSON statique définissant l'agencement visuel complet (grilles, colonnes, widgets) et le mapping des clés de données backend pour chaque rôle et archétype. L'ajout d'une nouvelle analyse ne requiert plus de code React.
* **L'Usine à Vues (`DynamicExpertView.jsx`) :** Moteur de rendu aveugle. Il itère sur le dictionnaire, résout les chemins de données imbriqués, applique des multiplicateurs mathématiques (ex: pour les pourcentages) et instancie dynamiquement les composants de l'UI Kit.
* **Primitives Intelligentes (`AdvancedTimelineChart.jsx`) :** Les graphiques sont abstraits. Le composant gère mathématiquement la connexion des valeurs nulles (trendlines) et utilise des sous-composants conditionnels (`ConditionalEventDot`) pour éliminer les artefacts visuels sur les courbes cumulées (un marqueur n'est dessiné que si la valeur a évolué).

### 10.2. Backend : Inversion de Contrôle (IoC)
La dette technique liée à la duplication des algorithmes de parcours temporel (timeline) dans les analyseurs enfants a été éradiquée via le pattern *Template Method / Dependency Injection*.
* **Moteur Parent (`BaseRoleAnalyzer`) :** Centralise la logique lourde. Il gère le cache Data Dragon et exécute la boucle de parcours des frames de la timeline (`_extract_timeline_data`).
* **Injection par Lambda (`support_analyzer.py`, `jungle_analyzer.py`) :** Les classes enfants ne contiennent plus de logique structurelle. Elles délèguent le traitement au parent en lui injectant simplement une fonction lambda (Extracteur) dictant quelle métrique précise doit être récupérée à l'instant T (ex: `totalDamageTaken` pour un Vanguard, `totalDamageDoneToChampions` pour une Artillery).

## 11. Refonte Anti-God Files : Pattern Registry et Composition (Juillet 2026)

L'approche décrite dans la Section 10 a montré ses limites (risque d'explosion combinatoire et création de "God Files"). Pour anticiper l'ajout des rôles Top, Mid et Bot (multipliés par leurs archétypes respectifs), l'architecture a basculé d'un modèle d'héritage monolithique vers un modèle de **Composition stricte via Inversion de Contrôle**.

### 11.1. Frontend : Éclatement de la Configuration (Registry Pattern)
Le fichier `roleLayouts.js`, devenu trop massif, a été démantelé.
* **Arborescence Modulaire :** Le layout de chaque archétype est désormais isolé dans son propre fichier (ex: `roles/support/vanguard.js`, `roles/jungle/assassin.js`).
* **Partage de Vues :** Les grilles communes (ex: l'analyse de vision pour les supports) sont isolées dans `shared/visionLayouts.js` et importées au besoin pour éviter la duplication.
* **Le Registre (`layouts/index.js`) :** Un fichier central assemble silencieusement ces modules au démarrage pour reformer le grand dictionnaire attendu par `RoleAnalysisController`. L'ajout d'un archétype ne génère plus aucun conflit de fusion.

### 11.2. Backend : Moteur Statistique par Composants
Les fichiers monolithiques (`support_analyzer.py`, `jungle_analyzer.py`) ont été supprimés. L'extraction des statistiques est déléguée à de petites briques spécialisées (Modules) obéissant à une interface stricte (`BaseMetricModule`).

* **Isolation des Domaines :** L'extraction de données est segmentée géographiquement ou thématiquement. Par exemple, un `VanguardCombatModule` ne gère que les statistiques d'encaissement et de CC, ignorant tout le reste.
* **Orchestrateur Aveugle (`orchestrator.py`) :** Remplace l'ancienne usine à if/else. Il détermine l'archétype, lit un dictionnaire de registre (`registry.py`), instancie la liste des modules requis de manière agnostique (Duck Typing) et fusionne leurs dictionnaires de retour.
* **Persistance de l'Héritage Utilitaire :** Bien que l'architecture soit compositionnelle, les modules complexes (Combat) héritent toujours de `BaseRoleAnalyzer` exclusivement pour exploiter son cache partagé Data Dragon et son moteur de parcours temporel (`_extract_timeline_data`), garantissant d'excellentes performances.



## [2026-07-02] - Refonte de l'architecture des vues expertes (Single Source of Truth)

**Problématique :** Dérive sémantique et redéfinition incohérente des métriques partagées entre différentes vues de rôles (ex: métriques de vision affichant des labels différents pour des données identiques entre Jungle et Support).
**Solution adoptée :** 
- Extraction de la définition des widgets et labels hors des configurations de layouts (`*Layouts.js`).
- Création d'un dictionnaire centralisé (`metricsRegistry.js`) contenant la configuration par défaut de chaque métrique métier.
- Mise à jour du moteur de rendu (`DynamicExpertView.jsx`) pour fusionner la configuration du registre et la déclaration du layout.
- Ajout d'un script de génération automatique (`generate_metrics_dict.js`) pour fournir un dictionnaire à jour aux LLM lors de la création de nouvelles vues (Top, Mid, ADC), empêchant les hallucinations de métriques.


## 12. Standardisation UI et Ergonomie (Juillet 2026)

Pour faire face aux incohérences visuelles et aux problèmes de performances liés au DOM, l'interface utilisateur a subi une cure de standardisation agressive, consolidant le "Design System".

### 12.1. Primitive Visuelle (`Avatar.jsx`)
* **Bordures Natives DataDragon :** Les images carrées fournies par l'API Riot contiennent des bordures noires incrustées.
* **Solution System Design :** Création d'une primitive universelle `<Avatar>`. Elle gère le rognage des bordures noires via un `scale-[1.15]` masqué par un conteneur `overflow-hidden`. Ce composant est désormais l'unique source de vérité pour toutes les images (Champions, Items, Runes, Spells, Lanes) et gère dynamiquement les focus (bordures dorées) et les arrondis standards (`rounded-md`).

### 12.2. Ergonomie Navigationnelle (`FilterBar`)
* **Loi de Fitts et Fréquence :** Les actions ont été scindées selon leur fréquence d'utilisation.
* **Actions Fréquentes :** Les filtres de rôle (Lanes) sont sortis du volet déroulant pour devenir des boutons interactifs directement exposés. Ils implémentent une logique de bascule (Toggle) : cliquer sur un filtre actif réinitialise la vue.
* **Actions Secondaires :** Le filtre de Patch reste confiné dans un composant `CustomSelect` pour économiser l'espace horizontal.

### 12.3. Résilience de l'Infinite Scroll (`MatchList`)
Le bouton de chargement manuel a été remplacé par un système hybride d'Autoload asynchrone.
* **Intersection Observer :** Le chargement local se déclenche nativement à l'approche du bas de page.
* **Scroll Anchoring :** Pour contrer les "Layout Shifts" (sauts de page) causés par le moteur de rendu natif de Google Chrome/Firefox lors de l'injection d'éléments DOM au-dessus du focus, le point d'intersection (la sentinelle) est verrouillé avec une hauteur stricte et la règle CSS `overflow-anchor: none`.
* **Deep Fetch Manuel :** Le bouton manuel est conservé uniquement comme garde-fou pour déclencher la recherche sur les archives distantes de Riot.

### 12.4. Le Scoreboard Universel (`MatchCardSummary`)
L'onglet "Résumé" des parties refuse catégoriquement d'inclure des métriques spécifiques par rôle afin de préserver sa fonction première : la **comparaison verticale**.
* **Alignement Mathématique :** L'UI superpose les métriques transverses (KDA, KP%, Dégâts, Économie) pour que l'œil de l'utilisateur puisse scanner la colonne de haut en bas et identifier les anomalies (le Carry, le Feeder).
* **Jauge Relative :** Les dégâts ne sont plus de simples nombres. Ils sont accompagnés d'une jauge de progression dont le 100% est indexé dynamiquement sur le joueur ayant infligé le maximum de dégâts au sein de la même équipe.
* **Sanctuarisation de l'Analyse :** Toute métrique conditionnelle ou spécifique à un rôle (Tournelles, Vision pure, Pathing) est bannie de cette vue et strictement réservée aux sous-onglets d'Analyse (`RoleAnalysisController`).

## 13. Architecture du Moteur Big Data (Crawler)

### 13.1. Files d'Attente Persistantes (PostgreSQL)
L'ingestion de masse est gérée par un processus asynchrone indépendant (Worker) via le script `run_crawler.py`. Au lieu de dépendre d'outils externes de file d'attente en mémoire vive, la persistance est assurée par PostgreSQL via les tables `crawler_queue` (joueurs découverts) et `crawler_match_queue` (matchs identifiés). Cette conception garantit l'intégrité transactionnelle (gestion des erreurs avec rollback) et permet de résister aux coupures brutales sans perte d'état.

### 13.2. Contrôle d'État (Singleton) et Mode "Extraction Seule"
Le pilotage du worker repose sur une table Singleton (`crawler_state`). 
* **Réactivité :** Le worker lit cet état avant chaque itération (grâce au forçage de rafraîchissement via SQLAlchemy), permettant une mise en pause immédiate de l'ingestion depuis le frontend.
* **Bridage de l'Exploration (Extraction Only) :** Un mode spécifique a été implémenté pour interdire l'insertion de nouveaux joueurs (fin du "Snowballing") dans la file d'attente, tout en forçant la consommation exclusive de la file existante.

### 13.3. Télémétrie via Server-Sent Events (SSE)
Pour le monitoring en temps réel, le backend expose un flux SSE (`stream-metrics`). Un soin particulier a été apporté à la gestion des sessions SQLAlchemy : la transaction est commitée à chaque itération de la boucle de streaming pour vider le cache transactionnel. Cela garantit que le tableau de bord frontend reçoit des métriques strictement à jour (requêtes, taille des files, statut) sans effet de "données fantômes".

## 14. Ingénierie Analytique et Backfill Temporel (Snowball)

Afin d'alimenter les futures recommandations de Draft de manière conditionnelle (ex: Probabilité de victoire si avance de +1500 Golds à 15 minutes), l'architecture extrait des métriques temporelles directement dans le Hot Storage.

### 14.1. Extraction Synchronisée (DataTrimmer)
Dès qu'une Timeline et ses Détails sont disponibles en mémoire, le Trimmer calcule dynamiquement :
* La différence de Golds (`gold_diff_15m`) et d'Expérience (`xp_diff_15m`) entre chaque joueur et son vis-à-vis strict (rôle par rôle) à la frame exacte de la 15ème minute.
* Le statut de `is_snowballing` (Avance de ressources critique).
Ces données scalaires sont insérées dans `MatchParticipant` par des requêtes d'Update chirurgicales.

### 14.2. Backfill Piloté par Base de Données
Pour réhydrater un historique existant sans consommer l'API Riot, le script `backfill_from_cold.py` obéit au SGBD. Il liste les IDs présents dans PostgreSQL, se connecte au Data Lake MinIO, télécharge les JSON bruts correspondants, et exécute le Trimmer pour propager rétroactivement les nouvelles métriques d'analyse de phase de lane vers le Hot Storage.

## 15. Refonte de l'Analyse Transverse (Synergies & Matchups)

Afin de supporter l'affichage lisible de données temporelles complexes (courbes de winrate sur la durée) et d'assurer une navigation fluide entre des dizaines de champions, la vue "Synergies et Matchups" a été totalement restructurée.

### 15.1. Contrat de Données et Orchestrateur (Backend)
L'ancien format de données plat a été remplacé par une structure multi-dimensionnelle groupée par rôle.
* **Extraction Sémantique** : L'orchestrateur SQL extrait désormais systématiquement la lane des participants analysés.
* **Groupement Actif** : Le backend calcule et assemble les résultats dans un dictionnaire structuré par position ({ TOP: [...], JUNGLE: [...], etc. }), permettant au frontend d'ingérer la donnée brute sans aucun post-traitement JavaScript lourd.
* **Référentiel Communautaire Croisé (Vues Matérialisées)** : Contrairement à la version précédente, la donnée globale n'est plus une moyenne absolue du champion affronté. L'orchestrateur extrait le pool exact d'affrontements du joueur (ex: "Mes parties d'Orianna contre Zed") et interroge des Vues Matérialisées pour obtenir l'addition mathématique exacte de ces affrontements spécifiques au niveau communautaire.

### 15.2. Architecture UI "Bottom Console" (Split Horizontal)
L'interface en accordéon (qui écrasait les graphiques) a été remplacée par un pattern "Master-Detail" horizontal, optimal pour la Data-Viz.
* **Master (Top) :** Une grille (`LaneGrid`) occupant 100% de la largeur contenant des "Chips" (Mini-cartes) ultra-compactes, permettant de scanner rapidement les winrates et les volumes de jeu.
* **Detail (Bottom) :** Lors du clic sur un champion, la vue se scinde. Une console fixe glisse depuis le bas de l'écran, offrant au graphique temporel (Recharts) toute la largeur nécessaire pour afficher une courbe lisse et lisible sans décaler la liste supérieure.

### 15.3. Persistance d'État et Unicité (Frontend)
Le cycle de vie du composant a été sécurisé contre les requêtes superflues et les conflits de sélection.
* **Clé Composite :** L'état de sélection croise désormais l'identifiant du champion (`champion_id`) avec son rôle d'apparition (`targetLane`) pour empêcher les activations multiples si un même champion est joué sur plusieurs positions (ex: Yasuo Mid et Top).
* **Persistance via `useRef` :** Lors d'un changement de filtre (ex: passage de "Carrière" à "Récent"), la sélection active est mémorisée silencieusement. Au retour de l'appel API, le composant cherche si la clé composite existe toujours dans le nouveau set de données et réhydrate la console automatiquement, évitant la frustration d'une fermeture intempestive.

### 15.4. Stabilisation du DOM et Accessibilité
Des mécanismes stricts ont été mis en place pour empêcher l'interface de "sauter" ou de déborder.
* **Scroll Anchoring Actif :** Les mini-cartes utilisent `React.forwardRef`. Lors du clic, l'apparition de la Bottom Console redimensionne la grille. Un `useEffect` attend la fin de l'animation CSS (310ms) puis exécute un `scrollIntoView` pour forcer le navigateur à recentrer le scroll sur la carte cliquée.
* **Contrôle Spatial et Design System :** Les cartes compactes imposent un `min-w-0` et un `truncate` stricts sur les libellés de volume (parties jouées) pour empêcher l'apparition d'une troisième ligne de texte ou d'une barre de défilement horizontale. Les couleurs sémantiques (`text-lol-win`, `text-lol-loss`) sont calculées dynamiquement pour le joueur et la communauté autour du pivot d'équilibre (50%).

# 16. Moteur Big Data et Topographie Riot API (Août 2026)
L'architecture analytique a franchi un cap pour supporter l'ingestion massive sans dégrader les temps de réponse de l'API.

### 16.1. Vues Matérialisées (Materialized Views)
Pour contrer l'explosion combinatoire des calculs de matchups (plus de 130 000 combinaisons par tranches de 5 minutes), le calcul à la volée a été abandonné au profit du moteur relationnel.

* **Snapshot Analytique** : La base PostgreSQL génère des vues matérialisées pré-calculant les winrates croisés de la communauté (Matchups et Synergies).

* **Rafraîchissement Non Bloquant** : Grâce à l'utilisation d'index uniques composites (sur les champions, les rôles et la tranche de temps), le rafraîchissement des vues s'effectue via l'instruction REFRESH MATERIALIZED VIEW CONCURRENTLY. Le processus d'agrégation tourne en arrière-plan (script ETL dédié) sans jamais verrouiller la table ni interrompre le service côté client.

### 16.2. Topographie Match-V5 et Correction Géo-Spatiale
Une anomalie majeure d'héritage de l'API Riot (champ lane de la V4 taggué en NONE dans la quasi-totalité des parties modernes) causait une fuite de données massive, rendant les champions invisibles dans les algorithmes.

* **Abandon du Legacy** : Le Crawler ignore désormais le champ obsolète lane et exploite exclusivement le champ teamPosition (calculé algorithmiquement par Riot sur les 15 premières minutes de jeu).

* **Déduplication Hot Storage** : L'architecture du modèle MatchParticipant a été nettoyée. Les données historiques exactes ont été transférées massivement via une commande SQL vers la colonne métier lane, et la colonne redondante position a été détruite pour garantir une source de vérité unique (SSOT).

* **Diagnostic Frontend (Laboratoire Big Data)** : Ajout d'une colonne de répartition spatiale (Lanes) par champion dans la vue globale pour monitorer et auditer la viabilité des classifications Riot en temps réel (ex: Détection et compréhension des biais algorithmiques comme le cas du "Fasting Senna").

## 17. Analyse Globale (Meta Duos) et Optimisation du Rendu DOM

Afin d'exploiter les données massives du Crawler et d'offrir une exploration macroscopique de la meta, une nouvelle vue dédiée aux synergies globales ("Meta Duos") a été implémentée. Face au volume de combinaisons possibles, des choix architecturaux stricts ont été appliqués côté client pour garantir les performances.

### 17.1. Virtualisation du DOM (Windowing)
L'affichage de milliers de duos (combinaisons croisées) dans une liste standard figeait le moteur de rendu du navigateur et surchargeait la RAM.
* **Rendu Partiel (`@tanstack/react-virtual`) :** L'application n'instancie plus l'intégralité des nœuds HTML. Seules les cartes strictement visibles à l'écran (plus un *overscan* de 5 éléments pour fluidifier le défilement) sont montées en mémoire.
* **Positionnement Absolu Dynamique :** Le conteneur parent calcule dynamiquement sa hauteur totale virtuelle, tandis que les enfants sont positionnés en absolu (via `transform: translateY`). Cela garantit un défilement natif à 60 FPS sans "Layout Shifts", même avec plusieurs dizaines de milliers de lignes de données.

### 17.2. Résolution du "Split-Brain" et Déduplication Client
Le backend relationnel extrait les affrontements de manière brute depuis les vues matérialisées[cite: 6] (ex: Ligne 1: A avec B / Ligne 2: B avec A). Pour éviter l'apparition de doublons visuels ayant des statistiques croisées identiques :
* **Clé Composite Triée :** Le frontend implémente un `Set` de déduplication algorithmique au niveau de l'orchestrateur. Chaque duo génère une clé lexicographique stricte (ex: `[id_A, id_B].sort().join('-')`), purgeant la liste avant le tri métier.
* **Ancrage Visuel Dynamique (UX) :** Pour faciliter le scan vertical par l'utilisateur, le composant `<DuoRowCard>` calcule dynamiquement sa disposition interne. Le champion correspondant à la lane primaire (le filtre "d'ancrage") est toujours forcé sur l'encart de gauche de la carte et de la console, effectuant un pivot (swap) des portraits et des données à la volée si la base de données les avait renvoyés dans le sens inverse.

### 17.3. Consolidation du Layout Master-Detail et Routage d'États
La topologie visuelle réutilise les concepts de Layout étirable éprouvés par la vue Synergies[cite: 6].
* **Flexbox Fluide :** L'interface abandonne les superpositions en position absolue au profit d'un partage d'espace strict (`basis-1/2`). Lors de l'ouverture de la console temporelle d'analyse de *Power Spikes*, la liste virtuelle s'écrase proprement vers le haut sans masquer la moindre donnée, préservant les coins arrondis et le Glassmorphism du Design System.
* **Filtres Hybrides Segmentés :** La `FilterBar` globale a été refactorisée pour agir selon un pattern conditionnel. En mode "Meta Duos", elle abandonne le sélecteur temporel pour exposer deux rangées distinctes (Rôle Primaire et Secondaire). Cette ségrégation visuelle prévient les conflits d'états illogiques (ex: bloquer la sélection de deux rôles identiques) via des règles d'exclusion appliquées avant même la requête API.