import axios from "axios"
import { API_BASE_URL } from "src/lib/axios"
import type { WebFormPublic, WebFormSubmitResponse } from "src/types/webForms"

// Instancia propia, SIN los interceptors de src/lib/axios.ts (que agregan el token de sesión,
// el header de organización desde localStorage, y redirigen a /login ante un 401). Esta página
// se embebe sin login en sitios de terceros -- no debe depender de nada de eso ni arriesgarse a
// un redirect inesperado dentro del iframe de otro sitio.
const axiosPublic = axios.create({ baseURL: API_BASE_URL })

export const getPublicWebForm = async (uuid: string): Promise<WebFormPublic> => {
    const res = await axiosPublic.get(`/public/forms/${uuid}`)
    return res.data
}

// El payload usa como clave el `id` (public_uuid) de cada WebFormField -- ver
// WebFormPublic.fields[].id. Debe incluir siempre el honeypot ("website_url_ext": "") y,
// si el form lo exige, "captcha_token".
export const submitPublicWebForm = async (uuid: string, payload: Record<string, unknown>): Promise<WebFormSubmitResponse> => {
    const res = await axiosPublic.post(`/public/forms/${uuid}/submit`, payload)
    return res.data
}
