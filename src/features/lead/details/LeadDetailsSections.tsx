import { useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { getUpdatedLead, getValue, LeadFormFieldType, useFieldCascade, type PartialFormProps } from "./LeadPartialUpdate"
import { BoolValue, DateValue, ListValues, ModalValue, NumberValue, StringValue } from "../shared/LeadValueComponents"
import { LeadFieldTypeAvatar } from "features/leadFields/LeadFieldTypeIcon"
import { CommonIconButton } from "shared/ui/buttons/CommonIconButton"
import { CustomListItem } from "shared/ui/lists/CustomListItem"
import type { LeadFieldDetailed, LeadFieldValueDetailed } from "src/types/leadFields"
import type { LeadDetailed } from "src/types/leads"
import type { LeadPostForm, LeadPostFormValues } from "../leadForm/LeadForm"
import { useModal } from "src/hooks/useModal"
import { useLoading } from "src/hooks/useLoading"
import { getFieldsBySections, getTypeOrSpecialTemplates } from "features/leadFields/leadFieldUtils"
import { updateLead } from "../leadService"
import { createFormDataFromLead } from "../leadUtils"
import { setFormErrors } from "src/utils/forms"
import { showCommonErrorToast, showToast } from "src/utils/feedback"
import { formatDate } from "src/utils/formatters"
import { DATE_INPUT_TYPE } from "../shared/LeadFormFields"
import { Accordion, AccordionDetails, Typography, Stack, List, ListItemText, Box, TextField } from "@mui/material"
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import GenericPaper from "src/components/layout/container/GenericPaper"
import { ColoredAccordionSummary } from "src/components/layout/container/ColoredHeaders"
import { updateFieldSection } from "../../orgProperties/fieldSections/fieldSectionsServices"
import { stopPropagationEvent } from "src/utils/lists"

interface LeadFieldSectionsProps {
    lead: LeadDetailed,
    updateLeadInfo: (lead: LeadDetailed, reloadAudits?: boolean) => void
}

export const LeadFieldSections = ({ lead, updateLeadInfo }: LeadFieldSectionsProps) => {

    //Para datos que necesitan un modal
    const { modalProps } = useModal()

    //Filtra los campos habilitados, ordenados por order. Antes también exigía tener un valor cargado,
    //lo que ocultaba por completo los campos vacíos y no dejaba forma de completarlos (la edición
    //inline no tiene ya un flujo aparte de "agregar campo"). Ahora se listan igual, mostrando el
    //placeholder "Sin valor. Clic para cargar." (ver LeadFieldContent) para que se puedan cargar.
    const fieldValues = useMemo(() => {
        if (!lead?.field_values) return []
        return lead.field_values
            .filter(i => i.field.active && i.active)
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

    //-------------------------- Renombrar sección con doble clic sobre su nombre --------------------------
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null)
    const [editingSectionName, setEditingSectionName] = useState("")

    const startEditingSectionName = (sectId: number, currentName: string) => {
        setEditingSectionId(sectId)
        setEditingSectionName(currentName)
    }

    const cancelEditingSectionName = () => {
        setEditingSectionId(null)
        setEditingSectionName("")
    }

    const saveEditingSectionName = (sectId: number, currentColor: string | undefined, originalName: string) => {
        const trimmed = editingSectionName.trim()
        //Sin cambios (o vacío): no hace falta llamar al backend.
        if (!trimmed || trimmed === originalName) return cancelEditingSectionName()
        //Sale del modo edición de forma optimista, antes de esperar la respuesta: si no, un Enter
        //seguido de un blur casi inmediato dispararía el guardado dos veces.
        cancelEditingSectionName()
        return updateFieldSection({ name: trimmed, color: currentColor ?? "primary" }, sectId)
            .then(res => {
                //Actualiza el nombre de la sección en todos los field_values del lead que la
                //referencian (no hace falta refetchear el lead completo).
                updateLeadInfo({
                    ...lead,
                    field_values: lead.field_values.map(fv =>
                        fv.field.lead_field_section.id === sectId
                            ? { ...fv, field: { ...fv.field, lead_field_section: { ...fv.field.lead_field_section, name: res.name } } }
                            : fv
                    )
                })
            })
            .catch(e => showCommonErrorToast(e, "No se ha podido renombrar la sección"))
    }

    return (
        <Box>
            {fieldValuesBySection.map((section, idx) =>
                <Accordion expanded={expanded === idx} onChange={onExpand(idx)} key={`section-${idx}`}
                    component={GenericPaper} elevation={0} sx={{ p: 0 }}>
                    <ColoredAccordionSummary expandIcon={<ArrowDropDownIcon />}
                        color={section?.sectionData?.color} isFirst={idx === 0} isLast={idx === fieldValuesBySection.length - 1}
                        aria-controls={`panel${idx + 1}-content`} id={`panel${idx + 1}-header`}>
                        {editingSectionId === section.id ? (
                            <TextField
                                autoFocus
                                variant="standard"
                                value={editingSectionName}
                                onChange={e => setEditingSectionName(e.target.value)}
                                //Evita que el clic/doble-clic dentro del campo (posicionar el cursor,
                                //seleccionar texto) burbujee hasta el AccordionSummary y pliegue/despliegue
                                //la sección mientras se está escribiendo.
                                onClick={stopPropagationEvent()}
                                onDoubleClick={stopPropagationEvent()}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        saveEditingSectionName(section.id, section.sectionData?.color, section.name)
                                    }
                                    if (e.key === "Escape") {
                                        e.preventDefault()
                                        cancelEditingSectionName()
                                    }
                                }}
                                onBlur={() => saveEditingSectionName(section.id, section.sectionData?.color, section.name)}
                                sx={{ "& .MuiInputBase-input": { fontSize: "1.5rem", fontWeight: 500 } }} />
                        ) : (
                            <Typography variant="h2" sx={{ cursor: "text" }}
                                //El nombre de la sección deja de reaccionar al clic simple (no
                                //pliega/despliega si se toca justo el texto), para que un doble clic
                                //pueda entrar en modo edición sin que el acordeón parpadee abriéndose y
                                //cerrándose de paso. El resto del encabezado sigue plegando/desplegando
                                //con un clic normal.
                                onClick={stopPropagationEvent()}
                                onDoubleClick={stopPropagationEvent(() => startEditingSectionName(section.id, section.name))}>
                                {section.name}
                            </Typography>
                        )}
                    </ColoredAccordionSummary>
                    <AccordionDetails sx={{ paddingTop: 0 }}>
                        <List>
                            {/* Todos los campos (de cualquier tipo) se editan inline: clic sobre el valor
                                (o el lápiz aparte, en el caso de FILE) + autoguardado al perder foco o Enter. */}
                            {section?.fields.map((fieldValue, idx) =>
                                <LeadFieldContent key={`field-${idx}`} fieldValue={fieldValue} modalProps={modalProps}
                                    lead={lead} updateLeadInfo={updateLeadInfo} />
                            )}
                        </List >
                    </AccordionDetails>
                </Accordion >
            )}
        </Box>
    )
}

