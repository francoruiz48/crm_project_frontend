import { useCallback, useEffect, useState } from 'react'
import { useListPagination } from 'src/hooks/useListPagination'
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists'
import type { LeadFlowDetailed } from 'src/types/leadFlow'
import type { Paginable } from 'src/types/shared'
import { Grid, ListItemButton, ListItemText, Stack, Typography } from '@mui/material'
import { CustomListItem } from 'shared/ui/lists/CustomListItem'
import { Link, useNavigate } from 'react-router-dom'
import CommonButton from 'shared/ui/buttons/CommonButton'
import PaginationComponent from 'shared/ui/lists/PaginationComponent'
import { CommonIconButton } from 'shared/ui/buttons/CommonIconButton'
import { EnabledIcon } from 'shared/ui/lists/Icons'
import { getLeadFlows } from './leadFlowServices/FlowService'
import { useLoading } from 'src/hooks/useLoading'
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen'
import { EntityConfirmDialog } from 'src/components/ui/feedback/EntityConfirmDialog'
import { useEntityActionManager } from 'src/hooks/useEntityActionManager'
import { OrderSearchMenu } from 'shared/ui/lists/OrderMenu'
import { useUserContext } from 'src/stores/UserContext'
import { NoItemsMessage } from 'src/components/ui/lists/NoItemsMessage'
import { Can } from 'src/components/auth/Can'

const ORDER_FLOW_FIELDS = [
    { name: "name", label: "Orden Alfabético" },
]

const SEARCH_FLOW_FIELDS = [
    { name: "name", label: "Nombre" },
    { name: "description", label: "Descripción" },
]

export const LeadFlowList = () => {

    const { activeOrg } = useUserContext()

    const [flows, setFlows] = useState<Paginable<LeadFlowDetailed> | null>(null)
    const nav = useNavigate()

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(flows, 12)

    const { fetchParams, changeHandlers } = useOrderSeachList("lead_flows")

    const fetchFlows = useCallback((fetchPage: number, pageSize: number) => getLeadFlows({
        page: fetchPage || 1, page_size: pageSize, detailed: true, ...fetchParams
    }).then(setFlows), [fetchParams])

    const { fnWithLoading, loading } = useLoading(fetchFlows)

    useEffect(() => {
        fnWithLoading(fetchPage, pageSize)
    }, [fetchPage, pageSize, fnWithLoading, activeOrg])

    return (
        <Stack spacing={2}>
            <Stack spacing={2} direction="row" useFlexGap sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                {(flows?.items && flows.items.length > 0) &&
                    <Can permission="lead_flow:update">
                        <CommonButton actionType="CREATE" component={Link} to="/lead-flow-editor" >
                            Abrir Editor
                        </CommonButton>
                    </Can>}
                <OrderSearchMenu searchOptions={SEARCH_FLOW_FIELDS} orderOptions={ORDER_FLOW_FIELDS} {...changeHandlers} />
            </Stack>
            <LoadingScreenWrapper loading={loading}>
                {(flows?.items && flows.items.length > 0) ?
                    <Stack spacing={2}>
                        <LeadFlowListData flows={flows.items} updateList={() => fetchFlows(fetchPage, pageSize)} />
                        <PaginationComponent {...pageComponentProps} />
                    </Stack>
                    :
                    <NoItemsMessage search={fetchParams.search}
                        emptyFetchMessage="No se han encontrado ciclos de vida...">
                        <Can permission="lead_flow:update">
                            <CommonButton actionType="CREATE" onClick={() => nav("/lead-flow-editor")} variant="contained">Abrir Editor</CommonButton>
                        </Can>
                    </NoItemsMessage>
                }
            </LoadingScreenWrapper>
        </Stack>
    )
}

export const LeadFlowListData = ({ flows, updateList }: { flows: LeadFlowDetailed[], updateList: () => Promise<void> }) => {

    const actions = useEntityActionManager<LeadFlowDetailed>({
        modelName: "LeadFlow",
        entityTypeName: "el ciclo de vida",
        onSuccess: () => updateList(),
    })

    return (
        <>
            <Grid container sx={{ marginInline: 1, alignItems: "stretch" }}>
                {flows.map((flow, idx) =>
                    <Grid key={`flow-${idx}`} size="grow" sx={{ minWidth: "15rem", minHeight: "100%" }}>
                        <CustomListItem disablePadding sx={{ height: "100%" }} secondaryAction={
                            <Stack direction="row" sx={{ alignItems: "center" }}>
                                <Can permission="lead_flow:update">
                                    <CommonIconButton actionType='MODIFY' title="Editar" tooltipSize="small" size="small"
                                        component={Link} to={`/lead-flow-editor/${flow.id}`} />
                                </Can>
                                <Can permission={flow.active ? actions.deletePerm : actions.updatePerm}>
                                    <CommonIconButton actionType={flow.active ? "DISABLE" : "ENABLE"} title={flow.active ? "Deshabilitar" : "Habilitar"}
                                        tooltipSize="small" size="small" color={flow.active ? "error" : "success"}
                                        onClick={() => actions.requestToggle(flow)} />
                                </Can>
                            </Stack>}>
                            <ListItemButton component={Link} to={`/lead-flow-editor/${flow.id}`} sx={{ height: "100%" }} >
                                <ListItemText sx={{ mr: 4 }} primary={
                                    <Stack spacing={1} direction="row" color="inherit" sx={{ width: "100%", alignItems: "center" }}>
                                        <EnabledIcon active={flow.active} />
                                        <Typography color="inherit">{flow.name}</Typography>
                                    </Stack>
                                }
                                    secondary={flow.description} />
                            </ListItemButton>
                        </CustomListItem>
                    </Grid>
                )}
            </Grid >
            <EntityConfirmDialog idModal='conf-delete-flow' controller={actions} />
        </>
    )
}
