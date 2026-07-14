import type { Path } from "react-hook-form";
import type { Lead } from "./leads";
import type { Campaign, Workspace } from "./campaigns";
import type { Nomenclator, NomenclatorItem } from "./nomenclators";

export interface DisableableEntity {
  active?: boolean,
}

/**
 * Define la estructura de una lista con paginación. Se llama como: Paginable<Lead>.
 */
export interface Paginable<T> {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: T[];
}

/**
 * Contiene los metadatos de los elementos comunes obtenidos como "detailed".
 */
export interface Metadata {
  created_at: string;
  updated_at?: string;
  active: boolean;
  created_by: number;
  updated_by?: number;
  creator?: Creator | null;
  updater?: Updater | null;
}

export interface Creator {
  id: number;
  name: string | null;
  last_name?: string | null;
  email: string | null;
}

export interface Updater {
  id: number;
  name: string | null;
  last_name?: string | null;
  email: string | null;
}

/**
 * Contienen los parámetros permitidos de cada request.
 */


export interface OrderParams {
  order_by?: number | string | null,
  ascending?: boolean
}

export interface ListParams extends OrderParams {
  only_active?: boolean,
  detailed?: boolean,
  page?: number,
  page_size?: number,
  search?: string,
  search_fields?: string
}
export interface WorkspaceParams extends ListParams {
  organization_id?: number
}
export interface CampaignParams extends ListParams {
  workspace_id?: number
}
export interface LeadListParams extends ListParams {
  campaign_id?: number
}
export interface LeadFlowParams extends ListParams {
  organization_id?: number
}
export interface FlowStateParams extends LeadFlowParams {
  lead_flow_id: number
}

export interface FieldAutomationParams extends ListParams {
  campaign_id?: number
}

export interface SystemAuditParams extends ListParams {
  start_date?: string,
  end_date?: string,
  date_field?: string,
}

/**
 * Contiene los formatos de mensaje de error.
 */
export interface SimpleErrorBody {
  message?: string //Error en el cuerpo
  detail?: string //Error en el cuerpo
  response?: {
    data: {
      detail: string | //Si el error no tiene identificador
      SimpleErrorMessage | [SimpleErrorMessage]
      message?: string
    }
  }
}
export interface SimpleErrorMessage {
  field: string,
  message: string
}

export interface ErrorBody<T> extends Omit<SimpleErrorBody, "response"> {
  response?: {
    data: {
      detail: string | //Si el error no tiene identificador
      ErrorMessage<T> | //Un solo error de formulario
      [ErrorMessage<T>] //Lista de errores de formulario
      message?: string
    }
  }
}
export interface ErrorMessage<T> {
  field: Path<T>,
  message: string
}

export interface DeleteResponse {
  action: "deleted" | "disabled"
}

export interface BulkDeleteResponse {
  deleted: number[],
  disabled: number[],
  failed: number[],
}
export interface BulkEnableResponse {
  activated: number[],
  already_active: number[],
  failed: number[],
}

export interface EnableResponse {
  actived: boolean
}

export interface SearchResults {
  leads: Lead[],
  campaigns: Campaign[],
  workspaces: Workspace[],
  nomenclators: Nomenclator[],
  nomenclator_items: NomenclatorItem[],
}

export interface LeadFilter {
  "field_id"?: number,
  "operator"?: string,
  "value"?: string | number | boolean
}

export interface Dictionary {
  "lead_search_operators"?: DictionaryItem[]
  "routing_condition_types"?: DictionaryItem[]
  "team_roles"?: DictionaryItem[]
  "lead_states_categories"?: DictionaryItem[],
  "lead_view_visibilities"?: DictionaryItem[],
  "automation_compatibility_matrix"?: AutomationCompatibility[],
  "entities"?: DictionaryItem[],
  "system_audit_log_actions"?: DictionaryItem[],
}

export interface DictionaryItem {
  "code": string,
  "label": string,
}

export type DateFormat = "dateTime" | "dateTimeLong" | "date" | "dateLong" | "time" | "custom"

export type OptionWithAction<T> = ((T & { isAction: boolean }) | { id: string, name: string, isAction: boolean })

export interface AutomationCompatibility {
  "field_type": {
    "operators": string[],
    "actions": string[],
  }
}

export interface ColorShades {
  LIGHTER: string,
  LIGHT: string,
  MAIN: string,
  DARK: string,
  DARKER: string,
}