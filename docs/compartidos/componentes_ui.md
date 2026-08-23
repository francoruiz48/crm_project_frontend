# Componentes UI (`src/components/ui/`)

---

## Botones (`buttons/`)

### `CommonButton` (default export) + `CommonAvatar` — `buttons/CommonButton.tsx`
Botón con ícono automático según `actionType`:
```tsx
<CommonButton actionType="CREATE" onClick={handleCreate}>Nuevo</CommonButton>
<CommonButton actionType="SAVE" loading={loading}>Guardar</CommonButton>
<CommonButton actionType="RETURN" variant="outlined" color="secondary">Volver</CommonButton>
```
- Props: todas las de `Button` + `actionType`, `loading`, `onlyTooltip` (solo icono con tooltip)
- En dark mode, outlined usa colores más claros para legibilidad
- Cuando `loading=true`, muestra spinner y texto "Cargando"

### `CommonIconButton` + `CommonIcon` — `buttons/CommonIconButton.tsx`
IconButton con tooltip incorporado:
```tsx
<CommonIconButton actionType="MODIFY" title="Editar" onClick={handleEdit} />
<CommonIconButton actionType="DISABLE" color="error" size="small" title="Eliminar" />
```
- Props: `actionType`, `title` (tooltip), `size`, `tooltipSize`, `color`, `loading`, `noTooltip`, `border`
- `CommonIcon` es la versión solo ícono (sin botón)

### `HandleActiveButton` (default export) — `buttons/HandleActiveButton.tsx`

---

## Íconos (`icons/`)

### `ACTION_ICONS` (default export) — `icons/ActionIcons.tsx`
Mapa de `ActionType` a iconos de MUI. Tipos disponibles:
`NONE`, `MODIFY`, `CLOSE`, `CREATE`, `DISABLE`, `ENABLE`, `DETAILS`, `SAVE`, `FILTER`, `OPTIONS`, `SETTINGS`, `RETURN`, `LOGIN`, `SIGNUP`, `LIST`, `CHECK`, `LOADING`, `MINUS`, `REORDER`, `OPEN_LIST`, `CLOSE_LIST`, `DRAG`, `RENAME`, `DUPLICATE`, `AUTOMATE`, `DOWNLOAD`, `IMPORT`, `PARAMETERS`, `USER`, `CALENDAR`, `TIME`

### `ROUTE_ICONS` (default export) — `icons/RouteIcons.tsx`
Mapa de `RouteType` a iconos de MUI para el navbar. Tipos disponibles:
`DASHBOARD`, `LEADS`, `CAMPAIGNS`, `NOMENCLATORS`, `AUTOMATIONS`, `ORGANIZATIONS`, `ORG_PROPERTIES`, `ROLES`, `TEAMS`, `AUDIT`

Consumido por `routeList.tsx` para asignar el ícono de cada ruta en el sidebar. Separa la definición de íconos de navegación de la configuración de rutas.

---
Botón que alterna entre "Habilitar" y "Deshabilitar" según el estado activo:
```tsx
<HandleActiveButton active={item.active} handleActive={() => toggleActive(item)} />
```
- Props: `active`, `handleActive`, `disableColor` (default `"error"`), `enableColor` (default `"success"`), `disableText`, `enableText`

---

## Control de acceso (`auth/`)

Componentes compartidos para control de permisos sobre elementos de UI. Importables desde `shared/auth/` gracias al path alias `shared/* → ./src/components/*`.

### `Can` (default export) — `auth/Can.tsx`
Renderiza `children` solo si el usuario tiene el permiso indicado en la org activa. Si no hay permiso, no renderiza nada. Si no se pasa `permission`, renderiza siempre.

```tsx
import { Can } from 'shared/auth/Can'
<Can permission="lead:create">
  <CommonButton actionType="CREATE">Agregar lead</CommonButton>
</Can>
```
- `permission`: string (un permiso) o string[] (cualquiera de la lista).

### `RequirePermission` (default export) — `auth/RequirePermission.tsx`
Envuelve `children` y los renderiza solo si el usuario tiene el permiso indicado en la org activa. Si no tiene permiso, muestra `<Unauthorized />` en vez de ocultar el contenido.

Se usa **automáticamente** en el sistema de rutas (`routeList.tsx`): el procesador `ROUTE_LIST_OUTLET_PROCESSED` envuelve cada ruta con `<RequirePermission permission={i.permission}>` a partir del campo `permission` de cada entrada. No hace falta usarlo manualmente al definir rutas.

