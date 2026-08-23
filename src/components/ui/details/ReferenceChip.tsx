import { Chip, type ChipProps } from '@mui/material'

interface ReferenceChipProps {
    reference: string
    size?: ChipProps['size']
    sx?: ChipProps['sx']
}

/**
 * Chip para mostrar la referencia de un lead -- usado en la tarjeta del tablero, el detalle del
 * lead y la columna "Referencia" de la tabla, para que se vea igual en los tres lugares (antes
 * cada uno la mostraba distinto: chip de color sólido en la tarjeta, texto suelto "ID: valor" en
 * el detalle, texto plano en la tabla).
 *
 * A propósito NO usa CustomChip: ese componente siempre pinta un relleno de color + borde de
 * color (pensado para etapa/etiquetas, donde el color identifica algo). La referencia no tiene
 * un color asociado, así que este chip usa el Chip de MUI "a secas" con variant="outlined" para
 * lograr un contorno real sobre fondo transparente (mismo criterio ya usado por el chip
 * "Agregar" de LeadTagsMenu.tsx).
 */
const ReferenceChip = ({ reference, size = "small", sx }: ReferenceChipProps) => (
    <Chip
        label={reference}
        size={size}
        variant="outlined"
        sx={{
            height: "auto",
            padding: "1px 0px",
            fontSize: size === "small" ? ".75rem" : ".875rem",
            fontWeight: 500,
            borderRadius: ".75rem",
            borderColor: "divider",
            color: "text.secondary",
            backgroundColor: "transparent",
            "& .MuiChip-label": { paddingLeft: "8px", paddingRight: "8px" },
            ...sx,
        }}
    />
)

export default ReferenceChip
