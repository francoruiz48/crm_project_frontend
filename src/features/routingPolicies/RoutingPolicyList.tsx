import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { RoutingPolicyFormSidebar } from './RoutingPolicyForm'
import { RoutingPolicyDetails } from './RoutingPolicyDetails'
import { ResponsiveListItem } from 'shared/ui/lists/CustomListItem'
import ContainerWithSidebar from 'shared/layout/container/GenericContainer'
import { DisableConfirmDialog, GenericConfirmDialog } from 'src/components/ui/feedback/ConfirmationDialog'
import PaginationComponent from 'shared/ui/lists/PaginationComponent'
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { EnabledIcon } from 'shared/ui/lists/Icons'
import { ControlledAutocomplete } from 'shared/ui/forms/CustomMultipleInputs'
import { useListPagination } from 'src/hooks/useListPagination'
import { useSidebar } from 'src/hooks/useSidebar'
import { useLoading } from 'src/hooks/useLoading'
import type { LeadRoutingPolicyDetailed } from 'src/types/routing'
import type { Team } from 'src/types/teams'
import type { Campaign } from 'src/types/campaigns'
import type { Paginable } from 'src/types/shared'
import {
    deleteRoutingPolicyForever, disableRoutingPolicy, enableRoutingPolicy,
    getRoutingPolicies, getRoutingPolicy,
} from './routingPolicyServices'
import { getTeams } from 'src/features/teams/teamServices'
import { getCampaigns } from 'src/features/campaigns/campaignServices'
import { showCommonErrorToast, showToast } from 'src/utils/feedback'
import { useForm, useWatch } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { Box, Grid, List, ListItemText, Stack, Typography } from '@mui/material'
import { NoItemsMessage } from 'src/components/ui/lists/NoItemsMessage'
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists'
import { OrderSearchMenu } from 'src/components/ui/lists/OrderMenu'
import CustomChip from 'src/components/ui/details/CustomChip'
import { Can } from 'src/components/auth/Can'
import { ListAddButton } from 'src/components/ui/buttons/ExpandingButton'

const PAGE_SIZE = 12

const ORDER_ROUTE_FIELDS = [
    { name: "name", label: "Orden Alfabético" },
]

const SEARCH_ROUTE_FIELDS = [
    { name: "name", label: "Nombre" },
]

