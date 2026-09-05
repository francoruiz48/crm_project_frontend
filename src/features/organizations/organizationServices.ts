import type { Organization, OrganizationDetailed, OrganizationPost } from "src/types/campaigns"
import type { ListParams, Paginable } from "src/types/shared"
import axiosCRM from "src/lib/axios"

export const getOrganizations = async<T extends ListParams>(params?: T):
    Promise<Paginable<
        T["detailed"] extends true ? OrganizationDetailed : Organization>> => {
    const org = await axiosCRM.get(`/organizations`, { params })
    return org.data
}

export const getOrganization = async (id: string): Promise<OrganizationDetailed> => {
    const org = await axiosCRM.get(`/organizations/${id}`)
    return org.data
}

export const createOrganization = async (body: OrganizationPost): Promise<OrganizationDetailed> => {
    const org = await axiosCRM.post(`/organizations`, body)
    return org.data
}

export const updateOrganization = async (body: OrganizationPost, id: string): Promise<OrganizationDetailed> => {
    const org = await axiosCRM.put(`/organizations/${id}`, body)
    return org.data
}
