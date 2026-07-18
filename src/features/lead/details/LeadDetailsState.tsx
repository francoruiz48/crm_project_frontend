import {
    Box, Divider, List, ListItemButton, ListSubheader, Popover, Stack, TextField, Tooltip, Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import GenericPaper from 'src/components/layout/container/GenericPaper'
import CustomChip from 'src/components/ui/details/CustomChip'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { useLoading } from 'src/hooks/useLoading'
import { getLeadFlowStates, getNextFlowState } from 'src/features/leadFlows/leadFlowServices/FlowService'
import { CATEGORY_CONFIG } from 'src/features/leadFlows/leadFlowServices/leadFlowUtils'
import type { LeadContactState, LeadContactStateDetailed } from 'src/types/orgProperties'
import type { LeadState, LeadStateDetailed, StateCategory } from 'src/types/leadFlow'
import type { LeadDetailed } from 'src/types/leads'
import { changeContactState, changeFlowState } from './LeadDetailsService'
import { showCommonErrorToast } from 'src/utils/feedback'
import { getLeadContactStates } from 'src/features/orgProperties/contactState/contactStatesServices'
import { getColorShades } from 'src/utils/formatters'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CancelIcon from '@mui/icons-material/Cancel'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'

interface LeadDetailsState {
    lead: LeadDetailed,
    contactState: LeadContactStateDetailed,
    flowState: LeadStateDetailed,
    updateLeadInfo: (lead: LeadDetailed, reloadAudits?: boolean) => void
}

const SECTION_LABEL_SX = { fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".04em" }

export const LeadDetailsState = ({ lead, contactState, flowState, updateLeadInfo }: LeadDetailsState) => {

    const [nextFlowStates, setNextFlowStates] = useState<LeadState[]>([])
    const [allFlowStates, setAllFlowStates] = useState<LeadState[]>([])
    const [contactStates, setContactStates] = useState<LeadContactState[]>([])

    useEffect(() => {
        getLeadContactStates({ only_active: true, page_size: 0, detailed: false })
            .then(res => setContactStates(res.items.filter(i => i.id !== contactState.id)))
    }, [contactState])

    useEffect(() => {
        getNextFlowState(flowState.id)
            .then(res => setNextFlowStates(res.data))
    }, [flowState])

    // Trae TODOS los estados del flujo (ordenados) para poder dibujar el "camino" completo,
    // no solo el estado actual y los siguientes posibles.
    useEffect(() => {
        getLeadFlowStates({ lead_flow_id: flowState.lead_flow_id, only_active: true, page_size: 0, order_by: "order", ascending: true })
            .then(res => setAllFlowStates(res.items))
            .catch(e => showCommonErrorToast(e))
    }, [flowState.lead_flow_id])

    const reachableStateIds = useMemo(() => new Set(nextFlowStates.map(s => s.id)), [nextFlowStates])

    const [contactAnchor, setContactAnchor] = useState<Element | null>(null)
    const [stepperAnchor, setStepperAnchor] = useState<Element | null>(null)
    const [stepperTarget, setStepperTarget] = useState<LeadState | null>(null)

    const closeStepperPopover = useCallback(() => {
        setStepperAnchor(null)
        setStepperTarget(null)
    }, [])

    // Ambos cambios ahora quedan registrados en el timeline de auditoría del lead,
    // así que los dos disparan el reload del tab de Auditoría.
    const handleContactChange = useCallback((newLead: LeadDetailed) => {
        updateLeadInfo(newLead, true)
    }, [updateLeadInfo])

    const handleFlowChange = useCallback((newLead: LeadDetailed) => {
        updateLeadInfo(newLead, true)
    }, [updateLeadInfo])

    return (
        <Stack spacing={2} sx={{ width: "100%" }}>
            {allFlowStates.length > 0 &&
                <Stack spacing={.5}>
                    <Typography variant="caption" color="text.secondary" sx={SECTION_LABEL_SX}>
                        Estado de Flujo
                    </Typography>
                    <FlowStatePath states={allFlowStates} currentStateId={flowState.id} reachableStateIds={reachableStateIds}
                        onSelectState={(state, anchor) => { setStepperTarget(state); setStepperAnchor(anchor) }} />
                    <Popover
                        id="flow-state-path-popover"
                        open={Boolean(stepperAnchor)}
                        anchorEl={stepperAnchor}
                        onClose={closeStepperPopover}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                    >
                        {stepperTarget &&
                            <StateChangeList key={stepperTarget.id} title="Actualizar Estado de Flujo" leadId={lead.id}
                                options={[]} initialSelected={stepperTarget}
                                onClose={closeStepperPopover} onChange={handleFlowChange} submit={changeFlowState} />
                        }
                    </Popover>
                </Stack>
            }

            <Stack spacing={.5} sx={{ alignItems: "start" }}>
                <Typography variant="caption" color="text.secondary" sx={SECTION_LABEL_SX}>
                    Estado de Contacto
                </Typography>
                <CustomChip chipColor={contactState.color}
                    onClick={contactStates.length > 0 ? (e => setContactAnchor(e.currentTarget)) : undefined}
                    label={
                        <Stack direction="row" spacing={.25} sx={{ alignItems: "center" }}>
                            <span>{contactState.name}</span>
                            {contactStates.length > 0 && <ArrowDropDownIcon fontSize="inherit" />}
                        </Stack>
                    } />
                <Popover
                    id="next-cont-states"
                    open={Boolean(contactAnchor)}
                    anchorEl={contactAnchor}
                    onClose={() => setContactAnchor(null)}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                >
                    <StateChangeList title="Actualizar Estado de Contacto" leadId={lead.id} options={contactStates}
                        onClose={() => setContactAnchor(null)} onChange={handleContactChange} submit={changeContactState} />
                </Popover>
            </Stack>
        </Stack>
    )
}

const getCategoryIcon = (category: StateCategory, sx?: object) => {
    switch (category) {
        case 'WON': return <EmojiEventsIcon sx={sx} />
        case 'LOST': return <CancelIcon sx={sx} />
        default: return null
    }
}

interface FlowStatePathProps {
    states: LeadState[],
    currentStateId: number,
    reachableStateIds: Set<number>,
    onSelectState: (state: LeadState, anchor: HTMLElement) => void,
}

/**
 * Muestra el flujo completo de estados como una barra de segmentos horizontal (basada en el
 * orden guardado en cada LeadState), en vez de un solo chip suelto que no dejaba ver en qué
 * parte del proceso está el lead ni qué tan lejos queda cada estado. El segmento del estado
 * actual se resalta, los ya recorridos quedan rellenos, y solo los estados alcanzables desde
 * el actual (según las transiciones configuradas en el editor de flujo) son clickeables para
 * cambiar de estado.
 */
const FlowStatePath = ({ states, currentStateId, reachableStateIds, onSelectState }: FlowStatePathProps) => {
    const theme = useTheme()
    const currentIndex = states.findIndex(s => s.id === currentStateId)
    const currentState = currentIndex >= 0 ? states[currentIndex] : undefined
    const currentShades = currentState
        ? getColorShades(currentState.color || CATEGORY_CONFIG[currentState.category]?.color || "secondary", theme)
        : undefined

    return (
        <Stack spacing={1} sx={{ width: "100%" }}>
            <Stack direction="row" spacing={.5} sx={{ width: "100%" }}>
                {states.map((state, idx) => {
                    const isCurrent = state.id === currentStateId
                    const isPast = currentIndex >= 0 && idx < currentIndex
                    const isReachable = reachableStateIds.has(state.id)
                    const isClickable = isReachable && !isCurrent
                    const shades = getColorShades(state.color || CATEGORY_CONFIG[state.category]?.color || "secondary", theme)
                    const filled = isPast || isCurrent

                    return (
                        <Tooltip key={state.id} title={isClickable ? `Marcar como "${state.name}"` : state.name}>
                            <Box component={isClickable ? "button" : "div"} type={isClickable ? "button" : undefined}
                                onClick={isClickable ? (e: MouseEvent<HTMLElement>) => onSelectState(state, e.currentTarget) : undefined}
                                sx={{
                                    flex: 1, height: ".6rem", minWidth: "1.5rem", p: 0, m: 0, border: "none",
                                    borderRadius: "1rem", font: "inherit",
                                    backgroundColor: filled ? shades.MAIN : theme.alpha(shades.MAIN, .18),
                                    opacity: (isReachable || filled) ? 1 : .45,
                                    outline: isCurrent ? `2px solid ${theme.alpha(shades.MAIN, .35)}` : "none",
                                    outlineOffset: "2px",
                                    cursor: isClickable ? "pointer" : "default",
                                    transition: "all 150ms ease",
                                    "&:hover": isClickable ? {
                                        filter: "brightness(1.15)",
                                        transform: "scaleY(1.4)",
                                    } : undefined,
                                }} />
                        </Tooltip>
                    )
                })}
            </Stack>
            {currentState &&
                <Stack direction="row" spacing={.5} sx={{ alignItems: "center" }}>
                    {getCategoryIcon(currentState.category, { fontSize: "1rem", color: currentShades?.MAIN })}
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {currentState.name}
                    </Typography>
                </Stack>
            }
        </Stack>
    )
}

interface StateOption {
    id: number,
    name: string,
    color?: string | null,
}

interface StateChangeListProps {
    title: string,
    leadId: number,
    options: StateOption[],
    initialSelected?: StateOption | null,
    onClose: () => void,
    onChange: (lead: LeadDetailed) => void,
    submit: (leadId: number, stateId: number, notes?: string) => Promise<LeadDetailed>,
}

/**
 * Lista de posibles próximos estados (de flujo o de contacto). Al elegir uno, en vez de
 * cambiar al toque, muestra un campo de notas opcional antes de confirmar el cambio.
 * Si se abre con `initialSelected` (ej. desde el camino de estados de flujo, donde el usuario
 * ya clickeó un estado puntual) salta directo a la confirmación con notas, sin mostrar lista.
 */
const StateChangeList = ({ title, leadId, options, initialSelected = null, onClose, onChange, submit }: StateChangeListProps) => {

    const [selected, setSelected] = useState<StateOption | null>(initialSelected)
    const [notes, setNotes] = useState("")

    const onSubmit = () => {
        if (!selected) return Promise.resolve()
        return submit(leadId, selected.id, notes.trim() || undefined)
            .then(lead => {
                onChange(lead)
                onClose()
            })
            .catch(e => showCommonErrorToast(e))
    }

    const { fnWithLoading: submitLoad, loading } = useLoading(onSubmit)

    // Si vino preseleccionado (desde el camino de estados) no hay lista a la que volver.
    const handleBack = () => initialSelected ? onClose() : setSelected(null)

    if (selected) return (
        <Stack component={GenericPaper} elevation={1} spacing={1.5} sx={{ minWidth: "16rem", maxWidth: "25rem", p: 1.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="body2">Cambiar a:</Typography>
                <CustomChip label={selected.name} chipColor={selected.color} />
            </Stack>
            <TextField label="Notas (opcional)" placeholder="Motivo del cambio..." multiline minRows={2}
                size="small" fullWidth value={notes} onChange={e => setNotes(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
            <Stack direction="row" spacing={1} sx={{ justifyContent: "end" }}>
                <CommonButton actionType="CLOSE" variant="outlined" color="error" onClick={handleBack} disabled={loading}>
                    Volver
                </CommonButton>
                <CommonButton actionType="SAVE" variant="contained" onClick={submitLoad} loading={loading}>
                    Confirmar
                </CommonButton>
            </Stack>
        </Stack>
    )

    return (
        <List component={GenericPaper} elevation={1} dense
            sx={{ minWidth: "10rem", maxWidth: "25rem", p: 0 }}
            subheader={
                <ListSubheader sx={{ backgroundColor: "transparent" }}>
                    {title}
                </ListSubheader>
            }
        >
            <Divider />
            {options.map(option => (
                <ListItemButton onClick={() => setSelected(option)} key={`state-option-${option.id}`}>
                    <CustomChip label={option.name} chipColor={option.color} sx={{ width: "100%" }} />
                </ListItemButton>
            ))}
        </List>
    )
}
