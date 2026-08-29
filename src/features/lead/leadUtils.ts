import type { LeadPostForm } from "./leadForm/LeadForm"
import type { Lead, LeadDetailed, LeadPostValue } from "src/types/leads"
import type { LeadField, LeadFieldValue } from "src/types/leadFields"
import type { ErrorBody, ErrorMessage } from "src/types/shared"
import { setFormErrors } from "src/utils/forms"
import { OPERATORS as OP } from "src/mocks/operators"
import type { FieldArrayWithId, UseFormSetError } from "react-hook-form"

const NOT_TITLE_TYPES = [
    "FILE", "BOOL", "HTML", "MARKDOWN",
    "SELECTOR_MULTIPLE", "CHECKBOX_MULTIPLE", "LEAD",
    "PASSWORD", "CREDIT_CARD_SIMPLE"
]

/**Revisa que el valor no sea parte de los tipos bloqueados, y que tenga un valor o nomenclador.*/
const isTitleValid = (fieldValue: LeadFieldValue) => {
    return !(
        NOT_TITLE_TYPES.includes(fieldValue.field.field_type_code) ||
        NOT_TITLE_TYPES.includes(fieldValue.field.field_subtype_code ?? "") ||
        NOT_TITLE_TYPES.includes(fieldValue.field.field_template_code ?? "")
    ) && (fieldValue.value || fieldValue.nomenclator_items.length !== 0)
}

/** 
 * Obtener un arreglo con los campos de lead indicados como título, en orden.
 * @params short: Muestra solo el elemento con title_order = 1
 */
export const getLeadTitleArray = (lead: Lead | LeadDetailed, short: boolean = false) => {

    const titleArray = lead.field_values
        .filter(fv => fv.field.title_order !== null && isTitleValid(fv) && fv.field.active && fv.active)
        .sort((a, b) => a.field.title_order! - b.field.title_order!)
        .map(fv => fv.value ?? fv.nomenclator_items[0].value!) //Si es selector, será único gracias a isTitleValid

    if (titleArray.length === 0) return ["Sin título"]

    return short ? [titleArray[0]] : titleArray
}

/**
 * Igual que getLeadTitleArray, pero para el subtítulo (línea secundaria debajo del título, ej.
 * Cargo + Empresa). A diferencia del título, si no hay ningún campo configurado como
 * subtitle_order devuelve un arreglo vacío — el subtítulo es opcional, no mostrar nada es lo
 * correcto (no hay equivalente a "Sin título" acá).
 */
export const getLeadSubtitleArray = (lead: Lead | LeadDetailed) => {
    return lead.field_values
        .filter(fv => fv.field.subtitle_order !== null && isTitleValid(fv) && fv.field.active && fv.active)
        .sort((a, b) => a.field.subtitle_order! - b.field.subtitle_order!)
        .map(fv => fv.value ?? fv.nomenclator_items[0].value!) //Si es selector, será único gracias a isTitleValid
}

/********************************************  FormData  ***********************************************/

/**
 * Crea un objeto FormData a partir de los datos de un formulario. Debe ser en formato { fieldName: string, data: object }
 * */
export const createFormData = <T extends { fieldName: string, data: object | number | File }>(fields: T[]) => {
    const formData = new FormData()
    fields.forEach(item => {
        if (item.fieldName === "data") formData.set(item.fieldName, JSON.stringify(item.data))
        else formData.set(item.fieldName, (item.data as File))
    })
    return formData
}

//Organiza los datos de Lead para acomodar los archivos File en un FormData
export const createFormDataFromLead = (data: LeadPostForm) => {
    const fields: { fieldName: string, data: number | object }[] = []
    const dataValues: LeadPostValue[] = []

    for (const fieldValue of data.values) {
        if (fieldValue.fieldData.field_type_code !== "FILE" || typeof fieldValue?.value === "number") {
            dataValues.push({ field_id: fieldValue.field_id, value: fieldValue.value })
            continue
        }
        //Si es un string, no se ha modificado el file, se envia solo en el cuerpo principal
        if (!fieldValue.value || typeof fieldValue?.value === "string") {
            dataValues.push({ field_id: fieldValue.field_id, value: fieldValue.value })
            continue
        }
        //Si es un arreglo, es porque se modifico el archivo. Se envia el nuevo archivo en un campo aparte. Toma solo el primer archivo.
        if (fieldValue?.value?.length > 0) {
            fields.push({ fieldName: `file-${fieldValue.field_id}`, data: (fieldValue?.value as FileList)?.[0] })
            dataValues.push({ field_id: fieldValue?.field_id, value: (fieldValue?.value as FileList)?.[0].name })
            continue
        }
    }
    fields.push({ fieldName: "data", data: { ...data, values: dataValues } })
    return createFormData(fields)
}

/**
 * Busca todos las opciones de los selectores necesarios para un formulario. Busca en todos ellos.
 */
export const updateSelectorOptions = async<T>
    (leadFields: LeadField[], idField: keyof LeadField, currentMap: Map<string, T[]>, filterTypes: string[], fetchFunction: (id: string) => Promise<T[]>) => {
    const newMap = new Map<string, T[]>()
    const promises: Array<Promise<void>> = []

    for (const leadField of leadFields) {
        if (!leadField.field_type_code) continue
        if (!filterTypes.includes(leadField.field_type_code)) continue
        const fetchId = `${leadField[idField] ?? null}`
        if (newMap.has(fetchId)) continue
        //Si ya existe, lo recupera sin hacer fetch
        if (currentMap.has(fetchId)) {
            newMap.set(fetchId, currentMap.get(fetchId)!)
        }
        //Si no existe, hace el fetch, lo pone en el arreglo de promesas, y al terminar lo pone en el map.
        promises.push(fetchFunction(fetchId).then(res => {
            newMap.set(fetchId, res)
        }))
    }
    //Cuando terminen todas las promesas, devuelve el mapa de opciones
    await Promise.all(promises)
    return newMap
}

/**
 * Función personalizada para ubicar los mensajes de error a su campo corrspondiente.
 */
export const setLeadFormErrors = (fields: FieldArrayWithId<LeadPostForm, "values", "id">[],
    error: ErrorBody<LeadPostForm>, setError: UseFormSetError<LeadPostForm>) => {

    const leadErrorMapping = (errorArray: ErrorMessage<LeadPostForm>[]) => {
        errorArray.forEach(error => {
            //Revisa si el error no viene de un campo no relacionado a values.
            if (error.field === "campaign_id") return setError("campaign_id", { message: error.message })
            //Busca el indice del field para asignarle el error.
            const fieldIdx = fields.findIndex(field => error.field === field.fieldData.name)
            //Si no coincide con un nombre, va a root.
            if (fieldIdx === -1) return setError("root", { message: error.message });
            return setError(`values.${fieldIdx}.value`, { message: error.message })
        })
    }
    setFormErrors(error, setError, leadErrorMapping)
}

export const OPERATORS_BY_LEAD_TYPE = {
    BOOL: [OP.eq, OP.neq],
    DATE_TIME: [OP.gt, OP.gte, OP.lt, OP.lte, OP.like],
    DATE: [OP.gt, OP.gte, OP.lt, OP.lte, OP.like],
    NUMBER: [OP.eq, OP.gt, OP.gte, OP.lt, OP.lte, OP.neq],
    INT: [OP.eq, OP.gt, OP.gte, OP.lt, OP.lte, OP.neq],
    STRING: [OP.like, OP.ilike],
    CALCULATED: [],
    LEAD: [],
    SELECTOR: [],
    FILE: []
}