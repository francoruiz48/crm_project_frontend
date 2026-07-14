import type { BulkDeleteResponse, DeleteResponse, EnableResponse, LeadFilter, LeadListParams, ListParams, Paginable } from "src/types/shared";
import type { Lead, LeadDetailed, LeadView, LeadViewDetailed, LeadViewPost } from "src/types/leads";
import axiosCRM from "src/lib/axios";

export const getLeads = async <T extends ListParams>(params?: T)
  : Promise<Paginable<T["detailed"] extends true ? LeadDetailed : Lead>> => {
  const lead = await axiosCRM.get(`leads`, { params });
  return lead.data;
};

export const getFilteredLeads = async <T extends ListParams>(body: { filters: LeadFilter[] }, params?: T)
  : Promise<Paginable<T["detailed"] extends true ? LeadDetailed : Lead>> => {
  const lead = await axiosCRM.post(`leads/search`, body, { params });
  return lead.data;
};

export const getLead = async (id: number): Promise<LeadDetailed> => {
  const lead = await axiosCRM.get(`leads/${id}`);
  return lead.data;
};
export const simulateCreateLead = async (body: FormData): Promise<Lead> => {
  const lead = await axiosCRM.post(`leads/simulate`, body);
  return lead.data;
};

export const createLead = async (body: FormData): Promise<LeadDetailed> => {
  const lead = await axiosCRM.post(`leads`, body);
  return lead.data;
};

export const updateLead = async (body: FormData, id: number): Promise<Lead> => {
  const lead = await axiosCRM.put(`leads/${id}`, body);
  return lead.data;
};

export const enableLead = async (id: number): Promise<EnableResponse> => {
  const lead = await axiosCRM.put(`leads/active/${id}`);
  return lead.data;
};
export const disableLead = async (id: number): Promise<DeleteResponse> => {
  const lead = await axiosCRM.delete(`leads/${id}`);
  return lead.data;
};

export const bulkDeleteLead = async (body: { ids: number[] }): Promise<BulkDeleteResponse> => {
  const res = await axiosCRM.post(`leads/bulk-delete`, body);
  return res.data;
};

export const updateLeadTags = async (ids: number[], leadId: number): Promise<Lead> => {
  const lead = await axiosCRM.put(`leads/${leadId}`, { tag_ids: ids });
  return lead.data;
};

export const getLeadViews = async <T extends LeadListParams>(params?: T)
  : Promise<Paginable<T["detailed"] extends true ? LeadViewDetailed : LeadView>> => {
  const view = await axiosCRM.get(`lead_views`, { params });
  return view.data;
};

export const getLeadView = async (id: number): Promise<LeadViewDetailed> => {
  const view = await axiosCRM.get(`lead_views/${id}`);
  return view.data;
};

export const createView = async (body: LeadViewPost): Promise<LeadViewDetailed> => {
  const view = await axiosCRM.post(`lead_views`, body);
  return view.data;
};

export const updateView = async (body: LeadViewPost, id: number): Promise<LeadView> => {
  const view = await axiosCRM.put(`lead_views/${id}`, body);
  return view.data;
};

export const enableView = async (id: number): Promise<EnableResponse> => {
  const view = await axiosCRM.put(`lead_views/active/${id}`);
  return view.data;
};
export const deleteView = async (id: number): Promise<DeleteResponse> => {
  const view = await axiosCRM.delete(`lead_views/${id}`);
  return view.data;
};

export const exportLeads = async (campaignId: number): Promise<void> => {
  const response = await axiosCRM.get(`export/${campaignId}`, {
    responseType: 'blob', // Crucial para archivos
  });

  // 1. Intentar extraer el nombre del archivo de los headers del backend
  let filename = `leads_campana_${campaignId}.xlsx`; // Fallback de seguridad
  const disposition = response.headers['content-disposition'];

  if (disposition && disposition.indexOf('attachment') !== -1) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      // Limpiamos las comillas que puedan venir del backend
      filename = matches[1].replace(/['"]/g, '');
    }
  }

  // 2. Crea una URL para el blob y fuerza la descarga en el navegador
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;

  // 3. Asignamos el nombre dinámico que extrajimos
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();

  // Limpieza del DOM
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

//Detección de headers
export const detectImportHeaders = async (file: File): Promise<{ headers: string[] }> => {
  const formData = new FormData();
  formData.append("file", file);
  // Asumiendo que configuraste tu axios para manejar FormData
  const res = await axiosCRM.post(`import/detect-headers`, formData);
  return res.data;
};

//Procesa import
export const processImport = async (campaignId: number, file: File, mapping: Record<string, string>): Promise<unknown> => {
  const formData = new FormData();
  formData.append("campaign_id", campaignId.toString());
  formData.append("mapping", JSON.stringify(mapping));
  formData.append("file", file);
  const res = await axiosCRM.post(`import/process`, formData);
  return res.data;
}

export const changeStateLead = async (lead_id: number, state_id: number): Promise<LeadDetailed> => {
  const body = { "new_state_id": state_id }
  const response = await axiosCRM.post(`leads/${lead_id}/change_state`, body);
  return response.data;
};

export const changeContactStateLead = async (lead_id: number, state_id: number): Promise<LeadDetailed> => {
  // Antes usaba PUT /leads/{id} (el mismo que cualquier campo genérico) y no dejaba
  // ningún rastro de auditoría. Ahora usa el endpoint dedicado, igual que changeStateLead.
  const body = { "new_contact_state_id": state_id }
  const response = await axiosCRM.post(`leads/${lead_id}/change_contact_state`, body);
  return response.data;
};