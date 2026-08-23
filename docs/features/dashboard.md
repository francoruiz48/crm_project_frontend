# Dashboard (`src/features/dashboard/`)

## Estructura
```
dashboard/
  dashboardServices.ts        → servicios API
  GlobalDashboardPage.tsx     → GlobalDashboardPage
  OrgDashboardPage.tsx        → OrgDashboardPage
```

## Componentes

### `GlobalDashboardPage` — `GlobalDashboardPage.tsx`
Dashboard global (superadmin). Se muestra cuando `activeOrg.id === 1`.
- Estadísticas de todo el sistema (organizaciones, usuarios, leads totales)

### `OrgDashboardPage` — `OrgDashboardPage.tsx`
Dashboard de organización. Se muestra cuando `activeOrg.id !== 1`.
- Estadísticas de la organización: leads por etapa (estados del flujo), leads por campaña, actividad reciente

### Enrutamiento (`routes.tsx`)
El componente `DashboardRouter` decide cuál mostrar:
```tsx
function DashboardRouter() {
  const { activeOrg } = useUserContext()
  if (activeOrg?.id === 1) return <GlobalDashboardPage />
  return <OrgDashboardPage />
}
```

Ambas páginas usan los componentes compartidos `StatCard` (`details/StatCard.tsx`) para las tarjetas de métricas y `CommonCRMText`/`CommonCRMTitle` (`details/CommonText.tsx`) para toda su tipografía (sin `fontSize`/`fontWeight` inline).

## Servicios (`dashboardServices.ts`)
```tsx
getDashboardStats() → DashboardStats
```

## Rutas
- `/dashboard` → `DashboardRouter`
