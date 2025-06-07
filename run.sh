#!/usr/bin/env bash

# ==============================================================================
# CONSOLE DE GESTION - MODEL CONTEXT PROTOCOLE ASYNCHRONE v3.0 (HTTP Streaming)
# Script de gestion Docker interactif pour FastMCP - Version simplifiée (Remote uniquement)
# ==============================================================================

# --- Configuration Stricte et Gestion des Erreurs ---
set -euo pipefail

# --- Palette de Couleurs ---
NC='\033[0m' # Pas de Couleur - Réinitialisation
FG_RED='\033[0;31m'
FG_GREEN='\033[0;32m'
FG_YELLOW='\033[0;33m'
FG_BLUE='\033[0;34m'
FG_MAGENTA='\033[0;35m'
FG_CYAN='\033[0;36m'
FG_WHITE='\033[0;37m'
FG_DARK_GRAY='\033[1;30m'
FG_BRIGHT_WHITE='\033[1;37m'
FG_LIGHT_BLUE='\033[1;34m'
FG_LIGHT_CYAN='\033[1;36m'
FG_LIGHT_GREEN='\033[1;32m'
FG_LIGHT_MAGENTA='\033[1;35m'
FG_LIGHT_YELLOW='\033[1;33m'
FG_LIGHT_RED='\033[1;31m'
FG_LIGHT_GRAY='\033[0;37m'


# --- Variables Globales ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

UP_ARGS_DEFAULT="-d --remove-orphans"
UP_ARGS="$UP_ARGS_DEFAULT"
SCRIPT_BUILD_ARGS=""

APP_MODULE_NAME="fastmcp-server"
WORKER_MODULE_NAME="worker"
REDIS_MODULE_NAME="redis"

BUILDABLE_MODULES_STR="$APP_MODULE_NAME $WORKER_MODULE_NAME"
PULLABLE_MODULES_STR="$REDIS_MODULE_NAME"
ALL_MANAGEABLE_MODULES_STR="$APP_MODULE_NAME $WORKER_MODULE_NAME $REDIS_MODULE_NAME"

read -r -a ALL_MANAGEABLE_MODULES_ARRAY <<< "$ALL_MANAGEABLE_MODULES_STR"
read -r -a BUILDABLE_MODULES_ARRAY <<< "$BUILDABLE_MODULES_STR"
read -r -a PULLABLE_MODULES_ARRAY <<< "$PULLABLE_MODULES_STR"

PNPM_SCRIPTS_ARRAY=("lint" "format" "check-types" "test")

DEFAULT_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
COMPOSE_FILE="$DEFAULT_COMPOSE_FILE"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_EXAMPLE_FILE="$PROJECT_ROOT/.env.example"

SHOW_MESSAGES=true
current_session_started_modules=""

# --- Fonctions UI et Logging ---
_log() {
  if [ "$SHOW_MESSAGES" = true ]; then
    local color_prefix="$FG_CYAN"
    local symbol="[i]"
    local type_tag="$1"
    shift
    case "$type_tag" in
      INFO)    color_prefix="$FG_CYAN"; symbol="[📡]" ;;
      WARN)    color_prefix="$FG_YELLOW";        symbol="[⚡]" ;;
      ERROR)   color_prefix="$FG_RED";           symbol="[💣]" ;;
      SUCCESS) color_prefix="$FG_GREEN";         symbol="[🔑]" ;;
      CMD)     color_prefix="$FG_DARK_GRAY";     symbol="[⚙️]" ;;
      SYSTEM)  color_prefix="$FG_LIGHT_BLUE";    symbol="[💻]" ;;
      INPUT)   color_prefix="$FG_MAGENTA";       symbol="[⌨️]" ;;
      DEBUG)   color_prefix="$FG_LIGHT_GRAY";    symbol="[🔬]" ;;
      MCP)     color_prefix="$FG_LIGHT_MAGENTA"; symbol="[💡]" ;;
      PNPM)    color_prefix="$FG_LIGHT_GREEN";   symbol="[🅿️]" ;;
      *)       type_tag="LOG"; color_prefix="$FG_WHITE"; symbol="[?]" ;;
    esac
    printf "${color_prefix}%s [%s] [%s] %b${NC}\n" "$symbol" "$(date +'%H:%M:%S')" "$type_tag" "$1"
  fi
}

_error_exit() {
  if [ "$SHOW_MESSAGES" = true ]; then
    printf "\n${FG_RED}"
    echo -e "╔═════════════════════════════════════════════════════════════════════════════╗"
    echo -e "║   ${FG_BRIGHT_WHITE}🛑 ALERTE SYSTÈME - DÉFAILLANCE CRITIQUE DU PROTOCOLE 🛑${FG_RED}                ║"
    echo -e "║   ${FG_YELLOW}Séquence d'arrêt d'urgence... Vérifiez les journaux de diagnostic.${FG_RED}            ║"
    echo -e "╚═════════════════════════════════════════════════════════════════════════════╝${NC}"
    printf "${FG_RED}🔥 [%s] [ERREUR TERMINALE] %b 🔥${NC}\n" "$(date +'%H:%M:%S')" "$1" >&2
  fi
  exit "${2:-1}"
}

_read_var_from_env() {
  local var_name="$1"
  local default_value="${2:-}"
  local value=""
  if [ -f "$ENV_FILE" ]; then
    value=$(grep -E "^\s*${var_name}\s*=" "$ENV_FILE" | \
            sed -e 's/\s*#.*//' -e "s/^\s*${var_name}\s*=\s*//" -e 's/^\s*//;s/\s*$//' -e "s/^['\"]//;s/['\"]$//" | \
            head -n 1)
  fi
  echo "${value:-$default_value}"
}


_strip_ansi_codes() {
    echo -n "$1" | sed -E 's/\x1b\[[0-9;]*[mGKHF]//g' | \
    sed -E 's/\x1b\([AB]//g' | sed -E 's/\x1b[<=>?]//g' | xargs
}

