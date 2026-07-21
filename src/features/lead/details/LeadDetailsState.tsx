import {
    Divider, List, ListItemButton, ListSubheader, Popover, Stack, TextField, Tooltip, Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import GenericPaper from 'src/components/layout/container/GenericPaper'
import CustomChip from 'src/components/ui/details/CustomChip'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { useLoading } from 'src/hooks/useLoading'
import { getNextFlowState } from 'src/features/leadFlows/leadFlowServices/FlowService'
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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

interface LeadDetailsState {
    lead: LeadDetailed,
    contactState: LeadContactStateDetailed,
    flowState: LeadStateDetailed,
    updateLeadInfo: (lead: LeadDetailed, reloadAudits?: boolean) => void
}

const SECTION_LABEL_SX = { fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".04em" }

export const LeadDetailsState = ({ lead, contactState, flowState, updateLeadInfo }: LeadDetailsState) => {

    const [nextFlowStates, setNextFlowStates] = useState<LeadState[]>([])
    const [contactStates, setContactStates] = useState<LeadContactState[]>([])

    useEffect(() => {
        getLeadContactStates({ only_active: true, page_size: 0, detailed: false })
            .then(res => setContactStates(res.items.filter(i => i.id !== contactState.id)))
    }, [contactState])

    useEffect(() => {
        getNextFlowState(flowState.id)
            .then(res => setNextFlowStates(res.data))
            .catch(e => showCommonErrorToast(e))
    }, [flowState])

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
            <Stack spacing={.5}>
                <Typography variant="caption" color="text.secondary" sx={SECTION_LABEL_SX}>
                    Estado de Flujo
                </Typography>
                <FlowStateChips currentState={flowState} nextStates={nextFlowStates}
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

interface FlowStateChipsProps {
    currentState: LeadStateDetailed,
    nextStates: LeadState[],
    onSelectState: (state: LeadState, anchor: HTMLElement) => void,
}

/**
 * Antes esto era una barra de segmentos con el flujo completo (todos los estados posibles, en
 * orden), pero terminaba mostrando de más: la mayoría no son relevantes en un momento dado, y los
 * nombres no entraban en el espacio disponible. Ahora, con más espacio disponible en esta columna
 * (se sacó la sección fija de "Creación de Lead" y se reordenaron los bloques), se muestra
 * directamente el estado actual (resaltado con un halo de su color, como brillaba el segmento
 * activo en la versión anterior) y, a los costados, un chip por cada estado al que se puede pasar
 * desde acá (según las transiciones configuradas en el editor de flujo) — con su nombre visible.
 * Los estados con `order` menor al actual (retroceder en el flujo) se muestran a la IZQUIERDA con
 * flecha hacia atrás; los de `order` mayor (avanzar) se muestran a la DERECHA con flecha hacia
 * adelante. Si el order de alguno es null no hay forma de saber la dirección, así que por defecto
 * se trata como "hacia adelante".
 */
const FlowStateChips = ({ currentState, nextStates, onSelectState }: FlowStateChipsProps) => {
    const theme = useTheme()

    const currentColor = currentState.color || CATEGORY_CONFIG[currentState.category]?.color || "secondary"
    const currentShades = getColorShades(currentColor, theme)

    const isBackward = (state: LeadState) =>
        currentState.order !== null && state.order !== null && state.order < currentState.order

    const byOrder = (a: LeadState, b: LeadState) => (a.order ?? 0) - (b.order ?? 0)
    const backwardStates = nextStates.filter(isBackward).sort(byOrder)
    const forwardStates = nextStates.filter(state => !isBackward(state)).sort(byOrder)

    const renderStateChip = (state: LeadState, direction: "back" | "forward") => (
        <Tooltip key={state.id} title={direction === "back" ? `Volver a "${state.name}"` : `Marcar como "${state.name}"`}>
            <CustomChip chipColor={state.color || CATEGORY_CONFIG[state.category]?.color || "secondary"}
                icon={direction === "back" ? <ArrowBackIcon fontSize="inherit" /> : <ArrowForwardIcon fontSize="inherit" />}
                label={state.name}
                onClick={(e: MouseEvent<HTMLElement>) => onSelectState(state, e.currentTarget)}
                sx={{ cursor: "pointer" }} />
        </Tooltip>
    )

    return (
        <Stack direction="row" spacing={.75} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
            {backwardStates.map(state => renderStateChip(state, "back"))}
            <CustomChip chipColor={currentColor}
                icon={getCategoryIcon(currentState.category, { fontSize: "inherit" }) ?? undefined}
                label={currentState.name}
                sx={{
                    fontWeight: 700,
                    boxShadow: `0 0 0 3px ${theme.alpha(currentShades.MAIN, .35)}`,
                }} />
            {forwardStates.map(state => renderStateChip(state, "forward"))}
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