export const RoutingPolicyList = () => {

    const [policies, setPolicies] = useState<Paginable<LeadRoutingPolicyDetailed> | null>(null)
    const [teams, setTeams] = useState<Team[]>([])
    const [campaigns, setCampaigns] = useState<Campaign[]>([])

    const [params, setParams] = useSearchParams()
    // team/campaign en la URL son el uuid real (Team.id/Campaign.id) -- antes se forzaban a
    // Number() y nunca matcheaban contra nada (resuelto acá aprovechando los objetos anidados
    // policy.target_team/campaign).
    const teamFilterId = params.get("team") ?? null

    const { control } = useForm<{ campaign_id: string | null }>({
        defaultValues: { campaign_id: params.get("campaign") ?? null },
    })
    const campaignFilter = useWatch({ control, name: "campaign_id" })

    const { sidebarMode, selectedEntity, handleSidebar, closeSidebar } = useSidebar<LeadRoutingPolicyDetailed>("id", params, setParams, getRoutingPolicy, "DETAILS_POLICY")

    const { fetchParams, changeHandlers } = useOrderSeachList()

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(policies, PAGE_SIZE)

    useEffect(() => {
        getTeams({ only_active: true, page_size: 0 }).then(res => setTeams(res.items))
        getCampaigns({ only_active: true, page_size: 0 }).then(res => setCampaigns(res.items))
    }, [])

    // Sincroniza el filtro de campaña con la URL (?campaign=)
    useEffect(() => {
        setParams(prev => {
            const next = new URLSearchParams(prev)
            if (campaignFilter) next.set("campaign", String(campaignFilter))
            else next.delete("campaign")
            return next
        }, { replace: true })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campaignFilter])

    const fetchPolicies = useCallback((fetchPage: number, pageSize: number, campaignId: string | null, teamId: string | null) => {
        // Si hay filtro por equipo, no es soportado por el backend: traemos todo y filtramos/paginamos client-side.
        if (teamId) {
            return getRoutingPolicies({ detailed: true, page_size: 0, target_team_id: teamId, campaign_id: campaignId ?? undefined, ...fetchParams })
                .then(res => {
                    const filtered = res.items.filter(p => p.target_team?.id === teamId)
                    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
                    const page = Math.min(fetchPage, totalPages)
                    const start = (page - 1) * pageSize
                    setPolicies({
                        items: filtered.slice(start, start + pageSize),
                        total: filtered.length, page, page_size: pageSize, total_pages: totalPages,
                    })
                })
                .catch(e => showCommonErrorToast(e, "Ha ocurrido un error al traer las políticas de enrutamiento"))
        }
        return getRoutingPolicies({
            only_active: false, detailed: true, page: fetchPage, page_size: pageSize,
            ...(campaignId ? { campaign_id: campaignId } : {}),
        })
            .then(setPolicies)
            .catch(e => showCommonErrorToast(e, "Ha ocurrido un error al traer las políticas de enrutamiento"))
    }, [fetchParams])

    const { loading, fnWithLoading: fetchPoliciesLoad } = useLoading(fetchPolicies)

    useEffect(() => {
        fetchPoliciesLoad(fetchPage, pageSize, campaignFilter ?? null, teamFilterId)
    }, [fetchPage, pageSize, campaignFilter, teamFilterId, fetchPoliciesLoad])

    const refreshList = useCallback(() => {
        fetchPolicies(policies?.page ?? 1, pageSize, campaignFilter ?? null, teamFilterId)
    }, [fetchPolicies, policies?.page, pageSize, campaignFilter, teamFilterId])

    const updateEntityOnList = useCallback((entity: LeadRoutingPolicyDetailed | null, mode: string) => {
        switch (mode) {
            case "CREATE_POLICY": case "DELETE_POLICY": {
                if (mode === "DELETE_POLICY" && selectedEntity && entity?.id === selectedEntity.id) closeSidebar()
                refreshList()
                break;
            }
            case "UPDATE_POLICY": {
                const newPolicy = entity as LeadRoutingPolicyDetailed
                return setPolicies(prevList => {
                    if (!prevList || prevList.items.length === 0) return prevList
                    const items = [...prevList.items]
                    const idx = items.findIndex(p => p.id === newPolicy.id)
                    if (idx === -1) return prevList
                    items[idx] = newPolicy
                    return { ...prevList, items: [...items] }
                })
            }
        }
    }, [closeSidebar, refreshList, selectedEntity])

    // --- Deshabilitar / Habilitar (real, no borra nada) ---
    const [togglingPolicy, setTogglingPolicy] = useState<LeadRoutingPolicyDetailed | null>(null)

    const handleToggleActive = useCallback((policy: LeadRoutingPolicyDetailed) => {
        const action = policy.active ? disableRoutingPolicy(policy.id) : enableRoutingPolicy(policy.id)
        return action.then(() => {
            updateEntityOnList({ ...policy, active: !policy.active }, "UPDATE_POLICY")
            if (selectedEntity?.id === policy.id) handleSidebar("KEEP", { ...selectedEntity, active: !policy.active })
            showToast(`"${policy.name}" ${policy.active ? "deshabilitada" : "habilitada"} con éxito.`)
        }).catch(e => showCommonErrorToast(e))
    }, [handleSidebar, selectedEntity, updateEntityOnList])

    // --- Eliminar definitivamente (borrado físico, irreversible) ---
    const [deletingPolicy, setDeletingPolicy] = useState<LeadRoutingPolicyDetailed | null>(null)

    const handleDeleteForever = useCallback((policy: LeadRoutingPolicyDetailed) => {
        return deleteRoutingPolicyForever(policy.id).then(() => {
            updateEntityOnList(policy, "DELETE_POLICY")
            showToast(`"${policy.name}" eliminada definitivamente.`)
        }).catch(e => showCommonErrorToast(e))
    }, [updateEntityOnList])

    const teamName = useMemo(() => teams.find(t => t.id === teamFilterId)?.name, [teams, teamFilterId])

    const clearTeamFilter = () => {
        setParams(prev => {
            const next = new URLSearchParams(prev)
            next.delete("team")
            return next
        }, { replace: true })
    }

    return (
        <ContainerWithSidebar isSidebarOpen={Boolean(sidebarMode)} closeSidebar={closeSidebar} sidebarComponent={
            <RoutingPolicySidebar mode={sidebarMode} entity={selectedEntity} handleSidebar={handleSidebar}
                closeSidebar={closeSidebar} updateEntityOnList={updateEntityOnList}
                initialCampaignId={campaignFilter ?? null}
                handleToggleActive={setTogglingPolicy} handleDeleteForever={setDeletingPolicy} />
        }>
            <Stack spacing={2}>
                <Stack direction="row" useFlexGap spacing={2} sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="h1">Políticas de Enrutamiento</Typography>
                    <Can permission="lead_routing_policy:create">
                        <ListAddButton onClick={() => { handleSidebar("CREATE_POLICY", null) }}
                            sx={{ marginLeft: "auto" }} />
                    </Can>
                </Stack>

                <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Box sx={{ minWidth: "15rem", flex: 1 }}>
                        <ControlledAutocomplete control={control} name="campaign_id" label="Filtrar por campaña" size="small"
                            options={campaigns} getOptionLabel={option => option.name} getOptionKey={option => `${option.id}`} returnField="id" />
                    </Box>
                    {teamFilterId &&
                        <CustomChip label={`Equipo: ${teamName ?? teamFilterId}`} onDelete={clearTeamFilter} chipColor="primary" />
                    }
                </Stack>
                <OrderSearchMenu searchOptions={SEARCH_ROUTE_FIELDS} orderOptions={ORDER_ROUTE_FIELDS} {...changeHandlers} />
                <LoadingScreenWrapper loading={loading}>
                    <Stack spacing={2}>
                        {
                            policies && policies.items?.length > 0 ?
                                <List dense>
                                    <Grid container sx={{ alignItems: "stretch" }}>
                                        {policies.items.map(policy =>
                                            <Grid size={{ xs: 12, sm: 12, md: 6, lg: 4 }} key={policy.id}>
                                                <ResponsiveListItem isSelected={policy.id === selectedEntity?.id} disablePadding
                                                    onClick={() => handleSidebar("DETAILS_POLICY", policy)}
                                                    actions={[
                                                        { actionType: "DETAILS", label: 'Detalle', onClick: () => handleSidebar("DETAILS_POLICY", policy) },
                                                        { actionType: "MODIFY", label: 'Modificar', onClick: () => handleSidebar("UPDATE_POLICY", policy), permission: "lead_routing_policy:update" },
                                                        {
                                                            actionType: (policy.active ? "DISABLE" : "ENABLE"), label: policy.active ? "Deshabilitar" : "Habilitar",
                                                            color: (policy.active ? "warning" : "success"), onClick: () => setTogglingPolicy(policy),
                                                            permission: policy.active ? "lead_routing_policy:delete" : "lead_routing_policy:update",
                                                        },
                                                        {
                                                            actionType: "DISABLE", label: "Eliminar definitivamente", color: "error", onClick: () => setDeletingPolicy(policy),
                                                            permission: "lead_routing_policy:delete",
                                                        },
                                                    ]}>
                                                    <ListItemText primary={
                                                        <Stack spacing={.5} direction="row" sx={{ alignItems: "center" }}>
                                                            <EnabledIcon active={policy.active} size="small" />
                                                            <Typography sx={{ fontWeight: 500, wordBreak: "break-word" }}>{policy.name}</Typography>
                                                        </Stack>
                                                    }
                                                        secondary={`Prioridad ${policy.priority} · ${policy.campaign_id ? "Por campaña" : "Global"}`} />
                                                </ResponsiveListItem>
                                            </Grid>
                                        )}
                                    </Grid>
                                </List>
                                :
                                <NoItemsMessage search={fetchParams.search} emptyFetchMessage="No se han encontrado políticas de enrutamiento...">
                                    <Can permission="lead_routing_policy:create">
                                        <CommonButton actionType="CREATE" onClick={() => { handleSidebar("CREATE_POLICY", null) }} variant="contained">
                                            Agregar
                                        </CommonButton>
                                    </Can>
                                </NoItemsMessage>
                        }
                        <PaginationComponent {...pageComponentProps} />
                    </Stack>
                </LoadingScreenWrapper>
            </Stack>
            <GenericConfirmDialog idModal='toggle-policy-list' open={Boolean(togglingPolicy)} handleClose={() => setTogglingPolicy(null)}
                onConfirm={() => handleToggleActive(togglingPolicy!)}
                confirmText={togglingPolicy?.active ? "Deshabilitar" : "Habilitar"}>
                {togglingPolicy && (
                    <>
                        <Typography variant="h3">
                            ¿Desea {togglingPolicy.active ? "deshabilitar" : "habilitar"} la política "{togglingPolicy.name}"?
                        </Typography>
                        <Typography variant="body1">
                            {togglingPolicy.active
                                ? "Dejará de aplicarse a los leads nuevos. Podés volver a habilitarla cuando quieras."
                                : "Volverá a aplicarse a los leads nuevos según su prioridad."}
                        </Typography>
                    </>
                )}
            </GenericConfirmDialog>
            <DisableConfirmDialog entity={deletingPolicy} clearEntity={() => setDeletingPolicy(null)} idModal='dis-policy-list'
                onlyDelete onConfirm={() => handleDeleteForever(deletingPolicy!)} entityTypeName='la política' />
        </ContainerWithSidebar >
    )
}

