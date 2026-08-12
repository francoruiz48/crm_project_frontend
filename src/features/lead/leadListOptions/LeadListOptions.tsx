import { memo, useCallback, useEffect, useState } from "react"
import { LeadViewMenu } from "./LeadViewMenu";
import { LeadFilters } from "./LeadFilters";
import GenericModal from "shared/layout/container/GenericModal";
import { ChipTooltip } from "shared/ui/details/ChipTooltip";
import CommonButton from 'shared/ui/buttons/CommonButton';
import type { Lead, LeadView, LeadViewParams } from "src/types/leads";
import type { LeadFilter, LeadListParams } from "src/types/shared";
import type { Campaign, Workspace } from "src/types/campaigns"
import { getWorkspaces } from "src/features/workspaces/workspaceServices";
import { getCampaigns } from "src/features/campaigns/campaignServices";
import { useUserContext } from 'src/stores/UserContext';
import { Badge, Button, Divider, Grid, Menu, MenuItem, Stack, ToggleButton, ToggleButtonGroup, Typography, ButtonGroup } from "@mui/material"
import { Can } from 'src/components/auth/Can';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import TableChartIcon from '@mui/icons-material/TableChart';
import WindowIcon from '@mui/icons-material/Window';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface LeadCampaignSelectorsProps {
    workspaceId: string | null,
    handleWorkspaceChange: (id: string | null) => void,
    campaignId: string | null,
    handleCampaignChange: (id: string | null) => void,
}

