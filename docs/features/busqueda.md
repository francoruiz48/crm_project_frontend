# Búsqueda global (`src/features/search/`)

## Estructura
```
search/
  GeneralSearchBar.tsx     → HeaderSearchBar (barra en el header) + getSearchCategories
  SearchResults.tsx        → SearchResultsList (página de resultados)
```
El servicio API ya no vive acá: `generalSearch` está en `src/services/generalService.ts`.

## Componentes

### `HeaderSearchBar` — `GeneralSearchBar.tsx`
Barra de búsqueda global ubicada en el `Header` de la aplicación.
- Input de texto con lupa, con debounce de 500ms y mínimo 3 caracteres para disparar la búsqueda.
- Muestra un dropdown de preview (hasta 5 resultados) con la opción "Ver todo" que navega a `/search?query=...`.
- Exporta `getSearchCategories(results)` (reutilizado por `SearchResultsList`).

### `SearchResultsList` — `SearchResults.tsx`
Página de resultados de búsqueda. Ruta: `/search`.
- Recibe el query de la URL (`searchParams.get("query")`).
- **Solo busca Leads** (el backend filtra por la entidad `lead`). Los bloques de otras entidades (Campañas, Workspaces, Nomencladores, etc.) quedaron comentados en `getSearchCategories` como plantilla por si se quieren habilitar en el futuro; cada categoría nueva es solo un item más en ese array.
- Con más de una categoría activa muestra tabs para cambiar entre ellas; con una sola, directamente el listado.
- Cada resultado es clickeable para navegar al detalle del lead, con acción secundaria "Ver Campaña" (solo si el lead tiene campaña asignada).

## Servicios
```tsx
// src/services/generalService.ts
generalSearch(query: string): Promise<SearchResults>   // GET /search?query=...
getDictionaries(keys: DictTypes[]): Promise<Dictionary> // GET /metadata/dictionaries
```

## Rutas
- `/search` → `SearchResultsList`
