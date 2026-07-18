import { useEffect, useMemo, useState } from "react"
import type { LeadPostForm, LeadPostFormValues } from "../leadForm/LeadForm"
import { LeadFieldTypeAvatar } from "features/leadFields/LeadFieldTypeIcon"
import { CommonIconButton } from "shared/ui/buttons/CommonIconButton"
import { CustomListItem } from "shared/ui/lists/CustomListItem"
import { useLoading } from "src/hooks/useLoading"
import type { LeadFieldDetailed, LeadFieldValueDetailed } from "src/types/leadFields"
import type { NomenclatorItem } from "src/types/nomenclators"
import type { Lead, LeadDetailed } from "src/types/leads"
import { getLeads, updateLead } from "../leadService"
import { getNomenclatorItems } from "features/nomenclators/nomenclatorService"
import { createFormDataFromLead } from "../leadUtils"
import { setFormErrors } from "src/utils/forms"
import { getListField } from "src/utils/lists"
import { showCommonErrorToast, showToast } from "src/utils/feedback"
import { useForm, type Control, type Path, type UseFormRegister, type UseFormSetValue } from "react-hook-form"
import { ListItemText, Stack } from "@mui/material"
import { getTypeOrSpecialTemplates } from "src/features/leadFields/leadFieldUtils"
import { DependentLeadFormSelector, LeadFormRelatedLead, LeadFormSelector } from "../shared/LeadFormMultipleFields"
import { LeadFormBool, LeadFormDate, LeadFormFile, LeadFormNumber, LeadFormText } from "../shared/LeadFormFields"


/**
 * Toma el lead viejo y el nuevo, y recorre los leadFields del lead viejo, reemplazando sus valores por los nuevos.
 * Exportado para reutilizarse también desde la edición inline con autoguardado (ver LeadDetailsSections.tsx).
 */
export const getUpdatedLead = (oldLead: LeadDetailed, newLead: Lead) => {

    const newfieldValuesCopy = [...newLead.field_values].sort((a, b) => b.field.id - a.field.id)
    const oldfieldValuesCopy = [...oldLead.field_values].sort((a, b) => b.field.id - a.field.id)

    const newFieldValues = oldfieldValuesCopy.map((ofv, oidx) => {
        return {
            ...ofv,
            value: newfieldValuesCopy[oidx].value,
            nomenclator_items: newfieldValuesCopy[oidx].nomenclator_items,
            related_leads: newfieldValuesCopy[oidx].related_leads,
        }
    })
    return { ...oldLead, field_values: newFieldValues } as LeadDetailed
}

export interface PartialFormValue {
    field_id: number,
    value: string | number[] | number | FileList | null
}
export interface PartialFormProps {
    values: PartialFormValue[]
}

export const getValue = (fieldValue: LeadFieldValueDetailed) => {
    if (fieldValue.field.field_type_code === "LEAD") return getListField(fieldValue.related_leads, "id", true) as number[]
    if (["SELECTOR_MULTIPLE", "CHECKBOX_MULTIPLE"].includes(fieldValue?.field?.field_subtype_code ?? ""))
        return getListField(fieldValue.nomenclator_items, "id", true) as number[]
    if (["SELECTOR_SIMPLE", "CHECKBOX_SIMPLE"].includes(fieldValue?.field?.field_subtype_code ?? ""))
        return fieldValue.nomenclator_items[0].id
    return fieldValue.value
}

interface LeadPartialUpdateProps {
    fieldValue: LeadFieldValueDetailed,
    onClose: (id: number) => void,
    lead: LeadDetailed,
    updateLeadInfo: (lead: LeadDetailed, reloadAudits?: boolean) => void
}

