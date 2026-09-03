import { useEffect, useState, useMemo } from 'react'
import {
    Stack, Typography, Box, Collapse, TextField, IconButton, Paper, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'

// Hooks y utilidades
import { useForm, useWatch } from 'react-hook-form'
import { useListPagination } from 'src/hooks/useListPagination'
import PaginationComponent from 'shared/ui/lists/PaginationComponent'

// Servicios y Tipos
import { useDictionaryContext } from 'src/stores/DictionaryContext'
import type { SystemAuditLog } from 'src/types/systemAudit'
import type { Paginable } from 'src/types/shared'
import { formatUserFullName } from 'src/utils/formatters'

// Componente que pasaste
import { ControlledAutocomplete } from 'src/components/ui/forms/CustomMultipleInputs' // <-- Ajusta este path a donde lo tengas
import { getSystemAudit } from './SystemAuditServices'

// --- Interfaces para los Filtros ---
interface AuditFilters {
    entity_type: string | null;
    action: string | null;
    creator_search: string;
    start_date: string;
    end_date: string;
}

interface SelectOption {
    id: string;
    label: string;
}

// --- Componente de Fila ---
const AuditTableRow = ({
    log,
    mappings
}: {
    log: SystemAuditLog,
    mappings: { entities: Record<string, string>, actions: Record<string, string> }
}) => {
    const [open, setOpen] = useState(false)
    const hasChanges = log.changes && Object.keys(log.changes).length > 0;

    // Traducir los nombres técnicos usando el mapping del back
    const entityDisplay = mappings?.entities[log.entity_type] || log.entity_type;
    const actionDisplay = mappings?.actions[log.action] || log.action;

    return (
        <>
            <TableRow
                onClick={() => hasChanges && setOpen(!open)} // <-- Clic en toda la fila
                sx={{
                    '& > *': { borderBottom: 'unset' },
                    cursor: hasChanges ? 'pointer' : 'default', // Cambia el cursor si hay cambios
                    '&:hover': {
                        backgroundColor: hasChanges ? 'action.hover' : 'inherit' // Da un feedback visual al pasar el mouse
                    }
                }}
            >
                <TableCell>{log.id}</TableCell>
                <TableCell>{entityDisplay}</TableCell>
                <TableCell>{log.entity_id}</TableCell>
                <TableCell><b>{actionDisplay}</b></TableCell>
                <TableCell>
                    <Tooltip title={log.creator?.email ?? ""} disableHoverListener={!log.creator?.email}>
                        <span>{formatUserFullName(log.creator) ?? 'Sistema'}</span>
                    </Tooltip>
                </TableCell>
                <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell align="right">
                    {hasChanges && (
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation(); // <-- Evita que el clic en el botón active también el clic de la fila
                                setOpen(!open);
                            }}
                        >
                            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                    )}
                </TableCell>
            </TableRow>
            {hasChanges && (
                <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                                <Typography variant="subtitle2" gutterBottom color="primary">Detalle de Cambios:</Typography>
                                <Paper variant="outlined" sx={{ p: 2, backgroundColor: "#1e1e1e", color: "#a6e22e", overflowX: "auto" }}>
                                    <pre style={{ margin: 0, fontSize: "0.85rem" }}>
                                        {JSON.stringify(log.changes, null, 2)}
                                    </pre>
                                </Paper>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    )
}

// --- Componente Principal ---
export const SystemAuditList = () => {
    const [logs, setLogs] = useState<Paginable<SystemAuditLog> | null>(null)
    const { dictionaries } = useDictionaryContext()
    const defs = useMemo(() => ({
        entities: dictionaries.entities ?? {},
        actions: dictionaries.system_audit_log_actions ?? {},
    }), [dictionaries.entities, dictionaries.system_audit_log_actions])
    const { fetchPage, pageSize, refresh, pageComponentProps } = useListPagination(logs)

    // 1. Inicializamos React Hook Form para los filtros
    const { control, register } = useForm<AuditFilters>({
        defaultValues: {
            entity_type: null,
            action: null,
            creator_search: '',
            start_date: '',
            end_date: ''
        }
    })

    // 2. Observamos todos los cambios del formulario
    const formValues = useWatch({ control }) as AuditFilters
    const [debouncedFilters, setDebouncedFilters] = useState<AuditFilters>(formValues)

    // Transformamos los diccionarios en arreglos para el ControlledAutocomplete
    const entityOptions: SelectOption[] = useMemo(() => {
        if (!defs?.entities) return [];
        return Object.entries(defs.entities).map(([key, label]) => ({ id: key, label: label as string }));
    }, [defs]);

    const actionOptions: SelectOption[] = useMemo(() => {
        if (!defs?.actions) return [];
        return Object.entries(defs.actions).map(([key, label]) => ({ id: key, label: label as string }));
    }, [defs]);

    // Debounce: Escucha los cambios de useForm y espera 500ms
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedFilters(formValues), 500)
        return () => clearTimeout(timer)
    }, [formValues])

    // Petición a la API
    useEffect(() => {
        const params: Record<string, string | number | boolean> = {
            page: fetchPage,
            page_size: pageSize,
            order_by: "created_at",
            ascending: false
        }

        if (debouncedFilters.entity_type) params.entity_type = debouncedFilters.entity_type;
        if (debouncedFilters.action) params.action = debouncedFilters.action;
        if (debouncedFilters.creator_search) params.creator_search = debouncedFilters.creator_search;
        if (debouncedFilters.start_date) params.start_date = debouncedFilters.start_date;
        if (debouncedFilters.end_date) params.end_date = debouncedFilters.end_date;

        getSystemAudit(params).then(setLogs)
    }, [fetchPage, pageSize, refresh, debouncedFilters])

    return (
        <Stack spacing={3} sx={{ p: 3 }}>
            <Typography variant="h1">Auditoría General del Sistema</Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell>ID</TableCell>
                            <TableCell>Entidad</TableCell>
                            <TableCell>ID Entidad</TableCell>
                            <TableCell>Acción</TableCell>
                            <TableCell>Usuario</TableCell>
                            <TableCell>Fecha</TableCell>
                            <TableCell align="right"></TableCell>
                        </TableRow>

                        {/* Fila de Filtros */}
                        <TableRow>
                            <TableCell />
                            <TableCell sx={{ minWidth: "15rem" }}>
                                <ControlledAutocomplete
                                    control={control}
                                    name="entity_type"
                                    options={entityOptions}
                                    getOptionLabel={option => option.label}
                                    getOptionKey={option => option.id}
                                    returnField="id"
                                    placeholder="Todas"
                                    size="small"
                                    disableClearable={false} // Para poder limpiar el filtro
                                />
                            </TableCell>
                            <TableCell />
                            <TableCell sx={{ minWidth: "15rem" }}>
                                <ControlledAutocomplete
                                    control={control}
                                    name="action"
                                    options={actionOptions}
                                    getOptionLabel={option => option.label}
                                    getOptionKey={option => option.id}
                                    returnField="id"
                                    placeholder="Todas"
                                    size="small"
                                    disableClearable={false}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    {...register("creator_search")}
                                    placeholder="Nombre, apellido o email"
                                    size="small"
                                    variant="standard"
                                />
                            </TableCell>
                            <TableCell>
                                <Stack direction="row" spacing={1}>
                                    <TextField {...register("start_date")} type="date" size="small" variant="standard" slotProps={{ inputLabel: { shrink: true } }} />
                                    <TextField {...register("end_date")} type="date" size="small" variant="standard" slotProps={{ inputLabel: { shrink: true } }} />
                                </Stack>
                            </TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {logs?.items && logs.items.length > 0 ? (
                            logs.items.map((log) => (
                                <AuditTableRow key={log.id} log={log} mappings={defs} />
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                    <Typography color="text.secondary">No se encontraron resultados...</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <PaginationComponent {...pageComponentProps} />
        </Stack>
    )
}
