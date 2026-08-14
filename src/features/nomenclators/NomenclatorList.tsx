import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { NomenclatorFormSidebar } from './NomenclatorForm'
import { NomenclatorDetails } from './NomenclatorDetails'
import { ResponsiveListItem } from 'shared/ui/lists/CustomListItem'
import ContainerWithSidebar from 'shared/layout/container/GenericContainer'
import { DisableConfirmDialog } from 'src/components/ui/feedback/ConfirmationDialog'
import PaginationComponent from 'shared/ui/lists/PaginationComponent'
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { EnabledIcon } from 'shared/ui/lists/Icons'
import { useListPagination } from 'src/hooks/useListPagination'
import { useSidebar } from 'src/hooks/useSidebar'
import { useLoading } from 'src/hooks/useLoading'
import type { Nomenclator, NomenclatorDetailed } from 'src/types/nomenclators'
import type { Paginable } from 'src/types/shared'
import { disableNomenclator, enableNomenclator, getNomenclator, getNomenclators } from './nomenclatorService'
import { showCommonErrorToast, showToast } from 'src/utils/feedback'
import { useUserContext } from 'src/stores/UserContext'
import { Can } from 'src/components/auth/Can'
import { useSearchParams } from 'react-router-dom'
import { Grid, List, ListItemText, Stack, Typography } from '@mui/material'
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists'
import { OrderSearchMenu } from 'src/components/ui/lists/OrderMenu'
import { NoItemsMessage } from 'src/components/ui/lists/NoItemsMessage'
import { ListAddButton } from 'src/components/ui/buttons/ExpandingButton'

const ORDER_NOM_FIELDS = [
    { name: "name", label: "Orden Alfabético" },
    { name: "parent_nomenclator_id", label: "Nomenclador padre" },
]

const SEARCH_NOM_FIELDS = [
    { name: "name", label: "Nombre" },
]

