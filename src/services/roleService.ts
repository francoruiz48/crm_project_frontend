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
    const role = await axiosCRM.get(`roles/${id}`, { params: { detailed: true } })
    return role.data
}
export const createRole = async (body: RolePost): Promise<RoleDetailed> => {
    const role = await axiosCRM.post(`roles`, body)
    return role.data
}
export const updateRole = async (body: RolePost, id: string): Promise<RoleDetailed> => {
    const role = await axiosCRM.put(`roles/${id}`, body)
    return role.data
}

export const disableRole = async (id: string): Promise<DeleteResponse> => {
    const org = await axiosCRM.delete(`roles/${id}`)
    return org.data
}
export const enableRole = async (id: string): Promise<EnableResponse> => {
    const org = await axiosCRM.put(`roles/active/${id}`)
    return org.data
}


export const getPermissions = async<T extends ListParams>(params?: T):
    Promise<Paginable<Permission>> => {
    const perm = await axiosCRM.get(`permissions`, { params })
    return perm.data
}
export const setRolePermissions = async (id: string, permissionIds: string[]): Promise<RoleDetailed> => {
    const role = await axiosCRM.put(`roles/${id}/permissions`, { permission_ids: permissionIds })
    return role.data
}
export const getPermision = async (id: number): Promise<Permission> => {
    const perm = await axiosCRM.get(`permissions/${id}`)
    return perm.data
}