También está disponible para uso directo si se necesita proteger un bloque de UI:
```tsx
import RequirePermission from 'shared/auth/RequirePermission'
<RequirePermission permission="lead:create">
  <CommonButton actionType="CREATE">Agregar lead</CommonButton>
</RequirePermission>
```
- `permission`: string (un permiso) o string[] (cualquiera de la lista).

---

## Formularios (`forms/`)

### `ControlledTextInput` — `forms/CustomInputs.tsx`
Input de texto controlado por React Hook Form:
```tsx
<ControlledTextInput control={control} name="nombre" label="Nombre" required errorMessage={errors.nombre?.message} />
```
- Props: `control`, `name`, `label`, `required`, `errorMessage`, `size`, `startAdornment`, más todas las de `TextField`

### `RegisteredTextInput` — `forms/CustomInputs.tsx`
Versión con `register` en vez de `control`:
```tsx
<RegisteredTextInput register={register} name="email" label="Email" required errorMessage={errors.email?.message} />
```

### `RegisteredDateInput` — `forms/CustomInputs.tsx`
Input de fecha con soporte de formatos:
```tsx
<RegisteredDateInput register={register} name="fecha" dateType="DATE_TIME" label="Fecha" />
```
- `dateType`: `"DATE"`, `"DATE_TIME"`, `"TIME"`
- Filtro de calendario invertido en dark mode

### `PasswordField` — `forms/CustomInputs.tsx`
Campo de contraseña con toggle de visibilidad:
```tsx
<PasswordField register={register} name="password" label="Contraseña" required errorMessage={errors.password?.message} />
```

### `ControlledSlider` — `forms/CustomInputs.tsx`
Slider o Rating controlado con spinner numérico:
```tsx
<ControlledSlider control={control} name="puntaje" label="Puntaje" min={0} max={10} step={1} />
<ControlledSlider control={control} name="estrellas" type="rating" max={5} step={0.5} label="Rating" />
```

### `ControlledNumber` — `forms/CustomInputs.tsx`
Campo numérico controlado:
```tsx
<ControlledNumber control={control} name="edad" label="Edad" min={0} max={150} type="spinner" />
<ControlledNumber control={control} name="monto" label="Monto" startAdornment={<span>$</span>} />
```
- `type`: `"field"` (NumberField completo) o `"spinner"` (solo spinner)

### `ControlledCheckbox` / `ControlledSwitch` — `forms/CustomInputs.tsx`
Checkbox o Switch controlado con tooltip opcional:
```tsx
<ControlledCheckbox control={control} name="activo" label="Activo" tooltip="Indica si está habilitado" />
<ControlledSwitch control={control} name="notificar" label="Notificar" />
```

### `SingleFileField` — `forms/CustomInputs.tsx`
Campo de archivo simple (nativo):
```tsx
<SingleFileField register={register} name="archivo" label="Archivo" />
```

### `ControlledAutocomplete` + `AutocompleteLoader` — `forms/CustomMultipleInputs.tsx`
Autocomplete controlado con soporte de selección simple/múltiple y retorno de campo específico:
```tsx
const options = [{ id: 1, name: "Opción 1" }, { id: 2, name: "Opción 2" }]
<ControlledAutocomplete control={control} name="seleccion" label="Elegir"
  options={options} getOptionLabel={(o) => o.name} getOptionKey={(o) => String(o.id)}
  returnField="id" multiple />
```
- Props clave: `options`, `getOptionLabel`, `getOptionKey`, `returnField` (null para devolver el objeto completo), `multiple`, `disableClearable`, `onChangeBefore`, `renderOption`, `renderValue`, `groupBy`, `renderGroup`
- `groupBy`: agrupa visualmente las opciones (requiere que `options` ya venga agrupada por ese criterio, si no MUI repite el encabezado)
- `renderGroup`: custom del encabezado de grupo. Para selectores de campo pasar `renderFieldSectionGroup` (ver `FieldSectionHeader` abajo) y así reemplazar el `ListSubheader` en negrita por defecto de MUI
- Muestra `AutocompleteLoader` (loading spinner) si no hay options y no está disabled