_select_modules_interactive_text() {
    local -n _options_array_ref=$1
    local _prompt_message="$2"
    local _all_keyword="$3"
    local _none_keywords_str="$4"
    local _allow_all_str="$5"
    local _allow_none_str="$6"
    local _single_selection_mode="${7:-false}"

    echo -e "${_prompt_message}" >&2
    local i=0
    for module_name_option_raw in "${_options_array_ref[@]}"; do
        local module_name_option=$(_strip_ansi_codes "$module_name_option_raw")
        printf "  ${FG_YELLOW}%-3s ${FG_LIGHT_CYAN}💠 %s${NC}\n" "$((i+1))" "$module_name_option" >&2
        i=$((i+1))
    done
    echo -e "${FG_LIGHT_BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}" >&2

    local prompt_options_display_parts=()
    if [ "$_single_selection_mode" = "true" ]; then
        prompt_options_display_parts+=("NUMÉRO (un seul choix)")
    else
        prompt_options_display_parts+=("NUMÉRO(S) (ex: ${FG_LIGHT_GREEN}1 2${NC}, ou ${FG_LIGHT_GREEN}1,3${NC})")
        if [[ "$_allow_all_str" == "true" ]]; then
            prompt_options_display_parts+=("'${FG_GREEN}⚡ $_all_keyword${NC}' (TOUS)")
        fi
    fi

    if [[ "$_allow_none_str" == "true" ]]; then
        local none_display_temp="'${FG_YELLOW}🚫 $_none_keywords_str${NC}'"
        if [[ "$_none_keywords_str" == *"vide"* || -z "$_none_keywords_str" ]]; then
             none_display_temp+=", ou ${FG_YELLOW}<VIDE>${NC} (ENTRÉE vide)"
        fi
        prompt_options_display_parts+=("$none_display_temp (AUCUN/ANNULER)")
    fi

    local full_prompt_options_display="${FG_DARK_GRAY}╭─${FG_MAGENTA}SÉLECTION MODULE ${FG_DARK_GRAY}﹝${NC}"
    local IFS_original_prompt=$IFS;
    IFS=';'; full_prompt_options_display+="${prompt_options_display_parts[*]}; "; IFS=$IFS_original_prompt
    full_prompt_options_display=${full_prompt_options_display//; / }
    full_prompt_options_display=${full_prompt_options_display%, }
    full_prompt_options_display+="${FG_DARK_GRAY}﹞${NC}"

    local user_input
    echo -en "${full_prompt_options_display}\n${FG_DARK_GRAY}╰─❯ ${FG_BRIGHT_WHITE}" >&2
    read -r user_input;
    echo -n -e "${NC}"
    user_input=$(_strip_ansi_codes "$user_input")
    echo -e "${FG_DARK_GRAY}───────────────────────────┤ ${FG_YELLOW}ANALYSE DE LA SÉLECTION${FG_DARK_GRAY} ├───────────────────────────${NC}" >&2

    if [[ "$_allow_all_str" == "true" && "$user_input" == "$_all_keyword" && "$_single_selection_mode" == "false" ]]; then
        local all_cleaned_modules=(); for m_raw in "${_options_array_ref[@]}"; do all_cleaned_modules+=("$(_strip_ansi_codes "$m_raw")"); done
        echo "${all_cleaned_modules[*]}" | xargs;
        return
    fi

    if [[ "$_allow_none_str" == "true" ]]; then
        if [[ -z "$user_input" && ("$_none_keywords_str" == *"vide"* || -z "$_none_keywords_str") ]]; then echo ""; return; fi
        if [[ -n "$_none_keywords_str" ]]; then
            IFS=' ' read -r -a none_keywords_array <<< "$_none_keywords_str"
            for current_none_keyword_raw in "${none_keywords_array[@]}"; do
                local current_none_keyword=$(_strip_ansi_codes "$current_none_keyword_raw")
                if [[ -n "$current_none_keyword" && "$user_input" == "$current_none_keyword" ]]; then echo ""; return; fi
            done
        fi
    fi

    local IFS_original_choices=$IFS;
    IFS=', '; read -r -a choices_array <<< "$user_input"; IFS=$IFS_original_choices
    local selected_modules_temp_array=();
    local valid_choice_made_flag=false
    for choice_item_raw in "${choices_array[@]}"; do
        local choice_item=$(_strip_ansi_codes "$choice_item_raw")
        if [[ "$choice_item" =~ ^[0-9]+$ ]]; then
            local index=$((choice_item-1))
            if [[ $index -ge 0 && $index -lt ${#_options_array_ref[@]} ]]; then
                local module_to_add=$(_strip_ansi_codes "${_options_array_ref[$index]}")
                local already_selected=false
                if [ "$_single_selection_mode" = "false" ]; then
                    for sel_mod in "${selected_modules_temp_array[@]}"; do if [ "$sel_mod" = "$module_to_add" ]; then already_selected=true; break; fi; done
                fi
                if [ "$already_selected" = false ]; then selected_modules_temp_array+=("$module_to_add"); fi
                valid_choice_made_flag=true
                if [ "$_single_selection_mode" = "true" ]; then break; fi
            else _log "WARN" "Numéro ${FG_LIGHT_RED}$choice_item${NC} hors limites. Ignoré."; fi
        elif [[ -n "$choice_item" ]]; then _log "WARN" "Entrée non-conforme : ${FG_LIGHT_RED}$choice_item${NC}."; fi
    done

    if ! $valid_choice_made_flag && [[ -n "$user_input" ]]; then
        if [[ "$_allow_none_str" == "true" ]]; then
            _log "MCP" "${FG_LIGHT_BLUE}Aucune cible valide. Opération nulle... 🌌${NC}";
            echo ""; return;
        fi
        _log "WARN" "${FG_LIGHT_YELLOW}Sélection invalide. 😵${NC}"; echo ""; return;
    fi
    echo "${selected_modules_temp_array[*]}" | xargs
}

_parse_args() {
    UP_ARGS="$UP_ARGS_DEFAULT"; SCRIPT_BUILD_ARGS=""
    while [[ $# -gt 0 ]]; do
    local key="$1"
    case $key in
        --no-cache) SCRIPT_BUILD_ARGS="--no-cache"; _log "SYSTEM" "${FG_LIGHT_YELLOW}☣️ OPTION CACHE-PURGE GLOBALE ACTIVÉE. Reconstruction intégrale. ☣️${NC}"; shift ;;
        --logs|--show-logs) UP_ARGS=""; _log "SYSTEM" "${FG_LIGHT_CYAN}📡 MODE AFFICHAGE LOGS EN CONTINU ACTIVÉ. Visualisation en temps réel. 📡${NC}"; shift ;;
        -f|--file)
        if [[ -z "${2-}" ]]; then _error_exit "Option --file requiert un chemin de fichier."; fi
        COMPOSE_FILE="$2";
        if [[ ! -f "$COMPOSE_FILE" ]]; then _error_exit "Fichier Compose '${FG_RED}$COMPOSE_FILE${NC}' INTROUVABLE ! 🚨"; fi
        _log "SYSTEM" "${FG_LIGHT_MAGENTA}🔄 Fichier Compose alternatif chargé : ${FG_LIGHT_BLUE}${COMPOSE_FILE}${NC}"; shift 2 ;;
        -q|--quiet) SHOW_MESSAGES=false; shift ;;
        --force-recreate) UP_ARGS_DEFAULT="$UP_ARGS_DEFAULT --force-recreate"; UP_ARGS="$UP_ARGS_DEFAULT"; _log "SYSTEM" "${FG_LIGHT_YELLOW}♻️ MODE RECRÉATION FORCÉE ACTIVÉ. Les conteneurs seront recréés. ♻️${NC}"; shift ;;
        *) _log "WARN" "${FG_LIGHT_YELLOW}Option de lancement non reconnue ignorée : ${FG_RED}$1${NC}. 🤨"; shift ;;
    esac;
    done
}


_ensure_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        _log "WARN" "Fichier de configuration ${FG_YELLOW}$ENV_FILE${NC} manquant."
        if [ -f "$ENV_EXAMPLE_FILE" ]; then
            _log "SYSTEM" "Création de ${FG_LIGHT_CYAN}$ENV_FILE${NC} depuis ${FG_LIGHT_BLUE}$ENV_EXAMPLE_FILE${NC}... 📜✨"
            cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
            _log "IMPORTANT" "${FG_GREEN}$ENV_FILE${NC} créé. ${FG_YELLOW}Veuillez le personnaliser avant de continuer !${NC}"
            echo -en "${FG_MAGENTA}⌨️ Appuyez sur [Entrée] pour continuer après vérification, ou ${FG_RED}Ctrl+C${FG_MAGENTA} pour annuler... ${NC}";
            read -r
        else
            _error_exit "Fichier modèle ${FG_RED}$ENV_EXAMPLE_FILE${NC} introuvable. Création de ${FG_RED}$ENV_FILE${NC} impossible."
        fi
    else
        _log "SUCCESS" "Fichier de configuration ${FG_GREEN}$ENV_FILE${NC} détecté."
    fi
}

# --- Séquences d'Opération Docker ---

