import type { Permission } from "src/types/roles"
import type { Dictionary } from "src/types/shared"

export const categorizePermissions = (permissions: Permission[], entityNames?: Dictionary["entities"]) => {
    const permissionCategories = new Map<string, Permission[]>()
    console.log(permissions)
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
    return Array.from(permissionCategories.entries())
}
