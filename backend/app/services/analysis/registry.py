"""
===============================================================================
FICHIER : backend/app/services/analysis/registry.py
PROJET  : JungleDiff

DESCRIPTION :
Dictionnaire de configuration absolu (Pattern Registre).
Lie dynamiquement les rôles et archétypes aux modules statistiques à exécuter.
===============================================================================
"""

from app.services.analysis.modules.vision.support_vision import SupportVisionModule
from app.services.analysis.modules.vision.jungle_vision import JungleVisionModule
from app.services.analysis.modules.combat.vanguard_combat import VanguardCombatModule
from app.services.analysis.modules.combat.artillery_combat import ArtilleryCombatModule
from app.services.analysis.modules.combat.assassin_combat import AssassinCombatModule
from app.services.analysis.modules.resources.jungle_resources import JungleResourceModule
from app.services.analysis.modules.objectives.jungle_objectives import JungleObjectiveModule

# Singleton : Instanciation unique en mémoire lors de l'initialisation de l'API
support_vision_module = SupportVisionModule()
jungle_vision_module = JungleVisionModule()
vanguard_combat_module = VanguardCombatModule()
artillery_combat_module = ArtilleryCombatModule()
assassin_combat_module = AssassinCombatModule()
jungle_resource_module = JungleResourceModule()
jungle_objective_module = JungleObjectiveModule()

ANALYSIS_REGISTRY = {
    "SUPPORT": {
        "VANGUARD": {
            "vision": support_vision_module,
            "combat": vanguard_combat_module
        },
        "ARTILLERY": {
            "vision": support_vision_module,
            "combat": artillery_combat_module
        }
    },
    "JUNGLE": {
        "ASSASSIN": {
            "combat": assassin_combat_module,
            "objectives": jungle_objective_module,
            "resources": jungle_resource_module,
            "vision": jungle_vision_module
        }
    }
}