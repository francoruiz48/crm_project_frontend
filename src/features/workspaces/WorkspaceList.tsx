import { useCallback, useEffect, useState } from 'react'
import { WorkspaceFormSidebar } from './WorkspaceForms';
import { WorkspaceDetails } from './WorkspaceDetails'
import { CreateCampaignFormSidebar } from 'features/campaigns/CampaignForms';
import { DisableConfirmDialog } from 'shared/ui/feedback/ConfirmationDialog';
import ContainerWithSidebar from 'shared/layout/container/GenericContainer';
import PaginationComponent from 'shared/ui/lists/PaginationComponent';
import LoadingScreenWrapper from 'shared/ui/feedback/LoadingScreen';
import { ResponsiveListItem } from 'shared/ui/lists/CustomListItem';
import { NoItemsMessage } from 'shared/ui/lists/NoItemsMessage';
import { OrderSearchMenu } from 'shared/ui/lists/OrderMenu';
import CommonButton from 'shared/ui/buttons/CommonButton';
import { EnabledIcon } from 'shared/ui/lists/Icons';
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists';
import { useListPagination } from 'src/hooks/useListPagination';
import { useSidebar } from 'src/hooks/useSidebar';
import { useLoading } from 'src/hooks/useLoading';
import type { CampaignDetailed, WorkspaceDetailed } from 'src/types/campaigns'
import type { Paginable } from 'src/types/shared'
import { disableWorkspace, enableWorkspace, getWorkspace, getWorkspaces } from './workspaceServices'
import { showCommonErrorToast, showToast } from 'src/utils/feedback';
import { useUserContext } from 'src/stores/UserContext';
import { Can } from 'src/components/auth/Can';
import { useSearchParams } from 'react-router-dom';
import { List, ListItemText, Stack, Typography } from '@mui/material'
import { ListAddButton } from 'src/components/ui/buttons/ExpandingButton';

const ORDER_WSP_FIELDS = [
    { name: "name", label: "Orden Alfabético" },
]

const SEARCH_WSP_FIELDS = [
    { name: "name", label: "Nombre" },
    { name: "description", label: "Descripción" },
]