### `GenericSelector` — `forms/GenericSelector.tsx`
Selector genérico `value`/`onChange` (no depende de react-hook-form), base para selectores especializados:
```tsx
<GenericSelector options={options} value={selected} onChange={handleChange}
  getOptionLabel={(o) => o.label} getOptionKey={(o) => o.id} />
```
- `searchable` (default `true`): decide si se renderiza como `Autocomplete` (con buscador) o como `<Select>` simple, sin duplicar lógica
- `groupBy`: agrupa las opciones en grupos contiguos preservando el orden de aparición (se reordena internamente para no repetir encabezados)
- `renderGroup`: custom del encabezado de grupo (default `renderFieldSectionGroup` de `FieldSectionHeader.tsx`)
- `renderOptionContent`: mismo render de cada opción en modo Select y en modo Autocomplete (si no se pasa, usa `getOptionLabel`)
- Muestra `AutocompleteLoader` si no hay options y no está disabled; `errorMessage` se muestra con `FormErrorMessage`

### `FieldSelector` + `ControlledFieldSelector` — `forms/FieldSelector.tsx`
Selector especializado en "elegir un campo" de Lead (custom + nativos), agrupado por sección. Los campos nativos (id negativo) se agrupan en secciones sintéticas ("Datos del Lead"/"Creación"/"Modificación"); los custom, por su `lead_field_section` (ver `getFieldSelectorGroupName`/`groupFieldsForSelector` en `leadFieldUtils.ts`):
```tsx
<FieldSelector fields={allFields} value={fieldId} onChange={setFieldId} searchable label="Campo" />
```
- "Hereda" de `GenericSelector` el toggle `searchable` (Autocomplete vs Select simple)
- `showTypeCaption` (default `true`): muestra `(TIPO)` en cursiva al lado del nombre — se oculta automáticamente para nativos; pasar `false` para no mostrarlo nunca
- `onChangeBefore`: se llama con el campo elegido (objeto completo) ANTES de `onChange` — útil para resetear otros campos del form que dependan del tipo del elegido
- `ControlledFieldSelector` es la versión conectada a react-hook-form (`control`/`name`), para formularios que manejan su estado con RHF (automatizaciones, filtros de la lista de leads)

### `FieldSectionHeader` + `renderFieldSectionGroup` + `renderGroupedMenuItems` — `forms/FieldSectionHeader.tsx`
Encabezado de sección para selectores que agrupan campos por sección: línea divisora suave + título en letra pequeña. Incluye 3 exports:
- `FieldSectionHeader` (componente): props `name`, `first` (el primer grupo no lleva línea divisora arriba)
- `renderFieldSectionGroup`: para pasar como `renderGroup` de un Autocomplete/`ControlledAutocomplete` con `groupBy` — respeta la estructura `<li><header/><ul>` que espera MUI
- `renderGroupedMenuItems`: para armar los children de un `<Select>` agrupado por sección — intercala un header (no seleccionable) antes de los `MenuItem` de cada grupo

### `ControlledRadio` — `forms/CustomMultipleInputs.tsx`
Grupo de radios controlado:
```tsx
<ControlledRadio control={control} name="tipo" label="Tipo"
  options={[{ code: "A", label: "Tipo A" }]}
  returnField="code" keyField="code" getRadioLabel={(o) => o.label} />
```

### `ControlledGroupedCheckbox` — `forms/CustomMultipleInputs.tsx`
Grupo de checkboxes que devuelve un arreglo de valores seleccionados:
```tsx
<ControlledGroupedCheckbox control={control} name="roles" label="Roles"
  options={roles} returnField="id" keyField="id" getCheckboxLabel={(r) => r.name} />
```

### `ControlledColorPicker` + `ColorPickerButton` + `ColorPickerMenu` — `forms/ColorPicker.tsx`
Selector de color con botones predefinidos del theme + selector HEX libre:
```tsx
<ControlledColorPicker control={control} name="color" />
```
- Muestra botones circulares para cada `colorTypesArray` del theme
- Botón adicional que abre `HexColorPicker` (react-colorful) con input HEX
- Props: `size`, `row`, `onBeforeChange`

### `ChipSelect` (default export) — `forms/ChipSelect.tsx`
Select estilizado como chip. Para selectores pequeños inline:
```tsx
<ChipSelect value={value} onChange={handleChange} size="small" chipColor="primary">
  <MenuItem value="op1">Opción 1</MenuItem>
</ChipSelect>
```

### `NumberField` (default export) + `NumberSpinner` — `forms/NumberField.tsx`
Campo numérico MUI-based con botones +/- y scrub area:
```tsx
<NumberField label="Cantidad" min={0} max={100} />
<NumberSpinner label="Edad" min={0} max={150} />
```
- Implementado con `@base-ui/react/number-field`
- Soporta `startAdornment`, `endAdornment`

