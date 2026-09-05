import { useCallback, useEffect, useState } from 'react'
import { OrganizationFormSidebar } from './OrganizationForm'
import OrganizationDetails from './OrganizationDetail'
import { ResponsiveListItem } from 'shared/ui/lists/CustomListItem'
import ContainerWithSidebar from 'shared/layout/container/GenericContainer'
import LoadingScreenWrapper from 'shared/ui/feedback/LoadingScreen'
import { NoItemsMessage } from 'shared/ui/lists/NoItemsMessage'
import { OrderSearchMenu } from 'shared/ui/lists/OrderMenu'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { EnabledIcon } from 'shared/ui/lists/Icons'
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists'
import { useLoading } from 'src/hooks/useLoading'
import { useSidebar } from 'src/hooks/useSidebar'
import type { Organization, OrganizationDetailed } from 'src/types/campaigns'
import { getOrganization, getOrganizations } from './organizationServices'
import { useUserContext } from 'src/stores/UserContext'
import { Can } from 'src/components/auth/Can'
import { useSearchParams } from 'react-router-dom'
import { List, ListItemText, Stack, Typography } from '@mui/material'
import { ListAddButton } from 'src/components/ui/buttons/ExpandingButton'

const ORDER_ORG_FIELDS = [
    { name: "name", label: "Orden Alfabético" },
]

const SEARCH_ORG_FIELDS = [
    { name: "name", label: "Nombre" },
    { name: "description", label: "Descripción" },
]

export const OrganizationList = () => {

    const [params, setParams] = useSearchParams()

    const { activeOrg, setActiveOrg, fetchOrgHeaderList } = useUserContext()

    const { sidebarMode, selectedEntity, handleSidebar, closeSidebar } = useSidebar<OrganizationDetailed>("id", params, setParams, getOrganization, "DETAILS_ORG")

    const [organizations, setOrganizations] = useState<OrganizationDetailed[]>([])

    const { fetchParams, changeHandlers } = useOrderSeachList("organizations")

    const fetchOrganizations = useCallback(async () => {
        return getOrganizations({ detailed: true, page_size: 0, ...fetchParams })
            .then(orgList => {
                const filteredList = orgList.items.filter(org => !org.is_system)
                setOrganizations(filteredList)
            })
    }, [fetchParams])

    const { loading, fnWithLoading: fetchOrgLoad } = useLoading(fetchOrganizations)

    useEffect(() => {
        fetchOrgLoad()
    }, [fetchOrgLoad])

    const handleActiveOrg = (org: OrganizationDetailed) => {
        if (!org.active) return
        setActiveOrg(org)
    }

    const updateEntityOnList = useCallback((newOrg: OrganizationDetailed, mode: string) => {
        switch (mode) {
            case "CREATE_ORG": case "DELETE_ORG":
                fetchOrgHeaderList()
                return fetchOrgLoad()
            case "UPDATE_ORG": {
                return setOrganizations(prevList => {
                    fetchOrgHeaderList()
                    if (!prevList || prevList.length === 0) return prevList
                    const newOrganizationsItems = [...prevList]
                    const orgIdx = prevList.findIndex(org => org.id === newOrg.id)
                    if (orgIdx === -1) return prevList
                    newOrganizationsItems[orgIdx] = newOrg
                    return newOrganizationsItems
                })
            }
        }
    }, [setOrganizations, fetchOrgLoad, fetchOrgHeaderList])

    return (
        <ContainerWithSidebar isSidebarOpen={Boolean(sidebarMode)} closeSidebar={closeSidebar} sidebarComponent={
            <OrganizationSidebar mode={sidebarMode} entity={selectedEntity} handleSidebar={handleSidebar}
                closeSidebar={closeSidebar} updateEntityOnList={updateEntityOnList} />
        }>
            <Stack spacing={2}>
                <Stack spacing={2} direction="row" useFlexGap sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="h1">Organizaciones</Typography>
                    {organizations && organizations?.length > 0 &&
                        <Can permission="organization:create">
                            <ListAddButton onClick={() => handleSidebar("CREATE_ORG", null)} sx={{ marginLeft: "auto" }} />
                        </Can>
                    }
                </Stack>
                <OrderSearchMenu searchOptions={SEARCH_ORG_FIELDS} orderOptions={ORDER_ORG_FIELDS} {...changeHandlers} />
                <LoadingScreenWrapper loading={loading}>
                    {organizations && organizations?.length > 0 ?
                        <List>
                            {organizations.map(org =>
                                <OrganizationListItem key={org.id} org={org} selectedEntity={selectedEntity} activeOrg={activeOrg}
                                    handleSidebar={handleSidebar} handleActiveOrg={handleActiveOrg} />
                            )}
                        </List>
                        :
                        <NoItemsMessage search={fetchParams.search} emptyFetchMessage="No se han encontrado organizaciones...">
                            <Can permission="organization:create">
                                <CommonButton actionType="CREATE" onClick={() => handleSidebar("CREATE_ORG", null)} variant="contained">
                                    Agregar
                                </CommonButton>
                            </Can>
                        </NoItemsMessage>
                    }
                </LoadingScreenWrapper>
            </Stack >
        </ContainerWithSidebar >
    )
}

