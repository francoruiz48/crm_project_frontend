import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { LeadPartialUpdate, getUpdatedLead, getValue, LeadFormFieldType, type PartialFormProps } from "./LeadPartialUpdate"
import { BoolValue, DateValue, ListValues, ModalValue, NumberValue, StringValue } from "../shared/LeadValueComponents"
import { LeadFieldTypeAvatar } from "features/leadFields/LeadFieldTypeIcon"
import { CommonIconButton } from "shared/ui/buttons/CommonIconButton"
import { CustomListItem } from "shared/ui/lists/CustomListItem"
import type { LeadFieldValueDetailed } from "src/types/leadFields"
import type { LeadDetailed } from "src/types/leads"
import type { LeadPostForm, LeadPostFormValues } from "../leadForm/LeadForm"
import { useModal } from "src/hooks/useModal"
import { useLoading } from "src/hooks/useLoading"
import { getFieldsBySections, getTypeOrSpecialTemplates } from "features/leadFields/leadFieldUtils"
import { updateLead } from "../leadService"
import { createFormDataFromLead } from "../leadUtils"
import { setFormErrors } from "src/utils/forms"
import { showToast } from "src/utils/feedback"
import { formatDate } from "src/utils/formatters"
import { DATE_INPUT_TYPE } from "../shared/LeadFormFields"
import { Accordion, AccordionDetails, Typography, Stack, List, ListItemText, Box } from "@mui/material"
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import GenericPaper from "src/components/layout/container/GenericPaper"
import { ColoredAccordionSummary } from "src/components/layout/container/ColoredHeaders"

// Tipos de campo que se editan con un clic directo sobre el valor + autoguardado al perder foco
// (ver InlineFieldEdit). El resto (SELECTOR, LEAD, FILE, CALCULATED, etc.) sigue con el lápiz +
// LeadPartialUpdate de siempre.
const SIMPLE_INLINE_TYPES = ["STRING", "NUMBER", "BOOL", "DATE", "DATE_TIME"]


interface LeadFieldSectionsProps {
    lead: LeadDetailed,
    updateLeadInfo: (lead: LeadDetailed, reloadAudits?: boolean) => void
}

export const LeadFieldSections = ({ lead, updateLeadInfo }: LeadFieldSectionsProps) => {

    //Para datos que necesitan un modal
    const { modalProps } = useModal()

    //Para seleccionar el campo para actualización parcial
    const [updatingFieldId, setUpdatingFieldId] = useState<number | null>(null)

    //Filtra leads para obtener los habilitados y con valor, ordenados por order
    const fieldValues = useMemo(() => {
        if (!lead?.field_values) return []
        return lead.field_values
            .filter(i => (i.field.active && i.active &&
                ((i.value && i.value !== "") || i.nomenclator_items?.length > 0 || i.related_leads?.length > 0)))
            .sort((a, b) => a.field.order - b.field.order)
    }, [lead])

    const fieldValuesBySection = useMemo(() => {
        return getFieldsBySections(fieldValues)
    }, [fieldValues])


    const [expanded, setExpanded] = useState<number | null>(0)

    const onExpand = (idx: number) => (
        (_: unknown, exp: boolean) => {
            if (!exp) setExpanded(null)
            else setExpanded(idx)
        }
    )

    return (
        <Box>
            {fieldValuesBySection.map((section, idx) =>
                <Accordion expanded={expanded === idx} onChange={onExpand(idx)} key={`section-${idx}`}
                    component={GenericPaper} elevation={0} sx={{ p: 0 }}>
                    <ColoredAccordionSummary expandIcon={<ArrowDropDownIcon />}
                        color={section?.sectionData?.color} isFirst={idx === 0}
                        aria-controls={`panel${idx + 1}-content`} id={`panel${idx + 1}-header`}>
                        <Typography variant="h2">{section.name}</Typography>
                    </ColoredAccordionSummary>
                    <AccordionDetails sx={{ paddingTop: 0 }}>
                        <List>
                            {section?.fields.map((fieldValue, idx) => {
                                //Los tipos simples se editan inline (clic + autoguardado), nunca pasan por LeadPartialUpdate
                                if (SIMPLE_INLINE_TYPES.includes(fieldValue.field.field_type_code)) {
                                    return <LeadFieldContent key={`field-${idx}`} fieldValue={fieldValue} modalProps={modalProps}
                                        lead={lead} updateLeadInfo={updateLeadInfo} />
                                }
                                return updatingFieldId !== fieldValue.field.id ?
                                    <LeadFieldContent key={`field-${idx}`} fieldValue={fieldValue} modalProps={modalProps}
                                        onToggleEdit={() => setUpdatingFieldId(fieldValue.field.id)} />
                                    : <LeadPartialUpdate key={`field-${idx}`} fieldValue={fieldValue} updateLeadInfo={updateLeadInfo}
                                        onClose={(id: number) => setUpdatingFieldId(prev => prev === id ? null : prev)} lead={lead} />
                            })}
                        </List >
                    </AccordionDetails>
                </Accordion >
            )}
            <Accordion expanded={expanded === -1} onChange={onExpand(-1)}
                component={GenericPaper} elevation={0} sx={{ p: 0 }}>
                <ColoredAccordionSummary color="info" isLast
                    expandIcon={<ArrowDropDownIcon />}
                    aria-controls="panel0-content" id="panel0-header">
                    <Typography variant="h2">Creación de Lead</Typography>
                </ColoredAccordionSummary>
                <AccordionDetails sx={{ paddingTop: 0 }}>
                    <List>
                        <LeadFieldContent value={lead?.created_at} fieldName="Fecha de Creación" type="DATE_TIME" />
                        {lead?.updated_at &&
                            <LeadFieldContent value={lead?.updated_at} fieldName="Fecha de Última Modificación" type="DATE_TIME" />
                        }
                    </List>
                </AccordionDetails>
            </Accordion>
        </Box>
    )
}