### `SearchInput` — `forms/SearchInput.tsx`
Input de búsqueda con selector de campo y debounce:
```tsx
<SearchInput onSearch={(q, field) => fetch({ search: q, search_fields: field })}
  options={[{ name: "name", label: "Nombre" }]} size="small" />
```
- Usa `useDebounce` (1 segundo por defecto)
- Soporta opciones con subopciones (`searchOptions` para autocomplete)
- Incluye selector de campo estilizado como `ChipSelect`

### `FileInput` (default export) — `forms/FileInput.tsx`
Input de archivo drag & drop con preview:
```tsx
<FileInput control={control} name="archivo" label="Subir archivo"
  accept=".pdf,.jpg" multiple showPreview />
```
- Drag & drop + click para seleccionar
- Preview de imágenes vía `FileReader`
- Validación de tipo de archivo contra `accept`
- Muestra cards con nombre, tamaño y tipo
- Soporta reemplazo de archivo existente

### `FormErrorMessage` — `forms/FormFeedback.tsx`
`FormHelperText` estilizado para mensajes de error:
```tsx
<FormErrorMessage>Campo requerido</FormErrorMessage>
```

---

## Detalles y chips (`details/`)

### `CustomChip` (default export, memo) — `details/CustomChip.tsx`
Chip estilizado con soporte de colores del theme y tamaño:
```tsx
<CustomChip label="Activo" chipColor="success" size="small" />
<CustomChip label="Ver" component={Link} to="/ruta" clickable />
```
- Colores derivados de `getColorShades` (soporta hex o color types)
- Backdrop blur y bordes redondeados (`.75rem`)
- Casteado a `OverridableComponent` para usar `component` y `to`

### `ChipTooltip` (memo) — `details/ChipTooltip.tsx`
Tooltip renderizado como chip (usa `CustomChip` como slot):
```tsx
<ChipTooltip title="Información adicional" color="info">
  <IconButton><InfoIcon /></IconButton>
</ChipTooltip>
```
- Props: `show`, `boxed`, `title`, `color`, `placement`, `size`
- Si `show=false`, renderiza solo children sin tooltip
- Si `boxed=true`, envuelve children en un Box inline-flex (útil para iconos)

### `CustomAvatar` (styled) — `details/CustomAvatar.tsx`
Avatar con color del theme, redondeado:
```tsx
<CustomAvatar color="primary"><EditIcon /></CustomAvatar>
```
- Tamaños: `small` (36px) / `medium` (50px)
- Color dinámico según el shade del theme (light/dark mode)

### `UserAvatar` — `details/UserAvatar.tsx`
Avatar de usuario con iniciales y color generado determinísticamente del nombre:
```tsx
<UserAvatar name="Juan Pérez" size={40} tooltip />
```
- Usa función hash para asignar siempre el mismo color al mismo nombre (HLS)
- Iniciales: primera letra del primer nombre + primera letra del apellido
- `nameToColor(name)` está **exportado** para reusarlo fuera del avatar (ej. `LeadComments` colorea cada comentario según su autor). Saturación/luminosidad fijas — solo varía el matiz

### `DetailsMetadata` (default export) + `MetadataShort` — `details/DetailsMetadata.tsx`
Componente de metadatos de auditoría (creación/modificación). `DetailsMetadata` versión completa con dos columnas separadas por divider vertical; `MetadataShort` versión de una línea.

`DetailsMetadata` usa iconos `PERSON_OUTLINE` (`BadgeOutlined`) para el creador, `MODIFY` (`Edit`) para el último editor y `CALENDAR` (`CalendarMonth`) para las fechas — todos inline sin avatar circular, con labels en mayúscula pequeña y tipografía refinada para un look profesional y minimalista. La sección "Modificado por" solo se renderiza si `updated_at` difiere de `created_at`.
```tsx
<DetailsMetadata entity={campaign} />
<MetadataShort metadata={lead} onlyUser />
```

### `TitleAndActive` (default export) — `details/TitleAndActive.tsx`
Título con avatar que indica estado activo/inactivo:
```tsx
<TitleAndActive active={item.active}>
  <Typography variant="h2">{item.name}</Typography>
</TitleAndActive>
```

