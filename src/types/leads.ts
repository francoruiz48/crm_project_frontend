export interface Lead {
    "id": number,
    "created_at": string,
    "updated_at": string,
    "active": boolean,
    "campaign_id": number,
    "field_values": LeadFieldValue[]

}

export interface LeadFieldValue {
    "id": number,
    "created_at": string,
    "updated_at": string,
    "active": boolean,
    "field_id": number,
    "value": string,
    "nomenclator_item_id"?: number | null,
    "lead_id": number,
    "field": LeadField,
    "nomenclator_item"?: Nomenclator | null
}

export interface LeadField {
    "id": number,
    "created_at": string,
    "updated_at": string,
    "active": boolean,
    "name": string,
    "field_type_code": string,
    "required": boolean,
    "default_value"?: string | null,
    "is_primary": boolean,
    "input_mask"?: string | null,
    "validation_rules": ValidationRule[],
    "nomenclator"?: Nomenclator | null,
    "campaign": Campaign
    "lead_field_section": LeadFieldSection
}

export interface ValidationRule {
    "id": number
    "name": string
    "expression": string
    "error_message": string
    "template_code": string
    "template_params": string
    "field": LeadField
}

export interface Nomenclator {
    "id": number,
    "name": string,
    "description": string,
    "is_global": boolean,
    "created_by_user_id": string,
    "created_at": string,
    "campaign_id"?: number | null
}

export interface Campaign {
    "id": number,
    "created_at": string,
    "updated_at": string,
    "active": boolean,
    "name": string,
    "description": string
}

export interface LeadFieldSection {
    "id": number,
    "name": string
}