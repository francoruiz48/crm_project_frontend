# CRM Project Frontend - Instrucciones para el agente

## Resumen del proyecto
CRM para cualquier tipo de cliente, con un fuerte énfasis en la personalización y parametrización.

## Stack
- React 19 + TypeScript + Vite para el frontend
- SPA Vite pura
- MUI v9.1.0, React Router v7 y React Hook Form

## Comandos
```bash
pnpm dev          # Iniciar servidor de desarrollo (puerto 5173)
pnpm build        # Type-check + build de producción
pnpm lint         # ESLint (config plana)
pnpm typecheck    # Chequeo de TypeScript (tsconfig.app.json)
pnpm precheck     # lint + typecheck (ejecutar antes de commits)
pnpm preview      # Previsualizar build de producción
```

## Arquitectura clave

### Path Aliases (vite.config.ts / tsconfig.app.json)
```ts
src/*      → ./src/*
features/* → ./src/features/*/
shared/*   → ./src/components/*
assets/*   → ./src/assets/*
```

### Puntos de entrada
- `src/app/main.tsx` - Bootstrap de la app con MUI ThemeProvider
- `src/app/App.tsx` - Router + UserProvider + ToastContainer
- `src/routes.tsx` - Configuración central de rutas con hijos anidados

### Manejo de estado
- **UserContext** (`src/stores/UserContext.tsx`) - Auth, orgs, org activa (org id=1 = panel global)
- **LeadNavigationContext** (`src/features/lead/stores/LeadNavigationContext.tsx`) - Estado de paginación/selección del listado de leads

### Capa de API
- `src/lib/axios.ts` - Instancia de Axios con:
  - Headers de auth automáticos (access/refresh tokens vía `tokenStore`)
  - Header `X-Organization-Id` desde localStorage `selected_org`
  - Interceptor de refresh token con cola de requests
- `VITE_API_BASE_URL` variable de entorno (default: `http://localhost:8000`)

### Estructura de features
```
src/features/
  auth/           - Login, signup, servicios de usuario
  lead/           - Listado, formulario, detalle, importación de leads
  workspaces/     - CRUD de workspaces
  validations/    - Validaciones de campos de lead
  leadFields/     - Definiciones dinámicas de campos de lead
  orgProperties/  - Tags, secciones de campos
  nomenclators/   - Datos de referencia
  fieldAutomation/ - Reglas de automatización
  campaigns/      - Detalle de campañas
  dashboard/      - Dashboards global y por org
  search/         - Búsqueda global
```

### Estructura de componentes UI
```
src/components/
  layout/container  - Contenedores comunes, modales, papers y sidebars
  ui/
    buttons/        - Botones comunes, IconButtons, íconos comunes
    details/        - Componentes para mostrar información
    feedback/       - Toasts, diálogos de confirmación, pantallas de carga
    forms/          - Inputs personalizados, FormFeedback
    lists/          - Íconos personalizados, paginación y elementos de lista/tabla
    modals/         - Ayuda de fórmulas de Excel, otros modales comunes
```

### Patrones comunes
- **Custom hooks** en `src/hooks/` para lógica reutilizable (paginación, modal, carga, debounce, drag-drop)
- **Archivos de servicio** por feature (`*Service.ts`, `*Services.ts`) para llamadas API
- **Tipos** en `src/types/` (shared, leads, leadFields, users, campaigns, etc.)
- **UI compartida** en `src/components/ui/`, layout en `src/components/layout/`
- **Formularios**: React Hook Form + componentes MUI
- **Toasts**: `react-toastify` vía helpers de `src/utils/feedback.ts`

### Configuración de TypeScript (Estricta)
- `strict: true`, `noUnusedLocals/Parameters: true`
- `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`
- Ejecutar `pnpm typecheck` para verificar

### ESLint
- Config plana con `typescript-eslint`, `react-hooks`, `react-refresh`
- `react-refresh/only-export-components: off`

### Tests
Todavía no hay framework de tests configurado.

