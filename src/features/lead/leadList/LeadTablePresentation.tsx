
import { cloneElement, memo, useCallback, useEffect, useMemo, useRef } from "react"
import { LeadListCellValue } from "./LeadListCellValue"
import { DateValue } from "../shared/LeadValueComponents"
import { SelectableTableRow } from "shared/ui/lists/CustomTableRow"
import type { LeadField, LeadFieldValue } from "src/types/leadFields"
import type { Lead } from "src/types/leads"
import { useNavigate } from "react-router-dom"
import { Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme, Checkbox, TableSortLabel, Tooltip, IconButton } from "@mui/material"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import type { Palette } from "@mui/material/styles"
import { getTypeIconAndColor } from "../../leadFields/LeadFieldTypeIcon"
import { formatUserFullName } from "src/utils/formatters"
import ReferenceChip from "shared/ui/details/ReferenceChip"

// Tipos semánticos para los campos nativos (id < 0)
const NATIVE_KEY_TYPES: Record<string, { type: string; subtype?: string }> = {
    contact_state_id: { type: 'SELECTOR', subtype: 'SELECTOR_SIMPLE' },
    current_state_id: { type: 'SELECTOR', subtype: 'SELECTOR_SIMPLE' },
    team_id: { type: 'LEAD' },
    assigned_to_user_id: { type: 'LEAD' },
    created_at: { type: 'DATE' },
    updated_at: { type: 'DATE' },
    created_by: { type: 'LEAD' },
    updated_by: { type: 'LEAD' },
}

const TABLE_SX = {
    // ── Celdas globales ───────────────────────────────────────────────────
    '& .MuiTableCell-root': {
        fontSize: '0.8rem',
        py: '5px',
        px: '10px',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
    },

    // ── Header ────────────────────────────────────────────────────────────
    '& .MuiTableHead .MuiTableRow-root': {
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.045), rgba(0,0,0,0.03))',
    },
    '& .MuiTableCell-head': {
        fontSize: '0.72rem',
        fontWeight: 700,
        py: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'text.secondary',
        borderBottom: '2px solid rgba(0,0,0,0.1)',
        userSelect: 'none',
    },
    '& .MuiTableSortLabel-root': {
        gap: '2px',
    },
    '& .MuiTableSortLabel-icon': {
        fontSize: '0.9rem !important',
        opacity: '0.4 !important',
    },
    '& .MuiTableSortLabel-root.Mui-active .MuiTableSortLabel-icon': {
        opacity: '1 !important',
    },

    // ── Filas del cuerpo ──────────────────────────────────────────────────
    '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even) .MuiTableCell-root': {
        bgcolor: 'rgba(0,0,0,0.018)',
    },
    '& .MuiTableBody-root .MuiTableRow-root:hover .MuiTableCell-root': {
        bgcolor: 'action.selected',
    },
    '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': {
        borderBottom: 'none',
    },

    // ── Checkbox ──────────────────────────────────────────────────────────
    '& .MuiTableCell-paddingCheckbox': {
        px: '4px',
    },
} as const

interface LeadTablePresentationProps {
    leads: Lead[],
    selectedColumns: LeadField[],
    modalProps: {
        openModalId?: string;
        handleOpen: (idModal: string) => void;
        handleClose: () => void;
    },
    orderProps: {
        orderBy: string | number | null;
        ascending: boolean;
        handleOrderList: (field: string | number | null) => void;
    },
    dragProps: {
        dragEvents: (idx: number, dropLast?: boolean) => {
            draggable: boolean;
            onDragEnter: () => void;
            onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
            onDragStart: () => void;
            onDrop: () => void;
        };
        dragStyles: (idx: number, palette: Palette, direction?: "column" | "row") => object;
    },
    selectCheckboxProps: {
        checkedItems: Map<string, Lead>;
        addItem: (item: Lead | Lead[]) => void;
        removeItem: (item: Lead) => void;
        removeAllItems: () => void;
    },
    // Clic simple: abre el sidebar de detalle rápido. Ir al detalle completo ahora es siempre
    // explícito, con el ícono de la última columna (ver más abajo) -- ya no hay doble clic.
    // Si no se pasa (uso fuera de LeadListPage, si lo hubiera), se cae al comportamiento viejo.
    onLeadClick?: (id: string) => void,
}

