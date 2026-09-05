import axiosCRM from "src/lib/axios"
import type { LeadContactState, LeadContactStateDetailed, LeadContactStatePost } from "src/types/orgProperties"
import type { ListParams, Paginable } from "src/types/shared"

export const getLeadContactStates = async <T extends ListParams>(params?: T)
    : Promise<Paginable<T["detailed"] extends true ? LeadContactStateDetailed : LeadContactState>> => {
    const LeadContactState = await axiosCRM.get(`lead_contact_states`, { params });
    return LeadContactState.data;
};

export const getLeadContactState = async (id: string): Promise<LeadContactStateDetailed> => {
    const LeadContactState = await axiosCRM.get(`lead_contact_states/${id}`);
    return LeadContactState.data;
};

export const createLeadContactState = async (body: LeadContactStatePost): Promise<LeadContactStateDetailed> => {
    const LeadContactState = await axiosCRM.post(`lead_contact_states`, body);
    return LeadContactState.data;
};

export const updateLeadContactState = async (body: LeadContactStatePost, id: string): Promise<LeadContactStateDetailed> => {
    const LeadContactState = await axiosCRM.put(`lead_contact_states/${id}`, body);
    return LeadContactState.data;
};