type LeadFieldProps = {
    value: string,
    type: string,
    fieldName: string | null
} | {
    fieldValue: LeadFieldValueDetailed,
    modalProps: {
        openModalId?: string;
        handleOpen: (idModal: string) => void;
        handleClose: () => void;
    },
    //NOTA: la variante {value, type, fieldName} de este union sigue existiendo por tipado, pero ya
    //no tiene ningún uso real en la app (se usaba solo para los metadatos fijos de "Creación de
    //Lead", ver log del 2026-07-14, que se sacaron por pedido del usuario). Queda como candidato a
    //limpieza si más adelante se simplifica LeadFieldContent para que solo maneje fieldValue.
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
    const subtypeCode = isSectionInfo ? props.fieldValue.field.field_subtype_code : undefined
    const templateCode = isSectionInfo ? props.fieldValue.field.field_template_code : undefined
    const modalProps = isSectionInfo ? props.modalProps : undefined
    const lead = isSectionInfo ? props.lead : undefined
    const updateLeadInfo = isSectionInfo ? props.updateLeadInfo : undefined

    const typeCode = isSectionInfo ? props.fieldValue.field.field_type_code : props.type
    const fieldName = isSectionInfo ? props.fieldValue.field.name : props.fieldName
    const value = isSectionInfo ? props.fieldValue.value : props.value

    const typeWithTemplates = getTypeOrSpecialTemplates(typeCode, templateCode)

    //Un campo tipo LEAD puede tener entre sus valores un lead de una campaña a la que el usuario
    //actual no tiene acceso (el backend lo manda "restricted", ver ListValues/RelatedLeadResponse).
    //En ese caso no se deja editar el campo: si se permitiera guardar, se correría el riesgo de
    //pisar sin querer esa relación (el usuario ni siquiera puede ver a qué lead apunta hoy).
    const hasRestrictedRelatedLead = typeCode === "LEAD" && Array.isArray(leads) && leads.some(l => l.restricted)

    //Todos los tipos de campo son editables inline, salvo los calculados (no los carga el usuario),
    //los que el propio campo marcó como no visibles/editables (is_visible), y los LEAD con algún
    //valor restringido (ver arriba).
    const isInlineEditable = Boolean(fieldValue && lead && updateLeadInfo &&
        typeCode !== "CALCULATED" && fieldValue.field.is_visible && !hasRestrictedRelatedLead)

    const component = (code?: string) => {
        switch (code) {
            //Templates especiales
            case "INSTAGRAM_USER":
            case "POSTAL_CODE":
            case "CREDIT_CARD_SIMPLE": return value ? <StringValue value={`${value}`} subtype={code} /> : undefined

            //Tipos de Field
            //Antes esto pasaba `${value}` directo, lo que convertía un valor null en el string
            //literal "null" (StringValue solo detecta vacío si recibe null/undefined/"", no el
            //string "null"). Al devolver undefined acá, cae en el placeholder "Sin valor. Clic
            //para cargar." de más abajo, igual que BOOL/DATE/FILE.
            case "STRING": return value ? <StringValue value={`${value}`} idModal={`${fieldValue?.field_id}-${fieldValue?.id}`}
                modalProps={modalProps} subtype={subtypeCode ?? undefined} /> : undefined
            case "NUMBER": return <NumberValue value={typeof value === "string" ? Number(value) : undefined}
                subtype={subtypeCode!} ratingCounter />

            //A diferencia de StringValue/NumberValue (que ya devuelven nada si no hay valor cargado),
            //BoolValue/DateValue/ModalValue no se autoguardan contra un valor vacío: sin este chequeo,
            //un campo BOOL sin cargar mostraría "No" como si fuera una respuesta real, una fecha vacía
            //se vería en blanco, y FILE mostraría un botón "Ver Documento" roto. Al devolver undefined acá,
            //el `??` de más abajo cae en el mismo placeholder "Sin valor. Clic para cargar." que ya usan
            //los demás tipos.
            case "BOOL": return (value !== null && value !== undefined && value !== "")
                ? <BoolValue value={`${value}`} /> : undefined

            case "DATE":
            case "DATE_TIME": return value ? <DateValue date={`${value}`} subtype={subtypeCode ?? undefined} /> : undefined

            case "SELECTOR": case "CHECKBOX":
                return <ListValues value={Array.isArray(nomenclators) ? nomenclators : []} idFieldValue={fieldValue?.id}
                    type="Selector" />
            case "LEAD":
                return <ListValues value={Array.isArray(leads) ? leads : []} idFieldValue={fieldValue?.id}
                    type="Lead" isNav />

            case "FILE": return value ? <ModalValue value={`${value}`} idModal={`file-${fieldValue?.id}`} size="small"
                modalProps={modalProps} type={code} subtype={subtypeCode!} /> : undefined

            //Cubre CALCULATED (no editable, así que acá no hay placeholder de "Sin valor" — mejor
            //no mostrar nada que mostrar el string literal "null" cuando el cálculo no arrojó nada).
            default: return value ? `${value}` : undefined
        }
    }

    //Mientras se edita, LeadFormFieldType ya muestra el nombre del campo como label propio del
    //input (salvo FILE, que no tiene label propio) — sin este estado, el nombre quedaba duplicado:
    //una vez como este caption y otra vez como label del input.
    const [editing, setEditing] = useState(false)
    const hideCaptionWhileEditing = editing && typeCode !== "FILE"

    return (
        <CustomListItem disablePadding>
            <LeadFieldTypeAvatar typeCode={typeWithTemplates} subtypeCode={subtypeCode} />
            <ListItemText>
                <Stack>
                    {!hideCaptionWhileEditing &&
                        <Typography variant="subtitle2" color="textSecondary">{fieldName}</Typography>
                    }
                    {isInlineEditable
                        ? <InlineFieldEdit fieldValue={fieldValue!} lead={lead!} updateLeadInfo={updateLeadInfo!}
                            editing={editing} onEditingChange={setEditing}
                            editTrigger={typeCode === "FILE" ? "icon" : "value"}>
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
    editing: boolean,
    onEditingChange: (editing: boolean) => void,
    //"value" (default): un clic sobre el valor entra en edición. "icon": el valor queda intacto
    //(ej. FILE, cuyo valor ya es un botón "Ver Documento" que abre un modal) y se agrega un lápiz
    //aparte para entrar en edición, así no compiten por el mismo clic.
    editTrigger?: "value" | "icon",
}

/**
 * Edición inline para CUALQUIER tipo de campo (STRING, NUMBER, BOOL, DATE/DATE_TIME, SELECTOR,
 * LEAD, FILE): un clic sobre el valor (o el lápiz, para FILE) lo convierte en el input
 * correspondiente —el mismo que antes armaba LeadPartialUpdate, incluyendo los campos "hijos"
 * dependientes de un SELECTOR (useFieldCascade)— y al perder foco o presionar Enter se guarda
 * automáticamente. Si falla (dato inválido), el campo queda en edición mostrando el error y se le
 * devuelve el foco al input para que no se pueda "salir" sin corregirlo. Con Escape se cancela y
 * se revierte al valor original.
 *
 * Nota: campos cuyo valor de solo-lectura ya es un botón interactivo propio (ej. STRING con
 * subtipo MARKDOWN/HTML → "Ver Markdown", o PASSWORD → mostrar/ocultar) no cortan la propagación
 * del clic, así que tocar ese botón también dispara la entrada en modo edición. Es un caso raro
 * (poca gente usa esos subtipos) y no rompe nada —simplemente entra en edición además de abrir el
 * modal/mostrar la contraseña— pero queda documentado acá por si en el futuro molesta.
 */
const InlineFieldEdit = ({ fieldValue, lead, updateLeadInfo, children, editing, onEditingChange, editTrigger = "value" }: InlineFieldEditProps) => {

    const fieldData = fieldValue.field
    const containerRef = useRef<HTMLDivElement>(null)

    const { dependentFieldValues, allFieldValues } = useFieldCascade(fieldValue, lead)

    const defaultValues = useMemo(() => ({
        values: allFieldValues.map(fv => ({ field_id: fv.field_id, value: getValue(fv) }))
    }), [allFieldValues])

    const { register, control, setValue, setError, handleSubmit, reset, formState: { errors } } = useForm<PartialFormProps>({ defaultValues })

    //Si el lead se actualiza desde afuera (ej. otro campo, o navegación) sincroniza el valor por defecto
    useEffect(() => { if (!editing) reset(defaultValues) }, [defaultValues, editing, reset])

    //Enfoca el primer input focuseable del grupo (best-effort: un querySelector genérico, no depende
    //de conocer la estructura interna de cada tipo de campo). Se usa tanto al entrar en edición como
    //para "trabar" el foco de vuelta cuando falla el guardado.
    const focusFirstInput = () => {
        setTimeout(() => {
            containerRef.current
                ?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, [role="combobox"], [role="switch"]')
                ?.focus()
        }, 0)
    }

    //Al entrar en edición hay que enfocar el input a mano: el clic que dispara setEditing(true) no
    //cae sobre el input real (todavía no existe en el DOM en ese momento, se está por renderizar).
    //Sin este foco explícito, el blur del grupo nunca se dispara al clickear afuera (nada estaba
    //realmente enfocado), lo que dejaba el campo trabado en edición y permitía tener varios campos
    //abiertos al mismo tiempo.
    useEffect(() => {
        if (editing) focusFirstInput()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing])

    //Para DATE/DATE_TIME, el valor que devuelve el input (vía setValueAs de LeadFormDate) queda en un
    //formato distinto al que ya está guardado (ej. "YYYY-MM-DD" vs el ISO del backend), así que hay que
    //normalizar ambos con el mismo formato antes de comparar. Para campos multi-valor (SELECTOR_MULTIPLE,
    //LEAD) se ordena el arreglo antes de comparar, porque el orden de selección puede no coincidir con
    //el que ya vino del backend aunque sea el mismo conjunto.
    const normalizeForCompare = (field: LeadFieldDetailed, value: unknown) => {
        if (value && (field.field_type_code === "DATE" || field.field_type_code === "DATE_TIME")) {
            const subtypeCode = (field.field_subtype_code ?? "DATE_TIME") as keyof typeof DATE_INPUT_TYPE
            const format = DATE_INPUT_TYPE[subtypeCode]?.format
            if (format) return formatDate(`${value}`, "custom", format) ?? `${value}`
        }
        if (Array.isArray(value)) return [...value].map(String).sort().join(",")
        return `${value ?? ""}`
    }

    const onSubmit = async (data: PartialFormProps) => {
        const [primary, ...dependents] = data.values

        if (fieldData.required && !primary.value) {
            setError("values.0.value", { message: "Este campo es obligatorio." })
            focusFirstInput()
            return
        }
        //No se deja guardar un campo dependiente obligatorio si quedó vacío tras cambiar el valor del padre
        const missingIdx = dependents.findIndex((v, idx) => allFieldValues[idx + 1].field.required && !v.value)
        if (missingIdx !== -1) {
            setError(`values.${missingIdx + 1}.value`, { message: "Este campo depende del valor que acabás de cambiar: elegí un valor antes de guardar." })
            focusFirstInput()
            return
        }
        //Si nada cambió (en el campo principal ni en sus dependientes) no llamamos al backend
        const nothingChanged = data.values.every((v, idx) => {
            const field = allFieldValues[idx].field
            return normalizeForCompare(field, v.value) === normalizeForCompare(field, getValue(allFieldValues[idx]))
        })
        if (nothingChanged) {
            onEditingChange(false)
            return
        }

        const postData: LeadPostForm = {
            values: data.values.map((v, idx) => ({ field_id: v.field_id, value: v.value, fieldData: allFieldValues[idx].field } as LeadPostFormValues)),
        }
        const formData = createFormDataFromLead(postData)
        return updateLead(formData, lead.id).then(res => {
            const newLead = getUpdatedLead(lead, res)
            if (!newLead) return
            updateLeadInfo(newLead, true)
            showToast(dependents.length > 0
                ? `Campo "${fieldData.name}" modificado con éxito, junto con ${dependents.map((_, idx) => `"${allFieldValues[idx + 1].field.name}"`).join(", ")} (que depende de él).`
                : `Campo "${fieldData.name}" modificado con éxito.`)
            onEditingChange(false)
        }).catch((e) => {
            setFormErrors(e, setError, null, "values.0.value", true)
            focusFirstInput()
        })
    }

    const { fnWithLoading: submitLoad, loading } = useLoading(onSubmit)

    const handleCancel = () => {
        reset(defaultValues)
        onEditingChange(false)
    }

    //Blur del grupo entero: si el foco se movió a otro campo DENTRO del mismo grupo (ej. del
    //selector padre a su hijo dependiente), no se considera una salida real y no se guarda todavía.
    const handleGroupBlur = (e: FocusEvent<HTMLDivElement>) => {
        if (containerRef.current?.contains(e.relatedTarget as Node)) return
        handleSubmit(submitLoad)()
    }

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Escape") {
            e.stopPropagation()
            handleCancel()
            return
        }
        //En textareas (HTML/MARKDOWN) Enter agrega una línea nueva, no confirma
        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
            e.preventDefault()
            handleSubmit(submitLoad)()
        }
    }

    if (!editing) {
        if (editTrigger === "icon") return (
            <Stack direction="row" spacing={.5} sx={{ alignItems: "center", width: "100%" }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
                <CommonIconButton title="Modificar" actionType="MODIFY" onClick={() => onEditingChange(true)}
                    size="small" tooltipSize="small" color="primary" />
            </Stack>
        )
        return (
            <Box onClick={() => onEditingChange(true)} sx={{
                cursor: "pointer", borderRadius: 1, mx: -.5, px: .5,
                "&:hover": { backgroundColor: "action.hover" },
            }}>
                {children}
            </Box>
        )
    }

    return (
        <Box ref={containerRef} onBlur={handleGroupBlur} onKeyDown={onKeyDown}>
            <Stack spacing={1.5}>
                <LeadFormFieldType register={register} control={control} setValue={setValue} name="values.0.value"
                    leadField={fieldData} lead={lead} size="small" errorMessage={errors?.values?.[0]?.value?.message} />
                {dependentFieldValues.map((depFv, idx) => (
                    <LeadFormFieldType key={depFv.field_id} register={register} control={control} setValue={setValue}
                        name={`values.${idx + 1}.value`} leadField={depFv.field} lead={lead} liveParentName="values.0.value"
                        size="small" errorMessage={errors?.values?.[idx + 1]?.value?.message} />
                ))}
            </Stack>
            {loading && <Typography variant="caption" color="text.secondary">Guardando...</Typography>}
        </Box>
    )
}