export const WorkspaceList = () => {

    const [params, setParams] = useSearchParams()

    const [workspaces, setWorkspaces] = useState<Paginable<WorkspaceDetailed> | null>(null)

    const { sidebarMode, selectedEntity, handleSidebar, closeSidebar } = useSidebar<WorkspaceDetailed | CampaignDetailed>("id", params, setParams, getWorkspace, "DETAILS_WSP")

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(workspaces)

    const { fetchParams, changeHandlers } = useOrderSeachList("workspaces")

    const { activeOrg } = useUserContext()

    const fetchWorkspaces = useCallback((fetchPage: number, pageSize: number) => {
        return getWorkspaces({ detailed: true, page_size: pageSize, page: fetchPage, ...fetchParams })
            .then(setWorkspaces)
            .catch(e => showCommonErrorToast(e))
    }, [fetchParams])

    const { loading, fnWithLoading: fetchWspLoad } = useLoading(fetchWorkspaces)

    useEffect(() => {
        fetchWspLoad(fetchPage, pageSize)
    }, [fetchWspLoad, fetchPage, pageSize, activeOrg])

    useEffect(() => {
        closeSidebar()
    }, [activeOrg, closeSidebar])

    const updateEntityOnList = useCallback((
        entity: WorkspaceDetailed | CampaignDetailed | null,
        mode: string) => {
        switch (mode) {
            case "CREATE_WSP": {
                getWorkspaces({ detailed: true, page_size: pageSize, only_active: false, page: workspaces?.page }).then(setWorkspaces)
                break;
            }
            case "UPDATE_WSP": {
                if (!workspaces) break
                const newWsp = entity as WorkspaceDetailed
                const workspaceItems = [...workspaces.items]
                const wspIdx = workspaceItems.findIndex(wsp => wsp.id === newWsp.id)
                if (wspIdx === -1) break
                workspaceItems[wspIdx] = newWsp
                setWorkspaces({ ...workspaces, items: [...workspaceItems] })
                break;
            }
            case "DELETE_WSP": {
                if (selectedEntity && entity?.id === selectedEntity.id) closeSidebar()
                getWorkspaces({ detailed: true, page_size: pageSize, only_active: false, page: workspaces?.page }).then(setWorkspaces)
                break;
            }
        }
    }, [closeSidebar, pageSize, selectedEntity, workspaces])

    const handleActive = useCallback(async (wsp: WorkspaceDetailed | null) => {
        if (!wsp) return
        const updateActive = (wsp: WorkspaceDetailed) => {
            updateEntityOnList({ ...wsp, active: !wsp.active }, "UPDATE_WSP")
            if (selectedEntity?.id === wsp.id) {
                handleSidebar("KEEP", { ...selectedEntity, active: !wsp.active })
            }
        }
        const deleteWsp = (org: WorkspaceDetailed) => {
            updateEntityOnList(org, "DELETE_WSP")
            if (selectedEntity?.id === org.id) {
                closeSidebar()
            }
        }
        if (wsp.active) {
            return disableWorkspace(wsp.id!).then((res) => {
                if (res.action === "disabled") {
                    updateActive(wsp)
                    showToast(`El espacio de trabajo "${wsp.name}" ha sido deshabilitado con éxito`)
                }
                if (res.action === "deleted") {
                    deleteWsp(wsp)
                    showToast(`El espacio de trabajo "${wsp.name}" ha sido eliminado definitivamente`)
                }
            })
                .catch(e => showCommonErrorToast(e))
        } else {
            return enableWorkspace(wsp.id!).then(() => {
                updateActive(wsp)
                showToast(`El espacio de trabajo "${wsp.name}" ha sido habilitado con éxito`)
            })
                .catch(e => showCommonErrorToast(e))
        }
    }, [closeSidebar, handleSidebar, selectedEntity, updateEntityOnList])

    const [deletingWsp, setDeletingWsp] = useState<WorkspaceDetailed | null>(null)
    const handleDeletingWsp = (deletingWsp: WorkspaceDetailed) => {
        setDeletingWsp(deletingWsp)
    }

    return (
        <ContainerWithSidebar isSidebarOpen={Boolean(sidebarMode)} closeSidebar={closeSidebar} sidebarWidth='45rem'
            sidebarComponent={
                <WorkspaceSidebar mode={sidebarMode} entity={selectedEntity} handleSidebar={handleSidebar}
                    closeSidebar={closeSidebar} updateEntityOnList={updateEntityOnList}
                    handleActive={handleDeletingWsp} />
            }>
            <Stack spacing={2}>
                <Stack spacing={2} direction="row" useFlexGap sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="h1">Espacios de Trabajo</Typography>

                    {workspaces && workspaces?.items.length > 0 &&
                        <Can permission="workspace:create">
                            <ListAddButton onClick={() => handleSidebar("CREATE_WSP", null)} sx={{ marginLeft: "auto" }} />
                        </Can>
                    }
                </Stack>
                <OrderSearchMenu searchOptions={SEARCH_WSP_FIELDS} orderOptions={ORDER_WSP_FIELDS} {...changeHandlers} />

                <LoadingScreenWrapper loading={loading}>
                    <Stack spacing={2}>
                        {workspaces?.items && workspaces?.items?.length > 0 ?
                            <List>
                                {workspaces?.items.map(wsp =>
                                    <ResponsiveListItem key={`wsp-${wsp.id}`} isSelected={wsp.id === selectedEntity?.id} disablePadding
                                        onClick={() => handleSidebar("DETAILS_WSP", wsp)}
                                        actions={[
                                            { template: "DETAILS", onClick: () => handleSidebar("DETAILS_WSP", wsp) },
                                            { actionType: "LIST", label: "Ver Leads", onClick: () => handleSidebar("UPDATE_WSP", wsp), permission: "workspace:update" },
                                            { template: wsp.active ? "DISABLE" : "ENABLE", onClick: () => handleDeletingWsp(wsp), permission: wsp.active ? "workspace:delete" : "workspace:update" },
                                        ]}>
                                        <ListItemText sx={{ mr: 7 }} primary={
                                            <Stack spacing={1} direction="row">
                                                <EnabledIcon active={wsp.active} />
                                                <Typography>{wsp.name}</Typography>
                                            </Stack>
                                        }
                                            secondary={wsp.description} />
                                    </ResponsiveListItem>
                                )}
                            </List>
                            : <Stack spacing={2} sx={{ justifyContent: "center", alignItems: "center" }}>
                                <NoItemsMessage search={fetchParams.search}
                                    emptyFetchMessage="No se han encontrado espacios de trabajo...">
                                    <Can permission="workspace:create">
                                        <CommonButton actionType='CREATE' onClick={() => handleSidebar("CREATE_WSP", null)} variant="contained">
                                            Agregar
                                        </CommonButton>
                                    </Can>
                                </NoItemsMessage>
                            </Stack>
                        }
                        <PaginationComponent {...pageComponentProps} />
                    </Stack>
                </LoadingScreenWrapper>
            </Stack>
            <DisableConfirmDialog idModal="del-wsp-list" entity={deletingWsp} clearEntity={() => setDeletingWsp(null)}
                onConfirm={() => handleActive(deletingWsp)} entityTypeName='el espacio de trabajo' />
        </ContainerWithSidebar >
    )
}


interface SidebarProps {
    mode: string | null,
    entity: WorkspaceDetailed | CampaignDetailed | null,
    closeSidebar: () => void,
    updateEntityOnList: (
        entity: WorkspaceDetailed | CampaignDetailed | null,
        mode: string,
    ) => void,
    handleSidebar: (mode: string, entity: WorkspaceDetailed | CampaignDetailed | null) => void,
    handleActive: (entity: WorkspaceDetailed) => void
}
const WorkspaceSidebar = ({ mode, entity, closeSidebar, updateEntityOnList, handleSidebar, handleActive }: SidebarProps) => {

    switch (mode) {
        case "CREATE_WSP":
            return <WorkspaceFormSidebar closeSidebar={closeSidebar}
                updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "CREATE_CMP":
            return <CreateCampaignFormSidebar workspace={entity as WorkspaceDetailed}
                handleSidebar={handleSidebar} />
        case "UPDATE_WSP":
            return <WorkspaceFormSidebar existingWsp={entity as WorkspaceDetailed} closeSidebar={closeSidebar}
                updateEntityOnList={entity => updateEntityOnList(entity, mode)}
                handleSidebar={handleSidebar} />
        case "DETAILS_WSP":
            return <WorkspaceDetails entity={entity as WorkspaceDetailed} closeSidebar={closeSidebar}
                handleSidebar={handleSidebar} handleActive={handleActive} />
    }

}