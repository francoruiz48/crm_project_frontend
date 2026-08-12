import { memo, useCallback, useEffect, useState } from 'react'
import { RoleFormSidebar } from './RoleForms'
import { RoleDetails } from './RoleDetails'
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
import type { Paginable } from 'src/types/shared'
import { showCommonErrorToast, showToast } from 'src/utils/feedback'
import { useUserContext } from 'src/stores/UserContext'
import { Can } from 'src/components/auth/Can'
import { useSearchParams } from 'react-router-dom'
import { Grid, List, ListItemText, Stack, Typography } from '@mui/material'
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists'
import { OrderSearchMenu } from 'src/components/ui/lists/OrderMenu'
import { NoItemsMessage } from 'src/components/ui/lists/NoItemsMessage'
import { disableRole, enableRole, getRole, getRoles } from 'src/services/roleService'
import type { RoleDetailed } from 'src/types/roles'
import { ListAddButton } from 'src/components/ui/buttons/ExpandingButton'

const ORDER_ROLE_FIELDS = [
    { name: "name", label: "Orden Alfabético" },
    { name: "code", label: "Código" },
]

const SEARCH_ROLE_FIELDS = [
    { name: "name", label: "Nombre" },
    { name: "code", label: "Código" },
]

export const RoleList = () => {

    const { activeOrg } = useUserContext()

    const [roles, setRoles] = useState<Paginable<RoleDetailed> | null>(null)

    const [params, setParams] = useSearchParams()

    const { sidebarMode, selectedEntity, handleSidebar, closeSidebar } = useSidebar<RoleDetailed>("id", params, setParams, getRole, "DETAILS_ROLE")

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(roles)

    const { fetchParams, changeHandlers } = useOrderSeachList()

    const fetchRoles = useCallback((fetchPage: number, pageSize: number) => {
        return getRoles({ detailed: true, page: fetchPage, page_size: pageSize, ...fetchParams })
            .then(setRoles)
    }, [fetchParams])

    const { loading, fnWithLoading: fetchRolesLoad } = useLoading(fetchRoles)

    useEffect(() => {
        fetchRolesLoad(fetchPage, pageSize)
    }, [fetchPage, pageSize, activeOrg, fetchRolesLoad])

    const updateEntityOnList = useCallback((entity: RoleDetailed | null, mode: string) => {
        switch (mode) {
            case "CREATE_ROLE": {
                fetchRolesLoad(roles?.page, pageSize)
                break;
            }
            case "UPDATE_ROLE": {
                const newRole = entity as RoleDetailed
                return setRoles(prevList => {
                    if (!prevList || prevList.items.length === 0) return prevList
                    const roleItems = [...prevList.items]
                    const roleIdx = roleItems.findIndex(role => role.id === newRole.id)
                    if (roleIdx === -1) return prevList
                    roleItems[roleIdx] = newRole
                    return { ...prevList, items: [...roleItems] }
                })
            }
            case "DELETE_ROLE": {
                if (selectedEntity && entity?.id === selectedEntity.id) closeSidebar()
                fetchRolesLoad(roles?.page, pageSize)
                break;
            }
        }
    }, [closeSidebar, roles?.page, pageSize, selectedEntity, fetchRolesLoad])

    const handleActive = useCallback(async (rol: RoleDetailed | null) => {
        if (!rol) return
        const updateActive = (rol: RoleDetailed) => {
            updateEntityOnList({ ...rol, active: !rol.active }, "UPDATE_ROLE")
            if (selectedEntity?.id === rol.id) {
                handleSidebar("KEEP", { ...selectedEntity, active: !rol.active })
            }
        }
        const deleteRol = (rol: RoleDetailed) => {
            updateEntityOnList(rol, "DELETE_ROLE")
            if (selectedEntity?.id === rol.id) {
                closeSidebar()
            }
        }
        if (rol.active) {
            return disableRole(rol.id).then(res => {
                if (res.action === "disabled") {
                    updateActive(rol)
                    showToast(`"${rol.name}" deshabilitado con éxito.`)
                }
                if (res.action === "deleted") {
                    deleteRol(rol)
                    showToast(`"${rol.name}" eliminado definitivamente.`)
                }
            })
                .catch(e => showCommonErrorToast(e))
        } else {
            return enableRole(rol.id).then(() => {
                updateActive(rol)
                showToast(`"${rol.name}" habilitado con éxito.`)
            })
                .catch(e => showCommonErrorToast(e))
        }
    }, [closeSidebar, handleSidebar, selectedEntity, updateEntityOnList])

    const [deletingRole, setDeletingRole] = useState<RoleDetailed | null>(null)
    const handleDeletingRole = (deletingRole: RoleDetailed) => {
        setDeletingRole(deletingRole)
    }

    return (
        <ContainerWithSidebar isSidebarOpen={Boolean(sidebarMode)} closeSidebar={closeSidebar} sidebarComponent={
            <RoleSidebar mode={sidebarMode} entity={selectedEntity} handleSidebar={handleSidebar}
                closeSidebar={closeSidebar} updateEntityOnList={updateEntityOnList}
                handleActive={handleDeletingRole} />
        }>
            <Stack>
                <Stack direction="row" useFlexGap spacing={2} sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="h1">Roles</Typography>
                    {roles && roles.items?.length > 0 &&
                        <Can permission="role:create">
                            <ListAddButton onClick={() => { handleSidebar("CREATE_ROLE", null) }}
                                sx={{ marginLeft: "auto" }} />
                        </Can>
                    }
                </Stack>
                <OrderSearchMenu searchOptions={SEARCH_ROLE_FIELDS} orderOptions={ORDER_ROLE_FIELDS} {...changeHandlers} />
                <LoadingScreenWrapper loading={loading}>
                    <Stack spacing={2}>
                        {
                            roles && roles.items?.length > 0 ?
                                <List dense>
                                    <Grid container sx={{ alignItems: "stretch" }}>
                                        {roles.items.map(rol => {
                                            return (<Grid size={{ xs: 12, sm: 12, md: 6, lg: 4 }} key={rol.id}>
                                                <ResponsiveListItem isSelected={rol.id === selectedEntity?.id} disablePadding
                                                    onClick={() => handleSidebar("DETAILS_ROLE", rol)}
                                                    actions={[
                                                        { template: "DETAILS", onClick: () => handleSidebar("DETAILS_ROLE", rol) },
                                                        { template: "MODIFY", onClick: () => handleSidebar("UPDATE_ROLE", rol), permission: "role:update" },
                                                        { template: rol.active ? "DISABLE" : "ENABLE", onClick: () => handleDeletingRole(rol), permission: rol.active ? "role:delete" : "role:update" },
                                                    ]}>
                                                    <ListItemText primary={
                                                        <Stack spacing={.5} direction="row" sx={{ alignItems: "center" }}>
                                                            <EnabledIcon active={rol.active} size="small" />
                                                            <Stack>
                                                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500, wordBreak: "break-word", textTransform: "uppercase", lineHeight: 1 }}>
                                                                    {rol.code}
                                                                </Typography>
                                                                <Typography sx={{ fontWeight: 500, wordBreak: "break-word" }}>{rol.name}</Typography>
                                                            </Stack>
                                                        </Stack>
                                                    } />
                                                </ResponsiveListItem>
                                            </Grid>
                                            )
                                        }
                                        )}
                                    </Grid>
                                </List>
                                :
                                <NoItemsMessage search={fetchParams.search} emptyFetchMessage="No se han encontrado roles...">
                                    <Can permission="role:create">
                                        <CommonButton actionType="CREATE" onClick={() => { handleSidebar("CREATE_ROLE", null) }} variant="contained">
                                            Agregar
                                        </CommonButton>
                                    </Can>
                                </NoItemsMessage>
                        }
                        <PaginationComponent {...pageComponentProps} />
                    </Stack>
                </LoadingScreenWrapper>
            </Stack>
            <DisableConfirmDialog entity={deletingRole} clearEntity={() => setDeletingRole(null)} idModal='dis-role-list'
                onConfirm={() => handleActive(deletingRole)} entityTypeName='el rol' />
        </ContainerWithSidebar >
    )
}

interface SidebarProps {
    mode: string | null,
    entity: RoleDetailed | null,
    closeSidebar: () => void,
    updateEntityOnList: (
        entity: RoleDetailed | null,
        mode: string,
    ) => void,
    handleSidebar: (mode: string, entity: RoleDetailed | null) => void,
    handleActive: (entity: RoleDetailed) => void
}
const RoleSidebar = memo(({ mode, entity, closeSidebar, updateEntityOnList, handleSidebar, handleActive }: SidebarProps) => {

    switch (mode) {
        case "CREATE_ROLE":
            return <RoleFormSidebar closeSidebar={closeSidebar}
                updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "UPDATE_ROLE":
            return <RoleFormSidebar existingRole={entity as RoleDetailed} closeSidebar={closeSidebar}
                updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "DETAILS_ROLE":
            return <RoleDetails role={entity as RoleDetailed} closeSidebar={closeSidebar}
                handleSidebar={handleSidebar} handleActive={handleActive} />
    }

})