export default OrganizationList

interface OrganizationListItemProps {
    org: OrganizationDetailed,
    selectedEntity: OrganizationDetailed | null,
    activeOrg: Organization | null,
    handleSidebar: (mode: string, entity: OrganizationDetailed | null) => void,
    handleActiveOrg: (org: OrganizationDetailed) => void,
}
const OrganizationListItem = ({ org, selectedEntity, activeOrg, handleSidebar, handleActiveOrg }: OrganizationListItemProps) => {
    // Estrategia de borrado de Organization (PROTECTED): el backend rechaza cualquier
    // borrado, así que no ofrece acciones destructivas en el menú.
    return (
        <ResponsiveListItem isSelected={org.id === selectedEntity?.id} disablePadding
            onClick={() => handleSidebar("DETAILS_ORG", org)}
            actions={[
                { template: "DETAILS", onClick: () => handleSidebar("DETAILS_ORG", org) },
                { template: "MODIFY", onClick: () => handleSidebar("UPDATE_ORG", org), permission: 'organization:update' },
                activeOrg?.id !== org.id && org.active &&
                { actionType: "CHECK", label: "Seleccionar Activa", color: "info", onClick: () => handleActiveOrg(org) },
            ]}>
            <ListItemText sx={{ mr: 10 }} primary={
                <Stack spacing={1} direction="row">
                    <EnabledIcon active={org.active} />
                    <Typography color={activeOrg?.id === org.id ? "info" : "textPrimary"}
                        sx={{ textDecoration: activeOrg?.id === org.id ? "underline" : "none" }}>
                        {org.name}
                    </Typography>
                </Stack>
            }
                secondary={org.description} />
        </ResponsiveListItem>
    )
}

interface SidebarProps {
    mode: string | null,
    entity: OrganizationDetailed | null,
    closeSidebar: () => void,
    updateEntityOnList: (entity: OrganizationDetailed, mode: string) => void,
    handleSidebar: (mode: string, entity: OrganizationDetailed | null) => void,
}
const OrganizationSidebar = ({ mode, entity, closeSidebar, updateEntityOnList, handleSidebar }: SidebarProps) => {
    switch (mode) {
        case "CREATE_ORG":
            return <OrganizationFormSidebar closeSidebar={closeSidebar}
                updateEntityOnList={(entity) => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "UPDATE_ORG":
            return <OrganizationFormSidebar existingOrg={entity as OrganizationDetailed}
                closeSidebar={closeSidebar} handleSidebar={handleSidebar}
                updateEntityOnList={(entity) => updateEntityOnList(entity, mode)} />
        case "DETAILS_ORG":
            return <OrganizationDetails entity={entity} closeSidebar={closeSidebar}
                handleSidebar={handleSidebar} />
    }
}