export const LeadPartialUpdate = ({ fieldValue, onClose, lead, updateLeadInfo }: LeadPartialUpdateProps) => {

    const fieldData = fieldValue.field

    //Si este campo tiene hijos dependientes (otro campo activo cuyo depends_on_field_id apunta a este), se editan
    //juntos en la misma transacción: si cambia el valor del padre, el valor ya cargado en el hijo puede dejar de ser
    //válido, así que se muestra también acá y no se deja guardar sin resolverlo (ver LeadPartialUpdate.tsx en logs).
    const dependentFieldValues = useMemo(() =>
        lead.field_values.filter(fv => fv.field.active && fv.field.depends_on_field_id === fieldData.id),
        [lead.field_values, fieldData.id]
    )

    const allFieldValues = useMemo(() => [fieldValue, ...dependentFieldValues], [fieldValue, dependentFieldValues])

    const defaultValues = useMemo(() => ({
        values: allFieldValues.map(fv => ({ field_id: fv.field_id, value: getValue(fv) }))
    }), [allFieldValues])

    const { register, control, setError, setValue, handleSubmit, formState: { errors } } = useForm<PartialFormProps>({ defaultValues })

    const iconCode = getTypeOrSpecialTemplates(fieldData.field_type_code, fieldData.field_template_code)

    const onSubmit = async (data: PartialFormProps) => {
        const [primary, ...dependents] = data.values
        if (!primary.value) return
        //No se deja guardar un campo dependiente obligatorio si quedó vacío tras cambiar el valor del padre
        const missingIdx = dependents.findIndex((v, idx) => allFieldValues[idx + 1].field.required && !v.value)
        if (missingIdx !== -1) {
            setError(`values.${missingIdx + 1}.value`, { message: "Este campo depende del valor que acabás de cambiar: elegí un valor antes de guardar." })
            return
        }
        //Un hijo opcional puede quedar en null tras limpiarse tras el cambio del padre: se envía así a propósito
        //(el backend lo interpreta como "vaciar el campo" y no valida su dependencia, ver AGENTS.md backend §7)
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
            onClose(fieldData.id)
        }).catch((e) => {
            setFormErrors(e, setError, null, "values.0.value", true)
        })
    }

    const { fnWithLoading: submitLoad, loading } = useLoading(onSubmit)

    return (
        <form onSubmit={handleSubmit(submitLoad)}>
            <CustomListItem disablePadding alwaysShowSecondary secondaryAction={
                <Stack direction="row">
                    {!loading && <CommonIconButton title="Cancelar" actionType="CLOSE" onClick={() => onClose(fieldData.id)}
                        size="small" tooltipSize="small" color="error" />}
                    <CommonIconButton title="Guardar" actionType="SAVE" type="submit" loading={loading}
                        size="small" tooltipSize="small" color="primary" />
                </Stack>
            }>
                <LeadFieldTypeAvatar typeCode={iconCode} subtypeCode={fieldData.field_subtype_code} />
                <ListItemText sx={{ mr: 9 }}>
                    <Stack spacing={1.5}>
                        <LeadFormFieldType register={register} control={control} setValue={setValue} name="values.0.value"
                            leadField={fieldData} lead={lead} size="small" errorMessage={errors?.values?.[0]?.value?.message} />
                        {dependentFieldValues.map((depFv, idx) => (
                            <LeadFormFieldType key={depFv.field_id} register={register} control={control} setValue={setValue}
                                name={`values.${idx + 1}.value`} leadField={depFv.field} lead={lead} liveParentName="values.0.value"
                                size="small" errorMessage={errors?.values?.[idx + 1]?.value?.message} />
                        ))}
                    </Stack>
                </ListItemText>
            </CustomListItem>
        </form>
    )
}

interface LeadFormFieldTypeProps {
    register: UseFormRegister<PartialFormProps>,
    control: Control<PartialFormProps>,
    setValue: UseFormSetValue<PartialFormProps>,
    name: Path<PartialFormProps>,
    leadField: LeadFieldDetailed,
    lead: LeadDetailed,
    //Path del valor del campo padre DENTRO DE ESTE MISMO mini-formulario, cuando el padre se está editando en vivo
    //junto a este campo (ver LeadPartialUpdate más arriba). Si no viene, este campo depende de un valor ya persistido.
    liveParentName?: Path<PartialFormProps>,
    errorMessage?: string,
    size?: "small" | "medium"
}