export const LeadTablePresentation = memo(({ leads, selectedColumns, modalProps, orderProps,
    dragProps: { dragEvents, dragStyles },
    selectCheckboxProps: { checkedItems, addItem, removeItem, removeAllItems },
    onLeadClick }: LeadTablePresentationProps) => {

    const nav = useNavigate()
    const { palette } = useTheme()

    const areAllItemsChecked = useMemo(() => checkedItems.size === leads.length, [checkedItems, leads])
    const onRowClick = useCallback((id: string) => onLeadClick ? onLeadClick(id) : nav(`/leads/${id}`), [nav, onLeadClick])

    // ── Scroll horizontal sincronizado arriba/abajo ───────────────────────────
    const tableContainerRef = useRef<HTMLDivElement>(null)
    const topScrollRef = useRef<HTMLDivElement>(null)
    const spacerRef = useRef<HTMLDivElement>(null)
    const syncing = useRef(false)

    // Mantiene el ancho del spacer igual al scrollWidth del TableContainer
    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return
        const updateWidth = () => {
            if (spacerRef.current) spacerRef.current.style.width = container.scrollWidth + 'px'
        }
        updateWidth()
        const ro = new ResizeObserver(updateWidth)
        ro.observe(container)
        return () => ro.disconnect()
    }, [selectedColumns])

    const onTopScroll = useCallback(() => {
        if (syncing.current || !tableContainerRef.current || !topScrollRef.current) return
        syncing.current = true
        tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft
        syncing.current = false
    }, [])

    const onBottomScroll = useCallback(() => {
        if (syncing.current || !tableContainerRef.current || !topScrollRef.current) return
        syncing.current = true
        topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft
        syncing.current = false
    }, [])

    return (
        <Box>
            {/* Scrollbar superior sincronizado */}
            <Box
                ref={topScrollRef}
                onScroll={onTopScroll}
                sx={{
                    overflowX: 'scroll',
                    overflowY: 'hidden',
                    mb: '4px',
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    boxShadow: 4,
                    // Scrollbar siempre visible, color neutro (anula el acento de Windows)
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(128,128,128,0.5) rgba(0,0,0,0.06)',
                    '&::-webkit-scrollbar': { height: '10px' },
                    '&::-webkit-scrollbar-track': { background: 'rgba(0,0,0,0.06)', borderRadius: '99px' },
                    '&::-webkit-scrollbar-thumb': { background: 'rgba(128,128,128,0.5)', borderRadius: '99px' },
                    '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(128,128,128,0.8)' },
                }}
            >
                <Box ref={spacerRef} sx={{ height: '1px', minWidth: 600 }} />
            </Box>

            <TableContainer ref={tableContainerRef} onScroll={onBottomScroll}
                component={Paper} elevation={4} sx={{
                    overflowX: 'auto',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(128,128,128,0.5) rgba(0,0,0,0.06)',
                    '&::-webkit-scrollbar': { height: '10px' },
                    '&::-webkit-scrollbar-track': { background: 'rgba(0,0,0,0.06)', borderRadius: '99px' },
                    '&::-webkit-scrollbar-thumb': { background: 'rgba(128,128,128,0.5)', borderRadius: '99px' },
                    '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(128,128,128,0.8)' },
                }}>
                <Table size="small" sx={{ ...TABLE_SX, minWidth: 600 }} aria-label="lead table">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    color="primary"
                                    checked={areAllItemsChecked}
                                    onChange={(_, checked) => checked ? addItem(leads) : removeAllItems()}
                                />
                            </TableCell>
                            {/* Columna fija después del checkbox -- ícono para ir al detalle completo,
                                separado del clic de la fila (que ahora solo abre el sidebar). */}
                            <TableCell padding="checkbox" />
                            {/* Columna fija de referencia (ej. "L-0001") -- siempre primera de las
                                columnas de datos, no es parte de las columnas custom seleccionables/reordenables. */}
                            <TableCell align="left" sx={{ fontWeight: 600 }}>Referencia</TableCell>
                            {selectedColumns.map((column, idx) =>
                                <LeadTableHeaderRow key={column.id} column={column} idx={idx} orderProps={orderProps}
                                    dragStyles={dragStyles} dragEvents={dragEvents} palette={palette} />
                            )
                            }
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {leads.map(lead => (
                            <SelectableTableRow onClick={() => onRowClick(lead.id)} key={lead.id} >
                                <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                                    <Checkbox
                                        color="primary"
                                        checked={checkedItems.has(lead.id)}
                                        onChange={(_, checked) => {
                                            if (checked) addItem(lead)
                                            else removeItem(lead)
                                        }}
                                    />
                                </TableCell>
                                <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                                    <Tooltip title="Ver detalle completo">
                                        <IconButton size="small" onClick={() => nav(`/leads/${lead.id}`)}>
                                            <OpenInNewIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                                <TableCell align="left" sx={{ whiteSpace: 'nowrap' }}>
                                    {lead.reference ? <ReferenceChip reference={lead.reference} /> : '—'}
                                </TableCell>
                                <LeadTableBodyRow key={lead.id} lead={lead} modalProps={modalProps} selectedColumns={selectedColumns} />
                            </SelectableTableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    )
})

