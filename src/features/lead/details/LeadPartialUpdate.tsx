/**
 * Ojo: este archivo ya NO exporta un componente de edición propio. Antes (`LeadPartialUpdate`)
 * era el formulario que se abría al clickear el lápiz, con Guardar/Cancelar explícitos. Ahora
 * TODOS los campos se editan inline (clic sobre el valor + autoguardado al perder foco o Enter,
 * ver `InlineFieldEdit` en `LeadDetailsSections.tsx`), que reutiliza lo de acá: `getUpdatedLead`,
 * `getValue`, `LeadFormFieldType` y los tipos `PartialFormValue`/`PartialFormProps`. Se dejan en
 * este archivo porque son los mismos helpers que ya existían, para no duplicar lógica.
 */
import { useEffect, useMemo, useState } from "react"
import type { LeadFieldDetailed, LeadFieldValueDetailed } from "src/types/leadFields"
import type { NomenclatorItem } from "src/types/nomenclators"
import type { Lead, LeadDetailed } from "src/types/leads"
import { getLeads } from "../leadService"
import { getNomenclatorItems } from "features/nomenclators/nomenclatorService"
import { getListField } from "src/utils/lists"
import { showCommonErrorToast } from "src/utils/feedback"
import type { Control, Path, UseFormRegister, UseFormSetValue } from "react-hook-form"
import { DependentLeadFormSelector, LeadFormRelatedLead, LeadFormSelector } from "../shared/LeadFormMultipleFields"
import { LeadFormBool, LeadFormDate, LeadFormFile, LeadFormNumber, LeadFormText } from "../shared/LeadFormFields"


/**
 * Toma el lead viejo y el nuevo, y recorre los leadFields del lead viejo, reemplazando sus valores por los nuevos.
 * Exportado para reutilizarse también desde la edición inline con autoguardado (ver LeadDetailsSections.tsx).
 */
export const getUpdatedLead = (oldLead: LeadDetailed, newLead: Lead) => {

    // Ordena por field.id para alinear posicionalmente los dos arrays (asume mismo
    // conjunto de campos en distinto orden). Antes era una resta numérica
    // (b.field.id - a.field.id); dejó de servir cuando field.id pasó a ser un UUID
    // (string) -- la resta da NaN y el sort queda como no-op, rompiendo la
    // alineación posicional de abajo. Comparación por string: determinística sin
    // importar si el id es número (nativo) o UUID (campo real).
    const sortByFieldId = (a: { field: { id: number | string } }, b: { field: { id: number | string } }) => {
        const aId = String(a.field.id), bId = String(b.field.id)
        return aId < bId ? 1 : aId > bId ? -1 : 0
    }
    const newfieldValuesCopy = [...newLead.field_values].sort(sortByFieldId)
    const oldfieldValuesCopy = [...oldLead.field_values].sort(sortByFieldId)

    const newFieldValues = oldfieldValuesCopy.map((ofv, oidx) => {
        return {
            ...ofv,
            value: newfieldValuesCopy[oidx].value,
            nomenclator_items: newfieldValuesCopy[oidx].nomenclator_items,
            related_leads: newfieldValuesCopy[oidx].related_leads,
        }
    })
    // Antes solo se copiaba field_values, así que "Modificado por"/"Fecha de actualización"
    // (DetailsMetadata.tsx) se quedaban con el valor viejo de oldLead hasta refrescar la
    // página -- newLead (la respuesta fresca del backend) sí trae updated_at/updater
    // actualizados, pero se descartaban acá.
    return { ...oldLead, field_values: newFieldValues, updated_at: newLead.updated_at, updater: newLead.updater } as LeadDetailed
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

/**
 * Si `fieldValue` tiene campos "hijos" activos (otro campo cuyo depends_on_field_id apunta a
 * este), se editan juntos en la misma transacción: si cambia el valor del padre, el valor ya
 * cargado en el hijo puede dejar de ser válido, así que se muestra también en el mismo grupo de
 * edición y no se deja guardar sin resolverlo. Solo los campos SELECTOR pueden ser padres/hijos
 * en esta cascada (ver LeadFieldForm.tsx: "Depende del Campo" solo aparece para SELECTOR).
 */
export const useFieldCascade = (fieldValue: LeadFieldValueDetailed, lead: LeadDetailed) => {
    const dependentFieldValues = useMemo(() =>
        lead.field_values.filter(fv => fv.field.active && fv.field.depends_on_field_id === fieldValue.field.id),
        [lead.field_values, fieldValue.field.id]
    )
    const allFieldValues = useMemo(() => [fieldValue, ...dependentFieldValues], [fieldValue, dependentFieldValues])
    return { dependentFieldValues, allFieldValues }
}

interface LeadFormFieldTypeProps {
    register: UseFormRegister<PartialFormProps>,
    control: Control<PartialFormProps>,
    setValue: UseFormSetValue<PartialFormProps>,
    name: Path<PartialFormProps>,
    leadField: LeadFieldDetailed,
    lead: LeadDetailed,
    //Path del valor del campo padre DENTRO DE ESTE MISMO grupo de edición, cuando el padre se está editando en vivo
    //junto a este campo (ver useFieldCascade/InlineFieldEdit). Si no viene, este campo depende de un valor ya persistido.
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