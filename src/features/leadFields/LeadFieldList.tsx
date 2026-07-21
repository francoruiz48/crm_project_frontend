import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { SimulateLeadFormModal } from "../lead/leadForm/LeadFormWraper"
import { ValidationFormSidebar } from "../validations/ValidationForm"
import { LeadFieldTableSections } from "./LeadFieldTable"
import { LeadFieldFormSidebar } from "./LeadFieldForm"
import { LeadFieldDetail } from "./LeadFieldDetail"
import { DisableBulkConfirmDialog } from "src/components/ui/feedback/ConfirmationDialog"
import { GenericSidebar } from "shared/layout/container/GenericContainer"
import LoadingScreenWrapper from "src/components/ui/feedback/LoadingScreen"
import CommonButton from "shared/ui/buttons/CommonButton"
import { useSelectCheckbox } from "src/hooks/useSelectCheckbox"
import { useLoading } from "src/hooks/useLoading"
import { useSidebar } from "src/hooks/useSidebar"
import { useModal } from "src/hooks/useModal"
import type { LeadFieldDetailed } from "src/types/leadFields"
import type { CampaignDetailed } from "src/types/campaigns"
import { disableBulkLeadField, disableLeadField, enableBulkLeadField, enableLeadField, getLeadField, getLeadFields, reorderLeadFields } from "./leadFieldServices"
import { getLeadFieldsBySectionsIds } from "./leadFieldUtils"
import { showCommonErrorToast, showToast } from "src/utils/feedback"
import { useSearchParams } from "react-router-dom"
import { ButtonGroup, Stack, Typography } from "@mui/material"

interface LeadFieldTableProps {
    campaign: CampaignDetailed,
    closeCmpSidebar: () => void,
    cmpSidebarMode: unknown | null
}

export interface ReorderFieldsIds {
    sectId: number;
    sectName: string;
    fields: number[];
}

