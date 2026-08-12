import type { DeleteResponse, EnableResponse, ListParams, Paginable } from "src/types/shared"
import axiosCRM from "src/lib/axios"
import type { Permission, Role, RoleDetailed, RolePost } from "src/types/roles"

export const getRoles = async<T extends ListParams>(params?: T):
    Promise<Paginable<
        T["detailed"] extends true ? RoleDetailed : Role>> => {
    const role = await axiosCRM.get(`roles`, { params })
    return role.data
}
export const getRole = async (id: string): Promise<RoleDetailed> => {
    const role = await axiosCRM.get(`roles/${id}`)
    return role.data
}
export const createRole = async (body: RolePost): Promise<RoleDetailed> => {
    const role = await axiosCRM.post(`roles`, body)
    return role.data
}
export const updateRole = async (body: RolePost, id: number): Promise<RoleDetailed> => {
    const role = await axiosCRM.put(`roles/${id}`, body)
    return role.data
}

export const disableRole = async (id: number): Promise<DeleteResponse> => {
    const org = await axiosCRM.delete(`roles/${id}`)
    return org.data
}
export const enableRole = async (id: number): Promise<EnableResponse> => {
    const org = await axiosCRM.put(`roles/active/${id}`)
    return org.data
}


export const getPermissions = async ():
    Promise<Paginable<Permission>> => {
    const perm = await axiosCRM.get(`permissions`)
    return perm.data
}
export const getPermision = async (id: number): Promise<Permission> => {
    const perm = await axiosCRM.get(`permissions/${id}`)
    return perm.data
}