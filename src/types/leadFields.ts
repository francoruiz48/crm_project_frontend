import type { Campaign } from "./campaigns";
import type { Metadata } from "./shared";
import type { Lead } from "./leads";
import type { Nomenclator, NomenclatorItem } from "./nomenclators";
import type { FieldArrayWithId } from "react-hook-form";
import type { LeadPostForm } from "src/features/lead/leadForm/LeadForm";
import type { LeadFieldSection, LeadFieldSectionDetailed } from "./orgProperties";

export interface ExcelFormulaTemplate {
  name_spanish: string;
  name_english: string;
  description: string;
  syntax: string;
  example: string;
  category: string;
  note: string;
}

export interface LeadFieldValue {
  id: number;
  active: boolean;
  field_id: number;
  value?: string | null;
  lead_id: number;
  field: LeadField;
  nomenclator_items: NomenclatorItem[];
  related_leads: Lead[],
}

export interface LeadFieldValueDetailed extends LeadFieldValue, Metadata {
  field: LeadFieldDetailed;
}

export interface LeadFieldPost {
  name?: string | null;
  campaign_id: number;
  order?: number;
  required: boolean;
  is_primary: boolean;
  is_visible: boolean;
  lead_field_section_id?: number | null;
  default_value?: string | null;
  input_mask?: string | null;
  mask_template_code?: string | null;
  //Plantilla
  field_template_code?: string | null;
  //Manual con Subtype
  field_type_code?: string | null;
  field_subtype_code?: string | null;
  //Selector o Checkbox
  nomenclator_id?: number | null;
  //Lead
  related_campaign_id?: number | null;
  //Calculated
  calculation_expression?: string | null;
  title_order?: number | null;
  //Igual que title_order pero para el subtítulo (línea secundaria debajo del título, ej. Cargo +
  //Empresa). Ver getLeadSubtitleArray en leadUtils.ts.
  subtitle_order?: number | null;
  //Selector/Checkbox dependiente de otro campo nomenclador de la misma campaña
  depends_on_field_id?: number | null;
}

export interface LeadField extends Omit<LeadFieldPost, "lead_field_section_id"> {
  id: number;
  active: boolean;
  name: string;
  configuration?: string;
  lead_field_section: LeadFieldSection;
  organization_id: number;
  order: number;
  title_order: number | null;
  subtitle_order: number | null;
  field_type_code: string;
  field_type: LeadFieldType,
  field_subtype: LeadFieldType | null,
  field_template_name: string | null,
}

export interface LeadFieldDetailed extends LeadField, Metadata {
  validation_rules: FieldValidationRule[];
  nomenclator: Nomenclator;
  lead_field_section: LeadFieldSectionDetailed;
  related_campaign: Campaign;
}

export interface LeadFieldTemplate {
  code: string;
  name: string;
  field_type_code: string;
  rules: {
    template_code?: string | null;
    template_params?: object | null;
    error_message: string;
  };
}

export interface InputMaskTemplate {
  code: string;
  name: string;
  mask: string;
}
export interface LeadFieldType {
  id: number;
  code: string;
  description: string;
}

export interface LeadFieldTypeDetailed extends LeadFieldType, Metadata {
  subtypes: (LeadFieldType & { lead_field_type_code: string })[];
}

export interface FieldValidationRulePost {
  name: string;
  expression?: string;
  error_message: string;
  template_code?: string | null;
  template_params?: { [param_name: string]: string };
  field_id: number;
}

export interface FieldValidationRule extends FieldValidationRulePost {
  id: number;
}

export interface FieldValidationRuleDetailed extends FieldValidationRule, Metadata { }

export interface FieldValidationRuleTemplate {
  name: string;
  code: string;
  error_message: string;
  description?: string;
  required_params: string[];
}

export interface LeadFieldsReorderBody {
  campaign_id: number,
  orders: {
    field_id: number,
    order: number,
  }[]
}

export interface LeadFieldsBySection<T = LeadFieldValueDetailed | LeadFieldDetailed | FieldArrayWithId<LeadPostForm, "values", "id">> {
  id: number,
  name: string,
  sectionData?: LeadFieldSection,
  fields: T[]
}