export const LeadFieldList = memo(({ campaign, cmpSidebarMode, closeCmpSidebar }: LeadFieldTableProps) => {

    const [leadFields, setLeadFields] = useState<LeadFieldDetailed[] | null>(null)

    const fetchLeadFields = useCallback((id: number) => {
        return getLeadFields({
            detailed: true, campaign_id: id, only_active: false, page_size: 0
        }).then(res => setLeadFields(res.items))
    }, [setLeadFields])

    const { loading: fieldsLoading, fnWithLoading: fetchFieldsLoad } = useLoading(fetchLeadFields)

    useEffect(() => {
        fetchFieldsLoad(Number(campaign.id))
    }, [campaign, fetchFieldsLoad])

    const [params, setParams] = useSearchParams()

    const { sidebarMode, selectedEntity, handleSidebar, closeSidebar } = useSidebar<LeadFieldDetailed>("id", params, setParams, getLeadField, "DETAILS_FIELD")
    const { modalProps } = useModal()

    const handleSidebarWrapper = useCallback((mode: string, entity?: LeadFieldDetailed | null) => {
        if (cmpSidebarMode) closeCmpSidebar()
        handleSidebar(mode, entity)
    }, [cmpSidebarMode, closeCmpSidebar, handleSidebar])

    //Define como actualizar la lista dependiendo de la acción realizada. 
    // Para CREATE se vuelve a hacer fetch de la página para no arruinar la paginación
    const updateEntity = useCallback((mode: string, entity: LeadFieldDetailed) => {
        switch (mode) {
            case "UPDATE_FIELD": {
                const newLeadField = entity as LeadFieldDetailed
                if (newLeadField.id === selectedEntity?.id) {
                    handleSidebar("KEEP", newLeadField)
                }
                return setLeadFields(prevList => {
                    if (!prevList || !(prevList?.length > 0)) return prevList
                    const newLeadFields = [...prevList]
                    const fieldIdx = prevList.findIndex(field => field.id === newLeadField.id)
                    if (fieldIdx === -1) return prevList
                    newLeadFields[fieldIdx] = newLeadField
                    return newLeadFields
                })
            }
            case "CREATE_FIELD": {
                return fetchFieldsLoad(campaign.id)
            }
            case "DELETE_FIELD": {
                return setLeadFields(prevList => {
                    if (!prevList || !(prevList?.length > 0)) return prevList
                    const newLeadFields = [...prevList]
                    const fieldIdx = prevList.findIndex(field => field.id === entity.id)
                    if (fieldIdx === -1) return prevList
                    newLeadFields.splice(fieldIdx, 1)
                    if (selectedEntity && entity.id === selectedEntity.id) closeSidebar()
                    return newLeadFields
                })
            }
        }
    }, [closeSidebar, selectedEntity, fetchFieldsLoad, handleSidebar, campaign.id])

    const handleActive = async (field: LeadFieldDetailed | null) => {
        if (!field || !field.id) return
        const updateActive = () => {
            updateEntity("UPDATE_FIELD", { ...field, active: !field.active })
            handleSidebar("KEEP", { ...field, active: !field.active })
        }
        if (field.active) {
            disableLeadField(field.id)
                .then(res => {
                    if (res.action === "disabled") {
                        updateActive()
                        showToast(`El campo "${field.name}" se ha deshabilitado con éxito`)
                    }
                    else {
                        updateEntity("DELETE_FIELD", field)
                        showToast(`El campo "${field.name}" se ha eliminado definitivamente`)
                    }
                })
                .catch(e => showCommonErrorToast(e))
        }
        else enableLeadField(field.id).then(() => {
            updateActive()
            showToast(`El campo "${field.name}" se ha habilitado con éxito`)
        })
            .catch(e => showCommonErrorToast(e))
    }

    //-----------------------------------------------Reordenamiento-----------------------------------------------
    const [isReordering, setIsReordering] = useState<boolean>(false)

    const [originalFieldsBySectionIds, setOriginalFieldsBySectionIds] = useState<ReorderFieldsIds[]>([])
    const [newFieldsBySectionIds, setNewFieldsBySectionIds] = useState<ReorderFieldsIds[]>([])

    useEffect(() => {
        const leadFieldsIds = getLeadFieldsBySectionsIds(leadFields)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOriginalFieldsBySectionIds(leadFieldsIds)
        setNewFieldsBySectionIds(leadFieldsIds)
    }, [leadFields])

    const submitReorder = useCallback((updatedfieldsBySectionIds: ReorderFieldsIds[]) => {
        if (!campaign?.id) return
        if (JSON.stringify(updatedfieldsBySectionIds) === JSON.stringify(originalFieldsBySectionIds)) return setIsReordering(false)
        const fieldsFlatList = updatedfieldsBySectionIds.map(section => section.fields).flat()
        const reorder = fieldsFlatList.map((field, idx) => ({ field_id: field, order: idx + 1 }))
        reorderLeadFields({ campaign_id: campaign.id, orders: reorder })
            .then(res => {
                showToast(res.message)
                fetchFieldsLoad(campaign.id)
                setIsReordering(false)
            })
            .catch(e => showCommonErrorToast(e))
    }, [campaign, fetchFieldsLoad, originalFieldsBySectionIds])

    const cancelReorder = () => {
        setNewFieldsBySectionIds(originalFieldsBySectionIds)
        setIsReordering(false)
    }

    //------------------------------------------------------Deshabilitación masiva de campos------------------------------------------------------
    const { checkedItems, checkedItemsArray, addItem, removeItem, removeAllItems, areThereActiveItems, areThereInactiveItems } = useSelectCheckbox<LeadFieldDetailed>()

    const checkBoxProps = useMemo(() => ({ checkedItems, checkedItemsArray, addItem, removeItem }), [checkedItems, checkedItemsArray, addItem, removeItem])

    const [bulkDisabling, setBulkDisabling] = useState<"disable" | "enable" | null>(null)

    const handleActiveBulk = useCallback((isDisabling: boolean) => {
        if (isDisabling) {
            return disableBulkLeadField(checkedItemsArray.map(i => i.id))
                .then(res => {
                    removeAllItems()
                    const [disLength, delLength, failLength] = [res.disabled.length, res.deleted.length, res.failed.length]
                    if (delLength + disLength > 0) fetchFieldsLoad(campaign.id)
                    showToast(`
                        ${disLength > 0 ? `Se han deshabilitado ${disLength} campo${disLength > 1 ? "s" : ""}. ` : ""}
                        ${delLength > 0 ? `Se han eliminado definitivamente ${delLength} campo${delLength > 1 ? "s" : ""}. ` : ""}
                        ${failLength > 0 ? `No se ha podido deshabilitar ${failLength} campo${failLength > 1 ? "s" : ""}.` : ""}
                        `)
                })
                .catch(e => showCommonErrorToast(e))
        }
        return enableBulkLeadField(checkedItemsArray.map(i => i.id))
            .then(res => {
                removeAllItems()
                const [enLength, failLength] = [res.activated.length, res.failed.length]
                if (enLength > 0) fetchFieldsLoad(campaign.id)
                showToast(`
                        ${enLength > 0 ? `Se han habilitado ${enLength} campo${enLength > 1 ? "s" : ""}. ` : ""}
                        ${failLength > 0 ? `No se ha podido habilitar ${failLength} campo${failLength > 1 ? "s" : ""}.` : ""}
                        `)
            })
            .catch(e => showCommonErrorToast(e))
    }, [campaign.id, checkedItemsArray, fetchFieldsLoad, removeAllItems])

    //Actualiza el nombre de la sección en todos los LeadField que la referencian, tras renombrarla
    //desde el doble clic en LeadFieldTableSections (evita tener que refetchear toda la lista).
    const handleSectionRenamed = useCallback((sectionId: number, newName: string) => {
        setLeadFields(prev => prev?.map(field =>
            field.lead_field_section.id === sectionId
                ? { ...field, lead_field_section: { ...field.lead_field_section, name: newName } }
                : field
        ) ?? prev)
    }, [])

    return (
        <Stack spacing={3}>
            <Stack useFlexGap direction="row" spacing={2}
                sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="h2">Lista de Campos de Lead</Typography>
                {leadFields && leadFields.length > 0 &&
                    <ButtonGroup sx={{ marginLeft: "auto" }}>
                        {!isReordering && campaign &&
                            <SimulateLeadFormModal campaign={campaign} leadFields={leadFields} onCancel={modalProps.handleClose} modalProps={modalProps} />
                        }
                        {isReordering && <CommonButton onClick={cancelReorder}
                            color="error" variant="outlined" actionType="CLOSE" onlyTooltip>
                            Cancelar
                        </CommonButton>}
                        <CommonButton onClick={() => isReordering ? submitReorder(newFieldsBySectionIds) : setIsReordering(true)}
                            color={isReordering ? "primary" : "secondary"} variant={isReordering ? "contained" : "outlined"}
                            actionType={isReordering ? "SAVE" : "REORDER"} onlyTooltip>
                            Reordenar
                        </CommonButton>
                        {!isReordering && checkedItems.size > 0 && areThereInactiveItems &&
                            <CommonButton onClick={() => setBulkDisabling("enable")} actionType="ENABLE" color="success" variant="outlined" onlyTooltip>
                                Habilitar Seleccionados
                            </CommonButton>}
                        {!isReordering && checkedItems.size > 0 && areThereActiveItems &&
                            <CommonButton onClick={() => setBulkDisabling("disable")} actionType="DISABLE" color="error" variant="outlined" onlyTooltip>
                                Deshabilitar Seleccionados
                            </CommonButton>}
                        {!isReordering && <CommonButton onClick={() => handleSidebar("CREATE_FIELD", null)} actionType="CREATE" onlyTooltip>
                            Agregar
                        </CommonButton>}

                    </ButtonGroup>
                }
            </Stack>
            <LoadingScreenWrapper loading={fieldsLoading}>
                {leadFields && newFieldsBySectionIds.length > 0 ?
                    <LeadFieldTableSections isReordering={isReordering} newFieldsBySectionIds={newFieldsBySectionIds} setNewFieldsBySectionIds={setNewFieldsBySectionIds}
                        handleActive={handleActive} leadFields={leadFields} handleSidebarWrapper={handleSidebarWrapper} onSectionRenamed={handleSectionRenamed} {...checkBoxProps} />
                    :
                    <Stack spacing={2} sx={{ justifyContent: "center", alignItems: "center" }}>
                        <Typography variant="h4">No se han encontrado campos para esta campaña...</Typography>
                        <CommonButton onClick={() => handleSidebar("CREATE_FIELD", null)} actionType="CREATE">Agregar</CommonButton>
                    </Stack>
                }
            </LoadingScreenWrapper >
            <GenericSidebar isSidebarOpen={Boolean(sidebarMode)} closeSidebar={closeSidebar} >
                <LeadFieldSidebar mode={sidebarMode} entity={selectedEntity} updateEntity={updateEntity} campaign={campaign}
                    closeSidebar={closeSidebar} handleSidebar={handleSidebarWrapper} leadFields={leadFields} />
            </GenericSidebar>
            <DisableBulkConfirmDialog idModal="dis-field-bulk" isDisabling={bulkDisabling === "disable"} open={Boolean(bulkDisabling)}
                onClose={() => setBulkDisabling(null)}
                onConfirm={() => handleActiveBulk(bulkDisabling === "disable")} entityTypeName="los campos seleccionados" />

        </Stack >
    )
})

