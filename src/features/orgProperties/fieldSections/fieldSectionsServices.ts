import axiosCRM from "src/lib/axios";
import type { LeadFieldSection, LeadFieldSectionDetailed, LeadFieldSectionPost } from "src/types/orgProperties";
import type { ListParams, Paginable } from "src/types/shared";

export const getFieldSections = async <T extends ListParams>(params?: T): Promise<Paginable<
    T["detailed"] extends true ? LeadFieldSectionDetailed : LeadFieldSection
>> => {
    const sections = await axiosCRM.get(`lead_field_sections`, { params });
    return sections.data;
};

export const getFieldSection = async (id: string): Promise<LeadFieldSectionDetailed> => {
    const section = await axiosCRM.get(`lead_field_sections/${id}`);
    return section.data;
};

export const createFieldSection = async (body: LeadFieldSectionPost): Promise<LeadFieldSectionDetailed> => {
    const section = await axiosCRM.post(`lead_field_sections`, body);
    return section.data;
};

export const updateFieldSection = async (body: LeadFieldSectionPost, id: string): Promise<LeadFieldSectionDetailed> => {
    const section = await axiosCRM.put(`lead_field_sections/${id}`, body);
    return section.data;
};