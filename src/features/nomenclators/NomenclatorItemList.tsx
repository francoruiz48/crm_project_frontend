import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { NomenclatorItemFormInline, NomenclatorItemFormSidebar } from './NomenclatorItemForm'
import { EntityConfirmDialog } from 'src/components/ui/feedback/EntityConfirmDialog'
import { useEntityActionManager } from 'src/hooks/useEntityActionManager'
import { GenericSidebar } from 'shared/layout/container/GenericSidebar'
import PaginationComponent from 'shared/ui/lists/PaginationComponent'
import LoadingScreenWrapper from 'shared/ui/feedback/LoadingScreen'
import { OrderSearchMenu } from 'shared/ui/lists/OrderMenu'
import { ResponsiveListItem } from 'shared/ui/lists/CustomListItem'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { EnabledIcon } from 'shared/ui/lists/Icons'
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists'
import { useListPagination } from 'src/hooks/useListPagination'
import { useLoading } from 'src/hooks/useLoading'
import { useSidebar } from 'src/hooks/useSidebar'
import type { NomenclatorDetailed, NomenclatorItemDetailed } from 'src/types/nomenclators'
import type { Paginable } from 'src/types/shared'
import { getNomenclatorItems } from './nomenclatorService'
import { showCommonErrorToast } from 'src/utils/feedback'
import { useUserContext } from 'src/stores/UserContext'
import { Can } from 'src/components/auth/Can'
import { ButtonGroup, Grid, List, ListItemText, Stack, Typography } from '@mui/material'
import { NoItemsMessage } from 'src/components/ui/lists/NoItemsMessage'
import { ListAddButton } from 'src/components/ui/buttons/ExpandingButton'

const ORDER_NOM_ITEM_FIELDS = (hasParent: boolean) => [
    { name: "value", label: "Orden Alfabético" },
    ...(hasParent ? [{ name: "parent_item_id", label: "Ítem padre" }] : []),
]

const SEARCH_NOM_ITEM_FIELDS = [
    { name: "value", label: "Valor" },
]


