import { useCallback, useEffect, useMemo, useState } from "react"
import { SidebarContentActionsWrapper, SidebarContentWrapper } from "shared/layout/container/GenericContainer"
import { ControlledAutocomplete, ControlledRadio } from "shared/ui/forms/CustomMultipleInputs"
import { FormErrorMessage } from "shared/ui/forms/FormFeedback"
import CommonButton from "shared/ui/buttons/CommonButton"
import { useLoading } from "src/hooks/useLoading"
import type { TeamDetailed, TeamMemberDetailed, TeamMemberPost, TeamMemberUpdate } from "src/types/teams"
import type { UserPublic } from "src/types/users"
import { createTeamMember, updateTeamMember } from "./teamServices"
import { getUsersInOrg } from "src/features/auth/userServices"
import { useDictionaryContext } from "src/stores/DictionaryContext"
import { setFormErrors } from "src/utils/forms"
import { showToast } from "src/utils/feedback"
import { useForm } from "react-hook-form"
import { ButtonGroup, Stack, Typography } from "@mui/material"
import ACTION_ICONS from "shared/ui/icons/ActionIcons"

interface TeamMemberFormSidebarProps {
    team: TeamDetailed,
    existingMember?: TeamMemberDetailed,
    excludedUserIds: string[],
    closeSidebar: () => void,
    updateEntityOnList: (entity: TeamMemberDetailed) => void,
}

export const TeamMemberFormSidebar = ({ team, existingMember, excludedUserIds, closeSidebar, updateEntityOnList }: TeamMemberFormSidebarProps) => {

    const submit = useCallback((data: TeamMemberPost | TeamMemberUpdate) => {
        if (!existingMember) {
            return createTeamMember(data as TeamMemberPost)
                .then(res => {
                    updateEntityOnList(res)
                    showToast(`Se agregó a "${res.user.name}" al equipo con éxito.`)
                    closeSidebar()
                })
        } else {
            return updateTeamMember(data as TeamMemberUpdate, existingMember.id)
                .then(res => {
                    updateEntityOnList(res)
                    showToast(`Se modificó el rol de "${existingMember.user.name}" con éxito.`)
                    closeSidebar()
                })
        }
    }, [existingMember, closeSidebar, updateEntityOnList])

    return <SidebarContentWrapper title={existingMember ? `Modificar rol de "${existingMember.user.name}"` : "Agregar Miembro"}
        subtitle={team.name}
        icon={existingMember ? ACTION_ICONS.MODIFY : ACTION_ICONS.CREATE}>
        <TeamMemberForm team={team} existingMember={existingMember} excludedUserIds={excludedUserIds}
            submit={submit} onCancel={closeSidebar} />
    </SidebarContentWrapper>
}

interface TeamMemberFormProps {
    team: TeamDetailed,
    existingMember?: TeamMemberDetailed,
    excludedUserIds: string[],
    submit: (data: TeamMemberPost | TeamMemberUpdate) => Promise<void>,
    onCancel: () => void
}

interface FormValues {
    // uuid de User (UserPublic.id ya lo devuelve así, aunque su tipo declarado diga number).
    user_id: string | null,
    role: string
}

export const TeamMemberForm = ({ team, existingMember, excludedUserIds, submit, onCancel }: TeamMemberFormProps) => {

    const [users, setUsers] = useState<UserPublic[]>([])
    const { dictionaries } = useDictionaryContext()
    const roles = useMemo(() => dictionaries.team_roles ?? [], [dictionaries.team_roles])

    useEffect(() => {
        if (!existingMember) getUsersInOrg().then(setUsers)
    }, [existingMember])

    const availableUsers = useMemo(() =>
        users.filter(u => u.active && !excludedUserIds.includes(u.id))
        , [users, excludedUserIds])

    const defaultValues = useMemo<FormValues>(() => ({
        user_id: existingMember?.user_id ?? null,
        role: existingMember?.role ?? "AGENT",
    }), [existingMember])

    const { control, handleSubmit, formState: { errors }, setError } = useForm<FormValues>({ defaultValues })

    const onSubmit = (data: FormValues) => {
        const payload = existingMember
            ? { role: data.role as "MANAGER" | "AGENT" }
            : { team_id: team.id, user_id: data.user_id as string, role: data.role as "MANAGER" | "AGENT" }
        return submit(payload)
            .catch(e => setFormErrors(e, setError))
    }

    const { loading, fnWithLoading: submitLoad } = useLoading(onSubmit)

    return (
        <form onSubmit={handleSubmit(submitLoad)} style={{ height: "100%" }}>
            <SidebarContentActionsWrapper
                actions={
                    <ButtonGroup sx={{ alignSelf: "end" }}>
                        <CommonButton actionType="CLOSE" color="error" variant="outlined" onClick={onCancel} disabled={loading}>
                            Cancelar
                        </CommonButton>
                        <CommonButton actionType={existingMember ? "MODIFY" : "CREATE"} variant="contained"
                            type="submit" loading={loading}>
                            Guardar
                        </CommonButton>
                    </ButtonGroup>
                }>
                <Stack spacing={2}>
                    {existingMember ? (
                        <Typography variant="body1">
                            Usuario: <strong>{existingMember.user.name} {existingMember.user.last_name}</strong> ({existingMember.user.email})
                        </Typography>
                    ) : (
                        <ControlledAutocomplete control={control} name="user_id" label="Usuario"
                            options={availableUsers} required
                            getOptionLabel={option => `${option.name}${option.last_name ? ` ${option.last_name}` : ""} (${option.email})`}
                            getOptionKey={option => `${option.id}`} returnField="id"
                            errorMessage={errors.user_id?.message} />
                    )}
                    <ControlledRadio control={control} name="role" label="Rol en el equipo"
                        options={roles} keyField="code" returnField="code" row
                        getRadioLabel={option => option.label}
                        errorMessage={errors.role?.message} />
                    {errors?.root &&
                        <FormErrorMessage >{errors?.root?.message}</FormErrorMessage>
                    }
                </Stack>
            </SidebarContentActionsWrapper>
        </form>
    )
}
