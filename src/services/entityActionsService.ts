import axiosCRM from "src/lib/axios"
import type { DeleteResponse, EnableResponse } from "src/types/shared"

/**
 * Acciones de habilitado/deshabilitado/borrado genéricas.
 * El `prefix` (ruta base del controller) lo resuelve src/config/entityActions.ts, así esta
 * capa no conoce entidades específicas. Rutas expuestas por BaseController (backend):
 *   - PUT    /{prefix}/active/{id}   → habilitar (requiere flag ACTIVE)
 *   - DELETE /{prefix}/active/{id}   → desactivar (requiere flag DEACTIVATE)
 *   - DELETE /{prefix}/{id}?force=   → borrar (soft/hard según estrategia)
 */

export const activateEntity = async (prefix: string, id: string): Promise<EnableResponse> => {
    const { data } = await axiosCRM.put<EnableResponse>(`/${prefix}/active/${id}`)
    return data
}

export const deactivateEntity = async (prefix: string, id: string): Promise<DeleteResponse> => {
    const { data } = await axiosCRM.delete<DeleteResponse>(`/${prefix}/active/${id}`)
    return data
}

export const deleteEntity = async (prefix: string, id: string, force = false): Promise<DeleteResponse> => {
    const { data } = await axiosCRM.delete<DeleteResponse>(`/${prefix}/${id}`, force ? { params: { force: true } } : undefined)
    return data
}