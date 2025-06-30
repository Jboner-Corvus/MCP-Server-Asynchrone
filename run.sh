#!/usr/bin/env bash

# ==============================================================================
# CONSOLE DE GESTION - MCP-SERVEUR v4.3
# - Docker Bake est maintenant utilisé par défaut pour toutes les constructions.
# - Simplification du menu et refactorisation pour plus de clarté.
# ==============================================================================

# --- Configuration Stricte et Gestion des Erreurs ---
set -euo pipefail

# --- Palette de Couleurs ---
NC=$(tput sgr0) # Pas de Couleur
FG_RED=$(tput setaf 1)
FG_GREEN=$(tput setaf 2)
FG_YELLOW=$(tput setaf 3)
FG_BLUE=$(tput setaf 4)
FG_MAGENTA=$(tput setaf 5)
FG_CYAN=$(tput setaf 6)
FG_BRIGHT_WHITE=$(tput setaf 15)
FG_LIGHT_BLUE=$(tput setaf 12)
FG_LIGHT_CYAN=$(tput setaf 14)
FG_LIGHT_GREEN=$(tput setaf 10)
FG_LIGHT_YELLOW=$(tput setaf 11)

# --- Variables Globales ---
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
ENV_FILE="${PROJECT_ROOT}/.env"
ENV_EXAMPLE_FILE="${PROJECT_ROOT}/.env.example"

readonly ALL_MANAGEABLE_MODULES_ARRAY=("fastmcp-server" "worker" "redis")

# ==============================================================================
# Fonctions Utilitaires et Logging
# ==============================================================================

_log() {
    local type_tag="$1"
    shift
    local message="$1"
    local color_prefix="$FG_CYAN"
    local symbol="[i]"

    case "$type_tag" in
      INFO)    color_prefix="$FG_CYAN"          ; symbol="[📡]" ;;
      WARN)    color_prefix="$FG_YELLOW"        ; symbol="[⚡]" ;;
      ERROR)   color_prefix="$FG_RED"           ; symbol="[💣]" ;;
      SUCCESS) color_prefix="$FG_GREEN"         ; symbol="[🔑]" ;;
      CMD)     color_prefix="$FG_LIGHT_CYAN"    ; symbol="[⚙️]" ;;
      SYSTEM)  color_prefix="$FG_LIGHT_BLUE"    ; symbol="[💻]" ;;
      PNPM)    color_prefix="$FG_LIGHT_GREEN"   ; symbol="[🅿️]" ;;
    esac
    printf "${color_prefix}%s [%s] [%s] %s${NC}\n" "$symbol" "$(date +'%H:%M:%S')" "$type_tag" "$message"
}

_error_exit() {
    _log "ERROR" "$1" >&2
    exit "${2:-1}"
}

_ensure_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        _log "WARN" "Fichier de configuration ${FG_YELLOW}$ENV_FILE${NC} manquant."
        if [ -f "$ENV_EXAMPLE_FILE" ]; then
            _log "SYSTEM" "Création de ${FG_LIGHT_CYAN}$ENV_FILE${NC} depuis ${FG_LIGHT_BLUE}$ENV_EXAMPLE_FILE${NC}..."
            cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
            _log "WARN" "${FG_GREEN}$ENV_FILE${NC} créé. ${FG_YELLOW}Veuillez le personnaliser avant de continuer !${NC}"
            read -p "Appuyez sur [Entrée] pour continuer après édition..."
        else
            _error_exit "Fichier modèle ${FG_RED}$ENV_EXAMPLE_FILE${NC} introuvable."
        fi
    fi
}

_check_dependencies() {
    if ! command -v docker &> /dev/null; then _error_exit "Dépendance 'docker' non trouvée. Veuillez l'installer."; fi
    if ! docker compose version &> /dev/null; then _error_exit "Dépendance 'docker compose' (v2+) non trouvée."; fi
    _log "SUCCESS" "Dépendances Docker et Docker Compose vérifiées."
}

# ==============================================================================
# Fonctions pour les Actions du Menu
# ==============================================================================

# --- Actions Docker Simplifiées ---
_action_start() {
    _ensure_env_file
    _log "INFO" "Démarrage des services (construction avec Bake par défaut)..."
    _log "CMD" "COMPOSE_BAKE=true docker compose -f \"$COMPOSE_FILE\" up --build -d"
    COMPOSE_BAKE=true docker compose -f "$COMPOSE_FILE" up --build -d
    _log "SUCCESS" "Services démarrés. Utilisez l'option 'Statut' ou 'Logs' pour vérifier."
}