interface LeadTableHeaderRowProps {
    column: LeadField,
    idx: number,
    orderProps: {
        orderBy: string | number | null;
        ascending: boolean;
        handleOrderList: (field: string | number | null) => void;
    },
    palette: Palette,
    dragStyles: (idx: number, palette: Palette, direction?: "column" | "row") => object,
    dragEvents: (idx: number, dropLast?: boolean) => {
        draggable: boolean;
        onDragEnter: () => void;
        onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
        onDragStart: () => void;
        onDrop: () => void;
    },
}
export const LeadTableHeaderRow = memo(({ column, idx, orderProps, dragStyles, dragEvents, palette }: LeadTableHeaderRowProps) => {
    // Para columnas nativas, ordenar por la clave del modelo (ej: "created_at")
    const orderKey = column.nativeKey ?? column.id
    const handleOrder = useCallback(() => orderProps.handleOrderList(orderKey), [orderProps, orderKey])
    const headerSx = useMemo(() => ({
        fontWeight: 600,
        ...dragStyles(idx, palette, "row")
    }), [dragStyles, idx, palette])

    const typeIcon = useMemo(() => {
        if (Number(column.id) < 0 && column.nativeKey) {
            const t = NATIVE_KEY_TYPES[column.nativeKey]
            return t ? getTypeIconAndColor(t.type, t.subtype ?? null) : null
        }
        return getTypeIconAndColor(column.field_type_code, column.field_subtype_code ?? null)
    }, [column])

    return (
        <TableCell align="left" {...dragEvents(idx, false)} sx={headerSx}
            sortDirection={orderProps.orderBy !== orderKey ? false :
                (orderProps.ascending ? "asc" : "desc")} >
            <TableSortLabel
                active={orderProps.orderBy === orderKey}
                direction={orderProps.orderBy !== orderKey ? "asc" :
                    (orderProps.ascending ? "asc" : "desc")}
                onClick={handleOrder}
            >
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    {column.name}
                    {typeIcon && cloneElement(typeIcon.component, {
                        sx: { fontSize: '0.85rem', color: `${typeIcon.color}.main`, opacity: 0.65, verticalAlign: 'middle' }
                    })}
                </Box>
            </TableSortLabel>
        </TableCell >
    )
})


