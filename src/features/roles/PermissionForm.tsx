import { Accordion, AccordionDetails, AccordionSummary, Checkbox, Divider, FormControlLabel, Grid, Stack, ButtonGroup, TextField } from '@mui/material'
import { memo, startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { CommonCRMText, CommonCRMTitle } from 'src/components/ui/details/CommonText'
import CustomChip from 'src/components/ui/details/CustomChip'
import { getPermissions } from 'src/services/roleService'
import type { Permission } from 'src/types/roles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { categorizePermissions } from './roleUtils'
import { stopPropagationEvent } from 'src/utils/lists'
import CommonButton from 'src/components/ui/buttons/CommonButton'
import { useLoading } from 'src/hooks/useLoading'
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen'
import { useDictionaryContext } from 'src/stores/DictionaryContext'
import { useDebounce } from 'src/hooks/useDebounce'

interface PermissionFormProps {
    // Ids iniciales de permisos seleccionados. Se usan solo para inicializar el estado
    // local de este componente; los cambios posteriores no re-renderizan al padre.
    initialSelectedIds: string[],
    // Ref mutable compartido con el padre (RoleForm). Se muta en cada cambio de selección
    // para que el padre lo lea en el submit, pero al no ser estado no re-renderiza nada
    // fuera de este componente.
    selectedPermissionIdsRef: React.MutableRefObject<string[]>,
}

// Fila de checkbox de un permiso individual, memoizada. Recibe "selected" como booleano
// escalar y "onToggle" estable para que, al togglear un permiso, solo se re-renderice esta
// fila y no las ~200 restantes del listado.
const PermissionCheckboxRow = memo(({ perm, selected, onToggle }: {
    perm: Permission,
    selected: boolean,
    onToggle: (id: string) => void,
}) => (
    <FormControlLabel sx={{ m: 0 }}
        control={<Checkbox size="small" checked={selected} onChange={() => onToggle(perm.id)} />}
        label={<CommonCRMText size="sm">{perm.codename === "view_all" ? "Ver lista de registros" : perm.name}</CommonCRMText>}
    />
))


// Lista de permisos agrupados por entidad. La selección vive en un estado local de este
// componente (para re-renderizar solo sus checkboxes) y se sincroniza hacia el padre
// mutando selectedPermissionIdsRef, de modo que togglear no re-renderiza RoleForm.
interface CategoryAccordionProps {
    categoryName: string,
    // Si el accordion está expandido. Se calcula en el padre desde expandedCategories.
    expanded: boolean,
    // Los permisos de la categoría (misma referencia estable que viene de categoriesView).
    perms: Permission[],
    // Ids seleccionados de ESTA categoría, en orden estable. Se compara por contenido en el
    // comparador custom, así el memo descarta las categorías que no cambiaron de selección.
    selectedIds: string[],
    selectedCount: number,
    categoryAllSelected: boolean,
    categoryViewSelected: boolean,
    // Callbacks estables (useCallback en el padre), para que el memo los compare por referencia.
    onToggle: (id: string) => void,
    onToggleGroup: (ids: string[]) => void,
    onToggleCategory: (categoryName: string) => void,
}

// Compara dos arrays de ids por contenido (orden estable), ignorando la referencia.
const sameIds = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id, i) => id === b[i])