## Cuestiones a tener en cuenta
- El servidor de desarrollo usa polling (`usePolling: true`) para Docker/WSL
- El puerto 5173 es estricto (falla si está ocupado)
- La org id `1` es especial (Panel Global) - filtrada en UserContext
- El refresh de token usa import dinámico para evitar dependencias circulares
- Claves de localStorage: `user`, `selected_org`, `sel_lead_fields`

## Tareas
- **Antes de tocar cualquier componente o módulo, revisar `docs/indice_frontend.md` para conocer la estructura del proyecto y los componentes existentes.** Empezar siempre por `docs/convenciones_frontend.md` si se necesita entender la arquitectura general. No duplicar componentes ni reinventar patrones que ya están documentados.
- Después de completar todo el prompt, ejecutar los comandos de lint y typecheck, y corregir solo las alertas correspondientes a los archivos modificados, sin tocar ningún otro archivo
- Antes de crear un componente nuevo, o usar un componente de MUI, verificar si ya existe uno similar dentro de `docs/indice_frontend.md`. Si es necesario actualizarlos, preguntar primero
- Si el alcance de una tarea es ambiguo o requiere tocar más de ~3-4 archivos, detenerse y confirmar antes de proceder
- Usar siempre pnpm, nunca modificar pnpm-lock.yaml manualmente
- Si el cambio afecta la UI, verificarlo mentalmente contra las guías de diseño web antes de marcar la tarea como completada
- El texto visible para el usuario (labels, botones, toasts, mensajes de validación) y los comentarios deben estar en español. El código en inglés.
- Usar la documentación actualizada de MUI 9.1.0 antes de usar uno de sus componentes, o mediante context7 MCP

## Convenciones
- Usar los wrappers controlados existentes (ControlledAutocomplete, etc.) en lugar de cablear inputs MUI directamente con register/Controller
- Los errores de API se muestran mediante los helpers de toast en src/utils/feedback.ts — no agregar alert() ni estados de error inline a menos que el patrón no aplique
- Usar tokens de color del tema (`theme.palette`) en lugar de valores de color hardcodeados. Si el color viene del backend, usar la utilidad `getColorShades`
- Usar siempre los tamaños de texto definidos en `src/theme/typographyTheme` (`FONT_SIZES`, `textTheme`). En componentes MUI, preferir los `variant` tipográficos. Nunca hardcodear `fontSize`/`fontWeight` con strings literales
- Si hay una línea o bloque de código que un desarrollador JR no entendería fácilmente, dejar un comentario corto y conciso en español explicándolo, sin emojis

## Lo que NO hacer
- No instalar nuevas dependencias a menos que se indique lo contrario. Si no hay otra opción, preguntar primero
- No tocar el repositorio remoto
- No usar nunca `any` - arreglar el tipo subyacente o preguntar
- No loguear ni exponer valores de access_token/refresh_token, ni siquiera en salida de depuración
- No usar patrones de Next.js

## Documentación
- Cuando sea necesario buscar documentación, usar Context7 si está disponible
- Guardar un resumen breve de cada cambio dentro de un documento en la carpeta `src/logs`, un archivo por fecha. Si ya existe un archivo para la fecha actual, agregar al final del documento, en UTF-8
- **Si un cambio modifica la estructura, los exports, o la interfaz de un componente, hook, servicio o utilidad documentado en `docs/`, actualizar el doc correspondiente para reflejar el cambio.** Esto incluye: agregar/quitar props, renombrar exports, cambiar la firma de hooks/servicios, reestructurar carpetas, o agregar/quitar archivos relevantes.

## Skills
- **frontend-design**: aplicar por defecto al crear o rediseñar UI, no solo cuando se solicite explícitamente.
- **web-design-guidelines**: usar cuando se solicite revisión de accesibilidad/UX, o antes de cerrar una nueva funcionalidad de UI.
- **vercel-react-best-practices**: aplicar SOLO las categorías de reglas "client-*" y "async-*" (obtención de datos del lado cliente, event listeners, localStorage, micro-optimizaciones de JS). Ignorar reglas de Server Components / RSC / Next.js — este proyecto es una SPA Vite sin SSR.