### `EnabledIcon` (memo) — `lists/Icons.tsx`
Icono que indica habilitado/deshabilitado (check/close):
```tsx
<EnabledIcon active={item.active} />
<EnabledIcon active={item.active} isAvatar />
```

### `CodeBox` (styled) — `details/CodeBox.tsx`
Caja oscura con fuente monospace para mostrar código:
```tsx
<CodeBox>{código}</CodeBox>
```

### `CommonCRMText` + `CommonCRMTitle` — `details/CommonText.tsx`
Componentes wrapper de `Typography` para texto centralizado (ver "Sistema tipográfico" en `convenciones_frontend.md`):

**`CommonCRMText`** — body text con tamaño predefinido:
```tsx
<CommonCRMText variant="body1" color="text.secondary" size="sm">Texto pequeño</CommonCRMText>
<CommonCRMText size="md">Tamaño por defecto</CommonCRMText>
```
- `size` (`"xs" | "sm" | "md" | "lg" | "xl"`): mapea a `FONT_SIZES` del theme. Opcional — si no se pasa, usa el default del `variant`
- `variant`: hereda de `Typography` (body1, body2, caption, etc.)
- `color`, `sx`, y el resto de props de `Typography` se pasan directamente

**`CommonCRMTitle`** — headings con opción de font display (Sora):
```tsx
<CommonCRMTitle titleLevel="h2" component="p" font="display">{value}</CommonCRMTitle>
<CommonCRMTitle titleLevel="h3">Título normal (Inter)</CommonCRMTitle>
```
- `titleLevel` (`"h1" | "h2" | "h3" | "h4" | "h5" | "h6"`): variant de MUI a usar
- `font` (`"CRM" | "display"`): `"display"` usa la fuente Sora (para números destacados, stat cards). Default: `"CRM"` (Inter)
- `component`: prop de MUI para controlar el elemento HTML renderizado (ej. `"p"` para que un `h2` se renderice como `<p>`)

### `StatCard` (default export) — `details/StatCard.tsx`
Tarjeta de métrica para dashboards (valor destacado + ícono + etiqueta):
```tsx
<StatCard label="Leads totales" value={data.total_leads} icon={<LeaderboardOutlined fontSize="small" />} color={palette.primary.main} />
```
- `label`: texto descriptivo bajo el valor (`CommonCRMText subtitle2`)
- `value`: número o string destacado (se muestra con `CommonCRMTitle` en fuente display)
- `icon`: nodo de ícono, teñido con el `color` recibido
- `color`: color del borde izquierdo y del ícono (hex o token)

### `NewTabLink` (default export) — `details/NewTabLink.tsx`
Link que se abre en nueva pestaña, con validación de URL:
```tsx
<NewTabLink url="https://example.com" title="Ver sitio" />
```

### `CustomProgressBar` (default export, memo) — `details/CustomProgressBar.tsx`
Barra de progreso estilizada:
```tsx
<CustomProgressBar variant="determinate" value={75} color="success" />
```

---

## Feedback y diálogos (`feedback/`)

### `GenericConfirmDialog` (memo) — `feedback/ConfirmationDialog.tsx`
Diálogo de confirmación con timeout configurable de seguridad:
```tsx
<GenericConfirmDialog idModal="conf" handleClose={onClose}
  onConfirm={handleDelete} confirmTimeoutSec={3}>
  <Typography>¿Confirmar eliminación?</Typography>
</GenericConfirmDialog>
```
- Muestra botón "Confirmar" que inicia un conteo regresivo
- Durante el conteo, se muestra botón "Cancelar (N s.)" con barra de progreso
- Props: `onConfirm`, `confirmTimeoutSec`, `noTimeout`, `confirmText`, `closeText`

### `DisableConfirmDialog` — `feedback/ConfirmationDialog.tsx`
Confirmación específica para habilitar/deshabilitar entidades:
```tsx
<DisableConfirmDialog entity={item} clearEntity={() => setItem(null)}
  idModal="del-conf" entityTypeName="la campaña"
  onConfirm={() => handleToggle(item)} />
```
- Adapta el texto según `onlyDelete` y el estado `active` de la entidad

### `DisableBulkConfirmDialog` — `feedback/ConfirmationDialog.tsx`
Confirmación para habilitar/deshabilitar múltiples entidades:
```tsx
<DisableBulkConfirmDialog open={open} onClose={onClose}
  isDisabling={true} entityTypeName="las campañas seleccionadas"
  onConfirm={handleBulkAction} />
```

