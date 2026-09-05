import type { DeleteStrategy, EntityActionsConfig } from "src/types/shared"

// ── Estrategias y qué acción ofrecen (coincide con las keys de "entity_delete_strategies") ──
// Definidas acá en un solo lugar para que el hook y los componentes no dupliquen los sets.

// Estrategias que ofrecen el toggle deshabilitar/habilitar (soft-delete).
export const CAN_TOGGLE_STRATEGIES: ReadonlySet<DeleteStrategy> = new Set([
    "SOFT_DELETE_ALWAYS",
    "SOFT_DELETE_HARD_OPT",
    "SMART_DELETE",
    "HARD_DELETE_WITH_TOGGLE",
])

// Estrategias que permiten borrado físico directo (sin force) desde la UI.
export const CAN_DELETE_STRATEGIES: ReadonlySet<DeleteStrategy> = new Set([
    "HARD_DELETE_ALWAYS",
    "HARD_DELETE_WITH_TOGGLE",
])

// Si la entidad no está mapeada en el diccionario, se mantiene el comportamiento
// histórico: mostrar solo el toggle deshabilitar/habilitar.
export const FALLBACK_STRATEGY: DeleteStrategy = "SOFT_DELETE_ALWAYS"

export const canEntityToggle = (strategy: DeleteStrategy | undefined): boolean =>
    CAN_TOGGLE_STRATEGIES.has(strategy ?? FALLBACK_STRATEGY)

export const canEntityDelete = (strategy: DeleteStrategy | undefined): boolean =>
    CAN_DELETE_STRATEGIES.has(strategy ?? FALLBACK_STRATEGY)

/**
 * Registro central de acciones de borrado/habilitado, keyed por nombre de modelo backend
 * (el mismo key de "entity_delete_strategies" del diccionario). Surge de la unificación de
 * las acciones ad-hoc de cada página (ver src/logs/EntityActionsUnificacion.md).
 *
 * Cómo se completa cada campo (en base al router del controller, backend/AGENTS.md §7):
 * - prefix: ruta base donde `BaseController.get_router` registra las rutas activas.
 * - permissionBase: permiso real de la entidad = nombre lógico del permiso (ej. una entidad
 *   puede vivir bajo "lead_routing_policies" pero su permiso es "lead_routing_policy").
 * - deactivate: true únicamente si el controller expone DELETE /{prefix}/active/{id} (flag
 *   DEACTIVATE en enabled_methods, o router custom). Si no, el toggle-off usa DELETE /{prefix}/{id}.
 *
 * Estrategias:
 *   C SOFT_DELETE_HARD_OPT → toggle + (opcional) borrado con ?force=true
 *   E SMART_DELETE        → solo toggle-off por desactivación explícita
 *   B SOFT_DELETE_ALWAYS  → toggle (toggle-off = soft-delete, o desactivación si existe)
 *   F HARD_DELETE_WITH_TOGGLE → toggle + borrado físico
 *   A HARD_DELETE_ALWAYS  → solo borrado físico
 *   P PROTECTED           → sin acciones (no se registran acá)
 */
export const MODEL_ACTIONS: Record<string, EntityActionsConfig> = {
    // Estrategia C: SOFT_DELETE_HARD_OPT
    Campaign: { prefix: "campaigns", permissionBase: "campaign", deactivate: true },
    WebForm: { prefix: "web_forms", permissionBase: "web_form", deactivate: true },
    Team: { prefix: "teams", permissionBase: "team", deactivate: true },
    User: { prefix: "users", permissionBase: "user" },
    // Estrategia E: SMART_DELETE
    LeadField: { prefix: "lead_fields", permissionBase: "lead_field", deactivate: true },
    Workspace: { prefix: "workspaces", permissionBase: "workspace", deactivate: true },
    // Estrategia B: SOFT_DELETE_ALWAYS
    Role: { prefix: "roles", permissionBase: "role" },
    LeadFlow: { prefix: "lead_flows", permissionBase: "lead_flow", deactivate: true },
    LeadState: { prefix: "lead_states", permissionBase: "lead_state", deactivate: true },
    LeadContactState: { prefix: "lead_contact_states", permissionBase: "lead_contact_state" },
    LeadFieldSection: { prefix: "lead_field_sections", permissionBase: "lead_field_section", deactivate: true },
    Nomenclator: { prefix: "nomenclators", permissionBase: "nomenclator" },
    NomenclatorItem: { prefix: "nomenclator_items", permissionBase: "nomenclator_item", deactivate: true },
    LeadComment: { prefix: "lead_comments", permissionBase: "lead_comment" },
    // Estrategia F: HARD_DELETE_WITH_TOGGLE
    FieldAutomation: { prefix: "field_automations", permissionBase: "field_automation", deactivate: true },
    LeadRoutingPolicy: { prefix: "lead_routing_policies", permissionBase: "lead_routing_policy", deactivate: true },
    // Estrategia A: HARD_DELETE_ALWAYS
    Lead: { prefix: "leads", permissionBase: "lead" },
    LeadView: { prefix: "lead_views", permissionBase: "lead_view" },
    ValidationRule: { prefix: "validation_rules", permissionBase: "validation_rule" },
    LeadStateTransition: { prefix: "lead_state_transitions", permissionBase: "lead_state_transition" },
    TeamMember: { prefix: "team_members", permissionBase: "team_member" },
    TeamWorkspaceAccess: { prefix: "team_workspace_access", permissionBase: "team_workspace_access" },
    TeamCampaignAccess: { prefix: "team_campaign_access", permissionBase: "team_campaign_access" },
    Tag: { prefix: "tags", permissionBase: "tag" },
    LeadFieldValue: { prefix: "lead_field_values", permissionBase: "lead_field_value" },
}

/**
 * Resuelve la config de una entidad. Si no está registrada, usa el fallback histórico:
 * prefix y permiso = modelName en minúsculas, sin desactivación explícita.
 */
export const getEntityActionConfig = (modelName: string): EntityActionsConfig =>
    MODEL_ACTIONS[modelName] ?? { prefix: modelName.toLowerCase(), permissionBase: modelName.toLowerCase() }