import { Divider, List, ListItemButton, ListSubheader, Popover, Stack, TextField, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import GenericPaper from 'src/components/layout/container/GenericPaper'
import CustomChip from 'src/components/ui/details/CustomChip'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { useLoading } from 'src/hooks/useLoading'
import { getNextFlowState } from 'src/features/leadFlows/leadFlowServices/FlowService'
import type { LeadContactState, LeadContactStateDetailed } from 'src/types/orgProperties'
import type { LeadState, LeadStateDetailed } from 'src/types/leadFlow'
import type { LeadDetailed } from 'src/types/leads'
import { changeContactState, changeFlowState } from './LeadDetailsService'
import { showCommonErrorToast } from 'src/utils/feedback'
import { getLeadContactStates } from 'src/features/orgProperties/contactState/contactStatesServices'

interface LeadDetailsState {
    lead: LeadDetailed,
    contactState: LeadContactStateDetailed,
    flowState: LeadStateDetailed,
    updateLeadInfo: (lead: LeadDetailed, reloadAudits?: boolean) => void
}

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
    }, [flowState])

    const [flowAnchor, setFlowAnchor] = useState<Element | null>(null)
    const [contactAnchor, setContactAnchor] = useState<Element | null>(null)

    // Ambos cambios ahora quedan registrados en el timeline de auditoría del lead,
    // así que los dos disparan el reload del tab de Auditoría.
    const handleContactChange = useCallback((newLead: LeadDetailed) => {
        updateLeadInfo(newLead, true)
    }, [updateLeadInfo])

    const handleFlowChange = useCallback((newLead: LeadDetailed) => {
        updateLeadInfo(newLead, true)
    }, [updateLeadInfo])

    return (
        <Stack spacing={1} direction="row" useFlexGap sx={{ alignItems: "center", justifyContent: "start", flexWrap: "wrap" }}>
            {flowState && setNextFlowStates?.length > 0 && <>
                <CustomChip label={flowState.name} chipColor={flowState.color} onClick={e => setFlowAnchor(e.currentTarget)} />
                <Popover
                    id="next-flow-states"
                    open={Boolean(flowAnchor)}
                    anchorEl={flowAnchor}
                    onClose={() => setFlowAnchor(null)}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                >
                    <StateChangeList title="Actualizar Estado de Flujo" leadId={lead.id} options={nextFlowStates}
                        onClose={() => setFlowAnchor(null)} onChange={handleFlowChange} submit={changeFlowState} />
                </Popover>
            </>}

            {contactState && contactStates?.length > 0 && <>
                <CustomChip label={contactState.name} chipColor={contactState.color} onClick={e => setContactAnchor(e.currentTarget)} />
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
            </>}
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
    onClose: () => void,
    onChange: (lead: LeadDetailed) => void,
    submit: (leadId: number, stateId: number, notes?: string) => Promise<LeadDetailed>,
}

/**
 * Lista de posibles próximos estados (de flujo o de contacto). Al elegir uno, en vez de
 * cambiar al toque, muestra un campo de notas opcional antes de confirmar el cambio.
 */
const StateChangeList = ({ title, leadId, options, onClose, onChange, submit }: StateChangeListProps) => {

    const [selected, setSelected] = useState<StateOption | null>(null)
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
                <CommonButton actionType="CLOSE" variant="outlined" color="error" onClick={() => setSelected(null)} disabled={loading}>
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
