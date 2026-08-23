import type { DeleteResponse, EnableResponse, Paginable, WebFormParams } from "src/types/shared"
import type { WebForm, WebFormDetailed, WebFormPost, WebFormUpdateBody } from "src/types/webForms"
import axiosCRM from "src/lib/axios"

export const getWebForms = async <T extends WebFormParams>(params?: T):
    Promise<Paginable<T["detailed"] extends true ? WebFormDetailed : WebForm>> => {
    const web_forms = await axiosCRM.get(`/web_forms`, { params })
    return web_forms.data
}

export const getWebForm = async (id: string): Promise<WebFormDetailed> => {
    // detailed: true es obligatorio para traer los fields (mismo patrón que
    // getFieldAutomation/getCampaign -- sin esto, la respuesta ni siquiera trae `fields`).
    const web_form = await axiosCRM.get(`/web_forms/${id}`, { params: { detailed: true } })
    return web_form.data
}

export const createWebForm = async (body: WebFormPost): Promise<WebForm> => {
    // El POST no devuelve detailed (no trae `fields` aunque se hayan creado) -- el caller debe
    // hacer un getWebForm(id) después si necesita mostrarlos sin refrescar.
    const web_form = await axiosCRM.post(`/web_forms`, body)
    return web_form.data
}

export const updateWebForm = async (body: WebFormUpdateBody, id: string): Promise<WebFormDetailed> => {
    // El PUT sí fuerza detailed=True del lado del backend -- devuelve `fields` actualizados.
    const web_form = await axiosCRM.put(`/web_forms/${id}`, body)
    return web_form.data
}

export const deleteWebForm = async (id: string, force = false): Promise<DeleteResponse> => {
    const res = await axiosCRM.delete(`/web_forms/${id}`, { params: { force } })
    return res.data
}

export const activateWebForm = async (id: string): Promise<EnableResponse> => {
    const res = await axiosCRM.put(`/web_forms/active/${id}`)
    return res.data
}

export const deactivateWebForm = async (id: string): Promise<DeleteResponse> => {
    const res = await axiosCRM.delete(`/web_forms/active/${id}`)
    return res.data
}
