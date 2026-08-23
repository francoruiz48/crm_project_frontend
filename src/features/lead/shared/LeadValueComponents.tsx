import { memo, useCallback, useMemo, useState } from 'react'
import { ChipTooltip } from 'shared/ui/details/ChipTooltip';
import CustomBar from 'shared/ui/details/CustomProgressBar';
import GenericModal from 'shared/layout/container/GenericModal';
import CommonButton from 'shared/ui/buttons/CommonButton';
import CustomChip from 'shared/ui/details/CustomChip';
import type { Lead } from 'src/types/leads';
import type { DateFormat } from 'src/types/shared';
import type { NomenclatorItem } from 'src/types/nomenclators';
import { getLeadTitleArray } from '../leadUtils';
import { formatDate, formatMoney, getFieldTypeValue, isValidURL, sanitizePhone } from 'src/utils/formatters';
import DOMPurify from 'dompurify';
import Markdown from 'react-markdown';
import { Link as RouterLink } from 'react-router-dom';
import { Box, IconButton, Rating, Stack, Typography } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import NewTabLink from 'src/components/ui/details/NewTabLink';
import { v4 } from 'uuid';

const CAPITALIZE_STYLE = { textTransform: "capitalize" }
const STOP_PROPAGATION = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => e.stopPropagation()

interface StringValueProps {
    value?: string,
    subtype?: string,
    allowShow?: boolean,
    modalProps?: {
        openModalId?: string;
        handleOpen?: (idModal: string) => void;
        handleClose: () => void;
    },
    idModal?: string,
    size?: "medium" | "small"
}

export const StringValue = ({ value, subtype, modalProps, idModal, size = "medium", allowShow = false }: StringValueProps) => {
    if (!value || value === "") return
    switch (subtype) {
        case "EMAIL": return <NewTabLink url={`mailto:${value}`} title={value} />

        case "URL":
        case "WEBSITE":
        case "SOCIAL_MEDIA":
        case "MAPS_URL": return <NewTabLink url={value} />
        case "INSTAGRAM_USER": return <InstagramLink value={value} />

        case "PHONE":
        case "LANDLINE":
        case "MOBILE": return <NewTabLink url={`tel:${sanitizePhone(value)}`} title={value} />

        case "WHATSAPP": return <NewTabLink title={value}
            url={`https://wa.me/${sanitizePhone(value)}`} />

        case "SIMPLE_ADDRESS":
        case "POSTAL_CODE":
        case "COORDINATES": return <NewTabLink title={value}
            url={`https://www.google.com/maps/search/${value?.replaceAll(" ", "+")}`} />

        case "MARKDOWN":
        case "HTML": return <ModalValue modalProps={modalProps} idModal={idModal ?? v4()}
            type='STRING' subtype={subtype} value={value} size={size} />

        case "PASSWORD": return <HiddenValue value={value} allowShow={allowShow} />
        case "CREDIT_CARD_SIMPLE": return <CardValue value={value} allowShow={allowShow} />

        default: return value
    }
}

export const InstagramLink = ({ value }: { value: string }) => {
    const hasAt = value.charAt(0) === "@"
    const url = isValidURL(value) ? value : `https://www.instagram.com/${hasAt ? value.slice(1) : value}`
    return <NewTabLink url={url} title={value} />
}

export const HiddenValue = ({ value, hiddenValue = "●●●●●●●●", allowShow = false }: { value: string, hiddenValue?: string, allowShow?: boolean }) => {
    const [showPassword, setShowPassword] = useState<boolean>(false);
    return (
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <div style={CAPITALIZE_STYLE}>{showPassword ? value : hiddenValue}</div>
            {allowShow &&
                <IconButton color="primary" size="small" onClick={() => setShowPassword(prev => !prev)}>
                    {showPassword ?
                        <VisibilityOffIcon /> : <VisibilityIcon />
                    }
                </IconButton>}
        </Stack>
    )
}

export const CardValue = ({ value, allowShow = false }: { value: string, allowShow?: boolean }) => {
    return <HiddenValue
        value={`${value.substring(0, 4)}-${value.substring(4, 8)}-${value.substring(8, 12)}-${value.slice(-4)}`}
        hiddenValue={`●●●●-●●●●-●●●●-${value?.slice(-4)}`} allowShow={allowShow} />
}

