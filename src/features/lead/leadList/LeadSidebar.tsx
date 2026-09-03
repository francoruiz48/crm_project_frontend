import { cloneElement, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LeadFilters } from '../leadListOptions/LeadFilters'
import { ViewForm } from '../leadListOptions/LeadViewMenu'
import PaginationComponent from 'shared/ui/lists/PaginationComponent'
import { useListPagination } from 'src/hooks/useListPagination'
import { deleteView, getLeadViews } from '../leadService'
import { useDictionaryContext } from 'src/stores/DictionaryContext'
import { showToast } from 'src/utils/feedback'
import type { LeadView, LeadViewParams } from 'src/types/leads'
import type { LeadFilter, LeadListParams, Paginable, DictionaryItem } from 'src/types/shared'
import {
    alpha, Box, Button, Collapse, IconButton,
    List, ListItem, ListItemButton, ListItemText, Stack,
    ToggleButton, ToggleButtonGroup, Toolbar, Tooltip, Typography, useTheme
} from '@mui/material'
import FilterAltIcon from '@mui/icons-material/FilterAlt'
import TableChartIcon from '@mui/icons-material/TableChart'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import ViewListIcon from '@mui/icons-material/ViewList'
import StyleIcon from '@mui/icons-material/Style'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PublicIcon from '@mui/icons-material/Public'
import PeopleIcon from '@mui/icons-material/People'
import LockIcon from '@mui/icons-material/Lock'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import SortIcon from '@mui/icons-material/Sort'
import ACTION_ICONS from 'src/components/ui/icons/ActionIcons'

interface LeadSidebarProps {
    campaignId: number | string | null
    filters: LeadFilter[]
    headers: LeadListParams
    setFiltersAndHeaders: (filters: LeadFilter[], headers: LeadListParams) => Promise<unknown>
    presentationProps: {
        presentationMode: string
        handlePresentation: (mode: string) => void
    }
    viewUpdateProps: {
        saveView: (name: string, visibility: string, existingView?: LeadView) => Promise<unknown>
        loadView: (view: LeadView) => void
        currentView: LeadViewParams | undefined
    }
    // Se necesita acá para poder abrir, desde "Opciones de Vista", los mismos modales
    // (columns_selector / card_fields_selector) que se renderizan en LeadListPage -- controlados
    // de forma centralizada vía useModal(), no hay estado propio del sidebar para esto.
    modalProps: {
        openModalId?: string
        handleOpen: (idModal: string) => void
        handleClose: () => void
    }
    onToggle: () => void
    formResetKey?: number
}

// ── Grupos de visibilidad ─────────────────────────────────────────────────
const VISIBILITY_GROUPS = [
    { code: 'PUBLIC', label: 'Públicas', icon: PublicIcon, color: '#16a34a' },  // green
    { code: 'TEAM', label: 'Equipo', icon: PeopleIcon, color: '#2563eb' },  // blue
    { code: 'PRIVATE', label: 'Privadas', icon: LockIcon, color: '#d97706' },  // amber
] as const

// ── Componente ViewGroup ──────────────────────────────────────────────────
interface ViewGroupProps {
    group: typeof VISIBILITY_GROUPS[number]
    views: LeadView[]
    onLoad: (view: LeadView) => void
    onEdit: (view: LeadView) => void
    onDelete: (viewId: string) => void
    visibilities: DictionaryItem[]
}