_action_restart_all() {
    _log "INFO" "Redémarrage complet : arrêt, reconstruction (avec Bake) et démarrage."
    _log "CMD" "docker compose -f \"$COMPOSE_FILE\" down"
    docker compose -f "$COMPOSE_FILE" down
    _log "CMD" "COMPOSE_BAKE=true docker compose -f \"$COMPOSE_FILE\" up --build -d"
    COMPOSE_BAKE=true docker compose -f "$COMPOSE_FILE" up --build -d
    _log "SUCCESS" "Tous les services ont été redémarrés avec les derniers changements."
}

_action_stop() {
    _log "INFO" "Arrêt de tous les services Docker..."
    _log "CMD" "docker compose -f \"$COMPOSE_FILE\" down"
    docker compose -f "$COMPOSE_FILE" down
    _log "SUCCESS" "Services arrêtés."
}

_action_rebuild_no_cache() {
    _log "WARN" "Reconstruction forcée des images avec Bake (SANS CACHE)..."
    _log "CMD" "COMPOSE_BAKE=true docker compose -f \"$COMPOSE_FILE\" build --no-cache"
    COMPOSE_BAKE=true docker compose -f "$COMPOSE_FILE" build --no-cache
    _log "SUCCESS" "Reconstruction terminée."
    _log "INFO" "Démarrage automatique des services avec les nouvelles images..."
    _log "CMD" "docker compose -f \"$COMPOSE_FILE\" up -d"
    docker compose -f "$COMPOSE_FILE" up -d
    _log "SUCCESS" "Services démarrés avec les images reconstruites."
}

# --- Actions de Diagnostic et Maintenance ---
_action_show_status() {
    _log "INFO" "Statut des conteneurs Docker :"
    docker compose -f "$COMPOSE_FILE" ps
}

_action_show_logs() {
    _log "INFO" "Affichage des journaux en continu (Ctrl+C pour quitter)..."
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100
}

_action_shell_access() {
    PS3="Choisissez le conteneur pour l'accès shell : "
    select module in "${ALL_MANAGEABLE_MODULES_ARRAY[@]}"; do
        if [[ -n "$module" ]]; then
            _log "INFO" "Ouverture d'un shell dans le conteneur '${FG_GREEN}$module${NC}'..."
            _log "CMD" "docker compose -f \"$COMPOSE_FILE\" exec \"$module\" /bin/bash"
            docker compose -f "$COMPOSE_FILE" exec "$module" /bin/bash || docker compose -f "$COMPOSE_FILE" exec "$module" /bin/sh
            break
        else
            _log "WARN" "Sélection invalide."
            break
        fi
    done
}

_action_clean_docker() {
    _log "WARN" "Cette action va supprimer tous les conteneurs ET VOLUMES associés à ce projet."
    read -p "Êtes-vous sûr de vouloir continuer? (o/N) " -n 1 -r; echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        _log "INFO" "Nettoyage du projet Docker (conteneurs, volumes)..."
        _log "CMD" "docker compose -f \"$COMPOSE_FILE\" down -v --remove-orphans"
        docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
        _log "SUCCESS" "Nettoyage terminé."
    else
        _log "INFO" "Nettoyage annulé."
    fi
}

# --- Actions de Développement Local ---
_run_pnpm_script() {
    local script_name="$1"
    local script_desc="$2"
    if ! command -v pnpm &> /dev/null; then _error_exit "'pnpm' non trouvé. Veuillez l'installer."; fi

    _log "PNPM" "Lancement du script '${FG_YELLOW}$script_name${NC}' ($script_desc)..."
    _log "CMD" "pnpm run $script_name"
    (cd "$PROJECT_ROOT" && pnpm run "$script_name")
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        _log "SUCCESS" "Script '${FG_YELLOW}$script_name${NC}' terminé avec succès."
    else
        _log "ERROR" "Le script '${FG_YELLOW}$script_name${NC}' a échoué avec le code de sortie $exit_code."
    fi
}

_action_clean_dev_environment() {
    _log "WARN" "Cette action va supprimer node_modules, dist, et pnpm-lock.yaml."
    _log "WARN" "Elle arrêtera également les conteneurs Docker pour libérer les fichiers."
    read -p "Êtes-vous sûr de vouloir réinitialiser l'environnement de développement ? (o/N) " -n 1 -r; echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        _log "INFO" "Nettoyage annulé."
        return
    fi

    _log "INFO" "Arrêt des conteneurs pour libérer les fichiers..."
    _log "CMD" "docker compose -f \"$COMPOSE_FILE\" down"
    docker compose -f "$COMPOSE_FILE" down
    _log "SUCCESS" "Conteneurs arrêtés."

    _log "INFO" "Suppression des dossiers de développement..."
    if sudo rm -rf "$PROJECT_ROOT/node_modules" "$PROJECT_ROOT/dist" "$PROJECT_ROOT/pnpm-lock.yaml"; then
        _log "SUCCESS" "Anciens dossiers et fichiers supprimés."
    else
        _error_exit "Échec de la suppression des dossiers. Veuillez vérifier les permissions."
    fi

    _log "PNPM" "Réinstallation propre des dépendances..."
    _log "CMD" "pnpm install"
    if (cd "$PROJECT_ROOT" && pnpm install); then
        _log "SUCCESS" "Dépendances réinstallées. L'environnement de développement est propre."
    else
        _error_exit "Échec de la réinstallation des dépendances."
    fi
}

