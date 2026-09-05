import type { FieldAutomationParams, Paginable } from "src/types/shared"
import type { FieldAutomation, FieldAutomationDetailed, FieldAutomationPost } from "src/types/automation"
import axiosCRM from "src/lib/axios"


export const getFieldAutomations = async<T extends FieldAutomationParams>(params?: T):
    Promise<Paginable<T["detailed"] extends true ? FieldAutomationDetailed : FieldAutomation>> => {
    const field_automations = await axiosCRM.get(`/field_automations`, { params })
    return field_automations.data
}

export const getFieldAutomation = async (id: string): Promise<FieldAutomationDetailed> => {
    // detailed: true es obligatorio: sin él la respuesta no trae conditions/actions, y
    // este método está tipado como FieldAutomationDetailed. Bug real 2026-08-06:
    // AutomationForm.tsx explotaba con "Cannot read properties of undefined (reading
    // 'map')" al ver el detalle de una automatización recién creada.
    const field_automation = await axiosCRM.get(`/field_automations/${id}`, { params: { detailed: true } })
    return field_automation.data
}

export const createFieldAutomation = async (body: FieldAutomationPost): Promise<FieldAutomationDetailed> => {
    const field_automation = await axiosCRM.post(`/field_automations`, body)
    return field_automation.data
}

export const updateFieldAutomation = async (body: FieldAutomationPost, id: string): Promise<FieldAutomationDetailed> => {
    const field_automation = await axiosCRM.put(`/field_automations/${id}`, body)
    return field_automation.data
}