export const NomenclatorList = () => {

    const { activeOrg, user } = useUserContext()

    const [nomenclators, setNomenclators] = useState<Paginable<NomenclatorDetailed> | null>(null)

    const [params, setParams] = useSearchParams()

    const { sidebarMode, selectedEntity, handleSidebar, closeSidebar } = useSidebar<NomenclatorDetailed>("id", params, setParams, getNomenclator, "DETAILS_NOM")

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(nomenclators)

    const { fetchParams, changeHandlers } = useOrderSeachList("nomenclators")

    const fetchNom = useCallback((fetchPage: number, pageSize: number) => {
        return getNomenclators({ detailed: true, page: fetchPage, page_size: pageSize, ...fetchParams })
            .then(setNomenclators)
    }, [fetchParams])

    const [nomenclatorsFull, setNomenclatorsFull] = useState<Nomenclator[]>([])

    useEffect(() => {
        getNomenclators({ detailed: false, page_size: 0 })
            .then(res => setNomenclatorsFull(res.items))
    }, [])

    const { loading, fnWithLoading: fetchNomLoad } = useLoading(fetchNom)

    useEffect(() => {
        fetchNomLoad(fetchPage, pageSize)
    }, [fetchPage, pageSize, activeOrg, fetchNomLoad])


    const updateEntityOnList = useCallback((entity: NomenclatorDetailed | null, mode: string) => {
        switch (mode) {
            case "CREATE_NOM": {
                fetchNomLoad(nomenclators?.page, pageSize)
                break;
            }
            case "UPDATE_NOM": {
                const newNom = entity as NomenclatorDetailed
                return setNomenclators(prevList => {
                    if (!prevList || prevList.items.length === 0) return prevList
                    const nomenclatorItems = [...prevList.items]
                    const nomIdx = nomenclatorItems.findIndex(nom => nom.id === newNom.id)
                    if (nomIdx === -1) return prevList
                    nomenclatorItems[nomIdx] = newNom
                    return { ...prevList, items: [...nomenclatorItems] }
                })
            }
            case "DELETE_NOM": {
                if (selectedEntity && entity?.id === selectedEntity.id) closeSidebar()
                fetchNomLoad(nomenclators?.page, pageSize)
                break;
            }
        }
    }, [closeSidebar, nomenclators?.page, pageSize, selectedEntity, fetchNomLoad])

    const handleActive = useCallback(async (nom: NomenclatorDetailed | null) => {
        if (!nom) return
        const updateActive = (nom: NomenclatorDetailed) => {
            updateEntityOnList({ ...nom, active: !nom.active }, "UPDATE_NOM")
            if (selectedEntity?.id === nom.id) {
                handleSidebar("KEEP", { ...selectedEntity, active: !nom.active })
            }
        }
        const deleteNom = (nom: NomenclatorDetailed) => {
            updateEntityOnList(nom, "DELETE_NOM")
            if (selectedEntity?.id === nom.id) {
                closeSidebar()
            }
        }
        if (nom.active) {
            return disableNomenclator(nom.id).then(res => {
                if (res.action === "disabled") {
                    updateActive(nom)
                    showToast(`"${nom.name}" deshabilitado con éxito.`)
                }
                if (res.action === "deleted") {
                    deleteNom(nom)
                    showToast(`"${nom.name}" eliminado definitivamente.`)
                }
            })
                .catch(e => showCommonErrorToast(e))
        } else {
            return enableNomenclator(nom.id).then(() => {
                updateActive(nom)
                showToast(`"${nom.name}" habilitado con éxito.`)
            })
                .catch(e => showCommonErrorToast(e))
        }
    }, [closeSidebar, handleSidebar, selectedEntity, updateEntityOnList])

    const [deletingNom, setDeletingNom] = useState<NomenclatorDetailed | null>(null)
    const handleDeletingNom = (deletingNom: NomenclatorDetailed) => {
        setDeletingNom(deletingNom)
    }

    const filterOptions = useMemo(() => [
        { label: "Ítem Padre", value: "parent_nomenclator_id", options: nomenclatorsFull?.map(nom => ({ label: `${nom.name}`, value: `${nom.id}` })) }
    ], [nomenclatorsFull])

    return (
        <ContainerWithSidebar isSidebarOpen={Boolean(sidebarMode)} closeSidebar={closeSidebar} sidebarComponent={
            <NomenclatorSidebar mode={sidebarMode} entity={selectedEntity} handleSidebar={handleSidebar}
                closeSidebar={closeSidebar} updateEntityOnList={updateEntityOnList}
                handleActive={handleDeletingNom} />
        }>
            <Stack>
                <Stack direction="row" useFlexGap spacing={2} sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="h1">Nomencladores</Typography>
                    {nomenclators && nomenclators.items?.length > 0 &&
                        <Can permission="nomenclator:create">
                            <ListAddButton onClick={() => { handleSidebar("CREATE_NOM", null) }}
                                sx={{ marginLeft: "auto" }} />
                        </Can>
                    }
                </Stack>
                <OrderSearchMenu searchOptions={SEARCH_NOM_FIELDS} orderOptions={ORDER_NOM_FIELDS} filterOptions={filterOptions} {...changeHandlers} />
                <LoadingScreenWrapper loading={loading}>
                    <Stack spacing={2}>
                        {
                            nomenclators && nomenclators.items?.length > 0 ?
                                <List dense>
                                    <Grid container sx={{ alignItems: "stretch" }}>
                                        {nomenclators.items.map(nom => {
                                            const isBlocked = nom.organization_id === 1 && !user?.is_superuser
                                            return (<Grid size={{ xs: 12, sm: 12, md: 6, lg: 4 }} key={nom.id}>
                                                <ResponsiveListItem isSelected={nom.id === selectedEntity?.id} disablePadding
                                                    onClick={() => handleSidebar("DETAILS_NOM", nom)}
                                                    actions={[
                                                        { template: "DETAILS", onClick: () => handleSidebar("DETAILS_NOM", nom) },
                                                        !isBlocked && { template: "MODIFY", onClick: () => handleSidebar("UPDATE_NOM", nom), permission: "nomenclator:update" },
                                                        !isBlocked && { template: nom.active ? "DISABLE" : "ENABLE", onClick: () => handleDeletingNom(nom), permission: nom.active ? "nomenclator:delete" : "nomenclator:update" },
                                                    ]}>
                                                    <ListItemText primary={
                                                        <Stack spacing={.5} direction="row" sx={{ alignItems: "center" }}>
                                                            <EnabledIcon active={nom.active} size="small" />
                                                            <Stack spacing={-.5}>
                                                                {nom.parent_nomenclators && nom.parent_nomenclators.length > 0 &&
                                                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500, textTransform: "uppercase", wordBreak: "break-word" }}>
                                                                        {nom.parent_nomenclators.map(parent => parent.name).join(", ")}
                                                                    </Typography>}
                                                                <Typography sx={{ fontWeight: 500, wordBreak: "break-word" }}>{nom.name}</Typography>
                                                            </Stack>
                                                        </Stack>
                                                    }
                                                        secondary={nom.organization_id === 1 &&
                                                            <span style={{ fontStyle: "italic" }}>Nomenclador del Sistema</span>
                                                        } />
                                                </ResponsiveListItem>
                                            </Grid>
                                            )
                                        }
                                        )}
                                    </Grid>
                                </List>
                                :
                                <NoItemsMessage search={fetchParams.search} emptyFetchMessage="No se han encontrado nomencladores...">
                                    <Can permission="nomenclator:create">
                                        <CommonButton actionType="CREATE" onClick={() => { handleSidebar("CREATE_NOM", null) }} variant="contained">
                                            Agregar
                                        </CommonButton>
                                    </Can>
                                </NoItemsMessage>
                        }
                        <PaginationComponent {...pageComponentProps} />
                    </Stack>
                </LoadingScreenWrapper>
            </Stack>
            <DisableConfirmDialog entity={deletingNom} clearEntity={() => setDeletingNom(null)} idModal='dis-nom-list'
                onConfirm={() => handleActive(deletingNom)} entityTypeName='el nomenclador' />
        </ContainerWithSidebar >
    )
}

interface SidebarProps {
    mode: string | null,
    entity: NomenclatorDetailed | null,
    closeSidebar: () => void,
    updateEntityOnList: (
        entity: NomenclatorDetailed | null,
        mode: string,
    ) => void,
    handleSidebar: (mode: string, entity: NomenclatorDetailed | null) => void,
    handleActive: (entity: NomenclatorDetailed) => void
}
const NomenclatorSidebar = memo(({ mode, entity, closeSidebar, updateEntityOnList, handleSidebar, handleActive }: SidebarProps) => {

    switch (mode) {
        case "CREATE_NOM":
            return <NomenclatorFormSidebar closeSidebar={closeSidebar}
                updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "UPDATE_NOM":
            return <NomenclatorFormSidebar existingNom={entity as NomenclatorDetailed} closeSidebar={closeSidebar}
                updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "DETAILS_NOM":
            return <NomenclatorDetails nomenclator={entity as NomenclatorDetailed} closeSidebar={closeSidebar}
                handleSidebar={handleSidebar} handleActive={handleActive} />
    }

})