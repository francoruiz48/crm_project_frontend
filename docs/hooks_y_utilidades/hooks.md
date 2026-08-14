# Hooks personalizados (`src/hooks/`)

## `useModal`
Maneja apertura/cierre de modales por ID:
```tsx
const { openModalId, handleOpen, handleClose, modalProps } = useModal()

// Pasar modalProps directamente a GenericModal:
<GenericModal idModal="mi-modal" {...modalProps}>
  ...
</GenericModal>
```
- `handleOpen(id: string)` → abre el modal con ese ID
- `handleClose()` → cierra cualquier modal abierto
- `modalProps` → objeto con `{ openModalId, handleOpen, handleClose }` listo para spread

## `useListPagination`
Maneja estado de paginación:
```tsx
const { fetchPage, pageSize, refresh, goToPageOne, pageComponentProps } = useListPagination<Paginable<T>>(data, 25)

// pageComponentProps se pasa directo a PaginationComponent:
<PaginationComponent {...pageComponentProps} />
```
- `fetchPage`: página actual para fetch
- `goToPageOne()`: resetea a página 1 (forza refresh incluso si ya está en 1)
- `pageComponentProps`: `{ totalPages, page, handlePage }` listo para spread

## `useLoading`
Envuelve una función async con estado de loading:
```tsx
const { loading, fnWithLoading } = useLoading(saveData)

<CommonButton loading={loading} onClick={fnWithLoading}>Guardar</CommonButton>
```
- `fnWithLoading(...args)` ejecuta la función y setea `loading=true/false` automáticamente

## `useDebounce`
Debounce para evitar llamadas frecuentes (útil en inputs de búsqueda):
```tsx
const { debouncedFunction, loading } = useDebounce(800)

const handleSearch = (value: string) => {
  debouncedFunction(() => fetchResults(value))
}
```
- `timeout` default: 1000ms
- `loading` indica si hay una operación pendiente

## `useDragAndDrop`
Reordenar elementos con drag & drop:
```tsx
const { dragEvents, dragStyles } = useDragAndDrop(items, setItems)

{items.map((item, idx) => (
  <div key={item.id} {...dragEvents(idx)}
    style={dragStyles(idx, palette)}>
    {item.name}
  </div>
))}
```
- `dragEvents(idx, dropLast?)`: `{ draggable, onDragStart, onDragOver, onDragEnter, onDrop }`
- `dragStyles(idx, palette, direction?, noCursor?)`: estilos de feedback visual (borde en el lugar de drop, opacidad en el elemento arrastrado)
- Callbacks opcionales: `customDragStart`, `customDragOver`, `customDrop`, `customDragEnter`

## `useSidebar`
Maneja la apertura/cierre del panel lateral (sidebar de detalle/edición):
```tsx
const { sidebarMode, selectedEntity, handleSidebar, closeSidebar } = useSidebar<EntityType>(
  'id', searchParams, setSearchParams, fetchEntityById, 'detail'
)

// Abrir sidebar en modo detalle:
handleSidebar('detail', entity)

// Cerrar sidebar:
closeSidebar()
```
- Sincroniza el parámetro `?selected=ID` en la URL automáticamente
- Al iniciar, si hay `?selected=ID` en la URL, ejecuta el callback para cargar la entidad
- `sidebarMode`: string | null (modo actual: 'detail', 'edit', etc.)
- `selectedEntity`: T | null

## `useSelectCheckbox`
Selección múltiple con checkboxes:
```tsx
const { checkedItemsArray, addItem, removeItem, removeAllItems, areThereActiveItems, areThereInactiveItems } = useSelectCheckbox<Campaign>()

addItem(campaign)       // Agrega uno
addItem(campaigns)      // Agrega varios
removeItem(campaign)    // Quita uno
removeAllItems()        // Limpia
```
- `checkedItemsArray`: T[] (items seleccionados como arreglo)
- `areThereActiveItems`: boolean (si algún item seleccionado está activo)
- `areThereInactiveItems`: boolean (si algún item seleccionado está inactivo)

## `useOrderList`
Maneja estado de ordenamiento de listas:
```tsx
const { orderBy, ascending, handleOrderList, orderProps } = useOrderList(fetchData)

// Renderiza un header de tabla clickeable:
<TableHead>
  <TableRow>
    <TableCell onClick={() => handleOrderList('name')}>
      Nombre {orderBy === 'name' && (ascending ? '↑' : '↓')}
    </TableCell>
  </TableRow>
</TableHead>
```
- Ciclo: ascendente → descendente → sin orden
- `orderProps`: `{ orderBy, ascending, handleOrderList }` listo para spread

## `useOrderSeachList`
Combina estado de búsqueda + ordenamiento + filtro de activos, con persistencia de los **filtros avanzados** en `sessionStorage` (solo filtros, no orden ni búsqueda por texto).
> Nota: el export conserva el typo histórico `useOrderSeachList` (falta la "r"). El archivo es `src/hooks/useOrderSearchLists.ts`.
```tsx
const { fetchParams, changeHandlers } = useOrderSeachList(entityName, id?, defaultValues?)

// entityName: string, clave de la entidad (ej. "leads", "campaigns", "nomenclators")
// id?: string, para instancias de listas dentro de otras listas con filtros propios
//   (ej. los ítems de un nomenclador: useOrderSeachList("nomenclator_items", nomenclator.id))
// defaultValues?: { order_by, ascending, search, search_fields }

// fetchParams = { order_by, ascending, search, search_fields, ...filterParams }
// changeHandlers = { handleOrderChange, handleSearchChange, handleFilterChange, filterParams }
// Pasar a OrderSearchMenu:
<OrderSearchMenu {...changeHandlers} />
```
- La clave de persistencia incluye la **organización activa** (`${entityName}${id ? "_" + id : ""}_${activeOrg?.id}_filters`), así los filtros de una org no se arrastran a otra.
- `defaultValues` opcional define el orden/búsqueda por defecto (ej. `useOrderSeachList("automations", undefined, DEFAULT_FIELDS)` para las automatizaciones).
- Tolerante a `sessionStorage` no disponible (modo privado) y a claves corruptas: en ambos casos se trabaja solo con estado en memoria.
