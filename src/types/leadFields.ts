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
  id: string;
  active: boolean;
  field_id: string;
  value?: string | null;
  lead_id: string;
  field: LeadField;
  nomenclator_items: NomenclatorItem[];
  related_leads: Lead[],
}

export interface LeadFieldValueDetailed extends LeadFieldValue, Metadata {
  field: LeadFieldDetailed;
}

export interface LeadFieldPost {
  name?: string | null;
  // public_uuid de Campaign (Fase 3, ya resuelto en el backend).
  campaign_id: string;
  order?: number;
  required: boolean;
  is_primary: boolean;
  is_visible: boolean;
  // public_uuid de LeadFieldSection (Fase 3, ya resuelto en el backend).
  lead_field_section_id?: string | null;
  default_value?: string | null;
  input_mask?: string | null;
  mask_template_code?: string | null;
  //Plantilla
  field_template_code?: string | null;
  //Manual con Subtype
  field_type_code?: string | null;
  field_subtype_code?: string | null;
  //Selector o Checkbox. public_uuid de Nomenclator (Fase 3, ya resuelto en el backend).
  nomenclator_id?: string | null;
  //Lead. public_uuid de Campaign (Fase 3, ya resuelto en el backend).
  related_campaign_id?: string | null;
  //Calculated
  calculation_expression?: string | null;
  title_order?: number | null;
  //Igual que title_order pero para el subtítulo (línea secundaria debajo del título, ej. Cargo +
  //Empresa). Ver getLeadSubtitleArray en leadUtils.ts.
  subtitle_order?: number | null;
  //Selector/Checkbox dependiente de otro campo nomenclador de la misma campaña. public_uuid de
  //LeadField (Fase 3, ya resuelto en el backend).
  depends_on_field_id?: string | null;
}

export interface LeadField extends Omit<LeadFieldPost, "lead_field_section_id" | "campaign_id" | "nomenclator_id" | "related_campaign_id" | "depends_on_field_id"> {
  id: string;
  active?: boolean;
  name: string;
  configuration?: string;
  lead_field_section: LeadFieldSection;
  organization_id: string;
  order: number;
  title_order: number | null;
  subtitle_order?: number | null;
  field_type_code: string;
  field_type: LeadFieldType,
  // FKs embebidas: siguen siendo el id interno viejo.
  campaign_id: string;
  nomenclator_id?: string | null;
  related_campaign_id?: string | null;
  depends_on_field_id?: string | null;
  field_subtype: LeadFieldType | null,
  field_template_name: string | null,
  /** Clave nativa en el modelo Lead (solo para campos del sistema, ej: "contact_state_id") */
  nativeKey?: string;
}

export interface LeadFieldDetailed extends LeadField, Omit<Metadata, "active"> {
  validation_rules: FieldValidationRule[];
  nomenclator: Nomenclator;
  lead_field_section: LeadFieldSectionDetailed;
  related_campaign: Campaign;
  // Fase 4: objeto anidado con el uuid real del campo del que depende (ver
  // backend/AGENTS.md §18), mismo patrón que nomenclator/related_campaign de arriba.
  // depends_on_field_id (en LeadField) sigue siendo la FK embebida sin migrar.
  depends_on_field?: {
    id: string;
    active: boolean;
    name: string;
    order: number;
    field_type_code?: string | null;
    field_subtype_code?: string | null;
    title_order?: number | null;
    subtitle_order?: number | null;
  } | null;
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
  id: string | number; // public_uuid desde Fase 3
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
  // public_uuid de LeadField (Fase 3, ya resuelto en el backend).
  field_id: string;
}

export interface FieldValidationRule extends Omit<FieldValidationRulePost, "field_id"> {
  id: string; // public_uuid desde Fase 3
  // FK embebida: sigue siendo el id interno viejo (sin migrar, ver backend/AGENTS.md §18).
  field_id: number;
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
  // public_uuid de Campaign/LeadField (Fase 3, ya resuelto en el backend).
  campaign_id: string,
  orders: {
    field_id: string,
    order: number,
  }[]
}

export interface LeadFieldsBySection<T = LeadFieldValueDetailed | LeadFieldDetailed | FieldArrayWithId<LeadPostForm, "values", "id">> {
  id: string,
  name: string,
  sectionData?: LeadFieldSection,
  fields: T[]
}