const ViewGroup = memo(({ group, views, onLoad, onEdit, onDelete }: ViewGroupProps) => {
    const [open, setOpen] = useState(false)
    const { palette } = useTheme()
    const Icon = group.icon

    return (
        <Box>
            <Button
                variant="text"
                size="small"
                fullWidth
                onClick={() => setOpen(prev => !prev)}
                sx={{
                    justifyContent: 'flex-start',
                    gap: 1,
                    px: 1.5,
                    py: 0.5,
                    color: 'text.secondary',
                    '&:hover': { bgcolor: alpha(palette.action.hover, 0.6) },
                }}
                startIcon={
                    open
                        ? <ExpandMoreIcon sx={{ fontSize: '14px !important', color: 'text.disabled' }} />
                        : <ChevronRightIcon sx={{ fontSize: '14px !important', color: 'text.disabled' }} />
                }
            >
                <Icon sx={{ fontSize: 13, color: group.color }} />
                <Typography variant="caption" sx={{ fontWeight: 500, flexGrow: 1, textAlign: 'left' }}>
                    {group.label}
                </Typography>
                <Typography variant="caption" color="text.disabled"
                    sx={{ ml: 'auto', bgcolor: 'action.hover', borderRadius: 1, px: 0.75, py: 0.1 }}>
                    {views.length}
                </Typography>
            </Button>

            <Collapse in={open}>
                <List dense disablePadding sx={{ pl: 2.5 }}>
                    {views.map(view => (
                        <ListItem
                            key={view.id}
                            disablePadding
                            secondaryAction={
                                <Stack direction="row">
                                    <IconButton size="small" title="Renombrar"
                                        onClick={() => onEdit(view)}
                                        sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
                                        <EditIcon sx={{ fontSize: 13 }} />
                                    </IconButton>
                                    <IconButton size="small" title="Eliminar"
                                        onClick={() => onDelete(view.id)}
                                        sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                                        <DeleteIcon sx={{ fontSize: 13 }} />
                                    </IconButton>
                                </Stack>
                            }
                        >
                            <ListItemButton
                                onClick={() => onLoad(view)}
                                sx={{ py: 0.5, pr: 7, borderRadius: 1, '&:hover': { bgcolor: alpha(palette.primary.main, 0.06) } }}
                            >
                                <ListItemText
                                    sx={{ my: 0 }}
                                    primary={
                                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                            {view.view_type === 'TABLE' && <TableChartIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
                                            {view.view_type === 'BOARD' && <ViewColumnIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
                                            {view.filters?.filters?.length > 0 && <FilterAltIcon sx={{ fontSize: 12, color: '#16a34a' }} />}
                                            {view.sort_config?.order_by && <SortIcon sx={{ fontSize: 12, color: '#2563eb' }} />}
                                            <Typography variant="caption" noWrap>{view.name}</Typography>
                                        </Stack>
                                    }
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Collapse>
        </Box>
    )
})

// ── Sidebar principal ─────────────────────────────────────────────────────
export const LeadSidebar = memo(({
    campaignId, filters, headers, setFiltersAndHeaders,
    presentationProps, viewUpdateProps, modalProps, onToggle, formResetKey
}: LeadSidebarProps) => {

    const { palette } = useTheme()

    // ── Views state ──
    const [currentViews, setCurrentViews] = useState<Paginable<LeadView> | null>(null)
    const { dictionaries } = useDictionaryContext()
    const visibilities = useMemo(() => dictionaries.lead_view_visibilities ?? [], [dictionaries.lead_view_visibilities])
    const { fetchPage, pageComponentProps, pageSize } = useListPagination(currentViews, 50)

    const fetchLeadViews = useCallback((page: number) => {
        if (!campaignId) return Promise.resolve()
        // campaignId antes se forzaba a Number(); eso mandaba NaN como filtro y la lista de
        // "Vistas Guardadas" del sidebar nunca cargaba nada.
        return getLeadViews({ only_active: true, page_size: pageSize, page, campaign_id: String(campaignId) })
            .then(setCurrentViews)
    }, [campaignId, pageSize])

    useEffect(() => { fetchLeadViews(fetchPage) }, [fetchPage, fetchLeadViews])

    const handleDeleteView = useCallback((viewId: string) => {
        deleteView(viewId).then(() => fetchLeadViews(fetchPage))
    }, [fetchLeadViews, fetchPage])

    // ── ViewForm popover ──
    const [editView, setEditView] = useState<LeadView | undefined>(undefined)
    const [viewFormAnchor, setViewFormAnchor] = useState<null | HTMLElement>(null)
    const saveViewRef = useRef<HTMLDivElement>(null)

    const handleEditView = useCallback((view: LeadView) => {
        setEditView(view)
        setViewFormAnchor(saveViewRef.current)
    }, [])

    const handleCloseForm = useCallback(() => {
        setEditView(undefined)
        setViewFormAnchor(null)
    }, [])

    const handleSaveView = useCallback((name: string, visibility: string, existingView?: LeadView) => {
        return viewUpdateProps.saveView(name, visibility, existingView)
            ?.then(() => {
                fetchLeadViews(fetchPage)
                showToast('Se ha guardado la vista actual.')
            })
    }, [viewUpdateProps, fetchLeadViews, fetchPage])

    // ── Filters apply ──
    const applyFilters = useCallback(async (data: { headers: LeadListParams; filters: LeadFilter[] }) => {
        return setFiltersAndHeaders(data.filters, { ...headers, ...data.headers })
    }, [setFiltersAndHeaders, headers])

    // Group views by visibility
    const viewsByGroup = VISIBILITY_GROUPS.map(group => ({
        group,
        views: currentViews?.items?.filter(v => v.visibility === group.code) ?? []
    })).filter(({ views }) => views.length > 0)

    const hasAnyViews = (currentViews?.items?.length ?? 0) > 0

    return (
        <Stack sx={{ height: '100%', overflow: 'hidden', bgcolor: 'background.paper' }}>

            {/* ── Header ── */}
            <Toolbar sx={{ borderBottom: `1px solid ${palette.divider}` }} >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    {cloneElement(ACTION_ICONS.FILTER, { sx: { color: "text.secondary" } })}
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1 }}>
                        Filtros y Vistas
                    </Typography>

                </Stack>
            </Toolbar>

            {/* ── Tipo de Vista ── */}
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${palette.divider}`, flexShrink: 0 }}>
                <Typography variant="caption"
                    sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary', display: 'block', mb: 1 }}>
                    Tipo de Vista
                </Typography>
                <ToggleButtonGroup
                    size="small"
                    value={presentationProps.presentationMode}
                    exclusive
                    onChange={(_, v) => { if (v) presentationProps.handlePresentation(v) }}
                    sx={{ width: '100%', '& .MuiToggleButton-root': { flex: 1, py: 0.5 } }}
                >
                    <Tooltip title="Tabla">
                        <ToggleButton value="TABLE">
                            <TableChartIcon sx={{ fontSize: 16, mr: 0.75 }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Tabla</Typography>
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Tablero">
                        <ToggleButton value="BOARD">
                            <ViewColumnIcon sx={{ fontSize: 16, mr: 0.75 }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Tablero</Typography>
                        </ToggleButton>
                    </Tooltip>
                </ToggleButtonGroup>
            </Box>

            {/* ── Opciones de Vista ──
                Tabla: selector de columnas (siempre existió, reubicado acá desde el toolbar
                superior). Tablero: selector de elementos de la tarjeta (nuevo). Un solo botón,
                condicional al modo -- no tiene sentido mostrar los dos a la vez. */}
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${palette.divider}`, flexShrink: 0 }}>
                <Typography variant="caption"
                    sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.disabled', display: 'block', mb: 1 }}>
                    Opciones de Vista
                </Typography>
                {presentationProps.presentationMode === 'TABLE' ? (
                    <Button variant="outlined" size="small" fullWidth
                        startIcon={<ViewListIcon sx={{ fontSize: 16 }} />}
                        onClick={() => modalProps.handleOpen('columns_selector')}
                        sx={{ justifyContent: 'flex-start', color: 'text.secondary', borderColor: 'divider' }}>
                        Campos a Mostrar
                    </Button>
                ) : (
                    <Button variant="outlined" size="small" fullWidth
                        startIcon={<StyleIcon sx={{ fontSize: 16 }} />}
                        onClick={() => modalProps.handleOpen('card_fields_selector')}
                        sx={{ justifyContent: 'flex-start', color: 'text.secondary', borderColor: 'divider' }}>
                        Elementos de la Tarjeta
                    </Button>
                )}
            </Box>

            {/* ── Área scrollable ── */}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>

                {/* Vistas Guardadas */}
                <Box sx={{ borderBottom: `1px solid ${palette.divider}`, py: 1 }}>
                    <Stack ref={saveViewRef} direction="row"
                        sx={{ justifyContent: 'space-between', alignItems: 'center', px: 2, pb: 0.75 }}>
                        <Typography variant="caption"
                            sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary' }}>
                            Vistas Guardadas
                        </Typography>
                        <Tooltip title="Guardar vista actual">
                            <IconButton size="small" onClick={() => setViewFormAnchor(saveViewRef.current)}
                                sx={{ color: 'text.disabled', '&:hover': { color: 'primary.main' } }}>
                                <SaveIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    {hasAnyViews ? (
                        viewsByGroup.map(({ group, views }) => (
                            <ViewGroup
                                key={group.code}
                                group={group}
                                views={views}
                                onLoad={viewUpdateProps.loadView}
                                onEdit={handleEditView}
                                onDelete={handleDeleteView}
                                visibilities={visibilities}
                            />
                        ))
                    ) : (
                        <Box sx={{ px: 2, py: 1 }}>
                            <Typography variant="caption" color="text.disabled">
                                Sin vistas guardadas
                            </Typography>
                        </Box>
                    )}

                    {pageComponentProps.totalPages > 1 && (
                        <PaginationComponent {...pageComponentProps} />
                    )}

                    <Box sx={{ px: 1.5, pt: 0.5 }}>
                        <Button variant="text" size="small" fullWidth startIcon={<AddIcon sx={{ fontSize: '14px !important' }} />}
                            onClick={() => setViewFormAnchor(saveViewRef.current)}
                            sx={{ justifyContent: 'flex-start', color: 'text.secondary', fontSize: '0.75rem', py: 0.5 }}>
                            Nueva Vista
                        </Button>
                    </Box>
                </Box>

                {/* Filtros — el header lo renderiza LeadFilters (showSectionHeader) */}
                <Box sx={{ px: 1.5, py: 1.5 }}>
                    {campaignId ? (
                        <LeadFilters
                            applyFilters={applyFilters}
                            filters={{ filters, headers }}
                            campaignId={String(campaignId)}
                            onClose={() => { }}
                            showCancelButton={false}
                            showTitle={false}
                            showHeaders={false}
                            showSectionHeader
                            formResetKey={formResetKey}
                        />
                    ) : (
                        <Stack spacing={0.75}>
                            <Typography variant="caption"
                                sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.disabled' }}>
                                Filtros
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                                Seleccioná una campaña para configurar los filtros.
                            </Typography>
                        </Stack>
                    )}
                </Box>
            </Box>

            {/* ViewForm popover — ref en el header de Vistas Guardadas */}
            <ViewForm
                existingView={editView}
                visibilities={visibilities}
                formAnchor={viewFormAnchor}
                handleClose={handleCloseForm}
                handleCreate={handleSaveView}
            />
        </Stack >
    )
})