type LeadFieldProps = {
    value: string,
    type: string,
    fieldName: string | null
} | {
    fieldValue: LeadFieldValueDetailed,
    onToggleEdit?: () => void,
    modalProps: {
        openModalId?: string;
        handleOpen: (idModal: string) => void;
        handleClose: () => void;
    },
    //Solo vienen para los tipos simples (ver SIMPLE_INLINE_TYPES), que se editan inline en vez de con el lápiz
    lead?: LeadDetailed,
    updateLeadInfo?: (lead: LeadDetailed, reloadAudits?: boolean) => void,
}
// props + type permite separar entre value/type/fieldname para metadatos, o el resto para las secciones. Se discrimina por value
// En secciones se recuperan los datos desde fieldValue
export const LeadFieldContent = (props: LeadFieldProps) => {

    const isSectionInfo = "fieldValue" in props

    const fieldValue = isSectionInfo ? props.fieldValue : undefined
    const nomenclators = isSectionInfo ? props.fieldValue.nomenclator_items : undefined
    const leads = isSectionInfo ? props.fieldValue.related_leads : undefined
    const onToggleEdit = isSectionInfo ? props.onToggleEdit : undefined
    const subtypeCode = isSectionInfo ? props.fieldValue.field.field_subtype_code : undefined
    const templateCode = isSectionInfo ? props.fieldValue.field.field_template_code : undefined
    const modalProps = isSectionInfo ? props.modalProps : undefined
    const lead = isSectionInfo ? props.lead : undefined
    const updateLeadInfo = isSectionInfo ? props.updateLeadInfo : undefined

    const typeCode = isSectionInfo ? props.fieldValue.field.field_type_code : props.type
    const fieldName = isSectionInfo ? props.fieldValue.field.name : props.fieldName
    const value = isSectionInfo ? props.fieldValue.value : props.value

    const typeWithTemplates = getTypeOrSpecialTemplates(typeCode, templateCode)

    const isInlineEditable = Boolean(fieldValue && lead && updateLeadInfo &&
        SIMPLE_INLINE_TYPES.includes(typeCode) && fieldValue.field.is_visible)


    const component = (code?: string) => {
        switch (code) {
            //Templates especiales
            case "INSTAGRAM_USER":
            case "POSTAL_CODE":
            case "CREDIT_CARD_SIMPLE": return <StringValue value={`${value}`} subtype={code} />

            //Tipos de Field
            case "STRING": return <StringValue value={`${value}`} idModal={`${fieldValue?.field_id}-${fieldValue?.id}`}
                modalProps={modalProps} subtype={subtypeCode ?? undefined} />
            case "NUMBER": return <NumberValue value={typeof value === "string" ? Number(value) : undefined}
                subtype={subtypeCode!} ratingCounter />

            case "BOOL": return <BoolValue value={`${value}`} />

            case "DATE":
            case "DATE_TIME": return <DateValue date={`${value}`} subtype={subtypeCode ?? undefined} />

            case "SELECTOR": case "CHECKBOX":
                return <ListValues value={Array.isArray(nomenclators) ? nomenclators : []} idFieldValue={fieldValue?.id}
                    type="Selector" />
            case "LEAD":
                return <ListValues value={Array.isArray(leads) ? leads : []} idFieldValue={fieldValue?.id}
                    type="Lead" isNav />

            case "FILE": return <ModalValue value={`${value}`} idModal={`file-${fieldValue?.id}`} size="small"
                modalProps={modalProps} type={code} subtype={subtypeCode!} />

            default: return `${value}`
        }
    }

    return (
        <CustomListItem disablePadding
            secondaryAction={onToggleEdit &&
                <CommonIconButton title="Modificar" actionType="MODIFY" onClick={onToggleEdit}
                    size="small" tooltipSize="small" color="primary"
                    disabled={typeCode === "CALCULATED" || !fieldValue?.field.is_visible} />
            } >
            <LeadFieldTypeAvatar typeCode={typeWithTemplates} subtypeCode={subtypeCode} />
            <ListItemText sx={{ mr: 6 }}>
                <Stack>
                    <Typography variant="subtitle2" color="textSecondary">{fieldName}</Typography>
                    {isInlineEditable
                        ? <InlineFieldEdit fieldValue={fieldValue!} lead={lead!} updateLeadInfo={updateLeadInfo!}>
                            {component(typeWithTemplates) ?? <Typography variant="body2" color="text.disabled">Sin valor. Clic para cargar.</Typography>}
                        </InlineFieldEdit>
                        : component(typeWithTemplates)
                    }
                </Stack>
            </ListItemText>
        </CustomListItem>
    )
}

