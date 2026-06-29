# Document d'Architecture et de Suivi - JungleDiff

## 1. Description Exhaustive de l'Application

JungleDiff est une application web analytique destinée aux joueurs de League of Legends. L'objectif est de fournir des métriques avancées et des analyses croisées en exploitant les API Riot Games (Account V1, Match V5). 

L'application est conçue pour fonctionner initialement en local, mais son architecture backend (Python/FastAPI) est dimensionnée avec une stack professionnelle pour supporter une future mise en production et une utilisation massive.

### Fonctionnalités cibles (Vues Frontend)
*   **Vue Historique :** Liste paginée (lazy loading) des matchs d'un joueur (date, patch, champion, KDA, victoire/défaite) avec volet déroulant pour le détail.
*   **Vue Clear :** Analyse spécifique pour les Junglers. Cartographie de la route moyenne lors du premier clear (0 à 4 minutes), filtrable par champion, patch et côté de la carte (Bleu/Rouge).
*   **Vue Synergies et Matchups :** Analyse du winrate croisé d'un joueur en fonction des champions alliés ou ennemis rencontrés sur des positions spécifiques.

---

## 2. Stratégies de Conception Technique

Pour garantir la scalabilité et éviter les goulets d'étranglement (Rate Limits de Riot, temps de calcul SQL), des choix architecturaux stricts ont été actés, écartant certaines idées initiales inefficaces (comme les "capteurs stupides" ou le profilage en mémoire vive).

### 2.1. L'Approche "Data Lake" et l'Ingestion Découplée
Le téléchargement et l'analyse de données sont deux processus strictement séparés pour éviter la perte de données en cas d'erreur.
1.  **Moissonnage (Seed) :** Un script récupère les identifiants bruts des dernières parties.
2.  **Worker Asynchrone (ARQ) :** Télécharge les payloads JSON (Détails et Timeline) à pleine vitesse (15 requêtes simultanées).
3.  **Stockage Brut :** Le JSON intégral est stocké tel quel dans une colonne `JSONB` de PostgreSQL (Données froides).
4.  **Analyse Différée :** Les scripts analytiques ou les outils de cartographie (Mapper) lisent la base de données locale sans solliciter l'API Riot.

### 2.2. Modèle Relationnel et Dédoublonnage (Données Chaudes)
Pour que le frontend réponde instantanément, les données essentielles sont extraites des JSON lors de l'ingestion et placées dans un modèle relationnel strict.
*   **Dédoublonnage :** Une partie contenant 10 joueurs n'est enregistrée qu'une seule fois dans la table `Match`.
*   **Table de Liaison :** La table `MatchParticipant` fait le pont entre `Match` et `Player`. C'est le cœur du système analytique.
*   **Auto-jointures (Self-Join) :** La vue "Synergies" exploitera des requêtes SQL d'auto-jointure sur `MatchParticipant` (indexée par `puuid`, `lane`, `champion_id`) pour calculer les winrates croisés de manière algorithmique sans surcharger Python.

### 2.3. Gestion du Rate Limit et Concurrence
L'API Riot impose une limite stricte (ex: 20 requêtes/sec, 100 requêtes/2 min).
*   **Client HTTP Intelligent :** Le client intercepte le code HTTP 429 et met en pause de manière asynchrone le processus en lisant le header `Retry-After`.
*   **Rafale (Burst) :** Les workers ARQ ne sont pas bridés artificiellement (pas de pause arbitraire de 2.5s). Ils consomment les jetons API à pleine vitesse jusqu'à heurter la limite, puis se mettent en pause globale.

### 2.4. Routage Géographique et Résilience
*   **Routage Continental :** L'application interroge les endpoints continentaux (`europe`, `americas`) et non régionaux, permettant la scalabilité internationale. Le `match_id` natif de Riot sert de clé primaire (ex: `EUW1_...`) et identifie implicitement la région.
*   **Clé API Dynamique :** La configuration est conçue pour gérer la clé API via Redis. Si une erreur HTTP 403 survient, le backend se met en pause, alerte le frontend, et attend la mise à jour de la clé sans nécessiter le redémarrage des conteneurs.

### 2.5. Orchestration de la Timeline (Les 3 Vitesses)
La Timeline représente 90% du poids d'une partie. La télécharger de manière synchrone provoquerait un timeout.
1.  **Vitesse 1 (Synchrone) :** Mise à jour immédiate de l'Historique (détails de base uniquement).
2.  **Vitesse 2 (Background) :** Un worker télécharge en arrière-plan et en basse priorité les timelines des parties identifiées comme "Jungle".
3.  **Vitesse 3 (On-Demand) :** Si l'utilisateur demande la vue Clear avant la fin de la Vitesse 2, la tâche est repriorisée.

### 2.6. Architecture LLM (Assistant Contextuel - POC)

Afin d'intégrer un assistant conversationnel (Gemma 4) sans compromettre la stabilité de l'application ni provoquer d'hallucinations, l'approche de "Tool Calling" autonome a été écartée. Le système repose sur le motif **"Context Injection"** (RAG déterministe) couplé à un flux **Server-Sent Events (SSE)**.

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