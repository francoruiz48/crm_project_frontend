# Utilidades, librerías, stores y tipos

---

## Utilidades (`src/utils/`)

### `feedback.ts`
Helpers para notificaciones toast:
```tsx
showToast("Lead creado exitosamente", "success")
showToast("Error al guardar", "error")
showCommonErrorToast(error, "Error inesperado")
```
- `showToast(message, mode)` → mode: `"success" | "error" | "warning" | "info" | "default"`
- `showCommonErrorToast(e, message)` → loguea el error en consola y muestra toast genérico

### `formatters.ts`
Formateo de datos:
```tsx
formatMoney(1500)                               // "$1.500,00"
formatDate("2024-01-15", "dateTimeLong")       // "lunes 15/01/2024 00:00:00"
formatDate("2024-01-15", "date")               // "15/01/2024"
isValidURL("https://example.com")              // true
sanitizePhone("+54 11 1234-5678")             // "541112345678"
getColorShades("primary", theme)               // { LIGHTER, LIGHT, MAIN, DARK, DARKER }
decodeUrlFilename("/path/file.pdf")            // "file.pdf"
```
- Fechas con `dayjs` en locale `es`
- `getFieldTypeValue` convierte strings a NUMBER/BOOL/OBJECT/ARRAY

### `forms.ts`
Manejo de errores de API en formularios:
```tsx
try {
  await saveData(payload)
} catch (error) {
  setFormErrors(error, setError)
}
```
- `setFormErrors(error, setError, mapFunction?, customRoot?, toRoot?)`
- Parsea el `detail` del backend (string, array, u objeto) y lo mapea a los campos del formulario

### `lists.ts`
Helpers para ordenar listas:
```tsx
orderList([3, 1, 2], false)         // [1, 2, 3]
orderListByField(items, 'order')    // ordena por campo
getListField(list, 'id', true)      // [1, 2, 3]
stopPropagationEvent(callback)      // (e) => { e.stopPropagation(); return callback() }
```

### `constants.ts`
```tsx
export const SUPERUSER: Organization = { id: 1, name: "Panel Global" }
```

---

## Librerías (`src/lib/`)

### `axios.ts` — `axiosCRM` (default export)
Instancia de Axios configurada con:
- `baseURL`: `VITE_API_BASE_URL` (default `http://localhost:8000`)
- **Request interceptor**: agrega `Authorization: Bearer <token>` y `X-Organization-Id` desde localStorage
- **Response interceptor**: en 401, intenta refresh token con cola de requests. No reintenta en `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`. Si falla el refresh, redirige a `/login`.

### `tokenStore.js` — `tokenStore`
Manejo de tokens JWT en localStorage:
```tsx
tokenStore.setTokens(access, refresh, rememberMe)
tokenStore.getAccessToken()
tokenStore.getRefreshToken()
tokenStore.hasSession()
tokenStore.isRemembered()
tokenStore.clear()
```

Además exporta:
- `getErrorMessage(error, fallback?)`: normaliza errores del backend (string | array de {field, message}) a un string

---

## Stores (`src/stores/`)

### `UserContext.tsx` — `UserProvider` + `useUserContext`
Contexto global de autenticación y organización activa:
```tsx
const { user, activeOrg, orgHeaderList, login, signup, logout, updateUser,
  refreshUser, setActiveOrg, fetchOrgHeaderList, isRestoring, loadingOrgs,
  hasOneActiveOrg } = useUserContext()
```

**Estado:**
- `user`: `UserData | null` — usuario autenticado, persistido en localStorage
- `activeOrg`: `Organization | null` — org seleccionada, persistida en localStorage como `selected_org`
- `orgHeaderList`: `Organization[]` — lista de orgs del usuario (para el selector)
- `isRestoring`: boolean — true mientras se restaura sesión tras recargar página
- `loadingOrgs`: boolean — true mientras se cargan las orgs
- `hasOneActiveOrg`: boolean — la lista tiene 1 o 0 orgs

