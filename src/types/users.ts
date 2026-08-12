import type { Permission, Role } from "./roles"
import type { Metadata } from "./shared"

export interface UserLogin {
    email: string,
    password: string
}

export interface UserSignup extends UserLogin {
    name: string,
    last_name: string,
    repeat_password: string,
    phone?: string,
    date_of_birth?: string,
}

export interface TokenResponse {
    access_token: string,
    refresh_token: string,
    token_type: string,
    expires_in: number
}

// Versión reducida de usuario, usada para selects dentro de una organización (GET /users/in-org/members)
export interface UserPublic {
    id: string,
    name: string,
    last_name: string | null,
    email: string,
    active: boolean,
}

export interface UserData extends Metadata {
    id: string,
    name: string,
    last_name: string | null,
    email: string,
    phone: string | null,
    date_of_birth: string | null,
    is_superuser: boolean,
    organizations_access: OrganizationAccess[]
}

export interface OrganizationAccess extends Metadata {
    id: number,
    organization_id: number,
    is_owner: boolean,
    roles: Role[],
    // Codenames de todos los permisos que tiene el usuario en esta organización (unión de sus roles).
    // Viene de GET/PUT /auth/me (UserDetailedResponse).
    permission_objects: Permission[]
}


// Invitaciones (/auth/invite, /auth/accept-invite)
export interface InviteRequest {
    email: string
    organization_id: number
    role_code?: string
}

export interface InviteResponse {
    invite_token: string
    expires_in_hours: number
    message: string
}

export interface AcceptInviteResponse {
    message: string
    organization_id: number
}
