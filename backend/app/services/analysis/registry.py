"""
===============================================================================
FICHIER : backend/app/services/analysis/registry.py
PROJET  : JungleDiff

DESCRIPTION :
Dictionnaire de configuration absolu (Pattern Registre).
Lie dynamiquement les rôles et archétypes aux modules statistiques à exécuter.

MODIFICATIONS :
- Instanciation du JunglePathingModule et injection dans le rôle JUNGLE
  pour extraire les données spatiales lors de l'orchestration des vues.
===============================================================================
"""

from app.services.analysis.modules.vision.support_vision import SupportVisionModule
from app.services.analysis.modules.vision.jungle_vision import JungleVisionModule
from app.services.analysis.modules.combat.vanguard_combat import VanguardCombatModule
from app.services.analysis.modules.combat.artillery_combat import ArtilleryCombatModule
from app.services.analysis.modules.combat.assassin_combat import AssassinCombatModule
from app.services.analysis.modules.resources.jungle_resources import JungleResourceModule
from app.services.analysis.modules.objectives.jungle_objectives import JungleObjectiveModule
from app.services.analysis.modules.objectives.support_objectives import SupportObjectiveModule
from app.services.analysis.modules.resources.support_resources import SupportResourceModule
from app.services.analysis.modules.agency.support_agency import SupportAgencyModule
from app.services.analysis.modules.pathing.jungle_pathing import JunglePathingModule

# Singleton : Instanciation unique en mémoire lors de l'initialisation de l'API
support_vision_module = SupportVisionModule()
jungle_vision_module = JungleVisionModule()
vanguard_combat_module = VanguardCombatModule()
artillery_combat_module = ArtilleryCombatModule()
assassin_combat_module = AssassinCombatModule()
jungle_resource_module = JungleResourceModule()
jungle_objective_module = JungleObjectiveModule()
support_objective_module = SupportObjectiveModule()
support_resource_module = SupportResourceModule()
support_agency_module = SupportAgencyModule()
jungle_pathing_module = JunglePathingModule()

ANALYSIS_REGISTRY = {
    "SUPPORT": {
        "VANGUARD": {
            "vision": support_vision_module,
            "combat": vanguard_combat_module,
            "objectives": support_objective_module,
            "resources": support_resource_module,
            "agency": support_agency_module
        },
        "ARTILLERY": {
            "vision": support_vision_module,
            "combat": artillery_combat_module,
            "objectives": support_objective_module,
            "resources": support_resource_module,
            "agency": support_agency_module
        }
    },
    "JUNGLE": {
        "ASSASSIN": {
            "combat": assassin_combat_module,
            "objectives": jungle_objective_module,
            "resources": jungle_resource_module,
            "vision": jungle_vision_module,
            "pathing": jungle_pathing_module
        }
    }
}