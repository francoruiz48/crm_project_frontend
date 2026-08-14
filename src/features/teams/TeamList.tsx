import { memo, useCallback, useEffect, useState } from 'react'
import { TeamFormSidebar } from './TeamForm'
import { TeamDetails } from './TeamDetails'
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
import type { TeamDetailed } from 'src/types/teams'
import type { Paginable } from 'src/types/shared'
import { disableTeam, enableTeam, getTeam, getTeams } from './teamServices'
import { showCommonErrorToast, showToast } from 'src/utils/feedback'
import { useUserContext } from 'src/stores/UserContext'
import { useSearchParams } from 'react-router-dom'
import { Grid, List, ListItemText, Stack, Typography } from '@mui/material'
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists'
import { OrderSearchMenu } from 'src/components/ui/lists/OrderMenu'
import { Can } from 'src/components/auth/Can'
import { ListAddButton } from 'src/components/ui/buttons/ExpandingButton'

const ORDER_TEAM_FIELDS = [
    { name: "name", label: "Orden Alfabético" },
]

const SEARCH_TEAM_FIELDS = [
    { name: "name", label: "Nombre" },
]

export const TeamList = () => {

    const { activeOrg } = useUserContext()

    const [teams, setTeams] = useState<Paginable<TeamDetailed> | null>(null)

    const [params, setParams] = useSearchParams()

    const { sidebarMode, selectedEntity, handleSidebar, closeSidebar } = useSidebar<TeamDetailed>("id", params, setParams, getTeam, "DETAILS_TEAM")

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(teams)

    const { fetchParams, changeHandlers } = useOrderSeachList("teams")

    const fetchTeams = useCallback((fetchPage: number, pageSize: number) => {
        return getTeams({ detailed: true, page: fetchPage, page_size: pageSize, ...fetchParams })
            .then(setTeams)
            .catch(e => showCommonErrorToast(e, "Ha ocurrido un error al traer los equipos"))
    }, [fetchParams])

    const { loading, fnWithLoading: fetchTeamsLoad } = useLoading(fetchTeams)

    useEffect(() => {
        fetchTeamsLoad(fetchPage, pageSize)
    }, [fetchPage, pageSize, activeOrg, fetchTeamsLoad])

    const updateEntityOnList = useCallback((entity: TeamDetailed | null, mode: string) => {
        switch (mode) {
            case "CREATE_TEAM": {
                fetchTeams(teams?.page ?? 1, pageSize)
                break;
            }
            case "UPDATE_TEAM": {
                const newTeam = entity as TeamDetailed
                return setTeams(prevList => {
                    if (!prevList || prevList.items.length === 0) return prevList
                    const teamItems = [...prevList.items]
                    const teamIdx = teamItems.findIndex(t => t.id === newTeam.id)
                    if (teamIdx === -1) return prevList
                    teamItems[teamIdx] = newTeam
                    return { ...prevList, items: [...teamItems] }
                })
            }
            case "DELETE_TEAM": {
                if (selectedEntity && entity?.id === selectedEntity.id) closeSidebar()
                fetchTeams(teams?.page ?? 1, pageSize)
                break;
            }
        }
    }, [closeSidebar, teams?.page, pageSize, selectedEntity, fetchTeams])

    const handleActive = useCallback(async (team: TeamDetailed | null) => {
        if (!team) return
        const updateActive = (team: TeamDetailed) => {
            updateEntityOnList({ ...team, active: !team.active }, "UPDATE_TEAM")
            if (selectedEntity?.id === team.id) {
                handleSidebar("KEEP", { ...selectedEntity, active: !team.active })
            }
        }
        const deleteTeam = (team: TeamDetailed) => {
            updateEntityOnList(team, "DELETE_TEAM")
            if (selectedEntity?.id === team.id) {
                closeSidebar()
            }
        }
        if (team.active) {
            return disableTeam(team.id).then(res => {
                if (res.action === "disabled") {
                    updateActive(team)
                    showToast(`"${team.name}" deshabilitado con éxito.`)
                }
                if (res.action === "deleted") {
                    deleteTeam(team)
                    showToast(`"${team.name}" eliminado definitivamente.`)
                }
            })
                .catch(e => showCommonErrorToast(e))
        } else {
            return enableTeam(team.id).then(() => {
                updateActive(team)
                showToast(`"${team.name}" habilitado con éxito.`)
            })
                .catch(e => showCommonErrorToast(e))
        }
    }, [closeSidebar, handleSidebar, selectedEntity, updateEntityOnList])

    const [deletingTeam, setDeletingTeam] = useState<TeamDetailed | null>(null)

    return (
        <ContainerWithSidebar isSidebarOpen={Boolean(sidebarMode)} closeSidebar={closeSidebar} sidebarComponent={
            <TeamSidebar mode={sidebarMode} entity={selectedEntity} handleSidebar={handleSidebar}
                closeSidebar={closeSidebar} updateEntityOnList={updateEntityOnList}
                handleActive={setDeletingTeam} />
        }>
            <Stack spacing={2}>
                <Stack direction="row" useFlexGap sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="h1">Equipos</Typography>
                    {teams && teams.items?.length > 0 &&
                        <Can permission="team:create">
                            <ListAddButton onClick={() => { handleSidebar("CREATE_TEAM", null) }}
                                sx={{ marginLeft: "auto" }} />
                        </Can>
                    }
                </Stack>
                <OrderSearchMenu searchOptions={SEARCH_TEAM_FIELDS} orderOptions={ORDER_TEAM_FIELDS} {...changeHandlers} />
                <LoadingScreenWrapper loading={loading}>
                    <Stack spacing={2}>
                        {
                            teams && teams.items?.length > 0 ?
                                <List dense>
                                    <Grid container sx={{ alignItems: "stretch" }}>
                                        {teams.items.map(team =>
                                            <Grid size={{ xs: 12, sm: 12, md: 6, lg: 4 }} key={team.id}>
                                                <ResponsiveListItem isSelected={team.id === selectedEntity?.id} disablePadding
                                                    onClick={() => handleSidebar("DETAILS_TEAM", team)}
                                                    actions={[
                                                        { actionType: "DETAILS", label: 'Detalle', onClick: () => handleSidebar("DETAILS_TEAM", team) },
                                                        { actionType: "MODIFY", label: 'Modificar', onClick: () => handleSidebar("UPDATE_TEAM", team), permission: "team:update" },
                                                        {
                                                            actionType: (team.active ? "DISABLE" : "ENABLE"), label: team.active ? "Deshabilitar" : "Habilitar",
                                                            color: (team.active ? "error" : "success"), onClick: () => setDeletingTeam(team),
                                                            permission: team.active ? "team:delete" : "team:update",
                                                        }
                                                    ]}>
                                                    <ListItemText primary={
                                                        <Stack spacing={.5} direction="row" sx={{ alignItems: "center" }}>
                                                            <EnabledIcon active={team.active} size="small" />
                                                            <Typography sx={{ fontWeight: 500, wordBreak: "break-word" }}>{team.name}</Typography>
                                                        </Stack>
                                                    }
                                                        secondary={`${team.members?.length ?? 0} miembro(s)`} />
                                                </ResponsiveListItem>
                                            </Grid>
                                        )}
                                    </Grid>
                                </List>
                                : <Stack spacing={2} sx={{ justifyContent: "center", alignItems: "center" }}>
                                    <Typography variant="h4">No se han encontrado equipos...</Typography>
                                    <CommonButton actionType="CREATE" onClick={() => { handleSidebar("CREATE_TEAM", null) }} variant="contained">
                                        Agregar
                                    </CommonButton>
                                </Stack>
                        }
                        <PaginationComponent {...pageComponentProps} />
                    </Stack>
                </LoadingScreenWrapper>
            </Stack>
            <DisableConfirmDialog entity={deletingTeam} clearEntity={() => setDeletingTeam(null)} idModal='dis-team-list'
                onConfirm={() => handleActive(deletingTeam)} entityTypeName='el equipo' />
        </ContainerWithSidebar >
    )
}

interface SidebarProps {
    mode: string | null,
    entity: TeamDetailed | null,
    closeSidebar: () => void,
    updateEntityOnList: (
        entity: TeamDetailed | null,
        mode: string,
    ) => void,
    handleSidebar: (mode: string, entity: TeamDetailed | null) => void,
    handleActive: (entity: TeamDetailed) => void
}
const TeamSidebar = memo(({ mode, entity, closeSidebar, updateEntityOnList, handleSidebar, handleActive }: SidebarProps) => {

    switch (mode) {
        case "CREATE_TEAM":
            return <TeamFormSidebar closeSidebar={closeSidebar}
                updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "UPDATE_TEAM":
            return <TeamFormSidebar existingTeam={entity as TeamDetailed} closeSidebar={closeSidebar}
                updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "DETAILS_TEAM":
            return <TeamDetails team={entity as TeamDetailed} closeSidebar={closeSidebar}
                handleSidebar={handleSidebar} handleActive={handleActive} />
    }

})
