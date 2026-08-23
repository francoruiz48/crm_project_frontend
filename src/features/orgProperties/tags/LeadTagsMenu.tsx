import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CustomChip from 'shared/ui/details/CustomChip'
import { useLoading } from 'src/hooks/useLoading'
import type { LeadDetailed } from 'src/types/leads'
import { showCommonErrorToast } from 'src/utils/feedback'
import { Box, Chip, List, ListItemButton, Paper, Stack, TextField, Typography } from '@mui/material'
import AddIcon from "@mui/icons-material/Add"
import SellIcon from "@mui/icons-material/Sell"
// Alternativas de ícono para "Etiquetas", por si se prefiere cambiar más adelante:
// import LocalOfferIcon from "@mui/icons-material/LocalOffer"
// import LabelIcon from "@mui/icons-material/Label"
import { InlineColorPickerButton } from 'src/components/ui/forms/ColorPicker'
import { createTag, getTags } from './LeadTagService'
import type { LeadTag } from 'src/types/orgProperties'
import { updateLeadTags } from 'src/features/lead/leadService'
import { Can } from 'src/components/auth/Can'
import { useUserContext } from 'src/stores/UserContext'

//Color por defecto del picker cuando el usuario todavía no eligió ninguno (un gris azulado neutro,
//para no confundirse con los colores "primary"/"secondary" que ya usa el resto de la app).
const DEFAULT_TAG_COLOR = "#64748B"

//Mismo estilo que SECTION_LABEL_SX de LeadDetailsState.tsx (Estado/Etapa), para que el
//título "Etiquetas" quede visualmente igual a esos otros títulos de sección.
const SECTION_LABEL_SX = { fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".04em" }

