# Índice de documentación del frontend

## Docs transversales
| Doc | Descripción |
|---|---|
| [`convenciones_frontend.md`](convenciones_frontend.md) | Stack tecnológico, entry points, arquitectura, path aliases, patrones comunes, convenciones de código, **sistema de rutas** |

## Componentes compartidos (`src/components/`)
| Doc | Descripción |
|---|---|
| [`compartidos/componentes_layout.md`](compartidos/componentes_layout.md) | Sidebar/Header/Navbar, GenericContainer, GenericPaper, GenericModal, GenericSidebar, ColoredHeaders |
| [`compartidos/componentes_ui.md`](compartidos/componentes_ui.md) | Botones, íconos (ActionIcons + RouteIcons), control de acceso (Can/RequirePermission), formularios controlados, detalles/chips, feedback (diálogos), listas/tablas, modales |

## Hooks y utilidades
| Doc | Descripción |
|---|---|
| [`hooks_y_utilidades/hooks.md`](hooks_y_utilidades/hooks.md) | Los 9 hooks personalizados: useModal, useListPagination, useLoading, useDebounce, useDragAndDrop, useSidebar, useSelectCheckbox, useOrderList, useOrderSeachList (sic, typo histórico) |
| [`hooks_y_utilidades/utilidades.md`](hooks_y_utilidades/utilidades.md) | Utils (feedback, formatters, forms, lists, constants), lib (axios, tokenStore), stores (UserContext), types, theme |

## Features (`src/features/`)
| Doc | Descripción |
|---|---|
| [`features/autenticacion.md`](features/autenticacion.md) | LoginForm, SignupForm, userServices |
| [`features/roles_y_permisos.md`](features/roles_y_permisos.md) | RoleList, RoleForms, RoleDetails |
| [`features/lead.md`](features/lead.md) | Módulo más grande: listado (tabla+board), formulario, detalle, actividades, comentarios, filtros, vistas, título configurable |
| [`features/campanas_y_workspaces.md`](features/campanas_y_workspaces.md) | Campaigns + Workspaces (CRUD, detalle, formularios) |
| [`features/nomencladores.md`](features/nomencladores.md) | NomenclatorList, NomenclatorDetails, NomenclatorForm, NomenclatorItemList, NomenclatorItemForm |
| [`features/campos_personalizados.md`](features/campos_personalizados.md) | LeadFieldList, LeadFieldForm, LeadFieldDetail, LeadFieldTable, LeadFieldTypeIcon |
| [`features/flujo_de_leads.md`](features/flujo_de_leads.md) | FlowEditor (React Flow), StateNode, CustomEdge, Sidebar, LeadFlowForms, LeadFlowList |
| [`features/automatizacion.md`](features/automatizacion.md) | AutomationList, AutomationPage, AutomationForm, ActionBuilder, ConditionBuilder |
| [`features/organizaciones.md`](features/organizaciones.md) | OrganizationList, OrganizationDetail, OrganizationForm, InviteDialog |
| [`features/equipos_y_enrutamiento.md`](features/equipos_y_enrutamiento.md) | Teams (TeamList, TeamForm, TeamDetails, TeamMemberList) + RoutingPolicies |
| [`features/dashboard.md`](features/dashboard.md) | GlobalDashboardPage, OrgDashboardPage |
| [`features/busqueda.md`](features/busqueda.md) | GeneralSearchBar, SearchResults |
| [`features/auditoria.md`](features/auditoria.md) | SystemAuditList |
| [`features/propiedades_org.md`](features/propiedades_org.md) | OrgProperties: fieldSections, tags, contactState |
| [`features/validaciones.md`](features/validaciones.md) | ValidationList, ValidationForm |

> **Regla:** antes de tocar un módulo, leer su doc correspondiente y `convenciones_frontend.md` para entender la arquitectura y no duplicar componentes existentes.
