import { Accordion, AccordionDetails, AccordionSummary, Checkbox, FormControlLabel, Grid, Stack } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { CommonCRMText, CommonCRMTitle } from 'src/components/ui/details/CommonText'
import CustomChip from 'src/components/ui/details/CustomChip'
import { getPermissions } from 'src/services/roleService'
import type { Permission } from 'src/types/roles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Dictionary } from 'src/types/shared'
import { getDictionaries } from 'src/services/generalService'
import { categorizePermissions } from './roleUtils'

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

    useEffect(() => {
        getPermissions({ page_size: 0 })
            .then(res => setPermissions(res.items))
        getDictionaries(["entities"])
            .then(res => setEntityNames(res.entities))
    }, [])

    const catPermissions = useMemo(() => {
        if (!permissions || !entityNames) return []
        return categorizePermissions(permissions, entityNames)
    }, [permissions, entityNames])

    // Todos los ids de permisos, y solo los de lectura (view/view_all), para los selectors globales
    const allPermissionIds = useMemo(
        () => catPermissions.flatMap(([, perms]) => perms.map(p => p.id)),
        [catPermissions],
    )
    const readPermissionIds = useMemo(
        () => catPermissions.flatMap(([, perms]) =>
            perms.filter(p => p.codename === "view" || p.codename === "view_all").map(p => p.id)),
        [catPermissions],
    )

    const allGlobalSelected = allPermissionIds.length > 0 && allPermissionIds.every(id => selectedPermissionIds.includes(id))
    const allReadSelected = readPermissionIds.length > 0 && readPermissionIds.every(id => selectedPermissionIds.includes(id))

    const toggle = (id: string) => {
        const next = selectedPermissionIds.includes(id)
            ? selectedPermissionIds.filter(selected => selected !== id)
            : [...selectedPermissionIds, id]
        onSelectedChange(next)
    }

    // Selecciona/des-selecciona un conjunto de ids según el estado "checked"
    const setMany = (ids: string[], checked: boolean) => {
        const next = new Set(selectedPermissionIds)
        ids.forEach(id => checked ? next.add(id) : next.delete(id))
        onSelectedChange(Array.from(next))
    }

    // Si todos los ids del grupo ya están seleccionados, los des-selecciona; si no, los selecciona todos
    const toggleGroup = (ids: string[]) => {
        const allSelected = ids.length > 0 && ids.every(id => selectedPermissionIds.includes(id))
        setMany(ids, !allSelected)
    }

    return (
        <>
            <CommonCRMTitle titleLevel="h3">Permisos</CommonCRMTitle>
            <Stack direction="row" sx={{ alignItems: "center", gap: 3, mb: 1, flexWrap: "wrap" }}>
                <FormControlLabel
                    control={<Checkbox size="small" checked={allGlobalSelected} onChange={() => toggleGroup(allPermissionIds)} />}
                    label={<CommonCRMText size="sm">Seleccionar todos</CommonCRMText>}
                />
                <FormControlLabel
                    control={<Checkbox size="small" checked={allReadSelected} onChange={() => toggleGroup(readPermissionIds)} />}
                    label={<CommonCRMText size="sm">Solo lectura</CommonCRMText>}
                />
            </Stack>
            <Grid container spacing={.5}>
                {catPermissions.map((cat, idx) => {
                    const [categoryName, perms] = cat
                    const totalCount = perms.length
                    const selectedCount = perms.filter(p => selectedPermissionIds.includes(p.id)).length
                    const categoryIds = perms.map(p => p.id)
                    const categoryAllSelected = selectedCount === totalCount
                    // Los permisos de lectura del encabezado solo se muestran si existen en esta categoría
                    const viewPerm = perms.find(p => p.codename === "view")
                    const viewAllPerm = perms.find(p => p.codename === "view_all")
                    return (
                        <Grid key={categoryName} size="grow" sx={{ minWidth: "15rem" }}>
                            <Accordion defaultExpanded={idx === 0} disableGutters>
                                <AccordionSummary id={categoryName} expandIcon={<ExpandMoreIcon />}>
                                    <Stack sx={{ width: "100%" }}>
                                        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                                            <CommonCRMText size="sm" sx={{ fontWeight: 500 }}>{categoryName}</CommonCRMText>
                                            <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", columnGap: 1 }}>
                                                {viewPerm && (
                                                    <FormControlLabel sx={{ m: 0 }}
                                                        control={<Checkbox size="small" checked={selectedPermissionIds.includes(viewPerm.id)} onChange={() => toggle(viewPerm.id)} />}
                                                        label={<CommonCRMText size="xs">Ver</CommonCRMText>}
                                                    />
                                                )}
                                                {viewAllPerm && (
                                                    <FormControlLabel sx={{ m: 0 }}
                                                        control={<Checkbox size="small" checked={selectedPermissionIds.includes(viewAllPerm.id)} onChange={() => toggle(viewAllPerm.id)} />}
                                                        label={<CommonCRMText size="xs">Ver todos</CommonCRMText>}
                                                    />
                                                )}
                                                <FormControlLabel sx={{ m: 0 }}
                                                    control={<Checkbox size="small" checked={categoryAllSelected} onChange={() => toggleGroup(categoryIds)} />}
                                                    label={<CommonCRMText size="xs">Todos</CommonCRMText>}
                                                />
                                            </Stack>
                                        </Stack>
                                        <CustomChip size="small" label={`${selectedCount}/${totalCount}`} sx={{ alignSelf: "flex-start", mt: .5 }} />
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", columnGap: 1, m: 0 }}>
                                        {perms.map(perm => (
                                            <FormControlLabel key={perm.id} sx={{ m: 0 }}
                                                control={
                                                    <Checkbox size="small" checked={selectedPermissionIds.includes(perm.id)}
                                                        onChange={() => toggle(perm.id)} />
                                                }
                                                label={<CommonCRMText size="sm">{perm.name}</CommonCRMText>}
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
        </>
    )
}