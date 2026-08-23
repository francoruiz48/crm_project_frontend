import { useState } from 'react'
import CommonButton from 'shared/ui/buttons/CommonButton'
import {
    Stack, Typography, List, ListItemButton, ListItemIcon, ListItemText, Checkbox, ButtonGroup,
} from '@mui/material'
import { BOARD_CARD_FIELD_OPTIONS, type BoardCardFieldCode } from '../boardCardFields'

interface LeadBoardCardFieldsSelectorProps {
    cardFields: BoardCardFieldCode[],
    handleCardFields: (fields: BoardCardFieldCode[], closeModal?: boolean) => void,
    handleClose: () => void,
}

/**
 * Análogo a LeadColumnSelector pero para el tablero: acá no hace falta orden (los elementos
 * de la tarjeta tienen una posición fija predefinida), solo mostrar/ocultar -- una lista simple
 * de checkboxes alcanza, sin el dual-list con drag and drop.
 */
export default function LeadBoardCardFieldsSelector({ cardFields, handleCardFields, handleClose }: LeadBoardCardFieldsSelectorProps) {
    const [selected, setSelected] = useState<BoardCardFieldCode[]>(cardFields)

    const toggle = (code: BoardCardFieldCode) => {
        setSelected(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
    }

    return (
        <Stack spacing={2}>
            <Typography variant="h2">Elementos de la Tarjeta</Typography>
            <Typography variant="body2" color="text.secondary">
                Elegí qué mostrar en cada tarjeta del tablero. El título del lead siempre se muestra.
            </Typography>
            <List dense>
                {BOARD_CARD_FIELD_OPTIONS.map(option => (
                    <ListItemButton key={option.code} onClick={() => toggle(option.code)}>
                        <ListItemIcon sx={{ pointerEvents: 'none' }}>
                            <Checkbox checked={selected.includes(option.code)} tabIndex={-1} disableRipple />
                        </ListItemIcon>
                        <ListItemText primary={option.label} sx={{ pointerEvents: 'none' }} />
                    </ListItemButton>
                ))}
            </List>
            <Stack sx={{ alignItems: 'end', width: '100%' }}>
                <ButtonGroup>
                    <CommonButton actionType="CLOSE" variant="outlined" onClick={() => handleClose()}>
                        Cancelar
                    </CommonButton>
                    <CommonButton actionType="OPTIONS" variant="contained" onClick={() => handleCardFields(selected, true)}>
                        Guardar Cambios
                    </CommonButton>
                </ButtonGroup>
            </Stack>
        </Stack>
    )
}
