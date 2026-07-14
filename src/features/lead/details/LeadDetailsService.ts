import type { LeadDetailed } from "src/types/leads";
import axiosCRM from "src/lib/axios";

export const changeFlowState = async (leadId: number, newStateId: number, notes?: string): Promise<LeadDetailed> => {
    const response = await axiosCRM.post(`/leads/${leadId}/change_state`, { new_state_id: newStateId, notes })
    return response.data
}

export const changeContactState = async (leadId: number, newContactStateId: number, notes?: string): Promise<LeadDetailed> => {
    const response = await axiosCRM.post(`/leads/${leadId}/change_contact_state`, { new_contact_state_id: newContactStateId, notes })
    return response.data
}