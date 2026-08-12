import { RequirePermission } from "src/components/auth/RequirePermission";
import { SystemAuditList } from "src/features/audit/SystemAuditLogs";
import { CampaignDetails } from "src/features/campaigns/CampaignDetails";
import { GlobalDashboardPage } from "src/features/dashboard/GlobalDashboardPage";
import { OrgDashboardPage } from "src/features/dashboard/OrgDashboardPage";
import { AutomationList } from "src/features/fieldAutomation/AutomationList";
import { AutomationPage } from "src/features/fieldAutomation/AutomationPage";
import { LeadDetailsLayout } from "src/features/lead/details/LeadDetails";
import { ImportLeadsPage } from "src/features/lead/ImportLeadsPage";
import { CreateLeadFormPage, UpdateLeadFormPage } from "src/features/lead/leadForm/LeadFormWraper";
import { LeadListPage } from "src/features/lead/leadList/LeadListPage";
import { LeadFlowEditor } from "src/features/leadFlows/FlowEditorPage";
import { NomenclatorList } from "src/features/nomenclators/NomenclatorList";
import OrganizationList from "src/features/organizations/OrganizationList";
import OrgProperties, { LEAD_PROPERTIES } from "src/features/orgProperties/orgPropertiesList";
import { SearchResultsList } from "src/features/search/SearchResults";
import { TeamsPage } from "src/features/teams/TeamsPage";
import { WorkspaceList } from "src/features/workspaces/WorkspaceList";
import { ProfilePage } from "src/pages/ProfilePage";
import { useUserContext } from "src/stores/UserContext";
import ROUTE_ICONS from "shared/ui/icons/RouteIcons";
import type { ReactNode } from "react";
import { RoleList } from "src/features/roles/RoleList";

/** Lista de rutas a usar en el sistema. 
 * Automáticamente completa el navbar y acomoda los permisos para su acceso. */

export interface RouteListProps {
    path: string,
    title: string,
    navTitle?: string,
    element: ReactNode,
    regularNavbar?: boolean,
    globalNavbar?: boolean,
    icon?: ReactNode,
    permission?: string | string[]
}

// Muestra GlobalDashboard para Panel Global (is_system), OrgDashboard para el resto
function DashboardRouter() {
    const { activeOrg } = useUserContext()
    if (activeOrg?.is_system) return <GlobalDashboardPage />
    return <OrgDashboardPage />
}

const LEAD_ROUTES: RouteListProps[] = [
    { path: "/leads/", title: "Leads", element: <LeadListPage />, regularNavbar: true, icon: ROUTE_ICONS.LEADS, permission: "lead:view" },
    { path: "/leads/new", title: "Nuevo Lead", element: <CreateLeadFormPage />, permission: "lead:create" },
    { path: "/leads/modify/:id", title: "Modificar Lead", element: <UpdateLeadFormPage />, permission: "lead:update" },
    { path: "/leads/:id", title: "Detalle de Lead", element: <LeadDetailsLayout />, permission: "lead:view" },
    { path: "/leads/import", title: "Importar Leads", element: <ImportLeadsPage />, permission: "lead:create" },
]

/** Lista de rutas que se muestran con Navbar */
const ROUTE_LIST_OUTLET: RouteListProps[] = [
    { path: "/dashboard", title: "Dashboard", element: <DashboardRouter />, regularNavbar: true, globalNavbar: true, icon: ROUTE_ICONS.DASHBOARD },
    ...LEAD_ROUTES,
    { path: "/campaigns/", title: "Campañas", element: <WorkspaceList />, regularNavbar: true, icon: ROUTE_ICONS.CAMPAIGNS, permission: "workspace:view" },
    { path: "/campaigns/:id", title: "Detalle de Campaña", element: <CampaignDetails />, permission: "campaign:view" },
    { path: "/nomenclators/", title: "Nomencladores", element: <NomenclatorList />, permission: "nomenclator:view" },
    { path: "/automations/", title: "Automatizaciones", element: <AutomationList />, regularNavbar: true, icon: ROUTE_ICONS.AUTOMATIONS, permission: "field_automation:view" },
    { path: "/automations/:id", title: "Detalle de Automatización", element: <AutomationPage />, permission: "field_automation:view" },
    { path: "/organizations/", title: "Organizaciones", element: <OrganizationList />, regularNavbar: true, globalNavbar: true, icon: ROUTE_ICONS.ORGANIZATIONS, permission: "organization:view" },
    { path: "/org-properties/", title: "Propiedades de Organización", navTitle: "Propiedades", element: <OrgProperties />, regularNavbar: true, icon: ROUTE_ICONS.ORG_PROPERTIES, permission: LEAD_PROPERTIES.map(prop => prop.permission) },
    { path: "/lead-flow-editor/:id?", title: "Editor de Ciclo de Vida", element: <LeadFlowEditor />, permission: "lead_flow:view" },
    { path: "/roles", title: "Roles y Permisos", element: <RoleList />, permission: "role:view", regularNavbar: true, globalNavbar: true, icon: ROUTE_ICONS.ROLES },
    { path: "/teams/", title: "Equipos y Enrutamiento", navTitle: "Equipos", element: <TeamsPage />, regularNavbar: true, icon: ROUTE_ICONS.TEAMS, permission: "team:view" },
    { path: "/audit-logs/", title: "Auditoría de Sistema", navTitle: "Auditoría", element: <SystemAuditList />, regularNavbar: true, globalNavbar: true, icon: ROUTE_ICONS.AUDIT, permission: "system_audit_log:view" },
    { path: "/search", title: "Búsqueda", element: <SearchResultsList />, permission: "lead:view" },
    { path: "/profile", title: "Mi Perfil", element: <ProfilePage /> },
]

/**Agrega automáticamente el RequirePermision, usando los props element y permission. */
export const ROUTE_LIST_OUTLET_PROCESSED = ROUTE_LIST_OUTLET
    .map(i => ({
        ...i,
        element: <RequirePermission permission={i.permission}>{i.element}</RequirePermission>
    }))