_action_full_cleanup() {
    echo -e "${FG_YELLOW}☣️ INITIATION PROTOCOLE DE NETTOYAGE COMPLET ☣️${NC}"
    echo -en "${FG_MAGENTA}⌨️ Confirmez la suppression totale des conteneurs, volumes et images locales ? (${FG_GREEN}o${FG_MAGENTA}/${FG_RED}N${FG_MAGENTA}): ${FG_BRIGHT_WHITE}"
    read -r full_cleanup_choice;
    echo -n -e "${NC}"; echo -e "${FG_DARK_GRAY}───┤ ${FG_YELLOW}VALIDATION${FG_DARK_GRAY} ├───${NC}"

    if [[ "$full_cleanup_choice" =~ ^[OoYy]$ ]]; then
        _log "WARN" "${FG_RED}🔥 NETTOYAGE COMPLET CONFIRMÉ ! Suppression des données en cours !${NC}"
        _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" down --remove-orphans -v --rmi local 💣"
        if ! docker compose -f "$COMPOSE_FILE" down --remove-orphans -v --rmi local; then _log "WARN" "${FG_YELLOW}⚠️ Anomalie durant la suppression. Échos résiduels possibles... ⚠️${NC}"; fi
        _log "SUCCESS" "${FG_GREEN}🔑 NETTOYAGE COMPLET TERMINÉ.${NC}"

        _log "INFO" "${FG_YELLOW}Phase 2/3: Reconstruction interactive des modules...${NC}"
        local build_failed_after_purge=false
        for module_to_build_item_raw in "${BUILDABLE_MODULES_ARRAY[@]}"; do
            local module_to_build_item=$(_strip_ansi_codes "$module_to_build_item_raw"); if [[ -z "$module_to_build_item" ]]; then continue; fi
            local current_module_build_options_str="";
            local no_cache_input_per_module_val=""
            echo -en "${FG_MAGENTA}⌨️ Option --no-cache pour \"${FG_GREEN}$module_to_build_item${NC}\" ? (${FG_GREEN}o${FG_MAGENTA}/${FG_RED}N${FG_MAGENTA}, timeout 4s -> N): ${FG_BRIGHT_WHITE}"
            if read -r -t 4 no_cache_input_per_module_val && [[ "$no_cache_input_per_module_val" =~ ^[OoYy]$ ]]; then
                current_module_build_options_str="--no-cache";
                echo -e "${FG_YELLOW}👍 Option --no-cache activée pour ${FG_GREEN}$module_to_build_item${NC}.${NC}" >&2
            else
                local read_exit_status=$?;
                echo "";
                if [ $read_exit_status -gt 128 ]; then _log "INFO" "${FG_LIGHT_CYAN}⏳ Délai écoulé. 'N' par défaut pour ${FG_GREEN}$module_to_build_item${NC}.${NC}";
                elif [[ -z "$no_cache_input_per_module_val" || "$no_cache_input_per_module_val" =~ ^[Nn]$ ]]; then echo -e "${FG_CYAN}👎 Option --no-cache désactivée pour ${FG_GREEN}$module_to_build_item${NC}.${NC}" >&2;
                elif [ $read_exit_status -ne 0 ]; then _log "WARN" "${FG_YELLOW}⚠️ Erreur lecture. 'N' par défaut pour ${FG_GREEN}$module_to_build_item${NC}.${NC}"; fi
            fi;
            echo -n -e "${NC}"

            _log "INFO" "${FG_LIGHT_CYAN}Construction: ${FG_GREEN}$module_to_build_item${NC} options: ${FG_LIGHT_GRAY}${current_module_build_options_str:-aucune}${NC} 🛠️🔥"
            _log "CMD" "Exécution: COMPOSE_BAKE=true docker compose -f \"$COMPOSE_FILE\" build $current_module_build_options_str \"$module_to_build_item\""
            if ! COMPOSE_BAKE=true docker compose -f "$COMPOSE_FILE" build $current_module_build_options_str "$module_to_build_item"; then
                _log "ERROR" "${FG_RED}☠️ ÉCHEC CRITIQUE construction ${FG_LIGHT_MAGENTA}$module_to_build_item${NC}.";
                build_failed_after_purge=true
            else _log "SUCCESS" "${FG_GREEN}🔑 Module ${FG_LIGHT_MAGENTA}$module_to_build_item${NC} construit."; fi
        done; echo -e "${FG_DARK_GRAY}──────────────────────────────────────────────────────────────────────────────${NC}"
        if [ "$build_failed_after_purge" = true ]; then _error_exit "Échec reconstruction post-nettoyage. Démarrage annulé."; fi

        _log "INFO" "${FG_YELLOW}Phase 3/3: Démarrage de tous les modules...${NC}"
        current_session_started_modules="$ALL_MANAGEABLE_MODULES_STR"
        _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" up $UP_ARGS $current_session_started_modules"
        if ! docker compose -f "$COMPOSE_FILE" up $UP_ARGS $current_session_started_modules; then _error_exit "${FG_RED}DÉFAILLANCE SYSTÈME ! 💥 Échec démarrage post-nettoyage."; fi
        _log "SUCCESS" "${FG_GREEN}🔑 PROTOCOLE NETTOYAGE ET REDÉMARRAGE COMPLETS TERMINÉS ! ✅🌐${NC}"
    else _log "INFO" "${FG_LIGHT_BLUE}Protocole Nettoyage Complet annulé.${NC}"; fi
}


_action_stop_remove_modules() {
    local modules_to_stop_remove_raw;
    modules_to_stop_remove_raw=$(_select_modules_interactive_text ALL_MANAGEABLE_MODULES_ARRAY "${FG_LIGHT_BLUE}╔═══════════════════════════════════════════════════════════════╗\n║ ${FG_LIGHT_YELLOW}🌀 SÉQUENCE D'ARRÊT ET SUPPRESSION DE MODULES (Conteneurs) 🌀${FG_LIGHT_BLUE} ║" "tous" "aucun vide" "true" "true" "false")
    local modules_to_stop_remove=$(_strip_ansi_codes "$modules_to_stop_remove_raw")

    if [[ -n "$modules_to_stop_remove" ]]; then
        _log "INFO" "${FG_LIGHT_CYAN}Modules ciblés pour arrêt/suppression ♻️ : ${FG_GREEN}$modules_to_stop_remove${NC}"
        _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" stop $modules_to_stop_remove"
        if ! docker compose -f "$COMPOSE_FILE" stop $modules_to_stop_remove; then _log "WARN" "${FG_YELLOW}⚠️ Échec arrêt. Résistance détectée ! 😠${NC}";
        else _log "SUCCESS" "${FG_GREEN}🔑 Modules arrêtés. 🧊${NC}"; fi

        _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" rm -f -s -v $modules_to_stop_remove"
        if ! docker compose -f "$COMPOSE_FILE" rm -f -s -v $modules_to_stop_remove; then _log "WARN" "${FG_YELLOW}⚠️ Échec suppression. Signatures fantômes ? 👻${NC}";
        else _log "SUCCESS" "${FG_GREEN}🔑 Instances supprimées. ✨${NC}"; fi
    else _log "INFO" "${FG_LIGHT_BLUE}Aucun module ciblé. Équilibre maintenu. 🧘${NC}"; fi
}

