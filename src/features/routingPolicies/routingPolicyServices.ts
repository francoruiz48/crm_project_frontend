import type {
    LeadRoutingPolicy, LeadRoutingPolicyDetailed, LeadRoutingPolicyPost, LeadRoutingPolicyUpdate,
    LeadRoutingPolicyValidateRequest, LeadRoutingPolicyValidateResponse,
} from "src/types/routing"
import type { ListParams, Paginable } from "src/types/shared"
import axiosCRM from "src/lib/axios"

interface RoutingPolicyParams extends ListParams {
    campaign_id?: string,
}

export const getRoutingPolicies = async <T extends RoutingPolicyParams>(params?: T):
    Promise<Paginable<T["detailed"] extends true ? LeadRoutingPolicyDetailed : LeadRoutingPolicy>> => {
    const policies = await axiosCRM.get(`/lead_routing_policies`, { params })
    return policies.data
}

export const getRoutingPolicy = async (id: string): Promise<LeadRoutingPolicyDetailed> => {
    const policy = await axiosCRM.get(`/lead_routing_policies/${id}`)
    return policy.data
}

export const createRoutingPolicy = async (body: LeadRoutingPolicyPost): Promise<LeadRoutingPolicyDetailed> => {
    const policy = await axiosCRM.post(`/lead_routing_policies`, body)
    return policy.data
}

export const updateRoutingPolicy = async (body: LeadRoutingPolicyUpdate, id: string): Promise<LeadRoutingPolicyDetailed> => {
    const policy = await axiosCRM.put(`/lead_routing_policies/${id}`, body)
    return policy.data
}

export const validateRoutingPolicy = async (body: LeadRoutingPolicyValidateRequest): Promise<LeadRoutingPolicyValidateResponse> => {
    const res = await axiosCRM.post(`/lead_routing_policies/validate`, body)
    return res.data
}