// Accordion por categoría, memoizado con "comparador por valor": solo se re-renderiza si alguna
// de sus props escalares/referencias cambió de verdad. Así, al togglear un permiso de una sola
// categoría, los ~30 accordions restantes se descartan (su selectedIds/contadores no cambiaron).
// Nota: no se puede evitar que MUI re-renderice el subárbol de un accordion EXPANDIDO al abrir o
// cerrar OTRO accordion (es el AccordionContext interno de MUI), pero sí se evita el re-render en
// el caso dominante del perfil (toggling de un checkbox), que no toca ese context.
const CategoryAccordion = memo(function CategoryAccordion({
    categoryName, expanded, perms, selectedIds, selectedCount, categoryAllSelected, categoryViewSelected,
    onToggle, onToggleGroup, onToggleCategory,
}: CategoryAccordionProps) {
    const selectedSet = new Set(selectedIds)
    const viewPermIds = perms.filter(p => p.codename === "view" || p.codename === "view_all").map(p => p.id)
    return (
        <Accordion expanded={expanded} onChange={() => onToggleCategory(categoryName)} disableGutters>
            <AccordionSummary id={categoryName} expandIcon={<ExpandMoreIcon />} sx={{ "& .MuiAccordionSummary-content": { mb: .5 } }}>
                <Stack sx={{ width: "100%" }}>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                        <CommonCRMText size="sm" sx={{ fontWeight: 500 }}>{categoryName}</CommonCRMText>
                        <CustomChip size="small" label={`${selectedCount}/${perms.length}`} chipColor="secondary" sx={{ alignSelf: "flex-start", mt: .5 }} />
                    </Stack>
                    <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap" }}>
                        {viewPermIds.length > 0 && (
                            <FormControlLabel sx={{ m: 0 }} onClick={stopPropagationEvent()}
                                control={<Checkbox size="small" checked={categoryViewSelected} onChange={() => onToggleGroup(viewPermIds)} />}
                                label={<CommonCRMText size="xs">Lectura</CommonCRMText>}
                            />
                        )}
                        <FormControlLabel sx={{ m: 0 }} onClick={stopPropagationEvent()}
                            control={<Checkbox size="small" checked={categoryAllSelected} onChange={() => onToggleGroup(perms.map(p => p.id))} />}
                            label={<CommonCRMText size="xs">Todos</CommonCRMText>}
                        />
                    </Stack>
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Divider sx={{ mb: 1, mt: -1 }} />
                <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", columnGap: 1, m: 0 }}>
                    {perms.map(perm => (
                        <PermissionCheckboxRow key={perm.id} perm={perm}
                            selected={selectedSet.has(perm.id)} onToggle={onToggle} />
                    ))}
                </Stack>
            </AccordionDetails>
        </Accordion>
    )
}, (prev, next) =>
    prev.categoryName === next.categoryName &&
    prev.expanded === next.expanded &&
    prev.perms === next.perms &&
    sameIds(prev.selectedIds, next.selectedIds) &&
    prev.selectedCount === next.selectedCount &&
    prev.categoryAllSelected === next.categoryAllSelected &&
    prev.categoryViewSelected === next.categoryViewSelected &&
    prev.onToggle === next.onToggle &&
    prev.onToggleGroup === next.onToggleGroup &&
    prev.onToggleCategory === next.onToggleCategory,
)


