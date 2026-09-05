import { useCallback, useEffect, useMemo, useRef } from "react"
import { RegisteredTextInput } from "shared/ui/forms/CustomInputs"
import { FormErrorMessage } from "shared/ui/forms/FormFeedback"
import CommonButton from "shared/ui/buttons/CommonButton"
import { useLoading } from "src/hooks/useLoading"
import type { RoleDetailed, RolePost } from "src/types/roles"
import { showCommonErrorToast, showToast } from "src/utils/feedback"
import { setFormErrors } from "src/utils/forms"
import { useForm } from "react-hook-form"
import { useUserContext } from "src/stores/UserContext"
import { ButtonGroup, Divider, Grid, Stack } from "@mui/material"
import { SidebarContentActionsWrapper, SidebarContentWrapper } from "src/components/layout/container/GenericSidebar"
import ACTION_ICONS from "shared/ui/icons/ActionIcons"
import { createRole, setRolePermissions, updateRole } from "src/services/roleService"
import { PermissionForm } from "./PermissionForm"
import { areStringArraysEqual } from "src/utils/lists"

interface RoleSidebarProps {
    existingRole?: RoleDetailed,
    closeSidebar: () => void,
    updateEntityOnList: (entity: RoleDetailed) => void,
    handleSidebar: (mode: string, entity: RoleDetailed | null) => void
}

//Wrapper de RoleForm para funcionar en un Sidebar
export const RoleFormSidebar = ({ existingRole, closeSidebar, handleSidebar, updateEntityOnList }: RoleSidebarProps) => {

    const handleClose = useCallback(() => {
        if (existingRole) handleSidebar("DETAILS_ROLE", existingRole)
        else closeSidebar()
    }, [existingRole, closeSidebar, handleSidebar])

    const submit = useCallback((data: RolePost, permissionIds: string[]) => {
        const hasRoleChanged = !existingRole || existingRole.code !== data.code || existingRole.name !== data.name


        const hasPermissionsChanged = (!existingRole && permissionIds.length > 0) ||
            (existingRole && !areStringArraysEqual(existingRole.permissions.map(p => p.id), permissionIds))

        const updateList = (res: RoleDetailed) => {
            updateEntityOnList(res)
            handleSidebar("DETAILS_ROLE", res)
        }

        // Comprueba si ha cambiado el rol para ejecutar
        const saveRole = (newRole: RolePost) => {
            if (!hasRoleChanged) return Promise.resolve(existingRole) //Devuelve el role sin cambios
            return existingRole
                ? updateRole(newRole, existingRole.id)
                    .then(res => res)
                : createRole(newRole)
                    .then(res => res)
        }

        // Comprueba si han cambiado los permisos para ejecutar
        const assignPermissions = (role: RoleDetailed) => {
            if (!hasPermissionsChanged) return Promise.resolve(role) //Devuelve el role sin cambios
            return setRolePermissions(role.id, permissionIds)
                .then(newRole => newRole)
                .catch(e => {
                    showCommonErrorToast(e, `No se ha podido actualizar los permisos de "${role.name}"`)
                    return role
                })
        }

        return saveRole(data)
            .then(assignPermissions)
            .then(res => {
                updateList(res)
                showToast(`El rol "${res.name}" se ha guardado con éxito.`)
            })
            .catch(e => showCommonErrorToast(e, `No se ha podido guardar el rol "${data.name}"`))

    }, [existingRole, handleSidebar, updateEntityOnList])

    return <SidebarContentWrapper title={`${existingRole ? "Modificar" : "Nuevo"} Rol`}
        subtitle="Roles"
        icon={ACTION_ICONS[existingRole ? "MODIFY" : "CREATE"]}>
        <RoleForm existingRole={existingRole} submit={submit} onCancel={handleClose} />
    </SidebarContentWrapper>
}

interface RoleProps {
    existingRole?: RoleDetailed,
    submit: (data: RolePost, permissionIds: string[]) => Promise<void>,
    onCancel: () => void
}

export const RoleForm = ({ existingRole, submit, onCancel }: RoleProps) => {

    const { activeOrg } = useUserContext()

    const defaultValues = useMemo(() => ({
        name: existingRole?.name ?? undefined,
        code: existingRole?.code ?? undefined,
        organization_id: existingRole?.organization_id ?? activeOrg!.id,
    }), [existingRole, activeOrg])

    const { register, handleSubmit, reset, formState: { errors }, setError } = useForm<RolePost>({ defaultValues })

    useEffect(() => { reset(defaultValues) }, [reset, defaultValues])

    // La selección de permisos vive en un ref mutable (no en estado) para que al togglear
    // un checkbox no se re-renderice todo este form: PermissionForm muta el ref internamente
    // y dispara su propio re-render local. El valor se lee acá en el submit.
    const selectedPermissionIdsRef = useRef<string[]>(
        existingRole?.permissions?.map(perm => perm.id) ?? [],
    )

    const onSubmit = (data: RolePost) => {
        return submit(data, selectedPermissionIdsRef.current)
            .catch(e => setFormErrors(e, setError))
    }

    const { loading, fnWithLoading: submitLoad } = useLoading(onSubmit)

    return (
        <form onSubmit={handleSubmit(submitLoad)} style={{ height: "100%" }}>
            <SidebarContentActionsWrapper
                actions={
                    <ButtonGroup sx={{ alignSelf: "end" }}>
                        <CommonButton actionType="CLOSE" variant="outlined" color="error"
                            onClick={onCancel} disabled={loading}>
                            Cancelar
                        </CommonButton>
                        <CommonButton actionType={existingRole ? "MODIFY" : "CREATE"}
                            variant="contained" type="submit" loading={loading}>
                            Guardar
                        </CommonButton>
                    </ButtonGroup>
                }>
                <input type="hidden" {...register("organization_id")} />
                <Stack spacing={2}>
                    <Grid container spacing={1}>
                        <Grid size="grow" sx={{ minWidth: "15rem" }}>
                            <RegisteredTextInput name="name" register={register} label="Nombre"
                                required errorMessage={errors.name?.message} />
                        </Grid>
                        <Grid size="grow" sx={{ minWidth: "15rem" }}>
                            <RegisteredTextInput name="code" register={register} label="Código"
                                required errorMessage={errors.code?.message} />
                        </Grid>
                        {errors?.root &&
                            <FormErrorMessage >{errors?.root?.message}</FormErrorMessage>
                        }
                    </Grid>
                    <Divider />
                    <PermissionForm initialSelectedIds={existingRole?.permissions?.map(perm => perm.id) ?? []} selectedPermissionIdsRef={selectedPermissionIdsRef} />                </Stack>
            </SidebarContentActionsWrapper>
        </form>
    )
}