interface ModalProps {
    modalProps?: {
        openModalId?: string;
        handleOpen?: (idModal: string) => void;
        handleClose: () => void;
    }
    idModal: string,
    type: string,
    subtype?: string | null,
    value: string,
    size?: "small" | "medium"
}

export const ModalValue = ({ modalProps, idModal, type, subtype, value, size = "medium" }: ModalProps) => {
    const getBtnText = () => {
        switch (type) {
            case "STRING": return subtype === "HTML" ? "Ver HTML" : "Ver Markdown"
            case "FILE": return subtype === "FILE_IMAGE" ? "Ver Imagen" : "Ver Documento"
            default: return "Ver Contenido"
        }
    }
    if (!modalProps) return

    return (
        <GenericModal idModal={idModal} {...modalProps} btnProps={{ size: size, sx: { width: "max-content" }, actionType: 'DETAILS' }}
            buttonText={getBtnText()} sx={{ minWidth: "80vw" }} >
            <ModalValueContent subtype={subtype} value={value} />
            <CommonButton actionType='CLOSE' variant="outlined"
                sx={{ marginLeft: "auto" }} onClick={() => modalProps!.handleClose()}>
                Cerrar Modal
            </CommonButton>
        </GenericModal>
    )
}
interface ModalContentProps {
    subtype?: string | null;
    value: string;
}
const ModalValueContent = ({ subtype, value }: ModalContentProps) => {

    switch (subtype) {
        case "HTML": {
            const purifiedHTML = DOMPurify.sanitize(value)
            return purifiedHTML
                ? <div style={{ paddingLeft: ".5rem" }} dangerouslySetInnerHTML={{ __html: purifiedHTML }} />
                : <Typography variant="body1" color="error">Contenido HTML no seguro, no se puede mostrar.</Typography>
        }
        case "MARKDOWN": {
            return <Markdown >{value}</Markdown>
        }
        case "FILE_IMAGE": {
            return <img src={value} alt={"Imagen adjunta."} />
        }
        case "FILE_DOCUMENT": {
            return <Box component="iframe" src={value}
                width="100%" height="600px" sx={{ border: "none" }} />
        }
        default: return "Tipo de contenido no soportado."
    }
}

interface NumberValueProps {
    value?: number,
    subtype?: string,
    size?: "medium" | "small",
    ratingCounter?: boolean,
    ratingTooltip?: boolean,
}

export const NumberValue = ({ value, subtype, size = "medium", ratingCounter = false, ratingTooltip = false }: NumberValueProps) => {
    // Bug real encontrado 2026-08-11: `!value` trataba 0 como "sin valor" (ej. una Calificación
    // Estrellas en 0, un valor real y válido) y no renderizaba nada -- sin mostrar tampoco el
    // placeholder de "Sin valor" (ver LeadDetailsSections.tsx, que para NUMBER siempre arma este
    // componente en vez de caer en el placeholder cuando corresponde).
    if (value === undefined || isNaN(value)) return

    switch (subtype) {
        case "MONEY": return formatMoney(value)
        case "PERCENTAGE": return `${value}%`
        case "STAR_RATING":
        case "NPS":
        case "SCORE": return <RatingValue value={value} subtype={subtype} size={size}
            counter={ratingCounter} tooltip={ratingTooltip} />

        default: return value
    }
}

interface RatingProps {
    value: number,
    subtype?: string | null,
    counter?: boolean,
    tooltip?: boolean,
    size?: "small" | "medium"
}

export const RatingValue = memo(({ value, subtype, counter = false, tooltip = false, size = "medium" }: RatingProps) => {

    if (!subtype || !["STAR_RATING", "NPS", "SCORE"].includes(subtype)) return

    const normaliseNPS = (value: number) => ((value - 1) * 100) / (10 - 1);

    return (
        <ChipTooltip show={tooltip} title={value} >
            <Stack direction="row" spacing={1} sx={{ lineHeight: 0, alignItems: "center", width: "auto" }}>
                {subtype === "STAR_RATING" &&
                    <Rating value={Number(value)} size={size} name="read-only" readOnly />
                }
                {subtype === "NPS" &&
                    <CustomBar value={normaliseNPS(Number(value))} variant="determinate" />
                }
                {subtype === "SCORE" &&
                    <CustomBar value={Number(value)} variant="determinate" />
                }
                {counter &&
                    <CustomChip label={value} chipColor="secondary" />
                }
            </Stack >
        </ChipTooltip>
    )
})

