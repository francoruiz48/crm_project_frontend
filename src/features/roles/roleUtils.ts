import type { Permission } from "src/types/roles"
import type { Dictionary } from "src/types/shared"

export const categorizePermissions = (permissions: Permission[], entityNames?: Dictionary["entities"]) => {
    const permissionCategories = new Map<string, Permission[]>()
    permissions.forEach((permission) => {
        const snakeCaseCodename = permission.codename.split(":")
        const snakeCaseCategory = snakeCaseCodename[0]
        const camelCaseCategory = snakeCaseCategory.split("_")
            .reduce((acc, cur) => {
                const capitalizedCur = cur.charAt(0).toLocaleUpperCase() + cur.slice(1) + (entityNames ? "" : " ")
                return `${acc}${capitalizedCur}`
            }, "")
        const category = entityNames ? entityNames[camelCaseCategory] ?? camelCaseCategory : camelCaseCategory
        if (permissionCategories.has(category)) {
            permissionCategories.get(category)?.push({ ...permission, codename: snakeCaseCodename[1] })
        } else {
            permissionCategories.set(category, [{ ...permission, codename: snakeCaseCodename[1] }])
        }
    })
    // Ordena los permisos de cada categoría: view_all, view, create, update, delete y luego el resto por nombre
    const CODenameOrder = ["view_all", "view", "create", "update", "delete"]
    permissionCategories.forEach((perms, category) => {
        permissionCategories.set(category, [...perms].sort((a, b) => {
            const aIdx = CODenameOrder.indexOf(a.codename)
            const bIdx = CODenameOrder.indexOf(b.codename)
            if (aIdx !== -1 || bIdx !== -1) {
                const aRank = aIdx === -1 ? CODenameOrder.length : aIdx
                const bRank = bIdx === -1 ? CODenameOrder.length : bIdx
                if (aRank !== bRank) return aRank - bRank
            }
            return a.name.localeCompare(b.name)
        }))
    })
    return Array.from(permissionCategories.entries())
}
