import { useCallback, useState } from "react"
import { buildActions, type ListItemAction } from "src/components/ui/lists/CustomListItem"
import { useDictionaryContext } from "src/stores/DictionaryContext"
import { canEntityDelete, canEntityToggle, getEntityActionConfig } from "src/config/entityActions"
import { activateEntity, deactivateEntity, deleteEntity } from "src/services/entityActionsService"
import { showCommonErrorToast, showToast } from "src/utils/feedback"
import type { DeleteStrategy, DisableableEntity } from "src/types/shared"

export type EntityPendingAction = "disable" | "enable" | "delete" | "delete-force"

export interface EntityActionManagerParams {
    // Nombre del modelo backend (key de "entity_delete_strategies" y de MODEL_ACTIONS).
    modelName: string,
    // Nombre/artículo de la entidad para el diálogo y el toast. Ej. "la campaña".
    entityTypeName?: string,
    // Callback tras una acción exitosa: refetch de la lista/detalle, navegación, etc.
    onSuccess?: () => unknown,
    // Default: `${permissionBase}:delete`
    deletePermission?: string,
    // Default: `${permissionBase}:update`
    togglePermission?: string,
}

export interface EntityActionManager<T extends DisableableEntity & { id: string }> {
    strategy: DeleteStrategy | undefined
    canToggle: boolean
    canDelete: boolean
    canForceDelete: boolean
    entityTypeName?: string
    // Permisos resueltos (para los hasPermission de los botones del detalle).
    updatePerm: string
    deletePerm: string
    // Acciones sidebar/menú para un ítem de lista (toggle DISABLE/ENABLE y/o DELETE).
    listActionsFor: (entity: T) => ListItemAction[]
    // Prepara la confirmación del toggle deshabilitar/habilitar (abre el diálogo).
    requestToggle: (entity: T) => void
    // Prepara la confirmación del borrado (force=true para la opción hard de SMART/C).
    requestDelete: (entity: T, force?: boolean) => void
    // Entidad cuya acción está pendiente de confirmar (null = sin diálogo abierto).
    pendingEntity: T | null
    pendingAction: EntityPendingAction | null
    // true cuando la acción pendiente es un borrado (el diálogo muestra solo "eliminar").
    isPendingDelete: boolean
    clearPending: () => void
    // Ejecuta la acción pendiente contra la API. Show toast + onSuccess al terminar.
    confirm: () => Promise<void>
}

/**
 * Manager reutilizable de acciones destructivas (deshabilitar/habilitar/borrar) para una
 * entidad backend. Centraliza:
 *   - la estrategia de borrado (del diccionario) y la config de rutas/permisos (MODEL_ACTIONS),
 *   - las acciones de lista (`listActionsFor`) y el estado de confirmación del diálogo.
 *
 * Uso típico en una lista:
 *   const actions = useEntityActionManager<CampaignDetailed>({ modelName: "Campaign", onSuccess: refetch })
 *   ...
 *   {items.map(item => <ResponsiveListItem actions={[...misAcciones, ...actions.listActionsFor(item)]} />)}
 *   <EntityConfirmDialog idModal="..." controller={actions} />
 *
 * Uso típico en un detalle: `canToggle` + `requestToggle(entity)` (HandleActiveButton).
 */
export const useEntityActionManager = <T extends DisableableEntity & { id: string },>({
    modelName, entityTypeName, onSuccess, deletePermission, togglePermission,
}: EntityActionManagerParams): EntityActionManager<T> => {

    const { dictionaries } = useDictionaryContext()
    const [pendingEntity, setPendingEntity] = useState<T | null>(null)
    const [pendingAction, setPendingAction] = useState<EntityPendingAction | null>(null)

    const strategy = dictionaries["entity_delete_strategies"]?.[modelName]

    const canToggle = canEntityToggle(strategy)
    const canDelete = canEntityDelete(strategy)
    // La opción de borrado "hard" (?force=true) solo existe en SOFT_DELETE_HARD_OPT (C).
    const canForceDelete = strategy === "SOFT_DELETE_HARD_OPT"

    const { prefix, permissionBase } = getEntityActionConfig(modelName)
    const deletePerm = deletePermission ?? `${permissionBase}:delete`
    const togglePerm = togglePermission ?? `${permissionBase}:update`

    const requestToggle = useCallback((entity: T) => {
        setPendingEntity(entity)
        setPendingAction(entity.active ? "disable" : "enable")
    }, [])

    const requestDelete = useCallback((entity: T, force = false) => {
        setPendingEntity(entity)
        setPendingAction(force ? "delete-force" : "delete")
    }, [])

    const clearPending = useCallback(() => {
        setPendingEntity(null)
        setPendingAction(null)
    }, [])

    const listActionsFor = useCallback((entity: T): ListItemAction[] => {
        const items: (ListItemAction | false)[] = []
        if (canToggle) {
            items.push({
                template: entity.active ? "DISABLE" : "ENABLE",
                onClick: () => requestToggle(entity),
                permission: entity.active ? deletePerm : togglePerm,
            })
        }
        if (canDelete) {
            items.push({ template: "DELETE", onClick: () => requestDelete(entity), permission: deletePerm })
        }
        return buildActions(...items)
    }, [canToggle, canDelete, requestToggle, requestDelete, deletePerm, togglePerm])

    const confirm = useCallback(async () => {
        if (!pendingEntity || !pendingAction) return
        const typeName = entityTypeName ?? "la entidad"
        const name = (pendingEntity as { name?: string }).name
        const label = name ? `${typeName} "${name}"` : typeName

        try {
            if (pendingAction === "enable") {
                await activateEntity(prefix, pendingEntity.id)
            } else if (pendingAction === "disable") {
                // Con deactivate el backend expone DELETE /{prefix}/active/{id}. Si no, el
                // soft-delete se hace por el DELETE genérico (mismo resultado: active=false).
                if (getEntityActionConfig(modelName).deactivate) await deactivateEntity(prefix, pendingEntity.id)
                else await deleteEntity(prefix, pendingEntity.id)
            } else {
                await deleteEntity(prefix, pendingEntity.id, pendingAction === "delete-force")
            }

            const verb = pendingAction === "enable" ? "habilitado"
                : pendingAction === "disable" ? "deshabilitado" : "eliminado"
            showToast(`${label} ${verb} con éxito.`)
            if (onSuccess) onSuccess()
        } catch (error) {
            showCommonErrorToast(error)
            // Se relanza para que el diálogo de confirmación no se cierre mientras falla.
            throw error
        }
    }, [pendingEntity, pendingAction, entityTypeName, onSuccess, prefix, modelName])

    return {
        strategy,
        canToggle,
        canDelete,
        canForceDelete,
        entityTypeName,
        updatePerm: togglePerm,
        deletePerm,
        listActionsFor,
        requestToggle,
        requestDelete,
        pendingEntity,
        pendingAction,
        isPendingDelete: pendingAction === "delete" || pendingAction === "delete-force",
        clearPending,
        confirm,
    }
}