interface InlineFieldEditProps {
    fieldValue: LeadFieldValueDetailed,
    lead: LeadDetailed,
    updateLeadInfo: (lead: LeadDetailed, reloadAudits?: boolean) => void,
    children: ReactNode,
}

/**
 * Edición inline para campos de tipo simple (STRING, NUMBER, BOOL, DATE/DATE_TIME): un clic sobre
 * el valor lo convierte en el input correspondiente (mismo que usa LeadPartialUpdate, vía
 * LeadFormFieldType), y al perder foco se guarda automáticamente llamando al backend. Si no hubo
 * cambios, no se llama al backend. Con Escape se cancela sin guardar. El resto de los tipos
 * (SELECTOR, LEAD, FILE, etc.) sigue usando el lápiz + LeadPartialUpdate de siempre.
 */
const InlineFieldEdit = ({ fieldValue, lead, updateLeadInfo, children }: InlineFieldEditProps) => {

    const fieldData = fieldValue.field
    const [editing, setEditing] = useState(false)

    const defaultValues = useMemo(() => ({
        values: [{ field_id: fieldData.id, value: getValue(fieldValue) }]
    }), [fieldData.id, fieldValue])

    const { register, control, setValue, setError, handleSubmit, reset, formState: { errors } } = useForm<PartialFormProps>({ defaultValues })

    //Si el lead se actualiza desde afuera (ej. otro campo, o navegación) sincroniza el valor por defecto
    useEffect(() => { if (!editing) reset(defaultValues) }, [defaultValues, editing, reset])

    //Para DATE/DATE_TIME, el valor que devuelve el input (vía setValueAs de LeadFormDate) queda en un
    //formato distinto al que ya está guardado (ej. "YYYY-MM-DD" vs el ISO del backend), así que hay que
    //normalizar ambos con el mismo formato antes de comparar. Sin esto, cualquier fecha se guardaría de
    //nuevo aunque el usuario no la haya tocado.
    const normalizeForCompare = (value: unknown) => {
        if (value && (fieldData.field_type_code === "DATE" || fieldData.field_type_code === "DATE_TIME")) {
            const subtypeCode = (fieldData.field_subtype_code ?? "DATE_TIME") as keyof typeof DATE_INPUT_TYPE
            const format = DATE_INPUT_TYPE[subtypeCode]?.format
            if (format) return formatDate(`${value}`, "custom", format) ?? `${value}`
        }
        return `${value ?? ""}`
    }

    const onSubmit = async (data: PartialFormProps) => {
        const [primary] = data.values
        const original = getValue(fieldValue)
        //Si no cambió nada no llamamos al backend
        if (normalizeForCompare(primary.value) === normalizeForCompare(original)) {
            setEditing(false)
            return
        }
        const postData: LeadPostForm = {
            values: [{ field_id: primary.field_id, value: primary.value, fieldData } as LeadPostFormValues],
        }
        const formData = createFormDataFromLead(postData)
        return updateLead(formData, lead.id).then(res => {
            const newLead = getUpdatedLead(lead, res)
            if (!newLead) return
            updateLeadInfo(newLead, true)
            showToast(`Campo "${fieldData.name}" modificado con éxito.`)
            setEditing(false)
        }).catch((e) => {
            setFormErrors(e, setError, null, "values.0.value", true)
        })
    }

    const { fnWithLoading: submitLoad, loading } = useLoading(onSubmit)

    const handleCancel = () => {
        reset(defaultValues)
        setEditing(false)
    }

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Escape") handleCancel()
        //En textareas (HTML/MARKDOWN) Enter agrega una línea nueva, no confirma
        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
            e.preventDefault()
            handleSubmit(submitLoad)()
        }
    }

    if (!editing) return (
        <Box onClick={() => setEditing(true)} sx={{
            cursor: "pointer", borderRadius: 1, mx: -.5, px: .5,
            "&:hover": { backgroundColor: "action.hover" },
        }}>
            {children}
        </Box>
    )

    return (
        <Box onBlur={handleSubmit(submitLoad)} onKeyDown={onKeyDown}>
            <LeadFormFieldType register={register} control={control} setValue={setValue} name="values.0.value"
                leadField={fieldData} lead={lead} size="small" errorMessage={errors?.values?.[0]?.value?.message} />
            {loading && <Typography variant="caption" color="text.secondary">Guardando...</Typography>}
        </Box>
    )
}