export const LeadCampaignSelector = memo(({ workspaceId, handleWorkspaceChange, campaignId, handleCampaignChange }: LeadCampaignSelectorsProps) => {

    const { activeOrg } = useUserContext()

    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [campaigns, setCampaigns] = useState<Campaign[]>([])

    //Inicialización al cambiar de organización
    useEffect(() => {
        getWorkspaces({ only_active: true, page_size: 0 }).then(wsps => {
            setWorkspaces(wsps.items)
            if (wsps.items.length === 0) {
                handleWorkspaceChange(null)
                return
            }
            // Workspace.id es string (uuid); antes se comparaba contra Number(workspaceId), lo
            // que nunca matcheaba (string !== number) y hacía que el workspaceId de la URL se
            // ignorara siempre, cayendo al primer elemento.
            const newWorkspaceId = (workspaceId && wsps.items.map(i => i.id).includes(String(workspaceId))) ? workspaceId : wsps.items[0].id
            handleWorkspaceChange(newWorkspaceId)

            getCampaigns({ only_active: true, workspace_id: newWorkspaceId as string, page_size: 0 }).then(cmps => {
                setCampaigns(cmps.items)
                if (cmps.items.length === 0) {
                    handleCampaignChange(null)
                    return
                }
                const newCampaignId = (campaignId && cmps.items.map(i => i.id).includes(String(campaignId))) ? campaignId : cmps.items[0].id
                handleCampaignChange(newCampaignId)
            })
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOrg])

    const onWorkspaceChange = useCallback((newWorkspaceId: string | null) => {
        if (!newWorkspaceId) return
        handleWorkspaceChange(newWorkspaceId)
        getCampaigns({ only_active: true, workspace_id: newWorkspaceId, page_size: 0 }).then(res => {
            setCampaigns(res.items)
            handleCampaignChange(res.items[0].id)
        })
    }, [handleWorkspaceChange, handleCampaignChange])

    const [workspaceAnchor, setWorkspaceAnchor] = useState<null | HTMLElement>(null)
    const [campaignAnchor, setCampaignAnchor] = useState<null | HTMLElement>(null)

    // Antes comparaba contra Number(workspaceId)/Number(campaignId): ws.id/c.id ya son string
    // (uuid), así que esa comparación nunca era true y el botón nunca mostraba el nombre
    // seleccionado (quedaba siempre en el fallback "Espacio de Trabajo"/"Campaña").
    const selectedWorkspace = workspaces.find(ws => ws.id === workspaceId)
    const selectedCampaign = campaigns.find(c => c.id === campaignId)

    return (
        <Stack direction="row" spacing={0} sx={{ alignItems: 'center' }}>
            {/* Workspace */}
            <Button
                variant="text"
                size="small"
                endIcon={<KeyboardArrowDownIcon />}
                onClick={e => setWorkspaceAnchor(e.currentTarget)}
                sx={{ fontWeight: 700, color: 'text.primary', px: 1, py: 0.5, minWidth: 0 }}
            >
                {selectedWorkspace?.name ?? 'Espacio de Trabajo'}
            </Button>
            <Menu
                anchorEl={workspaceAnchor}
                open={Boolean(workspaceAnchor)}
                onClose={() => setWorkspaceAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                {workspaces.map(ws => (
                    <MenuItem
                        key={ws.id}
                        selected={ws.id === workspaceId}
                        onClick={() => { onWorkspaceChange(ws.id); setWorkspaceAnchor(null) }}
                        dense
                    >
                        {ws.name}
                    </MenuItem>
                ))}
            </Menu>

            <Typography color="text.disabled" sx={{ mx: 0.25, lineHeight: 1 }}>/</Typography>

            {/* Campaign */}
            <Button
                variant="text"
                size="small"
                endIcon={<KeyboardArrowDownIcon />}
                onClick={e => setCampaignAnchor(e.currentTarget)}
                disabled={!workspaceId}
                sx={{ color: 'text.secondary', px: 1, py: 0.5, minWidth: 0 }}
            >
                {selectedCampaign?.name ?? 'Campaña'}
            </Button>
            <Menu
                anchorEl={campaignAnchor}
                open={Boolean(campaignAnchor)}
                onClose={() => setCampaignAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                {campaigns.map(c => (
                    <MenuItem
                        key={c.id}
                        selected={c.id === campaignId}
                        onClick={() => { handleCampaignChange(c.id); setCampaignAnchor(null) }}
                        dense
                    >
                        {c.name}
                    </MenuItem>
                ))}
            </Menu>
        </Stack>
    )
})

interface LeadListOptionsProps {
    areThereLeads: boolean,
    campaignId: string | null,
    filters: LeadFilter[],
    headers: LeadListParams,
    setFiltersAndHeaders: (filters: LeadFilter[], headers: LeadListParams) => Promise<unknown>,
    campaignSelectorProps: {
        workspaceId: string | null;
        campaignId: string | null;
        handleWorkspaceChange: (id: string | null) => void;
        handleCampaignChange: (id: string | null) => void;
    },
    presentationProps: {
        presentationMode: string;
        handlePresentation: (mode: "string") => void;
    },
    modalProps: {
        openModalId?: string;
        handleOpen: (idModal: string) => void;
        handleClose: () => void;
    },
    selectCheckboxProps: {
        checkedItems: Map<number, Lead>;
        addItem: (item: Lead | Lead[]) => void;
        removeItem: (item: Lead) => void;
        removeAllItems: () => void;
        areThereActiveItems: boolean;
        areThereInactiveItems: boolean;
    },
    bulkDelete: () => Promise<void> | undefined;
    viewUpdateProps: {
        saveView: (name: string, visibility: string, existingView?: LeadView) => Promise<unknown>
        loadView: (view: LeadView) => void;
        currentView: LeadViewParams | undefined;
    }
}

export const LeadListOptions = memo(({ areThereLeads, campaignId, filters, headers, setFiltersAndHeaders, modalProps, campaignSelectorProps, presentationProps, selectCheckboxProps, viewUpdateProps, bulkDelete }: LeadListOptionsProps) => {

    //Al aplicar filtros vuelve a la primera página
    const applyFilters = useCallback(async (data: { headers: LeadListParams, filters: LeadFilter[] }) => {
        const newHeaders = { ...headers, ...data.headers }
        return setFiltersAndHeaders(data.filters, newHeaders)?.then(() => modalProps.handleClose()
        )
    }, [setFiltersAndHeaders, headers, modalProps])

    return (
        <Grid container spacing={3} sx={{ justifyContent: "space-between", width: "100%" }}>
            <Grid size="auto">
                <LeadCampaignSelector {...campaignSelectorProps} />
            </Grid>
            <Divider orientation="vertical" flexItem />
            <Grid container size="grow" spacing={1} sx={{ justifyContent: "end", alignItems: "center", minWidth: "20rem" }}>
                <ToggleButtonGroup
                    size="small"
                    value={presentationProps.presentationMode}
                    exclusive
                    onChange={(_, value) => presentationProps.handlePresentation(value)}
                    aria-label="text alignment"
                >
                    <ChipTooltip title='Tabla' color="contrast">
                        <ToggleButton value="TABLE">
                            <TableChartIcon />
                        </ToggleButton>
                    </ChipTooltip>
                    <ChipTooltip title='Tablero' color="contrast">
                        <ToggleButton value="BOARD">
                            <ViewColumnIcon />
                        </ToggleButton>
                    </ChipTooltip>
                    <ToggleButton value="LIST" disabled>
                        <FormatListBulletedIcon />
                    </ToggleButton>
                    <ToggleButton value="GRID" disabled>
                        <WindowIcon />
                    </ToggleButton>
                </ToggleButtonGroup>
                <ButtonGroup >
                    {areThereLeads &&
                        <ChipTooltip title='Filtros' color="secondary">
                            <Badge badgeContent={filters.length} color="success">
                                <CommonButton variant="outlined" actionType="FILTER" color="secondary" onClick={() => modalProps.handleOpen("lead_filters")} />
                            </Badge>
                        </ChipTooltip>}
                    {
                        areThereLeads && !!campaignId &&
                        <ChipTooltip title='Campos a Mostrar' color="secondary">
                            <CommonButton variant="outlined" actionType='OPTIONS' color='secondary' onClick={() => modalProps.handleOpen("columns_selector")} />
                        </ChipTooltip>
                    }
                    {campaignSelectorProps?.campaignId &&
                        <LeadViewMenu {...viewUpdateProps} campaignId={String(campaignSelectorProps.campaignId)} />}
                    {selectCheckboxProps.checkedItems.size > 0 &&
                        <Can permission="lead:delete">
                            <ChipTooltip title='Eliminar Seleccionados' color="error">
                                <CommonButton variant="outlined" actionType="CLOSE" color="error" onClick={bulkDelete} />
                            </ChipTooltip>
                        </Can>
                    }
                </ButtonGroup>
                <GenericModal idModal="lead_filters" {...modalProps} buttonText="Aplicar Filtros" maxWidth="md" fullWidth
                    btnProps={{ actionType: 'FILTER' }} color='secondary' showButton={false} >
                    <LeadFilters applyFilters={applyFilters} filters={{ filters, headers }} campaignId={String(campaignId)}
                        onClose={() => modalProps.handleClose()} />
                </GenericModal>
            </Grid >
        </Grid>
    )
})