export const PermissionForm = ({ initialSelectedIds, selectedPermissionIdsRef }: PermissionFormProps) => {

    const { dictionaries } = useDictionaryContext()
    const entityNames = dictionaries.entities

    const [permissions, setPermissions] = useState<Permission[]>([])
    // Categorías con su accordion abierto. El estado vive acá para que cada accordion
    // se pueda abrir/cerrar por separado, y el botón global "Abrir/Cerrar" lo fuerza en bloque.
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

    // Búsqueda por nombre de categoría (entidad). El valor crudo se escribe en el input
    // y se propaga al filtro después del debounce para no recalcular en cada tecla.
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const { debouncedFunction } = useDebounce(300)

    const handleSearchChange = (value: string) => {
        setSearchTerm(value)
        debouncedFunction(() => setDebouncedSearch(value))
    }

    // Estado local de la selección. Vive acá (no en el padre) para que cada cambio solo
    // re-renderice este componente. Se sincroniza hacia el padre vía selectedPermissionIdsRef
    // dentro de los event handlers, sin tocar el estado de RoleForm.
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)

    // Set de los ids seleccionados para consultas de O(1), derivado del estado local.
    const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds])

    // Mantiene el ref del padre sincronizado con la selección local. Se hace en un efecto
    // (no inline en los handlers) porque los updaters de setState deben ser puros y la regla
    // react-hooks/refs prohíbe tocar refs durante el render.
    useEffect(() => {
        selectedPermissionIdsRef.current = selectedIds
    }, [selectedIds, selectedPermissionIdsRef])

    const fetchPermissions = useCallback(() => {
        return getPermissions({ page_size: 0 }).then((permsRes) => {
            setPermissions(permsRes.items)
            // Abre la primera categoría por defecto (este then solo corre al montar,
            // porque fetchLoadPermissions se invoca una única vez en el mount)
            const firstCategory = categorizePermissions(permsRes.items, entityNames)[0]?.[0]
            if (firstCategory) {
                setExpandedCategories(new Set([firstCategory]))
            }
        })
    }, [entityNames])

    const { loading: loadPermissions, fnWithLoading: fetchLoadPermissions } = useLoading(fetchPermissions)

    useEffect(() => {
        fetchLoadPermissions()
    }, [fetchLoadPermissions])

    const catPermissions = useMemo(() => {
        if (!permissions || !entityNames) return []
        return categorizePermissions(permissions, entityNames)
    }, [permissions, entityNames])

    // Filtra categorías por el término de búsqueda (matchea contra el nombre en español de la entidad)
    const filteredCatPermissions = useMemo(() => {
        if (!debouncedSearch.trim()) return catPermissions
        const term = debouncedSearch.trim().toLowerCase()
        return catPermissions.filter(([categoryName]) =>
            categoryName.toLowerCase().includes(term)
        )
    }, [catPermissions, debouncedSearch])

    // Indica si TODAS las categorías están expandidas (para el texto del botón global)
    // Nota: se usa filteredCatPermissions para que "Cerrar Todo" solo cierre las visibles.
    const allCategoriesExpanded = filteredCatPermissions.length > 0 && filteredCatPermissions.every(([categoryName]) => expandedCategories.has(categoryName))

    // Todos los ids de permisos, y solo los de lectura (view/view_all), para los selectors globales
    // Se calculan sobre catPermissions (sin filtro) para que "Seleccionar todos" siempre
    // abarque TODOS los permisos, no solo los visibles.
    const allPermissionIds = useMemo(() =>
        permissions.map(p => p.id),
        [permissions],
    )
    const readListPermissionIds = useMemo(() =>
        catPermissions.flatMap(([, perms]) =>
            perms.filter(p => p.codename === "view_all")
                .map(p => p.id))
        , [catPermissions]
    )
    const readDetailsPermissionIds = useMemo(() =>
        catPermissions.flatMap(([, perms]) =>
            perms.filter(p => p.codename === "view")
                .map(p => p.id))
        , [catPermissions]
    )

    const allGlobalSelected = allPermissionIds.length > 0 && allPermissionIds.every(id => selectedIdsSet.has(id))
    const allReadListSelected = readListPermissionIds.length > 0 && readListPermissionIds.every(id => selectedIdsSet.has(id))
    const allReadDetailsSelected = readDetailsPermissionIds.length > 0 && readDetailsPermissionIds.every(id => selectedIdsSet.has(id))

    // Datos derivados por categoría, precomputados para no recalcularlos en cada render del map
    const categoriesView = useMemo(() => filteredCatPermissions.map(([categoryName, perms]) => {
        const categoryIds = perms.map(p => p.id)
        // Los permisos de lectura del encabezado solo se muestran si existen en esta categoría
        const viewPerm = perms.filter(p => p.codename === "view" || p.codename === "view_all").map(p => p.id)
        // Ids seleccionados de ESTA categoría, en el orden de perms (estable), para el comparador
        // por valor del CategoryAccordion memoizado.
        const selectedIds = categoryIds.filter(id => selectedIdsSet.has(id))
        return {
            categoryName,
            perms,
            categoryIds,
            viewPerm,
            selectedIds,
            selectedCount: selectedIds.length,
            categoryAllSelected: categoryIds.length > 0 && categoryIds.every(id => selectedIdsSet.has(id)),
            categoryViewSelected: viewPerm.length > 0 && viewPerm.every(id => selectedIdsSet.has(id)),
        }
    }), [filteredCatPermissions, selectedIdsSet])

    // Handlers estables (useCallback con forma funcional de setState) para que las filas de
    // checkbox memoizadas reciban siempre la misma referencia de onToggle. Si dependieran del
    // Set derivado, se recrearían en cada cambio y el memo no tendría efecto.
    const toggle = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return Array.from(next)
        })
    }, [])

    // Si todos los ids del grupo ya están seleccionados, los des-selecciona; si no, los selecciona todos
    // Se envuelve en startTransition: cambiar un grupo completo (ej. "Seleccionar todos") es un cambio
    // GLOBAL que invierte los 203 checkboxes; marcarlo como non-blocking hace que el click responda al
    // instante y React pinte el resultado en segundo plano en vez de congelar el frame (ver
    // src/logs/PermOptimization.md, "Peores casos: Seleccionar todo").
    const toggleGroup = useCallback((ids: string[]) => {
        startTransition(() => {
            setSelectedIds(prev => {
                const allSelected = ids.length > 0 && ids.every(id => prev.includes(id))
                const next = new Set(prev)
                ids.forEach(id => allSelected ? next.delete(id) : next.add(id))
                return Array.from(next)
            })
        })
    }, [])

    const emptyPermissions = useCallback(() => {
        startTransition(() => setSelectedIds([]))
    }, [])

    // Abre/cierra un accordion individual (toggle) o fuerza todos según el botón global.
    // Estable (forma funcional) para que el memo de CategoryAccordion lo compare por referencia.
    const toggleCategory = useCallback((categoryName: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev)
            if (next.has(categoryName)) next.delete(categoryName)
            else next.add(categoryName)
            return next
        })
    }, [])

    const toggleAllCategories = () => {
        if (allCategoriesExpanded) {
            setExpandedCategories(new Set())
        } else {
            setExpandedCategories(new Set(filteredCatPermissions.map(([categoryName]) => categoryName)))
        }
    }

    return (
        <>
            <CommonCRMTitle titleLevel="h3">Permisos</CommonCRMTitle>
            <LoadingScreenWrapper loading={loadPermissions}>
                <TextField
                    label="Buscar categoría"
                    size="small"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    sx={{ mb: 1 }}
                    slotProps={{ input: { sx: { fontSize: "0.875rem" } } }}
                />
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1, flexWrap: "wrap" }}>
                    <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <FormControlLabel
                            control={<Checkbox size="small" checked={allReadListSelected}
                                indeterminate={readListPermissionIds.length > 0 && !allReadListSelected} onChange={() => toggleGroup(readListPermissionIds)} />}
                            label={<CommonCRMText size="sm">Consultar Listas</CommonCRMText>}
                        />
                        <FormControlLabel
                            control={<Checkbox size="small" checked={allReadDetailsSelected} onChange={() => toggleGroup(readDetailsPermissionIds)}
                                indeterminate={readDetailsPermissionIds.length > 0 && !allReadDetailsSelected} />}
                            label={<CommonCRMText size="sm">Consultar Detalles</CommonCRMText>}
                        />
                        <FormControlLabel
                            control={<Checkbox size="small" checked={allGlobalSelected} onChange={() => toggleGroup(allPermissionIds)}
                                indeterminate={selectedIds.length > 0 && !allGlobalSelected} />}
                            label={<CommonCRMText size="sm">Seleccionar todos</CommonCRMText>}
                        />
                    </Stack>
                    <ButtonGroup sx={{ ml: "auto" }}>
                        <CommonButton actionType='NONE' color="primary" onClick={toggleAllCategories} variant='outlined'>
                            {allCategoriesExpanded ?
                                <Stack direction="row" sx={{ alignItems: "center" }}><UnfoldLessIcon /> Cerrar Todo</Stack> :
                                <Stack direction="row" sx={{ alignItems: "center" }}><UnfoldMoreIcon /> Abrir Todo</Stack>}
                        </CommonButton>
                        <CommonButton actionType='CLOSE' color="error" onClick={emptyPermissions} variant='outlined'>Vaciar</CommonButton>
                    </ButtonGroup>
                </Stack>
                <Grid container spacing={.5}>
                    {categoriesView.map(({ categoryName, perms, selectedIds, selectedCount, categoryAllSelected, categoryViewSelected }) => (
                        <Grid key={categoryName} size="grow" sx={{ minWidth: "15rem" }}>
                            <CategoryAccordion
                                categoryName={categoryName}
                                expanded={expandedCategories.has(categoryName)}
                                perms={perms}
                                selectedIds={selectedIds}
                                selectedCount={selectedCount}
                                categoryAllSelected={categoryAllSelected}
                                categoryViewSelected={categoryViewSelected}
                                onToggle={toggle}
                                onToggleGroup={toggleGroup}
                                onToggleCategory={toggleCategory}
                            />
                        </Grid>
                    ))}
                </Grid>
            </LoadingScreenWrapper>
        </>
    )
}
