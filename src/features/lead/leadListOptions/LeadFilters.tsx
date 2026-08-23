import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ControlledCheckbox, ControlledNumber } from 'shared/ui/forms/CustomInputs'
import { ControlledAutocomplete } from 'shared/ui/forms/CustomMultipleInputs'
import { FormErrorMessage } from 'shared/ui/forms/FormFeedback'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { useLoading } from 'src/hooks/useLoading'
import type { LeadField } from 'src/types/leadFields'
import type { LeadFilter, LeadListParams } from 'src/types/shared'
import { getLeadFields } from 'src/features/leadFields/leadFieldServices'
import { setFormErrors } from 'src/utils/forms'
import {
    Controller, useFieldArray, useForm, useWatch,
    type Control, type FieldErrors, type Path, type UseFieldArrayRemove, type UseFormRegister
} from 'react-hook-form'
import {
    alpha, Box, CircularProgress, Collapse, Fade, Grid, IconButton,
    Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useTheme
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import CheckIcon from '@mui/icons-material/Check'
import AddIcon from '@mui/icons-material/Add'
import { LeadFormRelatedLead, LeadFormSelector, LeadFormNomenclator } from '../shared/LeadFormMultipleFields'
import { getNomenclatorItems } from 'src/features/nomenclators/nomenclatorService'
import type { NomenclatorItem } from 'src/types/nomenclators'
import { LeadFormBool, LeadFormDate, LeadFormFile, LeadFormNumber, LeadFormText } from '../shared/LeadFormFields'
import { OPERATORS_BY_LEAD_TYPE } from '../leadUtils'
import { NATIVE_LEAD_FIELDS } from '../nativeLeadFields'
import { ControlledFieldSelector } from 'src/components/ui/forms/FieldSelector'
import { getLeadContactStates } from 'src/features/orgProperties/contactState/contactStatesServices'
import { getLeadFlowStates } from 'src/features/leadFlows/leadFlowServices/FlowService'
import { getTeams } from '../teamService'
import { getUsers } from 'src/features/auth/userServices'
import { getCampaign } from 'src/features/campaigns/campaignServices'
import type { LeadContactState } from 'src/types/orgProperties'
import type { LeadState } from 'src/types/leadFlow'
import type { LeadTeam, LeadUser } from 'src/types/leads'
import { formatUserFullName } from 'src/utils/formatters'

// ── FormFilter: extiende LeadFilter con campos UI para rangos ─────────────────
interface FormFilter {
    field_id?: number | string
    operator?: string
    value?: string | number | number[] | boolean   // STRING y tipos restantes; BOOL usa 'true'/'false'
    value_from?: string                 // DATE/DATE_TIME: fecha inicio
    value_to?: string                   // DATE/DATE_TIME: fecha fin
    value_num_from?: number             // NUMBER/INT: valor mínimo
    value_num_to?: number               // NUMBER/INT: valor máximo
    value_ids?: (number | string)[]     // NATIVE_ID y SELECTOR: multi-select -- uuid string desde Fase 3/4
}

interface LeadListFilters {
    filters: FormFilter[],
    headers: LeadListParams
}

// ── Constantes de tipo ────────────────────────────────────────────────────────
const DATE_TYPES = ['DATE', 'DATE_TIME']
const NUMERIC_TYPES = ['NUMBER', 'INT']

// ── Conversión API → FormFilter (para restaurar vista guardada) ───────────────
// Los filtros guardados están en formato LeadFilter (output de API).
// Al cargar una vista, los convertimos al formato interno del formulario.
function apiFiltersToFormFilters(apiFilters: LeadFilter[], leadFields: LeadField[]): FormFilter[] {
    if (!apiFilters?.length) return [{}]

    // Agrupar por field_id para combinar rangos (DATE/NUMBER que vienen en dos filtros separados)
    const byField = new Map<string | number, LeadFilter[]>()
    for (const f of apiFilters) {
        if (f.field_id == null) continue
        if (!byField.has(f.field_id)) byField.set(f.field_id, [])
        byField.get(f.field_id)!.push(f)
    }

    const result: FormFilter[] = []
    for (const [rawFieldId, filters] of byField.entries()) {
        // Campos nativos usan nativeKey (string) como field_id. Los custom, desde Fase 3, usan
        // su public_uuid (también string) como field_id -- el typeof no alcanza para distinguirlos.
        // Bug real encontrado 2026-08-10: al asumir "string == nativo" cualquier filtro sobre un
        // campo custom (uuid) nunca matcheaba contra nativeKey, `field` quedaba undefined y el
        // filtro se descartaba acá (silencioso) -- se aplicaba al fetch (que no pasa por acá) pero
        // no se veía en el panel de filtros del sidebar al cargar una vista guardada. No hay
        // colisión posible entre un uuid y un nativeKey tipo "contact_state_id", así que probamos
        // ambas formas.
        const field = leadFields.find(f => f.nativeKey === rawFieldId || f.id === rawFieldId)
        if (!field) continue

        const typeCode = field.field_type_code

        if (typeCode === 'NATIVE_ID') {
            // Bug real encontrado 2026-08-10: acá se hacía Number(f.value), pero los ids de
            // NATIVE_ID (contact_state_id, current_state_id, team_id, assigned_to_user_id,
            // created_by, updated_by) son public_uuid (string) desde Fase 3/4 -- Number(uuid)
            // da NaN y el Autocomplete no encuentra ninguna opción, mostrando el filtro vacío
            // aunque el field sí matchee. Se deja el valor tal cual viene.
            const ids = filters.flatMap(f =>
                Array.isArray(f.value) ? f.value : (f.value != null ? [f.value] : [])
            ) as (number | string)[]
            result.push({ field_id: field.id, value_ids: ids })

        } else if (DATE_TYPES.includes(typeCode)) {
            const eqVal = filters.find(f => f.operator === 'eq')?.value as string | undefined
            const from = (filters.find(f => f.operator === 'gte')?.value ?? eqVal) as string | undefined
            const to = (filters.find(f => f.operator === 'lte')?.value ?? eqVal) as string | undefined
            result.push({ field_id: field.id, value_from: from, value_to: to })

        } else if (NUMERIC_TYPES.includes(typeCode)) {
            const eqVal = filters.find(f => f.operator === 'eq')?.value
            const from = (filters.find(f => f.operator === 'gte')?.value ?? eqVal)
            const to = (filters.find(f => f.operator === 'lte')?.value ?? eqVal)
            result.push({
                field_id: field.id,
                value_num_from: from != null ? Number(from) : undefined,
                value_num_to: to != null ? Number(to) : undefined,
            })

        } else if (typeCode === 'SELECTOR') {
            // Mismo bug que NATIVE_ID de arriba: NomenclatorItem.id es public_uuid desde Fase 4.
            const ids = filters.flatMap(f =>
                Array.isArray(f.value) ? f.value : (f.value != null ? [f.value] : [])
            ) as (number | string)[]
            result.push({ field_id: field.id, value_ids: ids })

        } else if (typeCode === 'BOOL') {
            const val = filters[0]?.value
            result.push({ field_id: field.id, value: (val === 1 || val === true || val === 'true') ? 'true' : 'false' })

        } else {
            // STRING y otros: cada filtro → fila propia
            for (const f of filters) {
                result.push({ field_id: field.id as number, operator: f.operator, value: f.value as string | number | boolean })
            }
        }
    }

    return result.length > 0 ? result : [{}]
}

const BOOL_OPTIONS = [
    { code: 'true', label: 'Es verdadero' },
    { code: 'false', label: 'Es falso' },
]

// ── SX compacto para inputs del sidebar ──────────────────────────────────────
export const XS_INPUT_SX = {
    '& .MuiInputBase-root': { fontSize: '0.72rem', minHeight: 28 },
    '& .MuiInputBase-input': { py: '3px !important', fontSize: '0.72rem' },
    '& .MuiInputLabel-root': { fontSize: '0.72rem' },
    '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: '0.75rem' },
    '& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': { padding: '1px' },
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface LeadFiltersProps {
    campaignId: string,
    filters: { filters: LeadFilter[], headers: LeadListParams },
    applyFilters: (data: { filters: LeadFilter[], headers: LeadListParams }) => Promise<void>,
    onClose: () => void,
    showCancelButton?: boolean,
    showTitle?: boolean,
    showHeaders?: boolean,
    showSectionHeader?: boolean,
    formResetKey?: number,   // incrementar para forzar reset del formulario (ej: al cargar vista guardada)
}

// ── Componente principal ──────────────────────────────────────────────────────
export const LeadFilters = memo(({
    campaignId, filters, applyFilters, onClose,
    showCancelButton = true, showTitle = true,
    showHeaders = true, showSectionHeader = false,
    formResetKey,
}: LeadFiltersProps) => {

    const { palette } = useTheme()
    const [leadFields, setLeadFields] = useState<LeadField[]>([])

    useEffect(() => {
        getLeadFields({ campaign_id: campaignId, only_active: true, page_size: 0 })
            .then(res => setLeadFields([...NATIVE_LEAD_FIELDS, ...res.items]))
    }, [campaignId])

    // Opciones para filtros nativos (se cargan una vez)
    const [contactStates, setContactStates] = useState<LeadContactState[]>([])
    const [leadStates, setLeadStates] = useState<LeadState[]>([])
    const [teams, setTeams] = useState<LeadTeam[]>([])
    const [users, setUsers] = useState<LeadUser[]>([])

    useEffect(() => {
        getLeadContactStates({ page_size: 0 }).then(r => setContactStates(r.items))
        getTeams({ page_size: 0 }).then(r => setTeams(r.items))
        getUsers().then(r => setUsers(r.items))
    }, [])

    useEffect(() => {
        if (!campaignId) return
        getCampaign(campaignId).then(campaign => {
            if (campaign.lead_flow_id) {
                getLeadFlowStates({ lead_flow_id: campaign.lead_flow_id, page_size: 0 })
                    .then(r => setLeadStates(r.items))
            }
        })
    }, [campaignId])

    const defaultValues = useMemo<LeadListFilters>(() => ({
        headers: {
            only_active: filters?.headers?.only_active,
            page_size: filters?.headers?.page_size,
        },
        filters: filters?.filters ?? []
    }), [filters])

    const { control, register, handleSubmit, formState: { errors }, setError, reset, getValues } = useForm<LeadListFilters>({ defaultValues })
    const { append, remove, fields } = useFieldArray({ control, name: "filters" })

    // Resetear el formulario solo cuando los filtros se limpian externamente (ej: botón "Limpiar filtros" del estado vacío)
    // No resetear al aplicar: el submit ya convirtió value_num_from/to → LeadFilter y un reset borraría esos valores
    const prevFiltersRef = useRef<string>('__init__')
    useEffect(() => {
        const curr = JSON.stringify(filters.filters ?? [])
        const wasNonEmpty = prevFiltersRef.current !== '__init__' && prevFiltersRef.current !== '[]'
        prevFiltersRef.current = curr
        if (curr === '[]' && wasNonEmpty) {
            reset(defaultValues)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.filters])

    // Restaurar el formulario al cargar una vista guardada.
    // formResetKey incrementa en LeadListPage cuando el usuario carga una vista.
    // Esperamos a que leadFields esté disponible para hacer la conversión LeadFilter → FormFilter.
    const lastResetKey = useRef<number | undefined>(undefined)
    useEffect(() => {
        if (formResetKey === undefined) return
        if (formResetKey === lastResetKey.current) return
        if (!leadFields.length) return   // esperar a que se carguen los campos
        lastResetKey.current = formResetKey

        const newFormFilters = apiFiltersToFormFilters(filters.filters ?? [], leadFields)
        const h = filters.headers ?? {}
        reset({
            filters: newFormFilters,
            headers: { only_active: h.only_active, page_size: h.page_size },
        })
        setCollapsedIds(new Set())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formResetKey, leadFields])

    // Estado de colapsado por id (opt-out: todas las filas empiezan expandidas)
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
    const toggleExpand = useCallback((id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }, [])

    // Fila vacía inicial
    useEffect(() => {
        if (fields.length === 0) append({})
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Colapsar / expandir todos
    const allFilters = useWatch({ control, name: 'filters' })
    const filledFields = useMemo(() =>
        fields.filter((_, idx) => allFilters?.[idx]?.field_id != null),
        [fields, allFilters]
    )
    const allCollapsed = filledFields.length > 0 && filledFields.every(f => collapsedIds.has(f.id))
    const collapseAll = useCallback(() => {
        setCollapsedIds(prev => { const n = new Set(prev); filledFields.forEach(f => n.add(f.id)); return n })
    }, [filledFields])
    const expandAll = useCallback(() => {
        setCollapsedIds(new Set())
    }, [])

    // ── Submit ────────────────────────────────────────────────────────────────
    const onSubmit = async (data: LeadListFilters) => {
        const outputFilters: LeadFilter[] = []

        for (const item of data.filters) {
            if (item.field_id == null) continue
            const field = leadFields.find(f => f.id === item.field_id)
            const typeCode = field?.field_type_code

            // ── Campos nativos (IDs negativos) ────────────────────────────
            if (Number(item.field_id) < 0) {
                const nativeKey = field?.nativeKey
                if (!nativeKey) continue

                if (typeCode === 'NATIVE_ID') {
                    const ids = item.value_ids
                    if (ids && ids.length > 0)
                        outputFilters.push({ field_id: nativeKey, operator: ids.length === 1 ? 'eq' : 'in', value: ids.length === 1 ? ids[0] : ids })
                } else if (DATE_TYPES.includes(typeCode ?? '')) {
                    const from = item.value_from
                    const to = item.value_to
                    if (from) outputFilters.push({ field_id: nativeKey, operator: 'gte', value: from })
                    if (to) outputFilters.push({ field_id: nativeKey, operator: 'lte', value: to })
                }
                continue
            }

            // ── Campos custom (IDs positivos) ─────────────────────────────
            if (typeCode === 'STRING') {
                if (item.value != null && item.value !== '')
                    outputFilters.push({ field_id: item.field_id, operator: 'ilike', value: item.value })

            } else if (DATE_TYPES.includes(typeCode ?? '')) {
                const from = item.value_from
                const to = item.value_to
                if (from && to && from === to) outputFilters.push({ field_id: item.field_id, operator: 'eq', value: from })
                else {
                    if (from) outputFilters.push({ field_id: item.field_id, operator: 'gte', value: from })
                    if (to) outputFilters.push({ field_id: item.field_id, operator: 'lte', value: to })
                }

            } else if (NUMERIC_TYPES.includes(typeCode ?? '')) {
                const from = item.value_num_from
                const to = item.value_num_to
                const fromValid = from != null && !isNaN(from)
                const toValid = to != null && !isNaN(to)
                if (fromValid && toValid && from === to) outputFilters.push({ field_id: item.field_id, operator: 'eq', value: from })
                else {
                    if (fromValid) outputFilters.push({ field_id: item.field_id, operator: 'gte', value: from })
                    if (toValid) outputFilters.push({ field_id: item.field_id, operator: 'lte', value: to })
                }

            } else if (typeCode === 'BOOL') {
                if (item.value != null && item.value !== '')
                    outputFilters.push({ field_id: item.field_id, operator: 'eq', value: item.value === 'true' ? 1 : 0 })

            } else if (typeCode === 'SELECTOR') {
                const ids = item.value_ids
                if (ids && ids.length > 0)
                    outputFilters.push({ field_id: item.field_id, operator: ids.length === 1 ? 'eq' : 'in', value: ids.length === 1 ? ids[0] : ids })

            } else {
                let newValue: string | number | number[] | boolean | undefined = item.value
                if (typeof item.value === "boolean") newValue = item.value ? 1 : 0
                if (item.value != null)
                    outputFilters.push({ field_id: item.field_id, operator: item.operator, value: newValue })
            }
        }

        return applyFilters({ ...data, filters: outputFilters })
            .catch(e => setFormErrors(e, setError,
                (e) => e.map(error => setError(`root`, { message: error.message }))
            ))
    }

    const { loading, fnWithLoading: applyFilterLoad } = useLoading(onSubmit)
    const pageSize = useWatch({ control, name: "headers.page_size" })

    const handleClear = useCallback(async () => {
        const headers = getValues('headers')
        reset({ filters: [{}], headers })
        return applyFilters({ filters: [], headers })
    }, [getValues, reset, applyFilters])

    // Bug real encontrado 2026-08-11 (reportado por el usuario): sacar una fila con la cruz
    // (LeadFiltersItem, botón "Eliminar filtro") solo llamaba a remove(idx) de useFieldArray --
    // un cambio local al borrador del formulario, sin submit. Sacar TODOS los filtros con la
    // cruz no volvía a traer los leads sin filtrar: el filtro viejo seguía aplicado hasta un
    // "Aplicar filtros" explícito que nunca llegaba, aunque el contador (ya arreglado arriba)
    // mostrara 0. Se trata la remoción como una acción completa -- mismo criterio que
    // handleClear (Limpiar filtros), que ya aplica al instante -- a diferencia de agregar/
    // tipear un valor, que sí conviene que espere al click explícito (si no, cada tecla
    // dispararía una búsqueda).
    //
    // Solo en el panel lateral (showCancelButton=false): en el modal de filtros
    // (LeadListOptions.tsx, showCancelButton=true) aplicar al instante rompería el botón
    // "Cancelar" -- la remoción ya habría impactado la lista real antes de poder cancelarla.
    const removeAndApply = useCallback<UseFieldArrayRemove>((idx) => {
        remove(idx)
        if (!showCancelButton) handleSubmit(applyFilterLoad)()
    }, [remove, showCancelButton, handleSubmit, applyFilterLoad])

    const isCompact = !showHeaders

    return (
        <Stack spacing={showHeaders ? 3 : 1}>
            {showTitle && <Typography variant="h2">Filtros de Búsqueda</Typography>}

            {showSectionHeader && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <Typography variant="caption"
                            sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.disabled' }}>
                            Filtros
                        </Typography>
                        {/*
                          Bug real encontrado 2026-08-11 (reportado por el usuario -- "el contador
                          queda mal" al sacar un filtro con la cruz): antes este número usaba
                          activeFilterCount (prop derivada de los filtros ya APLICADOS a la
                          búsqueda, filters.length en LeadListPage). La cruz de cada fila
                          (LeadFiltersItem, remove(idx)) solo edita el borrador del formulario --
                          no dispara submit -- así que el contador no se movía hasta apretar
                          "Aplicar filtros". Encima, filters.length cuenta entradas crudas de la
                          API, no filas: un rango Desde/Hasta (NUMBER o DATE) son dos entradas
                          (gte+lte) para una sola fila visual, así que el número tampoco
                          coincidía con lo que se veía en el panel. filledFields ya existe acá
                          (fields con field_id elegido) y refleja el estado VIVO del formulario --
                          se actualiza al instante al agregar/sacar una fila, y cuenta 1 por fila
                          sin importar cuántas entradas de LeadFilter genere al aplicar.
                        */}
                        {filledFields.length > 0 && (
                            <Typography variant="caption" sx={{
                                bgcolor: alpha(palette.success.main, 0.12),
                                color: 'success.dark', borderRadius: 1, px: 0.75, fontWeight: 600,
                            }}>
                                {filledFields.length}
                            </Typography>
                        )}
                    </Stack>
                    {filledFields.length > 0 && (
                        <Tooltip title={allCollapsed ? 'Expandir todos' : 'Colapsar todos'}>
                            <IconButton size="small" onClick={allCollapsed ? expandAll : collapseAll}
                                sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
                                {allCollapsed ? <UnfoldMoreIcon sx={{ fontSize: 14 }} /> : <UnfoldLessIcon sx={{ fontSize: 14 }} />}
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            )}

            <form onSubmit={handleSubmit(applyFilterLoad)}>
                <Stack spacing={showHeaders ? 2 : 0.75}>
                    {showHeaders && (
                        <Stack spacing={.5}>
                            <Grid container sx={{ alignItems: "center", flexWrap: "wrap" }} spacing={1}>
                                <Grid size="grow" spacing={.5} sx={{ minWidth: "10rem" }}>
                                    <ControlledNumber control={control} size="small" name="headers.page_size" label="Items por página" min={5} step={5}
                                        errorMessage={errors.headers?.page_size?.message} />
                                </Grid>
                                <Grid size="grow" sx={{ minWidth: "18rem" }}>
                                    <ControlledCheckbox control={control} name="headers.only_active" label="Mostrar sólo Leads habilitados"
                                        errorMessage={errors.headers?.only_active?.message} />
                                </Grid>
                            </Grid>
                            <Fade in={(pageSize ?? 0) >= 20}>
                                <Typography variant="subtitle2" color="warning" sx={{ fontWeight: 600 }}>
                                    Advertencia: Muchas filas pueden ralentizar la carga.
                                </Typography>
                            </Fade>
                        </Stack>
                    )}

                    {Boolean(campaignId) && (
                        <Stack spacing={0.5}>
                            {showHeaders && <Typography variant="h3">Filtros por Campo</Typography>}
                            {fields.map((filter, idx) => (
                                <LeadFiltersItem
                                    key={filter.id}
                                    idx={idx}
                                    control={control}
                                    register={register}
                                    leadFields={leadFields}
                                    errors={errors}
                                    remove={removeAndApply}
                                    disabled={loading}
                                    canDelete
                                    compact={isCompact}
                                    isExpanded={isCompact ? !collapsedIds.has(filter.id) : true}
                                    onToggleExpand={isCompact ? () => toggleExpand(filter.id) : undefined}
                                    nativeOptions={{ contactStates, leadStates, teams, users }}
                                />
                            ))}
                        </Stack>
                    )}

                    {errors.root && <FormErrorMessage>{errors.root.message}</FormErrorMessage>}

                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
                        <Tooltip title="Agregar filtro">
                            <span>
                                <IconButton size="small" onClick={() => append({})} disabled={loading}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                                    <AddIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            {!!campaignId && showCancelButton && (
                                <CommonButton actionType='CLOSE' variant="outlined" color="primary" onClick={onClose} disabled={loading}>
                                    Cancelar
                                </CommonButton>
                            )}
                            <Tooltip title="Limpiar filtros">
                                <span>
                                    <IconButton size="small" onClick={handleClear} disabled={loading}
                                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                                        <FilterAltOffIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Aplicar filtros">
                                <span>
                                    <IconButton size="small" type="submit" disabled={loading} color="primary"
                                        sx={{
                                            bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1,
                                            '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { bgcolor: 'action.disabledBackground' }
                                        }}>
                                        {loading
                                            ? <CircularProgress size={16} color="inherit" />
                                            : <CheckIcon sx={{ fontSize: 18 }} />}
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    </Stack>
                </Stack>
            </form>
        </Stack>
    )
})

// ── LeadFiltersItem ───────────────────────────────────────────────────────────
interface NativeOptions {
    contactStates: LeadContactState[]
    leadStates: LeadState[]
    teams: LeadTeam[]
    users: LeadUser[]
}

interface LeadFiltersItemProps {
    idx: number,
    leadFields: LeadField[],
    control: Control<LeadListFilters, unknown, LeadListFilters>,
    register: UseFormRegister<LeadListFilters>,
    errors: FieldErrors<LeadListParams & LeadListFilters>,
    remove: UseFieldArrayRemove,
    disabled?: boolean,
    canDelete?: boolean,
    compact?: boolean,
    isExpanded?: boolean,
    onToggleExpand?: () => void,
    nativeOptions?: NativeOptions,
}

export const LeadFiltersItem = memo(({
    idx, leadFields, control, register, errors,
    remove, disabled = false, canDelete = true,
    compact = false, isExpanded = true, onToggleExpand,
    nativeOptions,
}: LeadFiltersItemProps) => {
    const { palette } = useTheme()

    const filteredFields = useMemo(() => {
        if (!leadFields?.length) return []
        return leadFields.filter(f => !["LEAD", "FILE", "CALCULATED"].includes(f.field_type_code))
    }, [leadFields])

    const selectedFieldId = useWatch({ name: `filters.${idx}.field_id`, control })
    const selectedOperator = useWatch({ name: `filters.${idx}.operator`, control })
    const boolValue = useWatch({ name: `filters.${idx}.value` as Path<LeadListFilters>, control })
    const valueNumFrom = useWatch({ name: `filters.${idx}.value_num_from` as Path<LeadListFilters>, control })
    const valueNumTo = useWatch({ name: `filters.${idx}.value_num_to` as Path<LeadListFilters>, control })
    const valueIds = useWatch({ name: `filters.${idx}.value_ids` as Path<LeadListFilters>, control }) as (number | string)[] | undefined

    const selectedField = useMemo(() => filteredFields.find(i => i.id === selectedFieldId), [filteredFields, selectedFieldId])

    const typeCode = selectedField?.field_type_code
    const subtypeCode = selectedField?.field_subtype_code ?? undefined
    const isNativeId = typeCode === 'NATIVE_ID'
    const isString = typeCode === 'STRING'
    const isDate = DATE_TYPES.includes(typeCode ?? '')
    const isNumeric = NUMERIC_TYPES.includes(typeCode ?? '')
    const isBool = typeCode === 'BOOL'
    const isSelector = typeCode === 'SELECTOR'
    const isSimple = !isString && !isDate && !isNumeric && !isBool && !isSelector && !isNativeId

    // Opciones del Autocomplete para campos NATIVE_ID
    const nativeIdOptions = useMemo(() => {
        if (!isNativeId || !selectedField?.nativeKey) return []
        switch (selectedField.nativeKey) {
            case 'contact_state_id':
                return (nativeOptions?.contactStates ?? []).map(s => ({ id: s.id, label: s.name }))
            case 'current_state_id':
                return (nativeOptions?.leadStates ?? []).map(s => ({ id: s.id, label: s.name }))
            case 'team_id':
                return (nativeOptions?.teams ?? []).map(t => ({ id: t.id, label: t.name }))
            case 'assigned_to_user_id':
                return (nativeOptions?.users ?? []).map(u => ({ id: u.id, label: u.name ?? u.email }))
            case 'created_by':
            case 'updated_by':
                return (nativeOptions?.users ?? []).map(u => ({ id: u.id, label: formatUserFullName(u) ?? u.email }))
            default:
                return []
        }
    }, [isNativeId, selectedField?.nativeKey, nativeOptions])

    // Opciones del nomenclador para campos tipo SELECTOR
    const [selectorOptions, setSelectorOptions] = useState<NomenclatorItem[]>([])
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!isSelector || !selectedField?.nomenclator_id) { setSelectorOptions([]); return }
        getNomenclatorItems({ nomenclator_id: selectedField.nomenclator_id, page_size: 0 })
            .then(res => setSelectorOptions(res.items))
    }, [isSelector, selectedField?.nomenclator_id])

    const filteredOperators = useMemo(() => {
        if (!selectedField || !isSimple) return []
        return OPERATORS_BY_LEAD_TYPE[typeCode as keyof typeof OPERATORS_BY_LEAD_TYPE] ?? []
    }, [selectedField, isSimple, typeCode])

    const operatorLabel = useMemo(() =>
        filteredOperators.find(op => op.code === selectedOperator)?.label,
        [filteredOperators, selectedOperator]
    )

    // Texto de resumen para estado colapsado
    const collapsedSuffix = useMemo(() => {
        if (isNativeId) {
            if (!valueIds || valueIds.length === 0) return ''
            if (valueIds.length === 1) {
                const opt = nativeIdOptions.find(o => o.id === valueIds[0])
                return opt ? `· ${opt.label}` : '· 1 seleccionado'
            }
            return `· ${valueIds.length} seleccionados`
        }
        if (isString) return '· contiene'
        if (isDate) return '· rango de fechas'
        if (isBool) return boolValue === 'true' ? '· Es verdadero' : boolValue === 'false' ? '· Es falso' : ''
        if (isSelector) {
            if (!valueIds || valueIds.length === 0) return ''
            if (valueIds.length === 1) {
                const opt = selectorOptions.find(o => o.id === valueIds[0])
                return opt ? `· ${opt.value}` : '· 1 opción'
            }
            return `· ${valueIds.length} opciones`
        }
        if (isNumeric) {
            const f = valueNumFrom != null && !isNaN(Number(valueNumFrom)) ? valueNumFrom : null
            const t = valueNumTo != null && !isNaN(Number(valueNumTo)) ? valueNumTo : null
            if (f != null && t != null) return `· ${f} – ${t}`
            if (f != null) return `· ≥ ${f}`
            if (t != null) return `· ≤ ${t}`
            return ''
        }
        return operatorLabel ? `· ${operatorLabel}` : ''
    }, [isNativeId, isString, isDate, isBool, isSelector, isNumeric, valueIds, boolValue, nativeIdOptions, selectorOptions, valueNumFrom, valueNumTo, operatorLabel])

    const isFilled = selectedFieldId != null

    // ── Modo compacto (sidebar) ───────────────────────────────────────────────
    if (compact) {
        return (
            <Box sx={{
                borderRadius: 1,
                border: `1px solid ${isFilled ? alpha(palette.primary.main, 0.25) : alpha(palette.divider, 1)}`,
                bgcolor: isFilled ? alpha(palette.primary.main, 0.03) : 'transparent',
                overflow: 'hidden',
            }}>
                {/* Cabecera */}
                <Stack direction="row" sx={{ alignItems: 'center', px: 0.5, py: 0.25, minHeight: 30 }}>
                    {isFilled ? (
                        <IconButton size="small" onClick={onToggleExpand}
                            sx={{ color: 'text.disabled', flexShrink: 0, p: 0.25 }}>
                            <ChevronRightIcon sx={{
                                fontSize: 13, transition: 'transform 0.2s',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            }} />
                        </IconButton>
                    ) : (
                        <Box sx={{ width: 22, flexShrink: 0 }} />
                    )}

                    {!isExpanded && isFilled ? (
                        // Estado colapsado: nombre del campo + resumen
                        <Stack direction="row" spacing={0.5}
                            sx={{ alignItems: 'center', flex: 1, minWidth: 0, overflow: 'hidden', cursor: 'pointer' }}
                            onClick={onToggleExpand}>
                            <Typography variant="caption" noWrap
                                sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.7rem' }}>
                                {selectedField?.name ?? `Filtro ${idx + 1}`}
                            </Typography>
                            {collapsedSuffix && (
                                <Typography variant="caption" color="text.disabled" noWrap sx={{ fontSize: '0.68rem' }}>
                                    {collapsedSuffix}
                                </Typography>
                            )}
                        </Stack>
                    ) : (
                        // Estado expandido: selector de campo
                        <Box sx={{ flex: 1, minWidth: 0, ...XS_INPUT_SX }}>
                            <ControlledFieldSelector
                                control={control}
                                name={`filters.${idx}.field_id`}
                                fields={filteredFields}
                                label="Campo"
                                size="small"
                                showTypeCaption={false}
                                errorMessage={errors.filters?.[idx]?.field_id?.message}
                            />
                        </Box>
                    )}

                    {canDelete ? (
                        <Tooltip title="Eliminar filtro">
                            <IconButton size="small" onClick={() => remove(idx)} disabled={disabled}
                                sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' }, flexShrink: 0, p: 0.25 }}>
                                <CloseIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Box sx={{ width: 22, flexShrink: 0 }} />
                    )}
                </Stack>

                {/* Cuerpo expandido */}
                <Collapse in={isExpanded && isFilled}>
                    <Stack spacing={0.5} sx={{ px: 0.75, pb: 0.75 }}>
                        {isString && (
                            <Box sx={XS_INPUT_SX}>
                                <LeadFormText register={register}
                                    name={`filters.${idx}.value` as Path<LeadListFilters>}
                                    label="Buscar..." size="small" subtype={subtypeCode}
                                    errorMessage={errors.filters?.[idx]?.value?.message} showAdornment />
                            </Box>
                        )}

                        {isDate && (
                            <Stack spacing={0.5} sx={XS_INPUT_SX}>
                                <LeadFormDate register={register}
                                    name={`filters.${idx}.value_from` as Path<LeadListFilters>}
                                    label="Desde" size="small" subtype={subtypeCode}
                                    errorMessage={errors.filters?.[idx]?.value_from?.message} showAdornment />
                                <LeadFormDate register={register}
                                    name={`filters.${idx}.value_to` as Path<LeadListFilters>}
                                    label="Hasta" size="small" subtype={subtypeCode}
                                    errorMessage={errors.filters?.[idx]?.value_to?.message} showAdornment />
                            </Stack>
                        )}

                        {isNumeric && (
                            <Stack spacing={0.5} sx={XS_INPUT_SX}>
                                <ControlledNumber control={control}
                                    name={`filters.${idx}.value_num_from` as Path<LeadListFilters>}
                                    label="Desde" size="small"
                                    errorMessage={errors.filters?.[idx]?.value_num_from?.message} />
                                <ControlledNumber control={control}
                                    name={`filters.${idx}.value_num_to` as Path<LeadListFilters>}
                                    label="Hasta" size="small"
                                    errorMessage={errors.filters?.[idx]?.value_num_to?.message} />
                            </Stack>
                        )}

                        {isBool && (
                            <Controller control={control}
                                name={`filters.${idx}.value` as Path<LeadListFilters>}
                                render={({ field }) => (
                                    <ToggleButtonGroup
                                        size="small" exclusive
                                        value={field.value ?? null}
                                        onChange={(_, v) => { if (v !== null) field.onChange(v) }}
                                        sx={{ width: '100%', '& .MuiToggleButton-root': { flex: 1, py: 0.25, fontSize: '0.72rem' } }}
                                    >
                                        {BOOL_OPTIONS.map(opt => (
                                            <ToggleButton key={opt.code} value={opt.code}>
                                                {opt.label}
                                            </ToggleButton>
                                        ))}
                                    </ToggleButtonGroup>
                                )}
                            />
                        )}

                        {isSelector && (
                            <Box sx={XS_INPUT_SX}>
                                <LeadFormNomenclator control={control}
                                    name={`filters.${idx}.value_ids` as Path<LeadListFilters>}
                                    label="Opciones" size="small" options={selectorOptions}
                                    multiple
                                    errorMessage={errors.filters?.[idx]?.value?.message} />
                            </Box>
                        )}

                        {isNativeId && (
                            <Box sx={XS_INPUT_SX}>
                                <ControlledAutocomplete control={control}
                                    name={`filters.${idx}.value_ids` as Path<LeadListFilters>}
                                    options={nativeIdOptions}
                                    getOptionKey={o => `${o.id}`}
                                    getOptionLabel={o => o.label}
                                    returnField="id"
                                    multiple
                                    label={selectedField?.name ?? 'Valor'}
                                    size="small"
                                    errorMessage={errors.filters?.[idx]?.value?.message} />
                            </Box>
                        )}

                        {isSimple && (
                            <Stack spacing={0.5} sx={XS_INPUT_SX}>
                                <ControlledAutocomplete control={control}
                                    name={`filters.${idx}.operator`}
                                    options={filteredOperators}
                                    getOptionKey={o => o.code} getOptionLabel={o => o.label}
                                    returnField="code" label="Operación" size="small"
                                    errorMessage={errors.filters?.[idx]?.operator?.message} />
                                <LeadFormFieldType register={register} control={control}
                                    name={`filters.${idx}.value` as Path<LeadListFilters>}
                                    errorMessage={errors.filters?.[idx]?.value?.message}
                                    leadField={selectedField} />
                            </Stack>
                        )}
                    </Stack>
                </Collapse>
            </Box>
        )
    }

    // ── Modo normal (modal) ───────────────────────────────────────────────────
    return (
        <Box sx={{
            overflow: "hidden", borderRadius: ".5rem",
            border: `1px solid ${alpha(palette.contrast?.light ?? palette.divider, .5)}`,
            display: 'flex',
        }}>
            <Stack spacing={1} sx={{ py: 1, pl: 2, flexGrow: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>Filtro N° {idx + 1}</Typography>
                <Stack direction="row" spacing={.5} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Box sx={{ flexGrow: 2, minWidth: "12rem" }}>
                        <ControlledFieldSelector control={control} name={`filters.${idx}.field_id`}
                            fields={filteredFields} label="Campo a Filtrar" size="small" showTypeCaption={false}
                            errorMessage={errors.filters?.[idx]?.field_id?.message} />
                    </Box>

                    {isFilled && (
                        <>
                            {isString && (
                                <Box sx={{ flexGrow: 2, minWidth: "12rem" }}>
                                    <LeadFormText register={register}
                                        name={`filters.${idx}.value` as Path<LeadListFilters>}
                                        label="Buscar..." size="small" subtype={subtypeCode}
                                        errorMessage={errors.filters?.[idx]?.value?.message} showAdornment />
                                </Box>
                            )}

                            {isDate && (
                                <>
                                    <Box sx={{ flexGrow: 1, minWidth: "10rem" }}>
                                        <LeadFormDate register={register}
                                            name={`filters.${idx}.value_from` as Path<LeadListFilters>}
                                            label="Desde" size="small" subtype={subtypeCode}
                                            errorMessage={errors.filters?.[idx]?.value_from?.message} showAdornment />
                                    </Box>
                                    <Box sx={{ flexGrow: 1, minWidth: "10rem" }}>
                                        <LeadFormDate register={register}
                                            name={`filters.${idx}.value_to` as Path<LeadListFilters>}
                                            label="Hasta" size="small" subtype={subtypeCode}
                                            errorMessage={errors.filters?.[idx]?.value_to?.message} showAdornment />
                                    </Box>
                                </>
                            )}

                            {isNumeric && (
                                <>
                                    <Box sx={{ flexGrow: 1, minWidth: "8rem" }}>
                                        <ControlledNumber control={control}
                                            name={`filters.${idx}.value_num_from` as Path<LeadListFilters>}
                                            label="Desde" size="small"
                                            errorMessage={errors.filters?.[idx]?.value_num_from?.message} />
                                    </Box>
                                    <Box sx={{ flexGrow: 1, minWidth: "8rem" }}>
                                        <ControlledNumber control={control}
                                            name={`filters.${idx}.value_num_to` as Path<LeadListFilters>}
                                            label="Hasta" size="small"
                                            errorMessage={errors.filters?.[idx]?.value_num_to?.message} />
                                    </Box>
                                </>
                            )}

                            {isBool && (
                                <Box sx={{ flexGrow: 1, minWidth: "12rem" }}>
                                    <Controller control={control}
                                        name={`filters.${idx}.value` as Path<LeadListFilters>}
                                        render={({ field }) => (
                                            <ToggleButtonGroup size="small" exclusive
                                                value={field.value ?? null}
                                                onChange={(_, v) => { if (v !== null) field.onChange(v) }}
                                                sx={{ '& .MuiToggleButton-root': { flex: 1 } }}
                                            >
                                                {BOOL_OPTIONS.map(opt => (
                                                    <ToggleButton key={opt.code} value={opt.code}>
                                                        {opt.label}
                                                    </ToggleButton>
                                                ))}
                                            </ToggleButtonGroup>
                                        )}
                                    />
                                </Box>
                            )}

                            {isSelector && (
                                <Box sx={{ flexGrow: 2, minWidth: "12rem" }}>
                                    <LeadFormNomenclator control={control}
                                        name={`filters.${idx}.value_ids` as Path<LeadListFilters>}
                                        label="Opciones" size="small" options={selectorOptions}
                                        multiple
                                        errorMessage={errors.filters?.[idx]?.value?.message} />
                                </Box>
                            )}

                            {isNativeId && (
                                <Box sx={{ flexGrow: 2, minWidth: "12rem" }}>
                                    <ControlledAutocomplete control={control}
                                        name={`filters.${idx}.value_ids` as Path<LeadListFilters>}
                                        options={nativeIdOptions}
                                        getOptionKey={o => `${o.id}`}
                                        getOptionLabel={o => o.label}
                                        returnField="id"
                                        multiple
                                        label={selectedField?.name ?? 'Valor'}
                                        size="small"
                                        errorMessage={errors.filters?.[idx]?.value?.message} />
                                </Box>
                            )}

                            {isSimple && (
                                <>
                                    <Box sx={{ flexGrow: 1, minWidth: "10rem" }}>
                                        <ControlledAutocomplete control={control} name={`filters.${idx}.operator`}
                                            options={filteredOperators} getOptionKey={o => o.code} getOptionLabel={o => o.label}
                                            returnField="code" label="Operación" size="small"
                                            errorMessage={errors.filters?.[idx]?.operator?.message} />
                                    </Box>
                                    <Box sx={{ flexGrow: 2, minWidth: "12rem" }}>
                                        <LeadFormFieldType register={register} control={control}
                                            name={`filters.${idx}.value` as Path<LeadListFilters>}
                                            errorMessage={errors.filters?.[idx]?.value?.message}
                                            leadField={selectedField} />
                                    </Box>
                                </>
                            )}
                        </>
                    )}
                </Stack>
            </Stack>

            {canDelete && (
                <Box component="button" type="button" onClick={() => remove(idx)} disabled={disabled} sx={{
                    backgroundColor: alpha(palette.error.light, .3), color: palette.error.dark,
                    border: 'none', cursor: 'pointer', borderRadius: 0, minWidth: 0, padding: "1rem",
                    "&:hover": { backgroundColor: alpha(palette.error.light, .4) }
                }}>
                    <CloseIcon />
                </Box>
            )}
        </Box>
    )
})

// ── LeadFormFieldType (fallback para tipos no manejados explícitamente) ───────
interface LeadFormFieldTypeProps {
    register: UseFormRegister<LeadListFilters>,
    control: Control<LeadListFilters>,
    name: Path<LeadListFilters>,
    leadField?: LeadField,
    errorMessage?: string
}

const LeadFormFieldType = memo(({ register, control, name, leadField, errorMessage }: LeadFormFieldTypeProps) => {
    if (!leadField) return null
    const { field_type_code: typeCode, required } = leadField
    const subtypeCode = leadField.field_subtype_code ?? undefined
    switch (typeCode) {
        case "LEAD":
            return <LeadFormRelatedLead control={control} name={name} options={[]} size="small" label="Valor" required={required} errorMessage={errorMessage} showAdornment />
        case "FILE":
            return (<LeadFormFile control={control} name={name} required={required} size="small" label="Valor"
                errorMessage={errorMessage} showAdornment subtype={subtypeCode} />)
        case "SELECTOR":
            return <LeadFormSelector control={control} name={name} options={[]} size="small" label="Valor" subtype={subtypeCode} required={required} errorMessage={errorMessage} showAdornment />
        case "BOOL":
            return <LeadFormBool control={control} name={name} label="Valor" errorMessage={errorMessage} size="small" />
        case "DATE_TIME": case "DATE":
            return <LeadFormDate register={register} name={name} label="Valor" size="small" subtype={subtypeCode} required={leadField.required} errorMessage={errorMessage} showAdornment />
        case "NUMBER": case "INT":
            return <LeadFormNumber control={control} name={name} label="Valor" size="small" subtype={subtypeCode} required={leadField.required} errorMessage={errorMessage} showAdornment />
        case "STRING":
            return <LeadFormText register={register} name={name} label="Valor" size="small" required={leadField.required} errorMessage={errorMessage} subtype={subtypeCode} showAdornment />
        default:
            return null
    }
})
