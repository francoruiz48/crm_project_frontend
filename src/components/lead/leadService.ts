import axios from 'axios';
import { API_BASE_URL } from '../../generalService';
import type { Lead, LeadFieldSection } from '../../types/leads';

export const getLead = async (id : number) : Promise<Lead> => {
    const lead = await axios.get(`${API_BASE_URL}/leads/${id}`)
    return lead.data
}

export const getLeadSections = async () : Promise<LeadFieldSection[]> => {
    const sections = await axios.get(`${API_BASE_URL}/lead_field_sections?only_active=True`)
    return sections.data.items.sort((a:LeadFieldSection,b:LeadFieldSection)=>a.id-b.id)
}