interface LeadTableBodyRowProps {
    lead: Lead,
    selectedColumns: LeadField[],
    modalProps: {
        openModalId?: string;
        handleOpen: (idModal: string) => void;
        handleClose: () => void;
    }
}
export const LeadTableBodyRow = memo(({ lead, selectedColumns, modalProps }: LeadTableBodyRowProps) => {

    // Evita O(leads*columnas*field_values.find) en cada render:
    // lookup por columna para esta fila.
    //
    // Bug real encontrado 2026-08-01: la clave usada acá era fv.field_id, el id interno crudo
    // del campo (LeadFieldValueResponse.field_id: int -- FK embebida sin migrar). Pero
    // column.id (LeadField.id) es el uuid del campo -- nunca matcheaban, así que TODAS las
    // columnas custom del listado quedaban vacías aunque los leads sí tuvieran valores
    // cargados (se veían bien en el detalle, que indexa por el objeto anidado fv.field.id, no
    // por fv.field_id). Se corrige indexando por fv.field?.id, que sí es el uuid real.
    const fieldValueByFieldId = useMemo(() => {
        const map = new Map<string, LeadFieldValue>()
        for (const fv of lead.field_values) {
            if (fv.field?.id) map.set(`${fv.field.id}`, fv)
        }
        return map
    }, [lead.field_values])

    return (
        selectedColumns.map((column) => {
            // ── Columnas nativas (id negativo) ────────────────────────────
            if (Number(column.id) < 0) {
                return (
                    <TableCell component="td" scope="row" align="left" key={`${lead.id}-${column.id}`}>
                        <NativeCellValue lead={lead} nativeKey={column.nativeKey ?? ''} />
                    </TableCell>
                )
            }
            // ── Columnas custom (EAV) ────────────────────────────────────
            const leadValue = fieldValueByFieldId.get(`${column.id}`)
            return (
                <TableCell component="td" scope="row" align="left" key={`${lead.id}-${column.id}`}>
                    <LeadListCellValue leadId={lead.id} fieldValue={leadValue} {...modalProps}
                        type={column.field_type_code} subtype={column.field_subtype_code} />
                </TableCell>
            )
        })
    )
})

// ── NativeCellValue ───────────────────────────────────────────────────────────
const NativeCellValue = memo(({ lead, nativeKey }: { lead: Lead; nativeKey: string }) => {
    switch (nativeKey) {
        case 'contact_state_id': {
            const s = lead.contact_state
            if (!s) return <>—</>
            return (
                <Chip label={s.name} size="small"
                    sx={{ bgcolor: s.color ?? undefined, color: s.color ? '#fff' : undefined, fontSize: '0.72rem', height: 20 }} />
            )
        }
        case 'current_state_id': {
            const s = lead.current_state
            if (!s) return <>—</>
            return (
                <Chip label={s.name} size="small"
                    sx={{ bgcolor: s.color ?? undefined, color: s.color ? '#fff' : undefined, fontSize: '0.72rem', height: 20 }} />
            )
        }
        case 'team_id':
            return <>{lead.team?.name ?? '—'}</>
        case 'assigned_to_user_id':
            return <>{lead.assigned_to_user?.name ?? lead.assigned_to_user?.email ?? '—'}</>
        case 'created_at':
            return lead.created_at ? <DateValue date={lead.created_at} subtype="DATE" short /> : <>—</>
        case 'updated_at':
            return lead.updated_at ? <DateValue date={lead.updated_at} subtype="DATE" short /> : <>—</>
        case 'created_by': {
            const name = formatUserFullName(lead.creator)
            if (!name) return <>—</>
            return (
                <Tooltip title={lead.creator?.email ?? ""} disableHoverListener={!lead.creator?.email}>
                    <span>{name}</span>
                </Tooltip>
            )
        }
        case 'updated_by': {
            const name = formatUserFullName(lead.updater)
            if (!name) return <>—</>
            return (
                <Tooltip title={lead.updater?.email ?? ""} disableHoverListener={!lead.updater?.email}>
                    <span>{name}</span>
                </Tooltip>
            )
        }
        default:
            return <>—</>
    }
})
