import type { LeadFieldValue, LeadFieldValueDetailed } from "./leadFields";
import type { Creator, LeadFilter, ListParams, Metadata, Updater } from "./shared";
import type { LeadState, LeadStateDetailed } from "./leadFlow";
import type { ColorTypes } from "./mui-theme.d";
import type { LeadContactState, LeadContactStateDetailed, LeadTag } from "./orgProperties";
import type { Campaign } from "./campaigns";
import type { Team } from "./teams";

export interface LeadPostValue {
  field_id: number;
  value: string | number[] | number | FileList;
}
export interface LeadPost {
  // Recibe el public_uuid de Campaign al crear un lead nuevo (string). Al editar un lead
  // existente, LeadForm reutiliza este campo con el int viejo embebido en Lead.campaign_id
  // (todavía sin migrar, ver más abajo / backend/AGENTS.md §18), pero LeadUpdate no lo usa.
  campaign_id?: string | number;
  values: LeadPostValue[];
}

export interface LeadTeam {
  id: string;
  name: string;
}

export interface LeadUser {
  id: string;
  name: string;
  last_name?: string | null;
  email: string;
}

export interface Lead extends Metadata {
  id: string;
  // Referencia legible por el usuario, ej. "L-0001". Puede venir null en leads insertados directo. 
  // En la práctica todo lead real de la app siempre lo tiene.
  reference: string | null;
  active: boolean;
  campaign_id?: number;
  field_values: LeadFieldValue[];
  organization_id?: number,
  tags: LeadTag[],
  current_state_id: number,
  current_state: LeadState,
  contact_state_id: number,
  contact_state: LeadContactState,
  picture_url?: string,
  assigned_to_user_id: number | null,
  team_id: number | null,
  picture_avatar_url?: string | null;
  team?: LeadTeam | null;
  assigned_to_user?: LeadUser | null;
  // Fase 4: objeto anidado con el uuid real (ver backend/AGENTS.md §18), mismo patrón que
  // team/assigned_to_user de arriba. campaign_id de arriba sigue siendo la FK embebida.
  campaign?: Campaign | null;
  //Tipados como Creator/Updater (de shared.ts) y no como LeadUser: LeadDetailed extiende tanto
  //Lead como Metadata, y Metadata ya declara creator/updater con esos tipos. Si acá se usara
  //LeadUser TypeScript rechaza el extends múltiple por tener el mismo campo con tipos no idénticos 
  // en las dos interfaces base.
  creator?: Creator | null;
  updater?: Updater | null;
  //Solo viene poblado cuando este Lead aparece como "lead relacionado" (campo tipo LEAD) dentro de OTRO lead, 
  // y el usuario actual no tiene acceso a su campaña.
  restricted?: boolean;
}
export interface LeadDetailed extends Lead, Metadata {
  field_values: LeadFieldValueDetailed[];
  current_state: LeadStateDetailed,
  contact_state: LeadContactStateDetailed,
}

export interface LeadCommentPost {
  // public_uuid de Lead (Fase 3, ya resuelto en el backend).
  lead_id: string,
  content: string
  color?: ColorTypes
}

export interface LeadComment extends Omit<LeadCommentPost, "lead_id">, Metadata {
  id: string, // public_uuid desde Fase 3, ver backend/AGENTS.md §18
  lead_id: number, // FK embebida: sigue siendo el id interno viejo (sin migrar)
}

export interface LeadAudit extends Metadata {
  id: number,
  lead_id: number,
  activity_type: "LEAD_CREATED" | "FIELDS_UPDATED" | "STATE_CHANGED" | "LEAD_REASSIGNED" | "CONTACT_STATE_CHANGED",
  details: {
    message?: string,
    notes?: string,
    changes?: LeadAuditChange
    to_state_id?: number
    to_state_name?: string
    to_state_color?: string
    from_state_id?: number
    from_state_name?: string
    from_state_color?: string
    previous_team_id?: number | null
    previous_team_name?: string | null
    previous_user_id?: number | null
    previous_user_name?: string | null
    new_team_id?: number | null
    new_team_name?: string | null
    new_user_id?: number | null
    new_user_name?: string | null
    from_contact_state_id?: number | null
    from_contact_state_name?: string | null
    from_contact_state_color?: string | null
    to_contact_state_id?: number
    to_contact_state_name?: string
    to_contact_state_color?: string
  }
}

export interface LeadAuditChange {
  [field_id: string]: {
    field_name: string,
    new_value: string | number | number[] | null,
    old_value: string | number | number[] | null,
  }
}

export interface LeadViewPost {
  // public_uuid de Campaign (Fase 3, migrado también en el Response -- ver backend/AGENTS.md §18).
  campaign_id: string,
  name: string,
  visibility: string,
  // public_uuid de Team (Fase 3). El Response (LeadView) sigue con el int interno viejo (FK
  // embebida, deliberadamente sin migrar -- ver backend/AGENTS.md §18).
  team_id?: string | null,
  view_type?: string | null,
  filters?: {
    filters?: LeadFilter[],
    [item: string]: unknown
  },
  ui_config?: {
    selected_ids?: string[],
    fetch_params?: ListParams,
    [item: string]: unknown
  },
  sort_config?: {
    order_by?: string | number | null,
    ascending?: boolean,
    [item: string]: unknown
  }
}

export interface LeadViewParams {
  view_type?: string | null,
  filters?: {
    filters?: LeadFilter[],
    [item: string]: unknown
  },
  ui_config?: {
    selected_ids?: string[],
    fetch_params?: ListParams,
    [item: string]: unknown
  },
  sort_config?: {
    order_by?: string | number | null,
    ascending?: boolean,
    [item: string]: unknown
  }
}

export interface LeadView extends Omit<LeadViewPost, "team_id" | "campaign_id"> {
  id: string, // public_uuid desde Fase 3
  organization_id: number,
  team_id?: number | null // FK embebida: sigue siendo el id interno viejo (sin migrar)
  // FK embebida: sigue siendo el id interno viejo (sin migrar, ver backend/AGENTS.md §18).
  // Antes (Fase 3) esto estaba tipado string asumiendo que el Response ya daba el uuid real,
  // pero era un bug: el schema no convertía el int interno, tiraba 500 en cualquier request
  // (arreglado en Fase 4 agregando los objetos anidados de abajo).
  campaign_id: string,
  campaign?: Campaign | null,
  team?: Team | null,
}

export interface LeadViewDetailed extends LeadView, Metadata { }