**Acciones:**
- `login(data, rememberMe?)`: login + fetch user + fetch orgs
- `signup(data)`: registro + login automático
- `logout()`: limpia tokens + localStorage + estado
- `updateUser(data)`: actualiza perfil + refresh local
- `refreshUser()`: recarga datos del usuario desde API
- `setActiveOrg(org)`: cambia org activa (persiste en localStorage)
- `fetchOrgHeaderList()`: recarga lista de orgs

**Flujo de restauración:**
1. Al montar, si hay `refresh_token` pero no `access_token`, intenta `/auth/refresh`
2. Si ok: restaura tokens + fetch user + fetch orgs
3. Si fail: limpia todo y redirige a `/login`

---

## Tipos (`src/types/`)

| Archivo | Interfaces principales |
|---|---|
| `shared.ts` | `Paginable<T>`, `Metadata`, `DisableableEntity`, `OrderParams`, `SearchParams`, `OrderSearchParams`, `ListParams`, `LeadListParams`, `ErrorBody<T>`, `ErrorMessage<T>`, `SimpleErrorBody`, `BulkDeleteResponse`, `BulkEnableResponse`, `SearchResults`, `LeadFilter`, `Dictionary`, `ColorShades` |
| `campaigns.ts` | `Campaign`, `Workspace`, `Organization` (y sus variantes Detailed) |
| `leads.ts` | `Lead`, `LeadPost`, `LeadValue`, `LeadComment`, `LeadState`, `LeadActivityHistory` |
| `leadFields.ts` | `LeadField`, `LeadFieldDetailed`, `LeadFieldValue`, `LeadFieldTemplate`, `InputMaskTemplate`, `LeadFieldType`, `FieldValidationRule`, `FieldValidationRuleTemplate`, `ExcelFormulaTemplate`, `LeadFieldsBySection` |
| `users.ts` | `UserData`, `UserLogin`, `UserSignup`, `UserInvitation` |
| `nomenclators.ts` | `Nomenclator`, `NomenclatorItem` |
| `automation.ts` | `FieldAutomation`, `FieldAutomationCondition`, `FieldAutomationAction` |
| `leadFlow.ts` | `LeadFlow`, `LeadState`, `LeadStateTransition` |
| `orgProperties.ts` | `LeadFieldSection`, `Tag`, `LeadContactState` |
| `routing.ts` | `LeadRoutingPolicy`, `RoutingCondition` |
| `teams.ts` | `Team`, `TeamMember` |
| `systemAudit.ts` | `SystemAuditLog` |
| `mui-theme.d.tsx` | `ColorTypes`, `colorTypesArray` — extensión del theme de MUI |

---

## Theme (`src/theme/`)

### `theme.tsx`
Tema MUI creado con `createTheme` y `colorSchemes` (light/dark). Configura:
- `shape.borderRadius = ".5em"`
- Tipografía responsive vía `textTheme` (definido en `typographyTheme.tsx`)
- Componentes globales: `MuiButton` (borderRadius, sin box-shadow), `MuiFormControl` (margin), `MuiPaper` (bordes con alpha según elevation)

### `themePalette.tsx`
Paletas de colores light/dark con colores personalizados: `primary`, `secondary`, `success`, `info`, `warning`, `error`, `contrast` (fondos oscuros/claros), `alpha` helper.

### `typographyTheme.tsx`
Sistema de tipografía centralizado. Exports:
- `FONT_FAMILY` — `{ display: 'Sora, Inter, sans-serif', body: 'Inter, sans-serif' }`
- `FONT_SIZES` — `{ xs: '.75rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' }`
- `TITLE_LINE_HEIGHT` — `1.2` (line-height para todos los headings)
- `textTheme` — `{ root, title, variants }` donde `title` tiene h1-h6 (fontSize+fontWeight+lineHeight) y `variants` tiene body1/body2/subtitle/caption/overline/button

Consumido por `theme.tsx` via spread (`...textTheme.title, ...textTheme.variants`). No importar `typographyTheme` directamente en componentes — usar los `variant` de MUI o `CommonCRMText`/`CommonCRMTitle`.

### `paperUtils.tsx`
Helpers para calcular alpha de bordes según elevation de Paper.