export const LeadFormFieldType = ({ register, control, setValue, name, leadField, lead, liveParentName, errorMessage, size = "medium" }: LeadFormFieldTypeProps) => {

    const label = leadField.name ?? undefined
    const typeCode = leadField.field_type_code
    const subtypeCode = leadField.field_subtype_code ?? undefined
    const required = leadField.required

    const [selectors, setSelectors] = useState<NomenclatorItem[] | undefined>(undefined)
    const [relatedLeads, setRelatedLeads] = useState<Lead[] | undefined>(undefined)

    //Si este campo depende de otro que NO se edita en vivo en este mismo mini-form, sus opciones son los hijos del
    //valor ya persistido en el lead para el campo padre. Si el padre SÍ se edita acá (liveParentName), la cascada
    //la resuelve directamente DependentLeadFormSelector contra el valor en curso del formulario.
    const dependentParentItemIds = useMemo(() => {
        if (!leadField.depends_on_field_id || liveParentName) return null
        const parentFieldValue = lead.field_values.find(fv => fv.field_id === leadField.depends_on_field_id)
        return parentFieldValue?.nomenclator_items.map(item => item.id) ?? []
    }, [leadField.depends_on_field_id, lead.field_values, liveParentName])

    useEffect(() => {
        if (liveParentName) return
        if (leadField?.nomenclator?.id) {
            if (dependentParentItemIds !== null) {
                if (dependentParentItemIds.length === 0) { setSelectors([]); return }
                Promise.all(dependentParentItemIds.map(id =>
                    getNomenclatorItems({ detailed: false, page_size: 0, parent_item_id: id, only_active: true })
                )).then(results => {
                    const merged = new Map<number, NomenclatorItem>()
                    results.forEach(res => res.items.forEach(item => merged.set(item.id, item)))
                    setSelectors(Array.from(merged.values()))
                }).catch(e => showCommonErrorToast(e, `Ocurrio un error buscando las opciones de ${leadField.name}`))
                return
            }
            getNomenclatorItems({ detailed: false, page_size: 0, nomenclator_id: leadField.nomenclator.id, only_active: true })
                .then(res => setSelectors(res.items))
                .catch(e => showCommonErrorToast(e, `Ocurrio un error buscando las opciones de ${leadField.name}`))
        }
        else if (leadField?.related_campaign?.id) {
            getLeads({ detailed: false, page_size: 0, campaign_id: leadField.related_campaign.id, only_active: true })
                .then(res => setRelatedLeads(res.items))
                .catch(e => showCommonErrorToast(e, `Ocurrio un error buscando los leads de ${leadField.name}`))
        }
    }, [leadField, dependentParentItemIds, liveParentName])

    const isDependentBlocked = dependentParentItemIds !== null && dependentParentItemIds.length === 0

    switch (typeCode) {
        case "LEAD":
            return (<LeadFormRelatedLead control={control} name={name} options={relatedLeads} size={size}
                label={label} required={required} errorMessage={errorMessage} />)
        case "FILE":
            return (<LeadFormFile control={control} name={name} required={required} size={size}
                errorMessage={errorMessage} subtype={subtypeCode} />)
        case "SELECTOR":
            //El padre se edita en vivo junto a este campo: la cascada se resuelve contra el valor EN EL FORMULARIO
            if (liveParentName) {
                return (<DependentLeadFormSelector control={control} name={name} parentName={liveParentName} setValue={setValue}
                    label={label} subtype={subtypeCode} required={required} errorMessage={errorMessage} size={size} />)
            }
            return (<LeadFormSelector control={control} name={name} options={selectors} size={size}
                label={label} subtype={subtypeCode} required={required} errorMessage={errorMessage}
                disabled={isDependentBlocked} helperText={isDependentBlocked ? "El campo del que depende no tiene un valor cargado" : undefined} />)
        case "BOOL":
            return (<LeadFormBool control={control} name={name} label={label} errorMessage={errorMessage} size={size} />)
        case "DATE_TIME": case "DATE":
            return (<LeadFormDate register={register} name={name} label={label} size={size}
                subtype={subtypeCode} required={leadField.required} errorMessage={errorMessage} />)
        case "NUMBER": case "INT":
            return (<LeadFormNumber control={control} name={name} label={label} size={size}
                subtype={subtypeCode} required={leadField.required} errorMessage={errorMessage} />)
        case "STRING":
            return <LeadFormText register={register} name={name} label={label} size={size}
                required={leadField.required} errorMessage={errorMessage} subtype={subtypeCode} />
    }
}