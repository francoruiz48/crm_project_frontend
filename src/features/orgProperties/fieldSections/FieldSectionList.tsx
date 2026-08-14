import { useCallback, useEffect, useState } from 'react'
import { DisableConfirmDialog } from 'src/components/ui/feedback/ConfirmationDialog'
import PaginationComponent from 'shared/ui/lists/PaginationComponent'
import { ResponsiveListItem } from 'shared/ui/lists/CustomListItem'
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen'
import GenericPaper from 'shared/layout/container/GenericPaper'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { EnabledIcon } from 'shared/ui/lists/Icons'
import { useListPagination } from 'src/hooks/useListPagination'
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists'
import { useLoading } from 'src/hooks/useLoading'
import type { Paginable } from 'src/types/shared'
import { showCommonErrorToast, showToast } from 'src/utils/feedback'
import { Can } from 'src/components/auth/Can'
import { Divider, Grid, ListItemText, Stack, Typography } from '@mui/material'
import { OrderSearchMenu } from 'shared/ui/lists/OrderMenu'
import type { LeadFieldSectionDetailed } from 'src/types/orgProperties'
import { disableFieldSection, enableFieldSection, getFieldSections } from './fieldSectionsServices'
import { FieldSectionForm } from './FieldSectionForm'
import { NoItemsMessage } from 'src/components/ui/lists/NoItemsMessage'
import { useUserContext } from 'src/stores/UserContext'

const ORDER_SEC_FIELDS = [
    { name: "name", label: "Orden Alfabético" },
]

const SEARCH_SEC_FIELDS = [
    { name: "name", label: "Nombre" },
]

export const FieldSectionList = () => {

    const [sections, setSections] = useState<Paginable<LeadFieldSectionDetailed> | null>(null)

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(sections)

    const { fetchParams, changeHandlers } = useOrderSeachList("sections")

    const fetchSections = useCallback((fetchPage: number, pageSize: number) => {
        return getFieldSections({
            detailed: true, page: fetchPage, page_size: pageSize, ...fetchParams
        })
            .then(setSections)
            .catch(e => showCommonErrorToast(e, "Error recuperando la lista de secciones"))
    }, [fetchParams])

    const { fnWithLoading: fetchSectionsLoad, loading } = useLoading(fetchSections)

    useEffect(() => {
        fetchSectionsLoad(fetchPage, pageSize)
    }, [fetchSectionsLoad, fetchPage, pageSize])

    const [editingSection, setEditingSection] = useState<LeadFieldSectionDetailed | null | undefined>(null)

    const updateList = useCallback((entity?: LeadFieldSectionDetailed, update: boolean = false) => {
        if (update) {
            if (!sections || !entity) return
            const sectionsCopy = [...sections.items]
            const idx = sectionsCopy.findIndex(section => entity.id === section.id)
            if (idx === -1) return
            sectionsCopy[idx] = entity
            return setSections({ ...sections, items: sectionsCopy })

        } else fetchSectionsLoad(fetchPage, pageSize)
    }, [fetchPage, fetchSectionsLoad, pageSize, sections])

    return (
        <Stack spacing={2}>
            <Stack spacing={2} direction="row" useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                {(sections?.items && sections.items.length > 0) &&
                    <Can permission="lead_field_section:create">
                        <CommonButton actionType="CREATE" variant="contained" onClick={() => setEditingSection(undefined)}>
                            Agregar
                        </CommonButton>
                    </Can>
                }
                <OrderSearchMenu searchOptions={SEARCH_SEC_FIELDS} orderOptions={ORDER_SEC_FIELDS} {...changeHandlers} />
            </Stack>
            <Stack spacing={2}>
                <LoadingScreenWrapper loading={loading}>
                    {(sections?.items && sections.items.length > 0) ?
                        <Stack spacing={2}>
                            <FieldSectionListData sections={sections.items}
                                toggleUpdate={(state: LeadFieldSectionDetailed) => setEditingSection(state)}
                                updateList={updateList} />
                            <PaginationComponent {...pageComponentProps} />
                        </Stack>
                        :
                        <NoItemsMessage search={fetchParams.search}
                            emptyFetchMessage="No se han encontrado secciones de campo...">
                            <Can permission="lead_field_section:create">
                                <CommonButton actionType="CREATE" variant="contained"
                                    onClick={() => setEditingSection(undefined)}>Agregar</CommonButton>
                            </Can>
                        </NoItemsMessage>
                    }
                </LoadingScreenWrapper >
                {editingSection !== null &&
                    <Can permission="lead_field_section:update">
                        <Divider />
                        <GenericPaper elevation={4} sx={{ px: 3, py: 2 }}>
                            <FieldSectionForm existingSection={editingSection}
                                onClose={() => setEditingSection(null)} onSubmit={updateList} />
                        </GenericPaper>
                    </Can>
                }
            </Stack>
        </Stack>
    )
}

interface FieldSectionListDataProps {
    sections: LeadFieldSectionDetailed[],
    toggleUpdate: (state: LeadFieldSectionDetailed) => void,
    updateList: (entity?: LeadFieldSectionDetailed, update?: boolean) => void
}

const FieldSectionListData = ({ sections, toggleUpdate, updateList }: FieldSectionListDataProps) => {

    const { hasPermission } = useUserContext()

    const [disableSection, setDisableSection] = useState<LeadFieldSectionDetailed | null>(null)

    const handleEnableDisable = useCallback((id: number, isActive: boolean) => {
        if (!isActive) {
            return enableFieldSection(id)
                .then(() => {
                    showToast("Sección habilitada correctamente.", "success")
                    updateList()
                })
                .catch(e => { showCommonErrorToast(e, "Error habilitando la sección.") })
        }
        return disableFieldSection(id)
            .then(res => {
                if (res.action === "disabled") showToast("Sección deshabilitada correctamente.", "success")
                else showToast("Sección eliminada permanentemente.", "success")
                updateList()
            })
            .catch(e => { showCommonErrorToast(e, "Error deshabilitando la sección.") })
    }, [updateList])

    return (
        <>
            <Grid container sx={{ marginInline: 1, alignItems: "stretch" }}>
                {sections.map((section, idx) =>
                    <Grid key={`section-${idx}`} size="grow" sx={{ minWidth: "15rem", minHeight: "100%" }}>
                        <ResponsiveListItem disablePadding sx={{ height: "100%" }}
                            onClick={() => hasPermission("lead_field_section:update") && toggleUpdate(section)}
                            actions={[
                                {
                                    template: "MODIFY", onClick: () => toggleUpdate(section),
                                    permission: "lead_field_section:update"
                                },
                                {
                                    template: section.active ? "DISABLE" : "ENABLE", onClick: () => setDisableSection(section),
                                    permission: section.active ? "lead_field_section:delete" : "lead_field_section:update"
                                },
                            ]}>
                            <ListItemText sx={{ mr: 4 }} primary={
                                <Stack spacing={1} direction="row" color="inherit" sx={{ width: "100%", alignItems: "center" }}>
                                    <EnabledIcon active={section.active} />
                                    <Typography color="inherit">{section.name}</Typography>
                                </Stack>
                            } />
                        </ResponsiveListItem>
                    </Grid>
                )}
            </Grid >
            {disableSection &&
                <DisableConfirmDialog idModal='conf-delete-contact' entity={disableSection} clearEntity={() => setDisableSection(null)} entityTypeName="la sección"
                    onConfirm={() => handleEnableDisable(disableSection?.id, disableSection?.active)} />
            }
        </>
    )
}
