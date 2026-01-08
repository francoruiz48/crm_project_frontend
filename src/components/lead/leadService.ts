import axios from 'axios';
import { API_BASE_URL } from '../../generalService';
import type { Lead } from '../../types/leads';

export const getLead = async (id : number) : Promise<Lead> => {
    const lead = await axios.get(`${API_BASE_URL}/leads/${id}`)
    return lead.data
}