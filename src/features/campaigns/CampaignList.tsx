import { useEffect, useState } from "react"
import { DisableConfirmDialog } from "shared/ui/feedback/ConfirmationDialog"
import PaginationComponent from "shared/ui/lists/PaginationComponent"
import LoadingScreenWrapper from "shared/ui/feedback/LoadingScreen"
import { ResponsiveListItem } from "shared/ui/lists/CustomListItem"
import { NoItemsMessage } from "shared/ui/lists/NoItemsMessage"
import { OrderSearchMenu } from "shared/ui/lists/OrderMenu"
import CommonButton from "shared/ui/buttons/CommonButton"
import { EnabledIcon } from "shared/ui/lists/Icons"
import { useOrderSeachList } from "src/hooks/useOrderSearchLists"
import { useListPagination } from "src/hooks/useListPagination"
import { useLoading } from "src/hooks/useLoading"
import type { CampaignDetailed, WorkspaceDetailed } from "src/types/campaigns"
import type { Paginable } from "src/types/shared"
import { disableCampaign, enableCampaign, getCampaigns } from "./campaignServices"
import { showCommonErrorToast, showToast } from "src/utils/feedback"
import { Link } from "react-router-dom"
import { Grid, ListItemText, Stack, Typography } from "@mui/material"
import { useCallback } from "react"
import { Can } from "src/components/auth/Can"
import { ListAddButton } from "src/components/ui/buttons/ExpandingButton"

const ORDER_CMP_FIELDS = [
    { name: "name", label: "Orden Alfabético" },
]

const SEARCH_CMP_FIELDS = [
    { name: "name", label: "Nombre" },
    { name: "description", label: "Descripción" },
]

interface CampaignListProps {
    workspace: WorkspaceDetailed,
    handleSidebar: (mode: string, entity: WorkspaceDetailed | CampaignDetailed | null) => void,
    closeSidebar: () => void
}
export const CampaignList = ({ workspace, handleSidebar, closeSidebar }: CampaignListProps) => {

    const [campaigns, setCampaigns] = useState<Paginable<CampaignDetailed> | null>(null)

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(campaigns, 12)

    const { fetchParams, changeHandlers } = useOrderSeachList()

    const fetchCampaigns = useCallback((workspaceId: string, page: number, pageSize: number) => {
        return getCampaigns({ workspace_id: workspaceId, detailed: true, page: page || 1, page_size: pageSize, ...fetchParams })
            .then(setCampaigns)
    }, [fetchParams])

    const { fnWithLoading: fetchLoading, loading } = useLoading(fetchCampaigns)

    useEffect(() => {
        if (!workspace.id) return
        fetchLoading(workspace.id, fetchPage, pageSize)
    }, [workspace.id, fetchPage, pageSize, fetchLoading])

    const handleActiveCampaign = useCallback((campaign: CampaignDetailed) => {
        if (campaign.active) {
            return disableCampaign(campaign.id!)
                .then(res => {
                    fetchLoading(workspace.id, fetchPage, pageSize)
                    if (res.action === "disabled") showToast(`"${campaign.name}" deshabilitado con éxito.`)
                    else {
                        closeSidebar()
                        showToast(`"${campaign.name}" eliminado definitivamente.`)
                    }
                })
                .catch(e => showCommonErrorToast(e))
        } else {
            return enableCampaign(campaign.id!)
                .then(() => {
                    fetchLoading(workspace.id, fetchPage, pageSize)
                    showToast(`"${campaign.name}" habilitado con éxito.`)
                })
                .catch(e => showCommonErrorToast(e))
        }
    }, [fetchLoading, fetchPage, closeSidebar, pageSize, workspace.id])

    return (
        <Stack spacing={2}>
            <Stack spacing={1} direction="row" useFlexGap sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="h3">Lista de Campañas</Typography>
                {campaigns && campaigns?.items.length > 0 &&
                    <Can permission="campaign:create">
                        <ListAddButton onClick={() => handleSidebar("CREATE_CMP", workspace)} sx={{ marginLeft: "auto" }} size="small" />
                    </Can>
                }
            </Stack>
            <OrderSearchMenu searchOptions={SEARCH_CMP_FIELDS} orderOptions={ORDER_CMP_FIELDS} {...changeHandlers} />
            <LoadingScreenWrapper loading={loading}>
                {(campaigns?.items && campaigns.items.length > 0) ?
                    <>
                        <CampaignListData campaigns={campaigns.items} handleActiveCampaign={handleActiveCampaign} />
                        <PaginationComponent {...pageComponentProps} />
                    </>
                    :
                    <NoItemsMessage search={fetchParams.search}
                        emptyFetchMessage="No se han encontrado campañas para este espacio de trabajo...">
                        <Can permission="campaign:create">
                            <CommonButton actionType="CREATE" onClick={() => handleSidebar("CREATE_CMP", workspace)} variant="contained">Agregar</CommonButton>
                        </Can>
                    </NoItemsMessage>
                }
            </LoadingScreenWrapper>
        </Stack>
    )
}

interface CampaignListDataProps {
    campaigns: CampaignDetailed[],
    handleActiveCampaign: (campaign: CampaignDetailed) => Promise<void>
}
export const CampaignListData = ({ campaigns, handleActiveCampaign }: CampaignListDataProps) => {

    const [deletingCmp, setDeletingCmp] = useState<CampaignDetailed | null>(null)

    return (
        <Grid container sx={{ marginInline: 1, height: "100%" }}>
            {campaigns.map((cmp, idx) =>
                <Grid container key={`cmp-${idx}`} size="grow" sx={{ minWidth: "15rem", alignSelf: "stretch", alignItems: "start" }}>
                    <ResponsiveListItem disablePadding sx={{ height: "100%" }} component={Link} to={`/campaigns/${cmp.id}`}
                        actions={
                            [
                                { template: "DETAILS", component: Link, to: `/campaigns/${cmp.id}` },
                                {
                                    actionType: "LIST", label: "Ver Leads", component: Link,
                                    to: `/leads?workspace=${cmp.workspace_id}&campaign=${cmp.id}`, permission: "lead:view"
                                },
                                {
                                    template: cmp.active ? "DISABLE" : "ENABLE", onClick: () => setDeletingCmp(cmp),
                                    permission: cmp.active ? "campaign:delete" : "campaign:update"
                                },
                            ]
                        }>
                        <ListItemText sx={{ mr: 7 }} primary={
                            <Stack spacing={1} direction="row" color="inherit" sx={{ width: "100%", alignItems: "center" }}>
                                <EnabledIcon active={cmp.active} />
                                <Typography color="inherit">{cmp.name}</Typography>
                            </Stack>
                        }
                            secondary={cmp.description} />
                    </ResponsiveListItem>
                </Grid>
            )
            }
            <DisableConfirmDialog idModal='conf-delete-cmp-list' entity={deletingCmp} clearEntity={() => setDeletingCmp(null)} entityTypeName="la campaña"
                onConfirm={() => handleActiveCampaign(deletingCmp!)} />
        </Grid >
    )
}