### `LoadingScreenWrapper` (default export) — `feedback/LoadingScreen.tsx`
Wrapper que muestra un spinner si `loading=true`:
```tsx
<LoadingScreenWrapper loading={isFetching}>
  <div>contenido</div>
</LoadingScreenWrapper>
```

### `Toast` (default export) — `feedback/Toast.tsx`
Componente de toast personalizado para react-toastify. Usa `CustomAlert` internamente.

### `CustomAlert` (styled) — `feedback/CustomAlert.tsx`
Alert estilizado con backdrop blur y colores adaptados al theme:
```tsx
<CustomAlert severity="success">Operación exitosa</CustomAlert>
```

---

## Listas y tablas (`lists/`)

### `CustomListItem` (styled) — `lists/CustomListItem.tsx`
ListItem con selección visual y acciones visibles solo en hover:
```tsx
<CustomListItem isSelected={selectedId === item.id}>
  <ListItemText primary={item.name} />
</CustomListItem>
```
- Props: `isSelected`, `alwaysShowSecondary`, `color`
- Si `isSelected`, renderiza como Paper con elevation y borde de color

### `ResponsiveListItem` + `buildActions` + `ListItemAction` — `lists/CustomListItem.tsx`
ListItem responsivo: hover actions en desktop, menú contextual en táctil:
```tsx
<ResponsiveListItem actions={[
  { template: "DETAILS", onClick: () => handleDetail(item) },
  { template: "MODIFY", onClick: () => handleEdit(item) },
  !item.active && { template: "ENABLE", onClick: () => handleEnable(item) }
].filter(Boolean)}>
  <ListItemText primary={item.name} />
</ResponsiveListItem>
```
- `buildActions()` filtra valores falsy y completa templates (`DETAILS`, `MODIFY`, `ENABLE`, `DISABLE`, `DELETE`)
- En táctil (pointer: coarse) con más de 1 acción, muestra `MoreVertIcon` que abre `Menu`

### `SelectableTableRow` (memo, styled) — `lists/CustomTableRow.tsx`
TableRow con hover pointer y acciones ocultas que aparecen en hover:
```tsx
<TableBody>
  <SelectableTableRow hover onClick={handleClick}>
    <td>contenido</td>
    <td className="table-actions"><IconButton>...</IconButton></td>
  </SelectableTableRow>
</TableBody>
```

### `CustomTimelineItem` — `lists/CustomTimelineItem.tsx`
Item de timeline con punto de color seleccionable:
```tsx
<CustomTimelineItem selected={isActive} last={isLast}>
  <Typography>{contenido}</Typography>
</CustomTimelineItem>
```

### `OrderMenu` — `lists/OrderMenu.tsx`
Menú emergente para ordenar listas:
```tsx
<OrderMenu onOrderChange={(field, asc, active) => fetch({ order_by: field, ascending: asc, only_active: active })}
  options={[{ name: "name", label: "Nombre" }]} />
```
- Incluye opciones de orden ascendente/descendente + filtro "Solo activos"

### `OrderSearchMenu` — `lists/OrderMenu.tsx`
Combinación de `SearchInput` + `OrderMenu` en un mismo row:
```tsx
<OrderSearchMenu {...changeHandlers}
  searchOptions={searchOptions}
  orderOptions={orderOptions} size="small" />
```

### `PaginationComponent` (memo, default export) — `lists/PaginationComponent.tsx`
Componente de paginación MUI:
```tsx
<PaginationComponent totalPages={totalPages} page={page} handlePage={handlePage} />
```

### `NoItemsMessage` — `lists/NoItemsMessage.tsx`
Mensaje cuando no hay elementos:
```tsx
<NoItemsMessage search={query} emptyFetchMessage={<span>No hay campañas creadas</span>}>
  <CommonButton onClick={handleCreate}>Crear primera</CommonButton>
</NoItemsMessage>
```

---

## Modales (`modals/`)

### `FormulaHelperPanel` — `modals/FormulaHelperModal.tsx`
Panel colapsable de ayuda para fórmulas de Excel (campos CALCULATED):
```tsx
<FormulaHelperPanel open={showHelper} formulas={formulas}
  onInsert={(name) => insertFormula(name)} />
```
- Búsqueda por nombre (inglés/español) y descripción
- Agrupado por categoría en Accordions
- Muestra sintaxis, ejemplo y nota de cada fórmula
- Botón "Insertar" para cada fórmula
