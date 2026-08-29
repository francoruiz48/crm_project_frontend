import type { Metadata } from "./shared";

//Campaigns
export interface CampaignPost {
  name: string;
  description?: string;
  // En el Response, Campaign.workspace_id es el id interno, no el uuid.
  workspace_id: string;
  lead_flow_id?: string;
  target_audience?: string | null;
  is_public?: boolean;
}
export interface Campaign extends Omit<CampaignPost, "workspace_id"> {
  id: string;
  organization_id: string | null;
  workspace_id: string | null;
}

export interface CampaignDetailed extends Campaign, Metadata { }

//Workspaces
export interface WorkspacePost {
  name: string | null;
  description?: string | null;
  organization_id: number | null;
}
export interface Workspace extends WorkspacePost {
  id: string;
}
export interface WorkspaceDetailed extends Workspace, Metadata {
  campaigns: CampaignDetailed[];
}

//Organizations
export interface OrganizationPost {
  name: string | null;
  description?: string | null;
}
export interface Organization extends OrganizationPost {
  id: string;
  is_system: boolean; // true solo para "Panel Global" (solo lectura)
}
export interface OrganizationDetailed extends Organization, Metadata {
  active: boolean;
}