export const LeadTags = ({ lead, updateLeadInfo }: { lead: LeadDetailed, updateLeadInfo: (lead: LeadDetailed) => void }) => {

    const { hasPermission } = useUserContext()
    const canUpdateLead = hasPermission("lead:update")

    //Cache local de las etiquetas ya creadas en la organización, para poder reutilizar una etiqueta
    //existente (por nombre) en vez de crear una duplicada, y para ofrecerlas como sugerencias
    //mientras se escribe.
    const [tagList, setTagList] = useState<LeadTag[]>([])

    const fetchTags = useCallback(() => {
        return getTags({ only_active: true, page_size: 0 })
            .then(res => setTagList(res.items))
            .catch(e => showCommonErrorToast(e, "No se han podido recuperar las etiquetas."))
    }, [])

    const { fnWithLoading: fetchTagsLoad, loading: loadingTags } = useLoading(fetchTags)

    useEffect(() => {
        fetchTagsLoad()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    //Etiquetas que todavía no están asignadas a este lead (no tiene sentido sugerir una que ya tiene).
    const availableTags = useMemo(() =>
        tagList.filter(tag => !lead.tags.some(leadTag => leadTag.id === tag.id)),
        [tagList, lead.tags])

    const handleLeadTagUpdate = (tags: LeadTag[]) => updateLeadInfo({ ...lead, tags })

    /** Saca un tag puntual del lead (no borra la etiqueta en sí, solo la desasigna) */
    const handleUnassignTag = (tagToRemove: LeadTag) => {
        if (!canUpdateLead) return
        const newTagIds = lead.tags.filter(tag => tag.id !== tagToRemove.id).map(tag => tag.id)
        return updateLeadTags(newTagIds, lead.id)
            .then(res => handleLeadTagUpdate(res.tags))
            .catch(e => showCommonErrorToast(e))
    }

    /** Asigna al lead una etiqueta ya existente (elegida de las sugerencias), sin crear nada nuevo. */
    const handleAssignExisting = (tag: LeadTag) => {
        const newTagIds = [...lead.tags.map(t => t.id), tag.id]
        return updateLeadTags(newTagIds, lead.id)
            .then(res => handleLeadTagUpdate(res.tags))
            .catch(e => showCommonErrorToast(e))
    }

    /**
     * Confirma el nombre escrito a mano (Enter o clic afuera, sin haber elegido una sugerencia). Si
     * ya existe una etiqueta con ese nombre (sin importar mayúsculas) en la organización, se reutiliza
     * esa (se ignora el color elegido) en vez de crear una duplicada.
     */
    const handleCreateOrAssign = (name: string, color: string) => {
        const trimmed = name.trim()
        if (!trimmed) return

        const alreadyAssigned = lead.tags.some(tag => tag.name.toLowerCase() === trimmed.toLowerCase())
        if (alreadyAssigned) return

        const existing = tagList.find(tag => tag.name.toLowerCase() === trimmed.toLowerCase())
        if (existing) return handleAssignExisting(existing)

        return createTag({ name: trimmed, color }).then(newTag => {
            setTagList(prev => [...prev, newTag])
            return handleAssignExisting(newTag)
        }).catch(e => showCommonErrorToast(e))
    }

    return (
        <Stack spacing={.5}>
            <Stack direction="row" spacing={.5} sx={{ alignItems: "center", color: "text.secondary" }}>
                <SellIcon fontSize="small" />
                <Typography variant="caption" color="text.secondary" sx={SECTION_LABEL_SX}>Etiquetas</Typography>
            </Stack>
            <Stack direction="row" spacing={.75} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center", width: "100%" }}>
                {lead.tags.map(tag =>
                    <CustomChip key={`lead-${tag.id}`} size="small" chipColor={tag.color} defaultColor="secondary"
                        label={tag.name} squared onDelete={canUpdateLead ? () => handleUnassignTag(tag) : undefined} />
                )}
                <Can permission="lead:update">
                    <InlineTagAdder tagList={availableTags} onCreateOrAssign={handleCreateOrAssign}
                        onSelectExisting={handleAssignExisting} disabled={loadingTags} />
                </Can>
            </Stack>
        </Stack>
    )
}

interface InlineTagAdderProps {
    //Etiquetas disponibles (de la organización, que el lead todavía no tiene) para sugerir mientras se escribe.
    tagList: LeadTag[]
    onCreateOrAssign: (name: string, color: string) => void
    onSelectExisting: (tag: LeadTag) => void
    disabled?: boolean
}

/**
 * Chip "Agregar" que, al hacer clic, se convierte en un campo de texto + un botón de color al
 * costado. Mientras se escribe, se sugieren etiquetas existentes con nombre similar para elegir en
 * vez de crear una nueva. Enter o clic afuera (con texto cargado, sin elegir sugerencia) crea/asigna
 * la etiqueta escrita; Escape cancela.
 */
const InlineTagAdder = ({ tagList, onCreateOrAssign, onSelectExisting, disabled = false }: InlineTagAdderProps) => {
    const [adding, setAdding] = useState(false)
    const [draft, setDraft] = useState("")
    const [color, setColor] = useState(DEFAULT_TAG_COLOR)
    //Mientras el popover del color está abierto, hay que ignorar el blur del campo de texto (si no,
    //se cerraría el campo justo al intentar abrir el selector de color).
    const [pickerOpen, setPickerOpen] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const trimmedDraft = draft.trim()
    const suggestions = trimmedDraft
        ? tagList.filter(tag => tag.name.toLowerCase().includes(trimmedDraft.toLowerCase()))
        : []

    const reset = () => {
        setAdding(false)
        setDraft("")
        setColor(DEFAULT_TAG_COLOR)
    }

    const confirm = () => {
        const value = trimmedDraft
        reset()
        if (value) onCreateOrAssign(value, color)
    }

    const selectSuggestion = (tag: LeadTag) => {
        reset()
        onSelectExisting(tag)
    }

    if (!adding) {
        //CustomChip (usado para los tags en sí) pinta siempre un relleno de color + borde de color,
        //sin importar el `variant` que se le pase — por eso este botón usa el Chip de MUI "a secas",
        //para lograr un contorno realmente trazado (outlined + dashed) sobre fondo transparente. Se
        //replican a mano el padding/alto/fontSize/radio que usa CustomChip en tamaño "small" para que
        //este chip quede del mismo tamaño que las etiquetas de al lado.
        return (
            <Chip icon={<AddIcon fontSize="inherit" />} label="Agregar" size="small" variant="outlined"
                onClick={disabled ? undefined : () => setAdding(true)}
                sx={{
                    // Mismo radio "squared" que ahora usan los tags de al lado (ver CustomChip),
                    // para que este chip quede visualmente consistente con ellos.
                    height: "auto", padding: "1px 0px", fontSize: ".75rem", fontWeight: 500, borderRadius: ".375rem",
                    borderStyle: "dashed", color: "text.secondary", cursor: disabled ? "default" : "pointer",
                    "& .MuiChip-label": { paddingLeft: "8px", paddingRight: "8px" },
                }} />
        )
    }

    return (
        <Box sx={{ position: "relative" }}>
            <Stack direction="row" spacing={.5} sx={{ alignItems: "center" }}>
                <TextField
                    inputRef={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={() => { if (!pickerOpen) confirm() }}
                    autoFocus
                    size="small"
                    placeholder="Nueva etiqueta"
                    aria-label="Nueva etiqueta"
                    onKeyDown={e => {
                        const native = e.nativeEvent as unknown as { isComposing?: boolean, keyCode?: number }
                        if (e.key === "Enter") {
                            if (native.isComposing || native.keyCode === 229) return
                            e.preventDefault()
                            confirm()
                        }
                        if (e.key === "Escape") reset()
                    }}
                    sx={{ width: 160, "& .MuiInputBase-input": { py: .5, fontSize: 13 } }}
                />
                <InlineColorPickerButton color={color} onChange={setColor} ariaLabel="Elegir color de etiqueta"
                    onOpenChange={open => {
                        setPickerOpen(open)
                        //Al cerrar el picker (con el check, o clickeando afuera de él), el foco vuelve
                        //al campo de texto para poder seguir escribiendo el nombre de la etiqueta.
                        if (!open) requestAnimationFrame(() => inputRef.current?.focus())
                    }} />
            </Stack>
            {suggestions.length > 0 && (
                <Paper elevation={3} sx={{
                    position: "absolute", top: "100%", left: 0, mt: .5, zIndex: 20,
                    minWidth: 180, maxWidth: 260, maxHeight: 220, overflowY: "auto"
                }}>
                    <List dense disablePadding>
                        {suggestions.map(tag => (
                            <ListItemButton key={tag.id} dense
                                //Evita que el blur del campo de texto cierre todo antes de que llegue a
                                //procesarse el clic sobre la sugerencia.
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => selectSuggestion(tag)}>
                                <CustomChip size="small" chipColor={tag.color} label={tag.name} squared sx={{ pointerEvents: "none" }} />
                            </ListItemButton>
                        ))}
                    </List>
                </Paper>
            )}
        </Box>
    )
}
