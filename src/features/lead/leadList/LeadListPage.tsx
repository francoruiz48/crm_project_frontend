import { useCallback, useEffect, useMemo, useState } from 'react'
import { LeadListContent } from './LeadListContent'
import LeadColumnSelector from '../leadListOptions/LeadColumnSelector'
import { LeadListOptions } from '../leadListOptions/LeadListOptions'
import { DisableBulkConfirmDialog } from 'src/components/ui/feedback/ConfirmationDialog'
import { GenericContainer } from 'shared/layout/container/GenericContainer'
import PaginationComponent from 'shared/ui/lists/PaginationComponent'
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen'
import GenericModal from 'shared/layout/container/GenericModal'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { useListPagination } from 'src/hooks/useListPagination'
import { useSelectCheckbox } from 'src/hooks/useSelectCheckbox'
import { useOrderList } from 'src/hooks/useOrderList'
import { useLoading } from 'src/hooks/useLoading'
import { useModal } from 'src/hooks/useModal'
import type { LeadFilter, LeadListParams, ListParams, OrderParams, Paginable } from 'src/types/shared'
import type { Lead, LeadView, LeadViewParams } from 'src/types/leads'
import type { LeadField } from 'src/types/leadFields'
import { bulkDeleteLead, createView, getFilteredLeads, getLeads, updateView, exportLeads } from '../leadService'
import { getLeadFields } from 'src/features/leadFields/leadFieldServices'
import { showCommonErrorToast, showToast } from 'src/utils/feedback'
import { useLeadNavigation } from '../stores/LeadNavigationContext'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { Typography, Stack, ButtonGroup } from '@mui/material'

const DEFAULT_N_OF_FIELDS = 6

