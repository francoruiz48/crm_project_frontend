import type { Path } from "react-hook-form"
import { DisableConfirmDialog } from "src/components/ui/feedback/ConfirmationDialog"
import type { DisableableEntity } from "src/types/shared"
import type { EntityActionManager } from "src/hooks/useEntityActionManager"

interface EntityConfirmDialogProps<T extends DisableableEntity & { id: string }> {
    idModal: string,
    controller: EntityActionManager<T>,
    nameField?: Path<T>,
}

/**
 * Diálogo de confirmación conectado a `useEntityActionManager`. Se renderiza una única vez
 * por página; se abre solo cuando el manager tiene una acción pendiente (pendingEntity != null).
 *
 * Uso:
 *   const actions = useEntityActionManager<CampaignDetailed>({ modelName: "Campaign", onSuccess: refetch })
 *   ...
 *   <EntityConfirmDialog idModal="campaign-confirm" controller={actions} />
 */
export const EntityConfirmDialog = <T extends DisableableEntity & { id: string },>({
    idModal, controller, nameField,
}: EntityConfirmDialogProps<T>) => (
    <DisableConfirmDialog
        idModal={idModal}
        entity={controller.pendingEntity}
        clearEntity={controller.clearPending}
        entityTypeName={controller.entityTypeName ?? "la entidad"}
        onlyDelete={controller.isPendingDelete}
        nameField={nameField}
        onConfirm={controller.confirm}
    />
)