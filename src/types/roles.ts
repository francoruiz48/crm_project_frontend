import type { Metadata } from "./shared";

// `id` es el public_uuid del permiso (Fase 3). Sin él no se puede armar
// permission_ids para PUT /roles/{id}/permissions.
export interface Permission {
    id: string,
    name: string,
    codename: string,
}

export interface RolePost {
    code: string,
    name: string,
    organization_id: string
}
export interface Role extends RolePost, Metadata {
    id: string,
}
export interface RoleDetailed extends Role {
    permissions: Permission[]
}