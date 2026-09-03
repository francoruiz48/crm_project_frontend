import { Accordion, AccordionDetails, AccordionSummary, Checkbox, Divider, FormControlLabel, Grid, Stack, ButtonGroup } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CommonCRMText, CommonCRMTitle } from 'src/components/ui/details/CommonText'
import CustomChip from 'src/components/ui/details/CustomChip'
import { getPermissions } from 'src/services/roleService'
import type { Permission } from 'src/types/roles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import type { Dictionary } from 'src/types/shared'
import { getDictionaries } from 'src/services/generalService'
import { categorizePermissions } from './roleUtils'
import { stopPropagationEvent } from 'src/utils/lists'
import CommonButton from 'src/components/ui/buttons/CommonButton'
import { useLoading } from 'src/hooks/useLoading'
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen'

interface PermissionFormProps {
    selectedPermissionIds: string[],
    onSelectedChange: (ids: string[]) => void,
}

// Lista de permisos agrupados por entidad. El estado de selección vive en el padre
// (RoleForm), que es quien lo necesita al armar el submit; acá solo se renderizan
// los checkboxes y se notifican los cambios vía onSelectedChange.
export const PermissionForm = ({ selectedPermissionIds, onSelectedChange }: PermissionFormProps) => {

    const [permissions, setPermissions] = useState<Permission[]>([])
    const [entityNames, setEntityNames] = useState<Dictionary["entities"]>(undefined)
    // Categorías con su accordion abierto. El estado vive acá para que cada accordion
    // se pueda abrir/cerrar por separado, y el botón global "Abrir/Cerrar" lo fuerza en bloque.
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

    // Set interno de ids seleccionados (derivado de la prop del padre). Las operaciones
    // de consulta (has) pasan de O(n) a O(1); el padre siempre recibe un array nuevo vía
    // onSelectedChange para mantener el contrato de la prop.
    const selectedIds = useMemo(() => new Set(selectedPermissionIds), [selectedPermissionIds])

    const fetchPermissions = useCallback(() => {
        return Promise.all(
            [getPermissions({ page_size: 0 }), getDictionaries(["entities"])]
        ).then(([permsRes, dictsRes]) => {
            setPermissions(permsRes.items)
            setEntityNames(dictsRes.entities)
            // Abre la primera categoría por defecto (este then solo corre al montar,
            // porque fetchLoadPermissions se invoca una única vez en el mount)
            const firstCategory = categorizePermissions(permsRes.items, dictsRes.entities)[0]?.[0]
            if (firstCategory) {
                setExpandedCategories(new Set([firstCategory]))
            }
        })
    }, [])

    const { loading: loadPermissions, fnWithLoading: fetchLoadPermissions } = useLoading(fetchPermissions)

    useEffect(() => {
        fetchLoadPermissions()
    }, [fetchLoadPermissions])

    const catPermissions = useMemo(() => {
        if (!permissions || !entityNames) return []
        return categorizePermissions(permissions, entityNames)
    }, [permissions, entityNames])

    // Indica si TODAS las categorías están expandidas (para el texto del botón global)
    const allCategoriesExpanded = catPermissions.length > 0 && catPermissions.every(([categoryName]) => expandedCategories.has(categoryName))

    // Todos los ids de permisos, y solo los de lectura (view/view_all), para los selectors globales
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

    const allGlobalSelected = allPermissionIds.length > 0 && allPermissionIds.every(id => selectedIds.has(id))
    const allReadListSelected = readListPermissionIds.length > 0 && readListPermissionIds.every(id => selectedIds.has(id))
    const allReadDetailsSelected = readDetailsPermissionIds.length > 0 && readDetailsPermissionIds.every(id => selectedIds.has(id))

    // Datos derivados por categoría, precomputados para no recalcularlos en cada render del map
    const categoriesView = useMemo(() => catPermissions.map(([categoryName, perms]) => {
        const categoryIds = perms.map(p => p.id)
        // Los permisos de lectura del encabezado solo se muestran si existen en esta categoría
        const viewPerm = perms.filter(p => p.codename === "view" || p.codename === "view_all").map(p => p.id)
        return {
            categoryName,
            perms,
            categoryIds,
            viewPerm,
            selectedCount: perms.filter(p => selectedIds.has(p.id)).length,
            categoryAllSelected: categoryIds.length > 0 && categoryIds.every(id => selectedIds.has(id)),
            categoryViewSelected: viewPerm.length > 0 && viewPerm.every(id => selectedIds.has(id)),
        }
    }), [catPermissions, selectedIds])

    const toggle = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        onSelectedChange(Array.from(next))
    }

    // Selecciona/des-selecciona un conjunto de ids según el estado "checked"
    const setMany = (ids: string[], checked: boolean) => {
        const next = new Set(selectedIds)
        ids.forEach(id => checked ? next.add(id) : next.delete(id))
        onSelectedChange(Array.from(next))
    }

    // Si todos los ids del grupo ya están seleccionados, los des-selecciona; si no, los selecciona todos
    const toggleGroup = (ids: string[]) => {
        const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id))
        setMany(ids, !allSelected)
    }

    const emptyPermissions = () => {
        onSelectedChange([])
    }

    // Abre/cierra un accordion individual (toggle) o fuerza todos según el botón global
    const toggleCategory = (categoryName: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev)
            if (next.has(categoryName)) next.delete(categoryName)
            else next.add(categoryName)
            return next
        })
    }

    const toggleAllCategories = () => {
        if (allCategoriesExpanded) {
            setExpandedCategories(new Set())
        } else {
            setExpandedCategories(new Set(catPermissions.map(([categoryName]) => categoryName)))
        }
    }

    return (
        <>
            <CommonCRMTitle titleLevel="h3">Permisos</CommonCRMTitle>
            <LoadingScreenWrapper loading={loadPermissions}>
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
                                indeterminate={selectedPermissionIds.length > 0 && !allGlobalSelected} />}
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
                    {categoriesView.map(({ categoryName, perms, categoryIds, viewPerm, selectedCount, categoryAllSelected, categoryViewSelected }) => {
                        const totalCount = categoryIds.length
                        return (
                            <Grid key={categoryName} size="grow" sx={{ minWidth: "15rem" }}>
                                <Accordion expanded={expandedCategories.has(categoryName)} onChange={() => toggleCategory(categoryName)} disableGutters>
                                    <AccordionSummary id={categoryName} expandIcon={<ExpandMoreIcon />} sx={{ "& .MuiAccordionSummary-content": { mb: .5 } }}>
                                        <Stack sx={{ width: "100%" }}>
                                            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                                                <CommonCRMText size="sm" sx={{ fontWeight: 500 }}>{categoryName}</CommonCRMText>
                                                <CustomChip size="small" label={`${selectedCount}/${totalCount}`} chipColor="secondary" sx={{ alignSelf: "flex-start", mt: .5 }} />
                                            </Stack>
                                            <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap" }}>
                                                {viewPerm && (
                                                    <FormControlLabel sx={{ m: 0 }} onClick={stopPropagationEvent()}
                                                        control={<Checkbox size="small" checked={categoryViewSelected} onChange={() => toggleGroup(viewPerm)} />}
                                                        label={<CommonCRMText size="xs">Lectura</CommonCRMText>}
                                                    />
                                                )}
                                                <FormControlLabel sx={{ m: 0 }} onClick={stopPropagationEvent()}
                                                    control={<Checkbox size="small" checked={categoryAllSelected} onChange={() => toggleGroup(categoryIds)} />}
                                                    label={<CommonCRMText size="xs">Todos</CommonCRMText>}
                                                />
                                            </Stack>
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Divider sx={{ mb: 1, mt: -1 }} />
                                        <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", columnGap: 1, m: 0 }}>
                                            {perms.map(perm => (
                                                <FormControlLabel key={perm.id} sx={{ m: 0 }}
                                                    control={
                                                        <Checkbox size="small" checked={selectedIds.has(perm.id)}
                                                            onChange={() => toggle(perm.id)} />
                                                    }
                                                    label={<CommonCRMText size="sm">{perm.codename === "view_all" ? "Ver lista de registros" : perm.name}</CommonCRMText>}
                                                />
                                            ))
                                            }
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            </Grid>
                        )
                    })}
                </Grid>
            </LoadingScreenWrapper>
        </>
    )
}