# ==============================================================================
# UI du Menu
# ==============================================================================
_show_menu() {
    clear
    echo -e "${FG_MAGENTA}"
    cat << "EOF"
  ╔═════════════════════╗
  ║  ███╗   ███╗██████╗ ║
  ║  ████╗ ████║╚════██╗║
  ║  ██╔████╔██║ █████╔╝║
  ║  ██║╚██╔╝██║██╔═══╝ ║
  ║  ██║ ╚═╝ ██║███████╗║
  ║  ╚═╝     ╚═╝╚══════╝║
  ╚═════════════════════╝
EOF
    echo -e "${NC}${FG_LIGHT_YELLOW}       >>> CONSOLE DE GESTION - MCP-SERVEUR v4.3 <<<${NC}"
    echo "────────────────────────────────────────────────────────"
    echo -e " ${FG_CYAN}Gestion Docker & Services${NC}"
    printf "  1) ${FG_GREEN}🟢 Démarrer / Mettre à jour (avec Bake)${NC}\n"
    printf "  2) ${FG_YELLOW}🔄 Redémarrer (Arrêt + Build + Démarrage)${NC}\n"
    printf "  3) ${FG_RED}🔴 Arrêter tous les services${NC}\n"
    printf "  4) ${FG_BLUE}🔨 Reconstruire les images (SANS CACHE)${NC}\n"
    echo ""
    echo -e " ${FG_CYAN}Diagnostic & Maintenance${NC}"
    printf "  5) ${FG_BLUE}📊 Afficher le statut${NC}\n"
    printf "  6) ${FG_BLUE}📜 Afficher les logs${NC}\n"
    printf "  7) ${FG_BLUE}🐚 Accéder au shell d'un conteneur${NC}\n"
    printf "  8) ${FG_RED}🧹 Nettoyer le projet Docker (avec volumes)${NC}\n"
    echo ""
    echo -e " ${FG_CYAN}Qualité & Développement (Hôte Local)${NC}"
    printf "  10) ${FG_LIGHT_GREEN}🔍 Linter le code (lint)${NC}\n"
    printf "  11) ${FG_LIGHT_GREEN}✨ Formater le code (format)${NC}\n"
    printf "  12) ${FG_LIGHT_GREEN}🧪 Lancer les tests (test)${NC}\n"
    printf "  13) ${FG_LIGHT_GREEN}📘 Vérifier les types (check-types)${NC}\n"
    printf "  14) ${FG_RED}🧽 Nettoyer l'environnement de Dev${NC}\n"
    echo ""
    printf "  15) ${FG_RED}🚪 Quitter${NC}\n"
    echo "────────────────────────────────────────────────────────"
}

# ==============================================================================
# Boucle Principale
# ==============================================================================
main() {
    trap '_error_exit "Interruption manuelle détectée. Arrêt..."' INT TERM

    _check_dependencies
    _ensure_env_file

    while true; do
        _show_menu
        read -rp "Votre choix : " choice

        case "$choice" in
            1) _action_start ;;
            2) _action_restart_all ;;
            3) _action_stop ;;
            4) _action_rebuild_no_cache ;;
            5) _action_show_status ;;
            6) _action_show_logs ;;
            7) _action_shell_access ;;
            8) _action_clean_docker ;;
            10) _run_pnpm_script "lint" "Analyse statique du code" ;;
            11) _run_pnpm_script "format" "Formatage du code avec Prettier" ;;
            12) _run_pnpm_script "test" "Exécution de la suite de tests" ;;
            13) _run_pnpm_script "check-types" "Vérification des types TypeScript" ;;
            14) _action_clean_dev_environment ;;
            15)
                echo -e "${FG_GREEN}Au revoir!${NC}"
                exit 0
                ;;
            *)
                echo -e "${FG_RED}Choix invalide. Veuillez réessayer.${NC}"
                ;;
        esac
        read -p $'\nAppuyez sur Entrée pour retourner au menu...'
    done
}

# --- Point d'entrée du script ---
main "$@"