_action_pull_base_images() {
    if [ ${#PULLABLE_MODULES_ARRAY[@]} -eq 0 ]; then _log "INFO" "${FG_LIGHT_BLUE}Aucun module primaire pour synchronisation (pull). �${NC}"; return; fi
    local pullable_modules_cleaned_array=();
    for m_raw in "${PULLABLE_MODULES_ARRAY[@]}"; do pullable_modules_cleaned_array+=("$(_strip_ansi_codes "$m_raw")"); done
    local pullable_modules_cleaned_str="${pullable_modules_cleaned_array[*]}"

    echo -en "${FG_MAGENTA}⌨️ Initier synchronisation modules primaires (${FG_LIGHT_CYAN}$pullable_modules_cleaned_str${FG_MAGENTA}) ? (${FG_GREEN}o${FG_MAGENTA}/${FG_RED}N${FG_MAGENTA}): ${FG_BRIGHT_WHITE}"
    read -r pull_choice;
    echo -n -e "${NC}"; echo -e "${FG_DARK_GRAY}───┤ ${FG_YELLOW}VALIDATION${FG_DARK_GRAY} ├───${NC}"
    if [[ "$pull_choice" =~ ^[OoYy]$ ]]; then
        _log "INFO" "${FG_LIGHT_CYAN}📡 Synchronisation pour: ${FG_LIGHT_MAGENTA}$pullable_modules_cleaned_str${NC}... Connexion au dépôt central... 🌐${NC}"
        _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" pull $pullable_modules_cleaned_str"
        if ! docker compose -f "$COMPOSE_FILE" pull $pullable_modules_cleaned_str; then _log "WARN" "${FG_YELLOW}⚠️ Rupture synchronisation. Vérifiez connexion/intégrité. 🛰️💥${NC}";
        else _log "SUCCESS" "${FG_GREEN}🔑 Modules primaires synchronisés ! 📦${NC}"; fi
    else _log "INFO" "${FG_LIGHT_BLUE}Synchronisation annulée.${NC}"; fi
}

_action_build_modules() {
    if [ ${#BUILDABLE_MODULES_ARRAY[@]} -eq 0 ]; then _log "INFO" "${FG_LIGHT_BLUE}Aucun module à construire localement.${NC}"; return; fi
    local modules_to_build_raw;
    modules_to_build_raw=$(_select_modules_interactive_text BUILDABLE_MODULES_ARRAY "${FG_LIGHT_BLUE}╔═══════════════════════════════════════════════════════════════╗\n║ ${FG_GREEN}🛠️ CONSTRUCTION DE MODULES (Protocole AVANCÉ) 🛠️${FG_LIGHT_BLUE} ║" "toutes" "aucun vide" "true" "true" "false")
    local modules_to_build=$(_strip_ansi_codes "$modules_to_build_raw")

    if [[ -n "$modules_to_build" ]]; then
        read -r -a modules_to_build_final_array <<< "$modules_to_build"
        for module_to_build_item_raw in "${modules_to_build_final_array[@]}"; do
            local module_to_build_item=$(_strip_ansi_codes "$module_to_build_item_raw"); if [[ -z "$module_to_build_item" ]]; then continue; fi
            local current_module_build_options_str="$SCRIPT_BUILD_ARGS"
            if [[ "$SCRIPT_BUILD_ARGS" != *"--no-cache"* ]]; then
                local no_cache_input_per_module_val=""
                echo -en "${FG_MAGENTA}⌨️ Option --no-cache pour \"${FG_GREEN}$module_to_build_item${NC}\" ? (${FG_GREEN}o${FG_MAGENTA}/${FG_RED}N${FG_MAGENTA}, timeout 4s -> N): ${FG_BRIGHT_WHITE}"
                if read -r -t 4 no_cache_input_per_module_val && [[ "$no_cache_input_per_module_val" =~ ^[OoYy]$ ]]; then
                    current_module_build_options_str="--no-cache";
                    echo -e "${FG_YELLOW}👍 Option --no-cache activée pour ${FG_GREEN}$module_to_build_item${NC} ! 🧨${NC}" >&2
                else
                    local read_exit_status=$?;
                    echo "";
                    if [ $read_exit_status -gt 128 ]; then _log "INFO" "${FG_LIGHT_CYAN}⏳ Délai écoulé. 'N' par défaut pour ${FG_GREEN}$module_to_build_item${NC}.${NC}";
                    elif [[ -z "$no_cache_input_per_module_val" || "$no_cache_input_per_module_val" =~ ^[Nn]$ ]]; then echo -e "${FG_CYAN}👎 Option --no-cache désactivée pour ${FG_GREEN}$module_to_build_item${NC}. 🏛️${NC}" >&2;
                    elif [ $read_exit_status -ne 0 ]; then _log "WARN" "${FG_YELLOW}⚠️ Erreur lecture cache pour ${FG_GREEN}$module_to_build_item${NC}. 'N' par défaut. 👾${NC}"; fi
                fi;
                echo -n -e "${NC}"
            else _log "INFO" "${FG_LIGHT_YELLOW}☣️ OPTION CACHE-PURGE GLOBALE active pour ${FG_GREEN}$module_to_build_item${NC} ! 💥${NC}"; fi

            _log "INFO" "${FG_LIGHT_CYAN}Construction: ${FG_GREEN}$module_to_build_item${NC} options: ${FG_LIGHT_GRAY}${current_module_build_options_str:-aucune}${NC} 🛠️🔥"
            _log "CMD" "Exécution: COMPOSE_BAKE=true docker compose -f \"$COMPOSE_FILE\" build $current_module_build_options_str \"$module_to_build_item\""
            if ! COMPOSE_BAKE=true docker compose -f "$COMPOSE_FILE" build $current_module_build_options_str "$module_to_build_item"; then
                _error_exit "${FG_RED}☠️ ERREUR SYSTÈME MAJEURE construction ${FG_LIGHT_MAGENTA}$module_to_build_item${NC}. Code ROUGE ! ☠️"
            fi
            _log "SUCCESS" "${FG_GREEN}🔑 Module ${FG_LIGHT_MAGENTA}$module_to_build_item${NC} construit ! ✅✨"
        done
    else _log "INFO" "${FG_LIGHT_BLUE}Aucun module ciblé pour construction. 📜${NC}"; fi
}


_action_start_modules() {
    local modules_to_start_raw;
    modules_to_start_raw=$(_select_modules_interactive_text ALL_MANAGEABLE_MODULES_ARRAY "${FG_LIGHT_BLUE}╔═══════════════════════════════════════════════════════════════╗\n║ ${FG_GREEN}🚀 PROTOCOLE DE DÉMARRAGE/REDÉMARRAGE DE MODULES 🚀${FG_LIGHT_BLUE} ║" "tous" "aucun vide" "true" "true" "false")
    local modules_to_start=$(_strip_ansi_codes "$modules_to_start_raw")

    if [[ -n "$modules_to_start" ]]; then
        current_session_started_modules="$modules_to_start"
        _log "INFO" "${FG_LIGHT_CYAN} Démarrage: ${FG_GREEN}$current_session_started_modules${NC}... INITIALISATION PROTOCOLES ! 🚀"
        _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" up $UP_ARGS $current_session_started_modules"
        if ! docker compose -f "$COMPOSE_FILE" up $UP_ARGS $current_session_started_modules; then
            _error_exit "${FG_RED}DÉFAILLANCE SYSTÈME ! 💥 Échec démarrage ${FG_LIGHT_MAGENTA}$current_session_started_modules${NC}. ALERTE MAXIMALE !"
        fi
        _log "SUCCESS" "${FG_GREEN}🔑 Modules (${FG_LIGHT_MAGENTA}$current_session_started_modules${NC}) DÉMARRÉS ! ✅🌐"
    else current_session_started_modules=""; _log "INFO" "${FG_LIGHT_BLUE}Aucun module pour démarrage. Veille optimisée. ❄️${NC}"; fi
}

_action_full_sequence_modules() {
    _log "SYSTEM" "${FG_LIGHT_MAGENTA}⚙️ INITIATION SÉQUENCE D'OPÉRATIONS COMPLÈTES ⚙️${NC}"
    local modules_for_sequence_raw;
    modules_for_sequence_raw=$(_select_modules_interactive_text BUILDABLE_MODULES_ARRAY "${FG_LIGHT_BLUE}╔═══════════════════════════════════════════════════════════════╗\n║ ${FG_LIGHT_YELLOW}⚙️ SÉQUENCE COMPLÈTE (ARRÊT, CONSTRUCTION, DÉMARRAGE) ⚙️${FG_LIGHT_BLUE} ║" "toutes" "aucun vide" "true" "true" "false")
    local modules_for_sequence=$(_strip_ansi_codes "$modules_for_sequence_raw");
    if [[ -z "$modules_for_sequence" ]]; then _log "INFO" "${FG_LIGHT_BLUE}Aucun module pour séquence complète.${NC}"; return; fi
    _log "INFO" "${FG_CYAN}Modules pour séquence complète: ${FG_GREEN}$modules_for_sequence${NC}"

    _log "INFO" "${FG_YELLOW}Phase 1/3: Arrêt/Suppression pour ${FG_LIGHT_MAGENTA}$modules_for_sequence${NC}... 🛑🗑️"
    _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" stop $modules_for_sequence"
    if docker compose -f "$COMPOSE_FILE" stop $modules_for_sequence; then
        _log "SUCCESS" "${FG_GREEN}🔑 Modules arrêtés.${NC}"
        _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" rm -f -s -v $modules_for_sequence"
        if docker compose -f "$COMPOSE_FILE" rm -f -s -v $modules_for_sequence; then _log "SUCCESS" "${FG_GREEN}🔑 Instances supprimées.${NC}";
        else _log "WARN" "${FG_YELLOW}⚠️ Échec suppression pour ${FG_LIGHT_MAGENTA}$modules_for_sequence${NC}. Poursuite...${NC}"; fi
    else _log "WARN" "${FG_YELLOW}⚠️ Échec arrêt pour ${FG_LIGHT_MAGENTA}$modules_for_sequence${NC}. Poursuite...${NC}"; fi
    echo -e "${FG_DARK_GRAY}──────────────────────────────────────────────────────────────────────────────${NC}"

    _log "INFO" "${FG_YELLOW}Phase 2/3: Construction/Recompilation... 🛠️${NC}"
    local -a modules_for_sequence_array;
    read -r -a modules_for_sequence_array <<< "$modules_for_sequence"
    for module_to_build_item_raw in "${modules_for_sequence_array[@]}"; do
        local module_to_build_item=$(_strip_ansi_codes "$module_to_build_item_raw"); if [[ -z "$module_to_build_item" ]]; then continue; fi
        local current_module_build_options_str="$SCRIPT_BUILD_ARGS"
        if [[ "$SCRIPT_BUILD_ARGS" != *"--no-cache"* ]]; then
            local no_cache_input_per_module_val=""
            echo -en "${FG_MAGENTA}⌨️ Option --no-cache pour \"${FG_GREEN}$module_to_build_item${NC}\" ? (${FG_GREEN}o${FG_MAGENTA}/${FG_RED}N${FG_MAGENTA}, timeout 4s -> N): ${FG_BRIGHT_WHITE}"
            if read -r -t 4 no_cache_input_per_module_val && [[ "$no_cache_input_per_module_val" =~ ^[OoYy]$ ]]; then
                current_module_build_options_str="--no-cache";
                echo -e "${FG_YELLOW}👍 Option --no-cache activée pour ${FG_GREEN}$module_to_build_item${NC}.${NC}" >&2
            else
                local read_exit_status=$?;
                echo "";
                if [ $read_exit_status -gt 128 ]; then _log "INFO" "${FG_LIGHT_CYAN}⏳ Délai écoulé. 'N' par défaut pour ${FG_GREEN}$module_to_build_item${NC}.${NC}";
                elif [[ -z "$no_cache_input_per_module_val" || "$no_cache_input_per_module_val" =~ ^[Nn]$ ]]; then echo -e "${FG_CYAN}👎 Option --no-cache désactivée pour ${FG_GREEN}$module_to_build_item${NC}.${NC}" >&2;
                elif [ $read_exit_status -ne 0 ]; then _log "WARN" "${FG_YELLOW}⚠️ Erreur lecture cache pour ${FG_GREEN}$module_to_build_item${NC}. 'N' par défaut.${NC}"; fi
            fi;
            echo -n -e "${NC}"
        else _log "INFO" "${FG_LIGHT_YELLOW}☣️ OPTION CACHE-PURGE GLOBALE active pour ${FG_GREEN}$module_to_build_item${NC}.${NC}"; fi

        _log "INFO" "${FG_LIGHT_CYAN}Construction ${FG_GREEN}$module_to_build_item${NC} options: ${FG_LIGHT_GRAY}${current_module_build_options_str:-aucune}${NC}..."
        _log "CMD" "Exécution: COMPOSE_BAKE=true docker compose -f \"$COMPOSE_FILE\" build $current_module_build_options_str \"$module_to_build_item\""
        if ! COMPOSE_BAKE=true docker compose -f "$COMPOSE_FILE" build $current_module_build_options_str "$module_to_build_item"; then
            _error_exit "${FG_RED}☠️ ÉCHEC CRITIQUE - Construction ${FG_LIGHT_MAGENTA}$module_to_build_item${NC} avortée."
        fi
        _log "SUCCESS" "${FG_GREEN}🔑 Module ${FG_LIGHT_MAGENTA}$module_to_build_item${NC} construit."
    done;
    echo -e "${FG_DARK_GRAY}──────────────────────────────────────────────────────────────────────────────${NC}"

    _log "INFO" "${FG_YELLOW}Phase 3/3: Démarrage ${FG_LIGHT_MAGENTA}$modules_for_sequence${NC}... 🚀${NC}"
    current_session_started_modules="$modules_for_sequence"
    _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" up $UP_ARGS $modules_for_sequence"
    if ! docker compose -f "$COMPOSE_FILE" up $UP_ARGS $modules_for_sequence; then _error_exit "${FG_RED}DÉFAILLANCE SYSTÈME ! 💥 Échec démarrage final."; fi
    _log "SUCCESS" "${FG_GREEN}🔑 SÉQUENCE COMPLÈTE TERMINÉE. Modules (${FG_LIGHT_MAGENTA}$modules_for_sequence${NC}) opérationnels ! ✅🌐"
}

_action_show_logs() {
    local modules_for_logs_raw; modules_for_logs_raw=$(_select_modules_interactive_text ALL_MANAGEABLE_MODULES_ARRAY "${FG_LIGHT_BLUE}╔═══════════════════════════════════════════════════════════════╗\n║ ${FG_LIGHT_CYAN}📜 AFFICHAGE DES JOURNAUX D'ÉVÉNEMENTS (LOGS) 📜${FG_LIGHT_BLUE} ║" "tous" "aucun vide" "true" "true" "false")
    local modules_for_logs=$(_strip_ansi_codes "$modules_for_logs_raw")
    local target_log_display;
    if [[ -n "$modules_for_logs" ]]; then target_log_display="${FG_GREEN}${modules_for_logs}${NC}"; else target_log_display="${FG_GREEN}TOUS les modules actifs${NC}"; modules_for_logs=""; fi

    _log "INFO" "${FG_LIGHT_CYAN}Affichage journaux pour: $target_log_display... Canal ouvert.${NC}"
    _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" logs -f --tail=100 $modules_for_logs"
    echo -e "${FG_YELLOW}👁️‍🗨️  Surveillance active... ${FG_RED}Ctrl+C${NC}${FG_YELLOW} pour interrompre.${NC}"
    docker compose -f "$COMPOSE_FILE" logs -f --tail="100" $modules_for_logs || _log "WARN" "${FG_YELLOW}Journaux interrompus.${NC}"
}

_action_direct_shell_access() {
    local selected_module_raw;
    selected_module_raw=$(_select_modules_interactive_text ALL_MANAGEABLE_MODULES_ARRAY "${FG_LIGHT_BLUE}╔═══════════════════════════════════════════════════════════════╗\n║ ${FG_LIGHT_MAGENTA}📡 ACCÈS DIRECT AU TERMINAL D'UN MODULE (SHELL) 📡${FG_LIGHT_BLUE} ║" "" "aucun vide" "false" "true" "true")
    local selected_module=$(_strip_ansi_codes "$selected_module_raw");
    if [[ -z "$selected_module" ]]; then _log "MCP" "${FG_LIGHT_BLUE}Accès direct annulé.${NC}"; return; fi

    _log "INFO" "${FG_LIGHT_CYAN}Tentative connexion terminal direct avec ${FG_GREEN}$selected_module${NC}... Encryption...${NC}"
    echo -e "${FG_YELLOW}Connexion au terminal de ${FG_GREEN}$selected_module${NC}. Utilisez '${FG_RED}exit${NC}${FG_YELLOW}' pour quitter.${NC}"
    echo -e "${FG_DARK_GRAY}Appuyez sur [ENTRÉE] pour initier la connexion...${NC}";
    read -r
    local term_state; term_state=$(stty -g); trap 'stty "$term_state"; trap - INT TERM EXIT; clear; _log MCP "Connexion terminal avec ${FG_GREEN}$selected_module${NC} terminée.";' INT TERM EXIT

    _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" exec \"$selected_module\" /bin/bash"
    if ! docker compose -f "$COMPOSE_FILE" exec "$selected_module" /bin/bash; then
        _log "WARN" "${FG_YELLOW}Échec /bin/bash. Tentative /bin/sh pour ${FG_GREEN}$selected_module${NC}...${NC}"
        _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" exec \"$selected_module\" /bin/sh"
        if ! docker compose -f "$COMPOSE_FILE" exec "$selected_module" /bin/sh; then
            _log "ERROR" "${FG_RED}Impossible d'établir connexion terminal avec ${FG_GREEN}$selected_module${NC}.";
            stty "$term_state"; trap - INT TERM EXIT; return 1
        fi
    fi
    stty "$term_state";
    trap - INT TERM EXIT; clear
    _log "SUCCESS" "${FG_GREEN}🔑 Connexion terminal avec ${FG_GREEN}$selected_module${NC} terminée.${NC}"
}

_action_force_recreate_modules() {
    local modules_to_recreate_raw; modules_to_recreate_raw=$(_select_modules_interactive_text ALL_MANAGEABLE_MODULES_ARRAY "${FG_LIGHT_BLUE}╔═══════════════════════════════════════════════════════════════╗\n║ ${FG_LIGHT_YELLOW}♻️ PROTOCOLE DE DÉMARRAGE AVEC RECRÉATION FORCÉE ♻️${FG_LIGHT_BLUE} ║" "toutes" "aucun vide" "true" "true" "false")
    local modules_to_recreate=$(_strip_ansi_codes "$modules_to_recreate_raw")

    if [[ -n "$modules_to_recreate" ]]; then
        current_session_started_modules="$modules_to_recreate"
        _log "INFO" "${FG_LIGHT_CYAN}♻️ Recréation forcée pour: ${FG_GREEN}$modules_to_recreate${NC}... Nouvelles instances en cours de matérialisation !${NC}"
        _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" up $UP_ARGS --force-recreate $modules_to_recreate"
        if ! docker compose -f "$COMPOSE_FILE" up $UP_ARGS --force-recreate $modules_to_recreate; then
            _error_exit "${FG_RED}DÉFAILLANCE CRITIQUE ! 💥 Échec recréation forcée pour ${FG_LIGHT_MAGENTA}$modules_to_recreate${NC}."
        fi
        _log "SUCCESS" "${FG_GREEN}🔑 Modules (${FG_LIGHT_MAGENTA}$modules_to_recreate${NC}) recréés et démarrés ! ✅🌐${NC}"
    else _log "INFO" "${FG_LIGHT_BLUE}Aucun module pour recréation forcée. Instances préservées. 🛡️${NC}"; fi
}

_action_exec_command_in_module() {
    local selected_module_raw;
    selected_module_raw=$(_select_modules_interactive_text ALL_MANAGEABLE_MODULES_ARRAY "${FG_LIGHT_BLUE}╔═══════════════════════════════════════════════════════════════╗\n║ ${FG_LIGHT_GREEN}⚡ EXÉCUTION DE COMMANDE SPÉCIFIQUE DANS UN MODULE ⚡${FG_LIGHT_BLUE} ║" "" "aucun vide" "false" "true" "true")
    local selected_module=$(_strip_ansi_codes "$selected_module_raw")

    if [[ -z "$selected_module" ]]; then _log "MCP" "${FG_LIGHT_BLUE}Exécution commande annulée.${NC}"; return; fi

    echo -en "${FG_MAGENTA}⌨️ Entrez la commande à exécuter dans ${FG_GREEN}$selected_module${NC} (ex: ls -la /app): ${FG_BRIGHT_WHITE}"
    read -r command_to_exec;
    echo -n -e "${NC}"

    if [[ -z "$command_to_exec" ]]; then _log "WARN" "${FG_YELLOW}Aucune commande spécifiée. Opération annulée. 🤷${NC}"; return; fi

    _log "INFO" "${FG_LIGHT_CYAN}Transmission commande '${FG_LIGHT_YELLOW}$command_to_exec${NC}' au module ${FG_GREEN}$selected_module${NC}...${NC}"
    _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" exec \"$selected_module\" $command_to_exec"
    echo -e "${FG_DARK_GRAY}--- Sortie de la commande pour $selected_module ---${NC}"
    if ! docker compose -f "$COMPOSE_FILE" exec "$selected_module" $command_to_exec; then
        _log "ERROR" "${FG_RED}Échec exécution '${FG_LIGHT_YELLOW}$command_to_exec${NC}' dans ${FG_GREEN}$selected_module${NC}.${NC}"
    else _log "SUCCESS" "${FG_GREEN}🔑 Commande '${FG_LIGHT_YELLOW}$command_to_exec${NC}' exécutée dans ${FG_GREEN}$selected_module${NC}.${NC}"; fi
    echo -e "${FG_DARK_GRAY}--- Fin de la sortie ---${NC}"
}

_action_docker_system_prune() {
    echo -e "${FG_RED}🔥 ALERTE : OPTIMISATION SYSTÈME DOCKER 🔥${NC}"
    echo -e "${FG_YELLOW}Supprime conteneurs arrêtés, réseaux non utilisés, images pendantes, et cache de build.${NC}"
    echo -en "${FG_MAGENTA}⌨️ Confirmez cette optimisation système ? (${FG_GREEN}o${FG_MAGENTA}/${FG_RED}N${FG_MAGENTA}): ${FG_BRIGHT_WHITE}"
    read -r prune_choice;
    echo -n -e "${NC}"; echo -e "${FG_DARK_GRAY}───┤ ${FG_YELLOW}VALIDATION${FG_DARK_GRAY} ├───${NC}"

    if [[ "$prune_choice" =~ ^[OoYy]$ ]]; then
        _log "WARN" "${FG_RED}🔥 OPTIMISATION SYSTÈME APPROUVÉE ! Opération irréversible !${NC}"
        _log "CMD" "Exécution: docker system prune -a -f --volumes"
        if ! docker system prune -a -f --volumes; then _log "ERROR" "${FG_RED}Échec optimisation. Fragments résiduels possibles.${NC}";
        else _log "SUCCESS" "${FG_GREEN}🔑 Optimisation système Docker terminée ! ✨🧹${NC}"; fi
    else _log "INFO" "${FG_LIGHT_BLUE}Optimisation système Docker annulée. 🗄️${NC}"; fi
}

_action_show_status() {
    _log "INFO" "${FG_LIGHT_CYAN}Scan de l'état actuel des modules... Transmission des données... 📊${NC}"
    _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" ps"
    echo -e "${FG_DARK_GRAY}--- Rapport d'état des modules ---${NC}";
    docker compose -f "$COMPOSE_FILE" ps
    echo -e "${FG_DARK_GRAY}--- Fin du rapport ---${NC}";
    _log "SUCCESS" "${FG_GREEN}🔑 Rapport d'état affiché.${NC}"
}

_action_run_pnpm_script() {
    if ! command -v pnpm &> /dev/null; then _log "ERROR" "${FG_RED}Anomalie: 'pnpm' non détecté sur l'hôte. 🅿️❌${NC}"; return; fi
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then _log "ERROR" "${FG_RED}Anomalie: 'package.json' introuvable (${FG_LIGHT_MAGENTA}$PROJECT_ROOT${NC}). 📄❌${NC}"; return; fi

    local selected_script_raw;
    selected_script_raw=$(_select_modules_interactive_text PNPM_SCRIPTS_ARRAY "${FG_LIGHT_BLUE}╔═══════════════════════════════════════════════════════════════╗\n║ ${FG_LIGHT_GREEN}🔧 EXÉCUTION DES SCRIPTS DE MAINTENANCE PNPM (HÔTE) 🔧${FG_LIGHT_BLUE} ║" "" "aucun vide" "false" "true" "true")
    local selected_script=$(_strip_ansi_codes "$selected_script_raw")

    if [[ -z "$selected_script" ]]; then _log "MCP" "${FG_LIGHT_BLUE}Exécution script PNPM annulée.${NC}"; return; fi

    _log "PNPM" "${FG_LIGHT_CYAN}Initiation script PNPM '${FG_GREEN}$selected_script${NC}' sur hôte... 💻🔬${NC}"
    _log "CMD" "Exécution (dans $PROJECT_ROOT): pnpm run $selected_script"
    echo -e "${FG_DARK_GRAY}--- Exécution script PNPM '$selected_script' ---${NC}"
    (cd "$PROJECT_ROOT" && pnpm run "$selected_script");
    local pnpm_exit_code=$?
    echo -e "${FG_DARK_GRAY}--- Fin exécution script PNPM ---${NC}"

    if [ $pnpm_exit_code -eq 0 ]; then _log "SUCCESS" "${FG_GREEN}🔑 Script PNPM '${FG_GREEN}$selected_script${NC}' terminé avec succès.${NC}";
    else _log "ERROR" "${FG_RED}Échec script PNPM '${FG_GREEN}$selected_script${NC}' (code: $pnpm_exit_code). 💔${NC}"; fi
}

_action_restart_modules() {
    local modules_to_restart_raw;
    modules_to_restart_raw=$(_select_modules_interactive_text ALL_MANAGEABLE_MODULES_ARRAY "${FG_LIGHT_BLUE}╔═══════════════════════════════════════════════════════════════╗\n║ ${FG_LIGHT_YELLOW}🔄 PROTOCOLE DE REDÉMARRAGE RAPIDE DE MODULES 🔄${FG_LIGHT_BLUE} ║" "tous" "aucun vide" "true" "true" "false")
    local modules_to_restart=$(_strip_ansi_codes "$modules_to_restart_raw")

    if [[ -n "$modules_to_restart" ]]; then
        _log "INFO" "${FG_LIGHT_CYAN}🔄 Redémarrage rapide pour: ${FG_GREEN}$modules_to_restart${NC}...${NC}"
        _log "CMD" "Exécution (Phase 1 - Arrêt): docker compose -f \"$COMPOSE_FILE\" stop $modules_to_restart"
        if ! docker compose -f "$COMPOSE_FILE" stop $modules_to_restart; then _log "WARN" "${FG_YELLOW}⚠️ Anomalie arrêt ${FG_GREEN}$modules_to_restart${NC}. Tentative redémarrage...${NC}";
        else _log "SUCCESS" "${FG_GREEN}🔑 Modules (${FG_LIGHT_MAGENTA}$modules_to_restart${NC}) arrêtés.${NC}"; fi

        _log "CMD" "Exécution (Phase 2 - Démarrage): docker compose -f \"$COMPOSE_FILE\" up $UP_ARGS $modules_to_restart"
        if ! docker compose -f "$COMPOSE_FILE" up $UP_ARGS $modules_to_restart; then _error_exit "${FG_RED}DÉFAILLANCE CRITIQUE ! 💥 Échec redémarrage ${FG_LIGHT_MAGENTA}$modules_to_restart${NC}."; fi
        current_session_started_modules="$modules_to_restart"
        _log "SUCCESS" "${FG_GREEN}🔑 Modules (${FG_LIGHT_MAGENTA}$modules_to_restart${NC}) redémarrés ! ✅🌀${NC}"
    else _log "INFO" "${FG_LIGHT_BLUE}Aucun module pour redémarrage rapide. 🧘${NC}"; fi
}

_action_view_config() {
    _log "INFO" "${FG_LIGHT_CYAN}Analyse schémas d'orchestration... Affichage configuration interprétée... 📄⚙️${NC}"
    _log "CMD" "Exécution: docker compose -f \"$COMPOSE_FILE\" config"
    echo -e "${FG_DARK_GRAY}--- Configuration Docker Compose interprétée ---${NC}";
    docker compose -f "$COMPOSE_FILE" config
    echo -e "${FG_DARK_GRAY}--- Fin de la configuration ---${NC}";
    _log "SUCCESS" "${FG_GREEN}🔑 Configuration affichée.${NC}"
}

_action_validate_env() {
    _log "INFO" "${FG_LIGHT_CYAN}Validation paramètres (${FG_LIGHT_MAGENTA}$ENV_FILE${NC})... Scan directives vitales... 🧐🛡️${NC}"
    if [ ! -f "$ENV_FILE" ]; then
        _log "ERROR" "${FG_RED}Fichier ${FG_YELLOW}$ENV_FILE${NC} INTROUVABLE. Validation impossible ! 💔${NC}";
        _ensure_env_file; return 1; fi

    local validation_passed=true
    local required_vars=("AUTH_TOKEN" "HOST_PORT" "HTTP_STREAM_ENDPOINT" "REDIS_PASSWORD" "PORT" "WEBHOOK_SECRET")
    local optional_vars_default_check=("NODE_ENV" "LOG_LEVEL" "REDIS_HOST" "REDIS_PORT")

    _log "INFO" "Vérification des directives vitales obligatoires :"
    for var_name in "${required_vars[@]}"; do
        local var_value
        var_value=$(_read_var_from_env "$var_name")
        if [[ -z "$var_value" ]]; then
            _log "ERROR" "  ${FG_RED}Directive ${FG_YELLOW}$var_name${NC}${FG_RED} manquante/vide dans ${FG_LIGHT_MAGENTA}$ENV_FILE${NC}. CRITIQUE ! ❌${NC}";
            validation_passed=false
        elif [[ "$var_name" == "AUTH_TOKEN" && ("$var_value" == "YOUR_STRONG_SECRET_TOKEN_HERE_CHANGE_ME" || ${#var_value} -lt 16) ]]; then
            _log "WARN" "  ${FG_YELLOW}Directive ${FG_YELLOW}$var_name${NC}${FG_YELLOW} faible ou par défaut. Vulnérabilité ! ⚠️${NC}";
            validation_passed=false
        else
            _log "SUCCESS" "  ${FG_GREEN}Directive ${FG_GREEN}$var_name${NC}${FG_GREEN} présente. ✅${NC}";
        fi
    done

    _log "INFO" "Vérification des directives optionnelles (recommandé de définir) :"
    for var_name in "${optional_vars_default_check[@]}"; do
        local var_value
        var_value=$(_read_var_from_env "$var_name")
        if [[ -z "$var_value" ]]; then _log "WARN" "  ${FG_YELLOW}Directive ${FG_YELLOW}$var_name${NC}${FG_YELLOW} non définie. Valeurs par défaut internes utilisées. ⚠️${NC}";
        else _log "INFO" "  ${FG_CYAN}Directive ${FG_CYAN}$var_name${NC}${FG_CYAN} définie: '${FG_LIGHT_GRAY}$var_value${NC}'.${NC}"; fi
    done

    if [ "$validation_passed" = true ]; then _log "SUCCESS" "${FG_GREEN}🔑 Validation paramètres terminée. Directives vitales OK. Système stable. 🛡️✅${NC}";
    else _log "ERROR" "${FG_RED}ÉCHEC VALIDATION. Directives manquantes/faibles. Corrigez ${FG_LIGHT_MAGENTA}$ENV_FILE${NC}. 💔❌${NC}"; fi
    return 0
}

_display_final_summary() {
    local host_port_val=$(_read_var_from_env "HOST_PORT" "8081")
    local http_stream_endpoint_val=$(_read_var_from_env "HTTP_STREAM_ENDPOINT" "/stream")
    local redis_host_port_val=$(_read_var_from_env "REDIS_PORT_HOST" "6379")
    local health_check_path_val=$(_read_var_from_env "HEALTH_CHECK_PATH" "/health")

    local compose_file_display="${COMPOSE_FILE#"$PROJECT_ROOT"/}";
    if [ "$compose_file_display" = "$COMPOSE_FILE" ]; then compose_file_display="$(basename "$COMPOSE_FILE")";
    elif [ -z "$compose_file_display" ] || [ "$compose_file_display" = "." ]; then compose_file_display="docker-compose.yml"; fi

    echo -e "\n${FG_BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${FG_BLUE}║           ${FG_BRIGHT_WHITE}🏁 FIN DE SESSION - RAPPORT D'OPÉRATIONS 🏁 ${FG_BLUE}         ║${NC}"
    echo -e "${FG_BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"

    if [[ "$UP_ARGS" == "" ]]; then
        _log "SUCCESS" "${FG_GREEN}🔑 Session terminée. Modules activés en mode interactif (logs).${NC}"
    else
        _log "SUCCESS" "${FG_GREEN}🔑 Opérations terminées. Modules (potentiellement) activés en mode ${FG_LIGHT_CYAN}silencieux (arrière-plan)${NC}. 🕵️${NC}"
        echo -e "${FG_BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${FG_BLUE}║            ${FG_BRIGHT_WHITE}📜 COMMANDES DE MAINTENANCE POST-SESSION 📜 ${FG_BLUE}         ║${NC}"
        echo -e "${FG_BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
        echo -e "${FG_BLUE}║ ${FG_LIGHT_MAGENTA}📍 Origine: ${FG_WHITE}$PROJECT_ROOT${NC}     ${FG_BLUE}║${NC}"
        echo -e "${FG_BLUE}║ ${FG_LIGHT_MAGENTA}📦 Source FastMCP : ${FG_GREEN}Distante (npm:fastmcp@2.2.2)${NC}       ${FG_BLUE}║${NC}"
        echo -e "${FG_BLUE}║ ${FG_DARK_GRAY}─────────────────────────────────────────────────────────── ${FG_BLUE}║${NC}"
        echo -e "${FG_BLUE}║ ${FG_CYAN}📡 Consulter tous les journaux   : ${FG_LIGHT_CYAN}docker compose -f \"$compose_file_display\" logs -f${NC}      ${FG_BLUE}║${NC}"
        if [[ -n "$current_session_started_modules" ]]; then
            read -r -a started_modules_for_log_summary <<< "$current_session_started_modules"
            if [ ${#started_modules_for_log_summary[@]} -gt 0 ]; then
                for module_name_log_item_raw in "${started_modules_for_log_summary[@]}"; do
                    local module_name_log_item=$(_strip_ansi_codes "$module_name_log_item_raw")
                    if [[ -n "$module_name_log_item" ]]; then
                        printf "${FG_BLUE}║ ${FG_CYAN}🛰️ Journaux ${FG_GREEN}%-20s${NC}${FG_CYAN}: ${FG_LIGHT_CYAN}logs -f %s${NC}                 ${FG_BLUE}║${NC}\n" "$module_name_log_item" "$module_name_log_item"
                    fi;
                done; fi; fi
        echo -e "${FG_BLUE}║ ${FG_CYAN}📊 État actuel des modules      : ${FG_LIGHT_CYAN}docker compose -f \"$compose_file_display\" ps${NC}         ${FG_BLUE}║${NC}"
        echo -e "${FG_BLUE}║ ${FG_CYAN}🛑 Arrêter tous les modules      : ${FG_LIGHT_CYAN}docker compose -f \"$compose_file_display\" stop${NC}       ${FG_BLUE}║${NC}"
        
        echo -e "${FG_BLUE}║ ${FG_DARK_GRAY}────────────────── ${FG_BRIGHT_WHITE}ACCÈS DIRECT AUX TERMINAUX${FG_DARK_GRAY} ───────────────── ${FG_BLUE}║${NC}"
        for module_name_shell_item_raw in "${ALL_MANAGEABLE_MODULES_ARRAY[@]}"; do
            local module_name_shell_item=$(_strip_ansi_codes "$module_name_shell_item_raw")
            printf "${FG_BLUE}║ ${FG_CYAN}🔩 Terminal ${FG_GREEN}%-18s${NC}${FG_CYAN}: ${FG_LIGHT_CYAN}exec %s /bin/bash${NC}           ${FG_BLUE}║${NC}\n" "$module_name_shell_item" "$module_name_shell_item"
        done
        
        echo -e "${FG_BLUE}║ ${FG_DARK_GRAY}───────────────── ${FG_BRIGHT_WHITE}INTERFACES DE CONTRÔLE PRINCIPALES${FG_DARK_GRAY} ─────────── ${FG_BLUE}║${NC}"
        echo -e "${FG_BLUE}║ ${FG_GREEN}🚀 Serveur MCP (${APP_MODULE_NAME}) : ${FG_WHITE}http://localhost:${host_port_val}${http_stream_endpoint_val}${NC} ${FG_BLUE}      ║${NC}"
        echo -e "${FG_BLUE}║ ${FG_GREEN}🩺 Health Check (${APP_MODULE_NAME}) : ${FG_WHITE}http://localhost:${host_port_val}${health_check_path_val}${NC} ${FG_BLUE}        ║${NC}"
        echo -e "${FG_BLUE}║ ${FG_GREEN}🧠 Cache Redis (${REDIS_MODULE_NAME})  : Hôte: ${FG_WHITE}localhost:${redis_host_port_val}${NC}     ${FG_BLUE}║${NC}"
        echo -e "${FG_BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    fi
    _log "MCP" "${FG_LIGHT_MAGENTA}Déconnexion de la console. Protocoles en attente. Bonne continuation. 😉${NC}";
    echo ""
}

# --- Point d'Entrée Principal ---
main() {
    trap "_error_exit \"Interruption manuelle détectée. Arrêt d'urgence...\" 130" INT
    trap "_error_exit \"Signal de terminaison reçu. Fermeture des protocoles...\" 143" TERM

    _parse_args "$@"

    echo -e "${FG_LIGHT_BLUE}"
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
    echo -e "${NC}${FG_LIGHT_MAGENTA}       >>> CONSOLE DE GESTION - MODEL CONTEXT PROTOCOLE (HTTP Streaming) v3.0 <<<${NC}"
    echo -e "${FG_DARK_GRAY}===============================================================================================${NC}\n"

    _log "SYSTEM" "${FG_LIGHT_CYAN}🛠️ Initialisation protocoles système... Vérification intégrité modules... 🛠️${NC}"
    if ! command -v docker &> /dev/null; then _error_exit "${FG_RED}Anomalie: Noyau 'docker' non détecté ! 🐳❌${NC}"; fi
    if ! docker compose version &> /dev/null; then _error_exit "${FG_RED}Anomalie: Module 'docker compose' (v2+) manquant ! ⚙️❌${NC}"; fi
    if [ ! -f "$COMPOSE_FILE" ]; then _error_exit "Corruption: Fichier Compose (${FG_RED}$COMPOSE_FILE${NC}) non trouvé ! 😱"; fi
    
    _ensure_env_file
    echo -e "${FG_DARK_GRAY}──────────────────────────────────────────────────────────────────────────────${NC}"
    
    echo -e "${FG_BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${FG_BLUE}║   ${FG_BRIGHT_WHITE}📊 PARAMÈTRES ACTIFS DE LA CONSOLE DE GESTION ${FG_BLUE}📊    ║${NC}"
    echo -e "${FG_BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${FG_BLUE}║ ${FG_CYAN}📍 Répertoire Opérationnel  : ${FG_MAGENTA}$PROJECT_ROOT${NC}             ${FG_BLUE}║${NC}"
    echo -e "${FG_BLUE}║ ${FG_CYAN}📜 Fichier Docker Compose  : ${FG_MAGENTA}$COMPOSE_FILE${NC}               ${FG_BLUE}║${NC}"
    echo -e "${FG_BLUE}║ ${FG_CYAN}📦 Source FastMCP          : ${FG_GREEN}Distante (npm:fastmcp@2.2.2)${NC}       ${FG_BLUE}║${NC}"
    echo -e "${FG_BLUE}║ ${FG_CYAN}🛠️ Modules Constructibles  : ${FG_GREEN}$BUILDABLE_MODULES_STR${NC}      ${FG_BLUE}║${NC}"
    echo -e "${FG_BLUE}║ ${FG_CYAN}📦 Modules Synchronisables : ${FG_LIGHT_CYAN}$PULLABLE_MODULES_STR${NC}             ${FG_BLUE}║${NC}"
    echo -e "${FG_BLUE}║ ${FG_CYAN}🚀 Options 'UP' (mode)   : '${FG_LIGHT_GRAY}${UP_ARGS:-Console Directe}${NC}'                   ${FG_BLUE}║${NC}"
    echo -e "${FG_BLUE}║ ${FG_CYAN}⚙️ Options 'BUILD'       : '${FG_LIGHT_GRAY}${SCRIPT_BUILD_ARGS:-aucune}${NC}'                       ${FG_BLUE}║${NC}"
    echo -e "${FG_BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}\n"

    if [[ "$UP_ARGS" == "" ]]; then
        _action_show_logs; _display_final_summary; trap - INT TERM EXIT; exit 0;
    fi

    while true; do
        echo -e "${FG_MAGENTA}╔═════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${FG_MAGENTA}║        ${FG_BRIGHT_WHITE}🤖 CONSOLE DE COMMANDEMENT - MCP (HTTP Streaming) v3.0 🤖         ${FG_MAGENTA}║${NC}"
        echo -e "${FG_MAGENTA}╠═════════════════════════════════════════════════════════════════════════════╣${NC}"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_RED}%-70s${NC}${FG_MAGENTA}║${NC}\n" "1" "☣️ Nettoyage COMPLET (Supprime tout, Reconstruit, Démarre)"
        echo -e "${FG_MAGENTA}║ ${FG_DARK_GRAY}───────────────────────────────────────────────────────────────────────── ${FG_MAGENTA}║${NC}"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_YELLOW}%-70s${NC}${FG_MAGENTA}║${NC}\n" "2" "🌀 Arrêter & Supprimer des Modules (Stop & Rm)"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_YELLOW}%-70s${NC}${FG_MAGENTA}║${NC}\n" "3" "🔄 REDÉMARRER des Modules Spécifiques (Stop & Up)"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_YELLOW}%-70s${NC}${FG_MAGENTA}║${NC}\n" "4" "🚀 Démarrer/Redémarrer des MODULES (Up)"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_YELLOW}%-70s${NC}${FG_MAGENTA}║${NC}\n" "5" "♻️ Démarrer avec RECRÉATION FORCÉE (Up --force-recreate)"
        echo -e "${FG_MAGENTA}║ ${FG_DARK_GRAY}───────────────────────────────────────────────────────────────────────── ${FG_MAGENTA}║${NC}"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_LIGHT_GREEN}%-70s${NC}${FG_MAGENTA}║${NC}\n" "6" "📥 Synchroniser Images de Base (Pull)"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_LIGHT_GREEN}%-70s${NC}${FG_MAGENTA}║${NC}\n" "7" "🛠️ Construire/Reconstruire MODULES Locaux (Build)"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_LIGHT_GREEN}%-70s${NC}${FG_MAGENTA}║${NC}\n" "8" "⚙️ Séquence COMPLÈTE (Arrêt, Construction, Démarrage)"
        echo -e "${FG_MAGENTA}║ ${FG_DARK_GRAY}───────────────────────────────────────────────────────────────────────── ${FG_MAGENTA}║${NC}"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_LIGHT_CYAN}%-70s${NC}${FG_MAGENTA}║${NC}\n" "9" "📊 Afficher ÉTAT ACTUEL des Modules (docker compose ps)"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_LIGHT_CYAN}%-70s${NC}${FG_MAGENTA}║${NC}\n" "10" "📄 Visualiser CONFIGURATION Docker Compose"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_LIGHT_CYAN}%-70s${NC}${FG_MAGENTA}║${NC}\n" "11" "📜 Afficher JOURNAUX D'ÉVÉNEMENTS (Logs)"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_LIGHT_CYAN}%-70s${NC}${FG_MAGENTA}║${NC}\n" "12" "🔗 Accès TERMINAL DIRECT à un Module (Shell)"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_LIGHT_CYAN}%-70s${NC}${FG_MAGENTA}║${NC}\n" "13" "⚡ EXÉCUTER une Commande dans un Module (exec)"
        echo -e "${FG_MAGENTA}║ ${FG_DARK_GRAY}───────────────────────────────────────────────────────────────────────── ${FG_MAGENTA}║${NC}"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_BLUE}%-70s${NC}${FG_MAGENTA}║${NC}\n" "14" "🧹 Nettoyage SYSTÈME Docker (System Prune)"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_BLUE}%-70s${NC}${FG_MAGENTA}║${NC}\n" "15" "🛡️ VALIDER Paramètres d'Environnement (.env)"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_BLUE}%-70s${NC}${FG_MAGENTA}║${NC}\n" "16" "🅿️ Exécuter Script PNPM (Lint, Format, Test - Hôte)"
        echo -e "${FG_MAGENTA}║ ${FG_DARK_GRAY}───────────────────────────────────────────────────────────────────────── ${FG_MAGENTA}║${NC}"
        printf "${FG_MAGENTA}║ ${FG_CYAN}%-2s ${FG_RED}%-70s${NC}${FG_MAGENTA}║${NC}\n" "17" "🚪 QUITTER la Console de Gestion"
        echo -e "${FG_MAGENTA}╚═════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo -en "${FG_BRIGHT_WHITE}Entrez votre choix (1-17) : ${NC}"
        read -r main_choice

        echo -e "${FG_DARK_GRAY}───────────────────────────┤ ${FG_YELLOW}TRAITEMENT DU CHOIX${FG_DARK_GRAY} ├──────────────────────────${NC}"

        case "$main_choice" in
            1) _action_full_cleanup ;;
            2) _action_stop_remove_modules ;;
            3) _action_restart_modules ;;
            4) _action_start_modules ;;
            5) _action_force_recreate_modules ;;
            6) _action_pull_base_images ;;
            7) _action_build_modules ;;
            8) _action_full_sequence_modules ;;
            9) _action_show_status ;;
            10) _action_view_config ;;
            11) _action_show_logs ;;
            12) _action_direct_shell_access ;;
            13) _action_exec_command_in_module ;;
            14) _action_docker_system_prune ;;
            15) _action_validate_env ;;
            16) _action_run_pnpm_script ;;
            17) break ;;
            *) _log "WARN" "${FG_RED}Choix '$main_choice' invalide.${NC}" ;;
        esac

        if [[ "$main_choice" != "17" ]]; then
             echo -e "\n${FG_MAGENTA}Appuyez sur [ENTRÉE] pour retourner à la Console...${NC}";
             read -r; clear;
        fi
    done
    
    _display_final_summary
    _log "MCP" "${FG_LIGHT_MAGENTA}Déconnexion de la console. Session terminée. 😉${NC}"
    trap - INT TERM EXIT
}

main "$@"
exit 0
