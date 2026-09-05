import { Box, Paper, Stack, Tooltip, useTheme } from "@mui/material"
import type { ReactNode } from "react"
import { CommonCRMText, CommonCRMTitle } from "src/components/ui/details/CommonText"
import type { LeadIndicators as LeadIndicatorsType } from "src/types/leads"
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import HourglassBottomOutlinedIcon from '@mui/icons-material/HourglassBottomOutlined'
import ContactPageOutlinedIcon from '@mui/icons-material/ContactPageOutlined'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined'
import SwapVertOutlinedIcon from '@mui/icons-material/SwapVertOutlined'

interface LeadIndicatorsProps {
    indicators?: LeadIndicatorsType | null
}

const formatDays = (days: number | null | undefined): string => {
    if (days === null || days === undefined) return "—"
    if (days <= 0) return "Hoy"
    if (days === 1) return "1 d"
    return `${days} d`
}

interface IndicatorCardDef {
    label: string
    value: string
    // Explicación de qué mide el indicador, se muestra en el tooltip al pasar el mouse.
    description: string
    icon: ReactNode
}

// Ancho mínimo de cada card: lo suficiente para que labels largos ("Primer contacto",
// "Idas y vueltas") entren en una sola línea sin cortarse en la mayoría de los anchos de
// pantalla; si no entra, el grid de abajo hace que la card baje de fila (responsive) en vez
// de achicarla.
const CARD_MIN_WIDTH = "10.5rem"

/** Card individual de indicador: chip de ícono + label arriba, valor destacado abajo. */
const IndicatorCard = ({ label, value, description, icon }: IndicatorCardDef) => {
    const { palette } = useTheme()
    return (
        <Tooltip title={description} arrow enterDelay={400} placement="top">
            <Paper variant="outlined"
                sx={{
                    p: 1.5, borderRadius: 2, minWidth: CARD_MIN_WIDTH, cursor: "default",
                    transition: "border-color .15s",
                    "&:hover": { borderColor: palette.primary.main },
                }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: .75 }}>
                    <Box sx={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 26, height: 26, borderRadius: 1.5, flexShrink: 0,
                        bgcolor: `${palette.primary.main}18`,
                        color: palette.primary.main,
                    }}>
                        {icon}
                    </Box>
                    {/* Sin nowrap/ellipsis: si el ancho lo aprieta, el label pasa a 2 líneas en vez
                    de cortarse -- la card crece de alto y no pierde información. */}
                    <CommonCRMText size="sm" color="textSecondary" sx={{ lineHeight: 1.25 }}>
                        {label}
                    </CommonCRMText>
                </Stack>
                <CommonCRMTitle titleLevel="h4" component="p" font="display">{value}</CommonCRMTitle>
            </Paper>
        </Tooltip>
    )
}

const ICON_PROPS = { fontSize: "small" as const }

/**
 * Primera tanda de indicadores fijos del lead individual (aún no editables por el usuario --
 * ver diseño del módulo de Reportes/Indicadores, 2026-08-15). Se calculan en el backend en
 * tiempo real (LeadService._build_lead_indicators) y llegan en lead.indicators.
 */
export const LeadIndicators = ({ indicators }: LeadIndicatorsProps) => {
    if (!indicators) return null

    const items: IndicatorCardDef[] = [
        {
            label: "Antigüedad", value: formatDays(indicators.days_since_created),
            description: "Días transcurridos desde que se creó el lead.",
            icon: <AccessTimeOutlinedIcon {...ICON_PROPS} />,
        },
        {
            label: "Estado actual", value: formatDays(indicators.days_in_current_state),
            description: "Días desde el último cambio de etapa del flujo de este lead.",
            icon: <HourglassBottomOutlinedIcon {...ICON_PROPS} />,
        },
        {
            label: "Primer contacto",
            value: indicators.days_to_first_contact === null ? "Sin contactar" : formatDays(indicators.days_to_first_contact),
            description: indicators.days_to_first_contact === null
                ? "Todavía no se registró ningún cambio de estado de contacto para este lead."
                : "Días entre la creación del lead y el primer cambio de estado de contacto registrado.",
            icon: <ContactPageOutlinedIcon {...ICON_PROPS} />,
        },
        {
            label: "Interacciones", value: `${indicators.interactions_count}`,
            description: "Comentarios más eventos registrados (creación, reasignaciones, cambios de estado, edición de campos).",
            icon: <ChatBubbleOutlineOutlinedIcon {...ICON_PROPS} />,
        },
        {
            label: "Sin actividad", value: formatDays(indicators.days_since_last_activity),
            description: "Días desde el último comentario o evento registrado en este lead.",
            icon: <EventBusyOutlinedIcon {...ICON_PROPS} />,
        },
        {
            label: "Idas y vueltas", value: `${indicators.back_and_forth_count}`,
            description: "Cantidad de veces que el lead volvió a una etapa del flujo en la que ya había estado antes.",
            icon: <SwapVertOutlinedIcon {...ICON_PROPS} />,
        },
    ]

    return (
        <Stack spacing={1.5}>
            <CommonCRMText size="xs" color="textSecondary" sx={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: ".04em" }}>
                Indicadores del lead
            </CommonCRMText>
            <Box sx={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fit, minmax(${CARD_MIN_WIDTH}, 1fr))`,
                gap: 1.25,
            }}>
                {items.map(item => <IndicatorCard key={item.label} {...item} />)}
            </Box>
        </Stack>
    )
}