export const NomenclatorItemList = ({ nomenclator }: { nomenclator: NomenclatorDetailed }) => {

    const { activeOrg, hasPermission, user } = useUserContext()

    const [nomenclatorItems, setNomenclatorItems] = useState<Paginable<NomenclatorItemDetailed> | null>(null)
    const [parentNomenclatorItems, setParentNomenclatorItems] = useState<{ label: string, value: string }[]>([])

    const { sidebarMode, selectedEntity, handleSidebar, closeSidebar } = useSidebar<NomenclatorItemDetailed>()

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(nomenclatorItems, 12)

    const { fetchParams, changeHandlers } = useOrderSeachList("nomenclator_items", nomenclator.id)

    const fetchNomItems = useCallback((fetchPage: number, pageSize: number, nomId: string) => {
        return getNomenclatorItems({ detailed: true, page: fetchPage, page_size: pageSize, nomenclator_id: nomId, ...fetchParams })
            .then(res => setNomenclatorItems(res))
            .catch(e => showCommonErrorToast(e, "Ha ocurrido un error al traer los ítems del nomenclador"))
    }, [fetchParams])

    const { loading, fnWithLoading: fetchNomLoad } = useLoading(fetchNomItems)

    useEffect(() => {
        if (!nomenclator) return
        fetchNomLoad(fetchPage, pageSize, nomenclator.id)
    }, [fetchNomLoad, fetchPage, pageSize, activeOrg, nomenclator])


    useEffect(() => {
        if (!nomenclator) return
        Promise.all(nomenclator.parent_nomenclators.map(parent => {
            return getNomenclatorItems({ detailed: false, only_active: false, nomenclator_id: parent.id })
                .then(res => res.items)
        })
        ).then(res => setParentNomenclatorItems(
            res.flat()
                .map(item => ({ value: `${item.id}`, label: `${item.value}` }))
        ))
    }, [nomenclator])

    const updateEntityOnList = useCallback((entity: NomenclatorItemDetailed | null, mode: string) => {
        switch (mode) {
            case "CREATE_NOM": {
                fetchNomItems(nomenclatorItems?.page ?? 1, pageSize, nomenclator.id)
                break;
            }
            case "UPDATE_NOM": {
                const newNom = entity as NomenclatorItemDetailed
                return setNomenclatorItems(prevList => {
                    if (!prevList || prevList.items.length === 0) return prevList
                    const nomenclatorItemsList = [...prevList.items]
                    const nomenclatorx = nomenclatorItemsList.findIndex(nom => nom.id === newNom.id)
                    if (nomenclatorx === -1) return prevList
                    nomenclatorItemsList[nomenclatorx] = newNom
                    return { ...prevList, items: [...nomenclatorItemsList] }
                })
            }
            case "DELETE_NOM": {
                if (selectedEntity && entity?.id === selectedEntity.id) closeSidebar()
                fetchNomItems(nomenclatorItems?.page ?? 1, pageSize, nomenclator.id)
                break;
            }
        }
    }, [closeSidebar, nomenclator, nomenclatorItems?.page, pageSize, selectedEntity, fetchNomItems])

    const actions = useEntityActionManager<NomenclatorItemDetailed>({
        modelName: "NomenclatorItem",
        entityTypeName: "la opción",
        // Mantiene la lista y el sidebar sincronizados sin depender del refetch; lee
        // pendingEntity/pendingAction que todavía siguen seteados al correr onSuccess.
        onSuccess: () => {
            const target = actions.pendingEntity
            if (!target) return
            if (actions.pendingAction === "enable" || actions.pendingAction === "disable") {
                const updated = { ...target, active: actions.pendingAction === "enable" }
                updateEntityOnList(updated, "UPDATE_NOM")
                if (selectedEntity?.id === target.id) handleSidebar("KEEP", updated)
            } else {
                updateEntityOnList(target, "DELETE_NOM")
            }
        },
    })

    const isBlocked = nomenclator.organization_id === 1 && !user?.is_superuser

    const hasParent = nomenclator.parent_nomenclators.length > 0

    const orderOptions = useMemo(() => ORDER_NOM_ITEM_FIELDS(Boolean(nomenclator.parent_nomenclators)), [nomenclator.parent_nomenclators])

    const filterOptions = useMemo(() => hasParent ? [
        { label: "Ítem Padre", value: "parent_item_id", options: parentNomenclatorItems }
    ] : [], [parentNomenclatorItems, hasParent])

    const [editingItem, setEditingItem] = useState<NomenclatorItemDetailed | null>(null)


    return (
        <>
            <Stack spacing={1}>
                <Stack spacing={1} direction="row" useFlexGap sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="h3">Opciones de Nomenclador</Typography>
                    <ButtonGroup variant="outlined" sx={{ marginLeft: "auto" }} >
                        {nomenclatorItems && nomenclatorItems.items?.length > 0 && !isBlocked &&
                            <Can permission="nomenclator_item:create">
                                <ListAddButton onClick={() => handleSidebar("CREATE_NOM")} size="small" />
                            </Can>
                        }
                    </ButtonGroup>
                </Stack>
                <OrderSearchMenu searchOptions={SEARCH_NOM_ITEM_FIELDS} orderOptions={orderOptions}
                    filterOptions={filterOptions} {...changeHandlers} />
                <LoadingScreenWrapper loading={loading}>
                    {nomenclatorItems && nomenclatorItems.items?.length > 0 ?
                        <List dense>
                            <Grid container sx={{ alignItems: "stretch" }} >
                                {nomenclatorItems.items.map(item =>
                                    <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
                                        {(editingItem?.id === item.id && !hasParent) ?
                                            <NomenclatorItemFormInline item={item} nom={nomenclator} onCancel={() => setEditingItem(null)}
                                                updateEntityOnList={(entity: NomenclatorItemDetailed) => updateEntityOnList(entity, "UPDATE_NOM")} />
                                            :
                                            <ResponsiveListItem disablePadding
                                                actions={[
                                                    { template: "MODIFY", onClick: () => !hasParent ? setEditingItem(item) : handleSidebar("UPDATE_NOM", item), permission: "nomenclator_item:update" },
                                                    ...actions.listActionsFor(item),
                                                ]}
                                                onClick={() => !isBlocked && hasPermission("nomenclator_item:update") && (!hasParent ? setEditingItem(item) : handleSidebar("UPDATE_NOM", item))}>
                                                <ListItemText
                                                    primary={
                                                        <Stack spacing={.5} direction="row" sx={{ alignItems: "center" }}>
                                                            <EnabledIcon active={item.active} size="small" />
                                                            <Stack spacing={-.5}>
                                                                {item.parent_items && item.parent_items.length > 0 &&
                                                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500, textTransform: "uppercase", wordBreak: "break-word" }}>
                                                                        {item.parent_items.map(parent => parent.value).join(", ")}
                                                                    </Typography>}
                                                                <Typography sx={{ wordBreak: "break-word" }}>{item.value}</Typography>
                                                            </Stack>
                                                        </Stack>
                                                    }
                                                    secondary={!item.organization_id && <span style={{ fontStyle: "italic" }}>
                                                        Opción del Sistema
                                                    </span>} />
                                            </ResponsiveListItem>}
                                    </Grid>
                                )}
                            </Grid>
                        </List>
                        :
                        <NoItemsMessage search={fetchParams.search} emptyFetchMessage="No se han encontrado opciones en este nomenclador..." >
                            {!isBlocked &&
                                <Can permission="nomenclator_item:create">
                                    <CommonButton actionType='CREATE' onClick={() => handleSidebar("CREATE_NOM")} variant="contained">Agregar</CommonButton>
                                </Can>
                            }
                        </NoItemsMessage>
                    }
                    <PaginationComponent {...pageComponentProps} />
                </LoadingScreenWrapper >

                <EntityConfirmDialog idModal='dis-nom-item-list' controller={actions} nameField='value' />
            </Stack >
            <GenericSidebar isSidebarOpen={Boolean(sidebarMode)} closeSidebar={closeSidebar}>
                <NomenclatorItemSidebar mode={sidebarMode} entity={selectedEntity} handleSidebar={handleSidebar}
                    closeSidebar={closeSidebar} updateEntityOnList={updateEntityOnList} nomenclator={nomenclator}
                    handleActive={actions.requestToggle} />
            </GenericSidebar>
        </ >
    )
}

interface SidebarProps {
    mode: string | null,
    entity: NomenclatorItemDetailed | null,
    nomenclator: NomenclatorDetailed | null,
    closeSidebar: () => void,
    updateEntityOnList: (
        entity: NomenclatorItemDetailed | null,
        mode: string,
    ) => void,
    handleSidebar: (mode: string, entity: NomenclatorItemDetailed | null) => void,
    handleActive: (entity: NomenclatorItemDetailed) => void
}
export const NomenclatorItemSidebar = memo(({ mode, entity, nomenclator, closeSidebar, updateEntityOnList, handleSidebar }: SidebarProps) => {

    switch (mode) {
        case "CREATE_NOM":
            return <NomenclatorItemFormSidebar closeSidebar={closeSidebar} nomenclator={nomenclator}
                updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "UPDATE_NOM":
            return <NomenclatorItemFormSidebar existingNom={entity as NomenclatorItemDetailed} nomenclator={nomenclator}
                closeSidebar={closeSidebar} updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
    }
})