export const LeadListPage = () => {

    const [params, setParams] = useSearchParams()
    const { modalProps } = useModal()

    const navigate = useNavigate()

    const [leads, setLeads] = useState<Paginable<Lead> | null>(null)

    const [fetchParams, setFetchParams] = useState<LeadListParams>({ only_active: true, page_size: 15 })

    const [orderParams, setOrderParams] = useState<OrderParams>({})

    const [filters, setFilters] = useState<LeadFilter[]>([])

    const headerParams = useMemo(() => ({ ...fetchParams, ...orderParams }), [fetchParams, orderParams])

    //Si tiene filtros, debe usar otro endpoint.
    const fetchLeads = useCallback((page: number, filters: LeadFilter[], headers: LeadListParams, campaignId: string | number) => {
        if (filters.length > 0) {
            return getFilteredLeads({ filters: filters }, { campaign_id: campaignId, page, ...headers })
                .then(setLeads)
                .catch(e => {
                    showCommonErrorToast(e)
                    throw e
                })
        } else {
            return getLeads({ campaign_id: campaignId, page, ...headers })
                .then(setLeads)
                .catch(e => {
                    showCommonErrorToast(e)
                    throw e
                })
        }
    }, [])

    const areThereLeads = useMemo(() => leads?.items ? leads.items.length > 0 : false, [leads])

    const { loading, fnWithLoading: fetchLeadLoad } = useLoading(fetchLeads)


    //----------------------------setListContext----------------------------
    const { setListContext } = useLeadNavigation();

    // Efecto para sincronizar con el LeadNavigationContext
    useEffect(() => {
        // Verificamos leads y leads.items porque leads es un objeto Paginable
        if (leads && leads.items && leads.items.length > 0) {
            // Mapeamos los IDs desde la propiedad "items"
            const ids = leads.items.map(lead => lead.id);

            // Construimos los parámetros actuales incluyendo la página en la que estamos
            const currentParams = { ...headerParams, page: leads.page, campaign_id: Number(campaignId) };

            // Enviamos: (IDs, Parámetros, Filtros, Total de Páginas)
            setListContext(ids, currentParams, filters, leads.total_pages);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leads, headerParams, filters, setListContext]); // Usamos las dependencias reales de tu componente

    //-------------------Selección de Campaña--------------------------

    const [workspaceId, setWorkspaceId] = useState<string | number | null>(params?.get("workspace") ?? null)
    const [campaignId, setCampaignId] = useState<string | number | null>(params?.get("campaign") ?? null)

    //Guarda los cambios de campaign y workspace a searchParams
    useEffect(() => {
        setParams(prev => {
            if (prev.get("workspace_id") === workspaceId && prev.get("campaign_id") === campaignId) return prev
            const next = new URLSearchParams(prev)
            if (workspaceId) next.set("workspace", `${workspaceId}`)
            else next.delete("workspace_id")
            if (campaignId) next.set("campaign", `${campaignId}`)
            else next.delete("campaign_id")
            return next
        }, { replace: true })
    }, [campaignId, workspaceId, setParams])

    const handleWorkspaceChange = useCallback((id: number | string | null) => {
        setWorkspaceId(id)
    }, [])
    const handleCampaignChange = useCallback((id: number | string | null) => {
        setCampaignId(id)
    }, [])

    const campaignSelectorProps = useMemo(() => ({
        workspaceId, campaignId, handleWorkspaceChange, handleCampaignChange
    }), [workspaceId, campaignId, handleWorkspaceChange, handleCampaignChange])

    //--------------------------------Paginación------------------------------

    const { fetchPage, pageComponentProps } = useListPagination(leads)

    useEffect(() => {
        if (!campaignId) return
        fetchLeadLoad(fetchPage, filters, headerParams, campaignId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campaignId, fetchPage, fetchLeadLoad])

    //-------------------------------Ordenamiento-------------------------------

    const orderListFn = useCallback((orderBy: number | string | null, ascending: boolean) => {
        if (!campaignId) return null
        setOrderParams({ order_by: orderBy, ascending })
        fetchLeadLoad(leads?.page ?? 1, filters, { ...fetchParams, order_by: orderBy, ascending }, campaignId)
    }, [campaignId, filters, fetchParams, leads?.page, fetchLeadLoad])

    const { orderProps, setOrderList } = useOrderList(orderListFn)

    //----------------------------------Filtros----------------------------------

    //Al aplicar filtros vuelve a la primera página
    const setFiltersAndHeaders = useCallback(async (filters: LeadFilter[], newParams: LeadListParams) => {
        if (!campaignId) return null
        return fetchLeadLoad(1, filters, { ...newParams, ...orderParams }, campaignId).then(() => {
            setFetchParams(newParams)
            setFilters(filters)
        })
    }, [campaignId, fetchLeadLoad, orderParams])
    //Reinicia los filtros al cambiar de campaña
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setFiltersAndHeaders([], fetchParams) }, [campaignId])

    //-----------------------------Orden de Columnas-----------------------------

    const [leadFields, setLeadFields] = useState<LeadField[]>([])

    useEffect(() => {
        if (!campaignId) return
        getLeadFields({ detailed: false, campaign_id: Number(campaignId), only_active: true, page_size: 0 })
            .then(leadFields => setLeadFields(leadFields.items))
    }, [campaignId])

    const [selectedFieldIds, setSelectedFieldIds] = useState<number[]>([])

    //Trae el arreglo de ids, con el orden definido de leads en localStorage. Si no, trae los primeros N elementos
    useEffect(() => {
        if (!leadFields || leadFields.length === 0 || !campaignId) return
        const localSelectedFields = JSON.parse(window.localStorage.getItem("sel_lead_fields") ?? "{}")?.[campaignId]
        if (localSelectedFields) {
            setSelectedFieldIds(localSelectedFields)
        } else {
            setSelectedFieldIds(leadFields.slice(0, DEFAULT_N_OF_FIELDS).map(fields => fields.id))
        }
    }, [leadFields, campaignId])

    const handleSelectedFieldIds = useCallback((ids: number[], closeModal: boolean = false) => {
        setSelectedFieldIds(ids)
        if (closeModal) modalProps.handleClose()
    }, [modalProps])

    //Ante cambios a selectedFieldIds los actualiza en localStorage
    useEffect(() => {
        if (selectedFieldIds.length === 0 || !campaignId) return
        const totalSelectedFields = window.localStorage.getItem("sel_lead_fields")
        let newTotalSelectedFields: Record<number, number[]> = {}
        if (totalSelectedFields) {
            newTotalSelectedFields = { ...JSON.parse(totalSelectedFields) }
        }
        newTotalSelectedFields[Number(campaignId)] = selectedFieldIds
        window.localStorage.setItem("sel_lead_fields", JSON.stringify(newTotalSelectedFields))
    }, [selectedFieldIds, campaignId])

    //--------------------------------Presentación--------------------------------

    const [presentationMode, setPresentationMode] = useState<string>("TABLE")


    const handlePresentation = useCallback((mode: string) => {
        setPresentationMode(mode)
    }, [])

    const presentationProps = useMemo(() => ({
        presentationMode, handlePresentation
    }), [presentationMode, handlePresentation])

    //------------------------------------LeadView------------------------------------
    //Necesarios acá para interactuar con los estados y hacer fetch de Leads
    const updateViewName = (name: string, existingView?: LeadView) => {
        if (!existingView?.campaign_id) return
        const newView = {
            ...existingView,
            name: name
        }
        return updateView(newView, existingView.id)
    }

    const saveView = useCallback(async (name: string, visibility: string, existingView?: LeadView) => {
        if (!campaignId) return
        if (existingView) return updateViewName(name, existingView)
        const newView = {
            name: name,
            visibility: visibility,
            campaign_id: Number(campaignId),
            filters: { "filters": filters },
            sort_config: { "order_by": orderProps.orderBy, "ascending": orderProps.ascending },
            ui_config: { "selected_ids": selectedFieldIds, "fetch_params": fetchParams },
            view_type: presentationMode,
        }
        return createView(newView)
    }, [campaignId, fetchParams, filters, orderProps, presentationMode, selectedFieldIds])

    const currentView = useMemo(() => {
        if (!campaignId) return
        return {
            filters: { "filters": filters },
            sort_config: { "order_by": orderProps.orderBy, "ascending": orderProps.ascending },
            ui_config: { "selected_ids": selectedFieldIds, "fetch_params": fetchParams },
            view_type: presentationMode,
        } as LeadViewParams
    }, [campaignId, fetchParams, filters, orderProps, presentationMode, selectedFieldIds])

    const loadView = useCallback((view: LeadView) => {
        if (!campaignId || Number(campaignId) !== view.campaign_id) return
        let newFilters: LeadFilter[] = []
        if (view?.filters?.filters) {
            newFilters = view.filters.filters
            setFilters(newFilters)
        }
        let newFetchParams: ListParams = {}
        if (view?.ui_config?.fetch_params) {
            newFetchParams = view.ui_config.fetch_params
            setFetchParams(newFetchParams)
        }
        let newOrderParams: OrderParams = {}
        if (view?.sort_config?.order_by && view?.sort_config?.ascending !== undefined) {
            newOrderParams = { order_by: view.sort_config.order_by, ascending: view.sort_config.ascending }
            setOrderParams(newOrderParams)
            setOrderList(view.sort_config.order_by, view.sort_config.ascending)
        }
        if (view?.ui_config?.selected_ids) {
            setSelectedFieldIds(view.ui_config.selected_ids)
        }
        if (view?.view_type) {
            setPresentationMode(view?.view_type)
        }
        fetchLeadLoad(fetchPage, newFilters, { ...newFetchParams, ...newOrderParams }, campaignId)
    }, [campaignId, fetchLeadLoad, fetchPage, setOrderList])

    const viewUpdateProps = useMemo(() => ({ saveView, loadView, currentView }), [saveView, loadView, currentView])

    //-------------------------------Leads Seleccionados-------------------------------

    const selectCheckboxProps = useSelectCheckbox<Lead>()

    const bulkDelete = useCallback(async () => {
        if (!campaignId) return
        return bulkDeleteLead({ ids: Array.from(selectCheckboxProps.checkedItems.keys()) })
            .then(res => {
                fetchLeadLoad(fetchPage, filters, headerParams, campaignId)
                selectCheckboxProps.removeAllItems()
                const delLength = res.deleted.length
                const failLength = res.failed.length
                showToast(`
                    ${delLength > 0 ? `Se han eliminado ${delLength} lead${delLength > 1 ? "s" : ""}\n` : ""}
                    ${failLength > 0 ? `No se ha podido eliminar ${failLength} lead${failLength > 1 ? "s" : ""}` : ""}
                    `)
            })
            .catch(e => showCommonErrorToast(e))
    }, [selectCheckboxProps, campaignId, fetchLeadLoad, fetchPage, filters, headerParams])

    const [bulkDeleteOpen, setBulkDeleteOpen] = useState<boolean>(false)


    //Exportar Leads
    const handleExport = useCallback(async () => {
        if (!campaignId) return;
        try {
            await exportLeads(Number(campaignId));
        } catch (error) {
            console.error("Error al exportar los leads", error);
        }
    }, [campaignId]);

    const { fnWithLoading: exportLoad, loading: exporting } = useLoading(handleExport)

    //Importar Leads
    const handleImport = useCallback(() => {
        if (!campaignId) return;
        navigate(`/leads/import?campaign=${campaignId}`);
    }, [campaignId, navigate]);

    return (
        <GenericContainer containerSize="xl">
            <Stack spacing={3} sx={{ minWidth: 0 }}>
                <Stack useFlexGap direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }} spacing={2}>
                    <Typography variant="h1">Lista de Leads</Typography>
                    <ButtonGroup>
                        <CommonButton
                            actionType='IMPORT'
                            variant="outlined"
                            color="secondary"
                            onClick={handleImport}
                            onlyTooltip
                        >Importar Leads</CommonButton>
                        {areThereLeads &&
                            <CommonButton
                                actionType='DOWNLOAD'
                                loading={exporting}
                                variant="outlined"
                                color="secondary"
                                onClick={exportLoad}
                                onlyTooltip
                            >Exportar Leads</CommonButton>
                        }
                        {areThereLeads &&
                            <CommonButton actionType='CREATE' variant="contained" color="primary"
                                component={RouterLink} to={`/leads/new?workspace=${workspaceId}&campaign=${campaignId}`} onlyTooltip>
                                Agregar
                            </CommonButton>
                        }
                    </ButtonGroup>
                </Stack>
                <Stack spacing={2} sx={{ minWidth: 0 }}>
                    <LeadListOptions areThereLeads={areThereLeads} campaignId={campaignId} modalProps={modalProps} campaignSelectorProps={campaignSelectorProps} presentationProps={presentationProps}
                        filters={filters} headers={{ ...fetchParams, ...orderParams }} setFiltersAndHeaders={setFiltersAndHeaders} viewUpdateProps={viewUpdateProps} selectCheckboxProps={selectCheckboxProps}
                        bulkDelete={async () => setBulkDeleteOpen(true)} />
                    <LoadingScreenWrapper loading={loading}>
                        {(leads && campaignId !== null && workspaceId !== null) ?
                            <>
                                <LeadListContent leads={leads.items} leadFields={leadFields} selectedFieldIds={selectedFieldIds} modalProps={modalProps} presentationMode={presentationMode}
                                    activeFilters={filters.length} orderProps={orderProps} handleSelectedFieldIds={handleSelectedFieldIds} selectCheckboxProps={selectCheckboxProps}
                                    campaignId={campaignId} workspaceId={Number(workspaceId)} filters={filters} />
                                {presentationMode === "TABLE" && <PaginationComponent {...pageComponentProps} />}

                            </>
                            :
                            <Stack spacing={3} sx={{ alignItems: "center", py: 6 }}>
                                <Typography variant="h3">No hay leads para presentar</Typography>
                                <Typography variant="h4">Revisa que haya una campaña seleccionada</Typography>
                            </Stack>
                        }
                    </LoadingScreenWrapper>
                </Stack >
                <DisableBulkConfirmDialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} idModal="bulk-del-leads"
                    onlyDelete entityTypeName="los leads seleccionados" onConfirm={bulkDelete} isDisabling />
                <GenericModal idModal="columns_selector" {...modalProps} buttonText="Modificar Columnas" maxWidth="md" fullWidth showButton={false}>
                    <LeadColumnSelector originalList={leadFields} selectedFieldIds={selectedFieldIds!} handleSelectedFieldIds={handleSelectedFieldIds} handleClose={modalProps.handleClose} showField="name" />
                </GenericModal>
            </Stack >
        </GenericContainer >
    )
}