interface BoolValueProps {
    value: string,
    size?: "medium" | "small"
}

export const BoolValue = memo(({ value, size = "medium" }: BoolValueProps) => {
    const boolValue = useMemo(() => getFieldTypeValue("BOOL", value), [value])
    return (
        <CustomChip chipColor={boolValue ? "success" : "error"} size={size} sx={{ fontWeight: "bold" }}
            label={boolValue ?
                <Stack direction="row" spacing={.5}><CheckIcon fontSize={size} /><span> Si</span></Stack>
                : <Stack direction="row" spacing={.5}><CloseIcon fontSize={size} /><span> No</span></Stack>
            } />
    )
})

interface DateValueProps {
    date: string,
    subtype?: string,
    short?: boolean
}

export const DateValue = ({ date, subtype, short = false }: DateValueProps) => {
    let formatType: DateFormat

    switch (subtype) {
        case "TIME_ONLY": formatType = "time"; break
        case "DATE_TIME":
        case "DATE_EVENT": formatType = short ? "dateTime" : "dateTimeLong"; break
        default: formatType = short ? "date" : "dateLong"; break
    }
    return (
        <div style={CAPITALIZE_STYLE}>
            {formatDate(date, formatType)}
        </div>
    )
}

interface ListValuesProps {
    value: Lead[] | NomenclatorItem[];
    idFieldValue?: number,
    type: "Lead" | "Selector";
    maxItems?: number | false;
    isNav?: boolean;
    shortTitle?: boolean
}

export const ListValues = memo(({ value, idFieldValue, type, maxItems = false, isNav = false, shortTitle = false }: ListValuesProps) => {

    const visibleItems = useMemo(() => {
        const limit = typeof maxItems === "number" ? maxItems : undefined
        return value.slice(0, limit)
    }, [value, maxItems])

    const overflowCount = useMemo(() => {
        if (!maxItems) return 0
        return value.length > maxItems ? value.length - maxItems : 0
    }, [value.length, maxItems])

    const getLabel = useCallback((val: Lead | NomenclatorItem) => {
        if (type === "Selector") return `${(val as NomenclatorItem).value}`
        return getLeadTitleArray(val as Lead, shortTitle).join(" ")
    }, [type, shortTitle])

    const getLink = useCallback((val: Lead | NomenclatorItem) => {
        if (type === "Lead") return `/leads/${val.id}`
        else return `/nomenclators/${(val as NomenclatorItem).nomenclator_id}?selected=${val.id}`
    }, [type])

    if (value.length === 0) return "---"

    return (
        <Stack direction="row" spacing={.5} useFlexGap sx={{ flexWrap: "wrap" }}>
            {visibleItems.map(val => {
                //Un lead relacionado (campo tipo LEAD) puede pertenecer a una campaña a la que el
                //usuario actual no tiene acceso. El backend ya lo redacta (related_leads viene con
                //restricted=true y field_values recortado a solo los campos title_order, ver
                //RelatedLeadResponse) — acá solo evitamos el link de navegación (llevaría a un 404)
                //y avisamos por qué con un tooltip, en vez de dejarlo como un chip normal.
                const restricted = type === "Lead" && Boolean((val as Lead).restricted)
                return (
                    <ChipTooltip key={`${idFieldValue}-${val.id}`} show={restricted}
                        title="No tenés acceso a la campaña de este lead." color="secondary" size="small">
                        <CustomChip
                            label={getLabel(val)} title={restricted ? undefined : getLabel(val)}
                            icon={restricted ? <LockIcon fontSize="inherit" /> : undefined}
                            chipColor="secondary" size="small"
                            {...(isNav && !restricted && {
                                component: RouterLink, to: getLink(val),
                                onClick: STOP_PROPAGATION
                            })}
                        />
                    </ChipTooltip>
                )
            })}
            {overflowCount > 0 &&
                <CustomChip chipColor="secondary" size="small"
                    label={`${overflowCount} más`} />
            }
        </Stack>
    )
})
