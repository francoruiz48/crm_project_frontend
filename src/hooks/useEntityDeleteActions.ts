import { useMemo } from 'react'
import { buildActions, type ListItemAction } from 'src/components/ui/lists/CustomListItem'
import { useDictionaryContext } from 'src/stores/DictionaryContext'
import { canEntityDelete, canEntityToggle, getEntityActionConfig } from 'src/config/entityActions'
import type { DeleteStrategy } from 'src/types/shared'

export interface EntityDeleteActionsParams {
    // Nombre del modelo backend (key de "entity_delete_strategies"), ej. "Campaign" u "Organization".
    modelName: string,
    // Estado activo de la entidad: define si se muestra "Deshabilitar" o "Habilitar".
    active?: boolean,
    // Callback del toggle deshabilitar/habilitar (la página decide si abre un diálogo de confirmación).
    onToggle: () => void,
    // Callback de borrado físico directo (solo en las estrategias que lo permiten sin force).
    onDelete?: () => void,
    // Default: `${modelName.toLowerCase()}:delete`
    deletePermission?: string,
    // Default: `${modelName.toLowerCase()}:update`
    togglePermission?: string,
}

export interface EntityDeleteActions {
    strategy: DeleteStrategy | undefined
    // Si el detalle puede mostrar el botón de deshabilitar/habilitar (HandleActiveButton).
    canToggle: boolean
    // Si la entidad soporta borrado físico directo desde la UI.
    canDelete: boolean
    // Porción de acciones de borrado/deshabilitado lista para esparcir en `ResponsiveListItem`.
    listActions: ListItemAction[]
}

/**
 * Dado el modelo backend (ej. "Campaign"), lee su estrategia de borrado del contexto de
 * diccionarios y devuelve la porción de acciones destructivas que la UI debe ofrecer:
 * - `listActions`: ítems listos para `ResponsiveListItem` (toggle DISABLE/ENABLE y/o DELETE).
 * - `canToggle` / `canDelete`: flags para renderizar los botones del detalle.
 * La página compone este slice con sus propias acciones (DETAILS, MODIFY, etc.).
 *
 * Para acciones con confirmación de diálogo centralizada ver `useEntityActionManager`
 * (este hook queda para los consumidores que manejan el toggle ellos mismos).
 */
export const useEntityDeleteActions = ({ modelName, active, onToggle, onDelete, deletePermission, togglePermission }: EntityDeleteActionsParams): EntityDeleteActions => {
    const { dictionaries } = useDictionaryContext()

    const strategy = dictionaries["entity_delete_strategies"]?.[modelName]

    const canToggle = canEntityToggle(strategy)
    const canDelete = canEntityDelete(strategy)

    const { permissionBase } = getEntityActionConfig(modelName)
    const deletePerm = deletePermission ?? `${permissionBase}:delete`
    const togglePerm = togglePermission ?? `${permissionBase}:update`

    const listActions = useMemo<ListItemAction[]>(() => {
        const items: (ListItemAction | false)[] = []
        if (canToggle) {
            items.push({
                template: active ? "DISABLE" : "ENABLE",
                onClick: onToggle,
                permission: active ? deletePerm : togglePerm,
            })
        }
        if (canDelete && onDelete) {
            items.push({ template: "DELETE", onClick: onDelete, permission: deletePerm })
        }
        return buildActions(...items)
    }, [canToggle, canDelete, active, onToggle, onDelete, deletePerm, togglePerm])

    return { strategy, canToggle, canDelete, listActions }
}