interface SidebarProps {
    mode: string | null,
    entity: LeadFieldDetailed | null,
    closeSidebar: () => void,
    updateEntity: (mode: string, entity: LeadFieldDetailed) => void,
    handleSidebar: (mode: string, entity: LeadFieldDetailed | null) => void,
    leadFields: LeadFieldDetailed[] | null,
    campaign: CampaignDetailed
}

const LeadFieldSidebar = ({ mode, entity, handleSidebar, closeSidebar, updateEntity, campaign, leadFields }: SidebarProps) => {

    const content = useMemo(() => ({
        "DETAILS_FIELD":
            <LeadFieldDetail campaignName={campaign.name} leadField={entity as LeadFieldDetailed} leadFieldListLength={leadFields?.length ?? 0}
                leadFields={leadFields} closeSidebar={closeSidebar} handleSidebar={handleSidebar} updateEntity={updateEntity} />
        ,
        "CREATE_FIELD":
            <LeadFieldFormSidebar campaign={campaign} leadFields={leadFields} closeSidebar={closeSidebar} handleSidebar={handleSidebar}
                updateEntityOnList={(entity) => updateEntity(mode!, entity)} />
        ,
        "UPDATE_FIELD":
            <LeadFieldFormSidebar existingLF={entity as LeadFieldDetailed} campaign={campaign} leadFields={leadFields}
                updateEntityOnList={(entity) => updateEntity(mode!, entity)}
                closeSidebar={closeSidebar} handleSidebar={handleSidebar} />
        ,
        "UPDATE_VAL": <ValidationFormSidebar leadField={entity as LeadFieldDetailed}
            updateEntityOnList={(entity) => updateEntity("UPDATE_FIELD", entity)}
            handleSidebar={handleSidebar} />
        ,
    }), [campaign, closeSidebar, entity, handleSidebar, leadFields, mode, updateEntity])

    const contentMode = mode as keyof typeof content
    return content[contentMode]

}