interface SidebarProps {
    mode: string | null,
    entity: LeadRoutingPolicyDetailed | null,
    initialCampaignId: string | null,
    closeSidebar: () => void,
    updateEntityOnList: (entity: LeadRoutingPolicyDetailed | null, mode: string) => void,
    handleSidebar: (mode: string, entity: LeadRoutingPolicyDetailed | null) => void,
    handleToggleActive: (entity: LeadRoutingPolicyDetailed) => void,
    handleDeleteForever: (entity: LeadRoutingPolicyDetailed) => void,
}
const RoutingPolicySidebar = memo(({ mode, entity, initialCampaignId, closeSidebar, updateEntityOnList, handleSidebar, handleToggleActive, handleDeleteForever }: SidebarProps) => {

    switch (mode) {
        case "CREATE_POLICY":
            return <RoutingPolicyFormSidebar closeSidebar={closeSidebar} initialCampaignId={initialCampaignId}
                updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "UPDATE_POLICY":
            return <RoutingPolicyFormSidebar existingPolicy={entity as LeadRoutingPolicyDetailed} closeSidebar={closeSidebar}
                updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "DETAILS_POLICY":
            return <RoutingPolicyDetails policy={entity as LeadRoutingPolicyDetailed} closeSidebar={closeSidebar}
                handleSidebar={handleSidebar} handleToggleActive={handleToggleActive} handleDeleteForever={handleDeleteForever} />
    }
})
