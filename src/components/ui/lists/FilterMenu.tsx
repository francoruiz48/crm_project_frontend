import GenericPaper from 'src/components/layout/container/GenericPaper'
import Typography from '@mui/material/Typography'
import { CustomAvatar } from '../details/CustomAvatar'
import ACTION_ICONS from '../icons/ActionIcons'
import { Badge, Grid, Stack, ButtonGroup, Box, Divider } from '@mui/material'
import CommonButton from '../buttons/CommonButton'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ControlledSwitch, RegisteredDateInput, RegisteredTextInput } from '../forms/CustomInputs'
import { ControlledAutocomplete } from '../forms/CustomMultipleInputs'
import type { UserPublic } from 'src/types/users'
import { getUsersInOrg } from 'src/features/auth/userServices'
import { useLoading } from 'src/hooks/useLoading'

const DATE_FIELD_OPTIONS = [
    { label: "Creación", value: "created_at" },
    { label: "Modificación", value: "updated_at" }
]

const FILTER_ITEM_SX = { minWidth: "15rem", flex: 1 } as const

interface FilterMenuProps {
    existingFilters: Record<string, string>,
    onSubmit: (filters: Record<string, string>) => void,
    filterOptions: {
        label: string;
        value: string;
        options: { label: string, value: string }[];
    }[],
    onClose: () => void,
    noCreator?: boolean,
    noUpdater?: boolean,
    noActive?: boolean,
    noDate?: boolean
}

export const FilterMenu = ({ existingFilters, filterOptions, onSubmit, onClose, noCreator = false, noUpdater = false, noActive = false, noDate = false }: FilterMenuProps) => {

    //Id único por instancia: cuando hay dos FilterMenu montados a la vez (ej. lista principal + sidebar de detalles),
    //el atributo form del botón debe apuntar al formulario de SU propia instancia y no al primero del DOM.
    const formId = useId()

    const [users, setUsers] = useState<UserPublic[]>([])

    const fetchUsers = useCallback(() => {
        return getUsersInOrg().then(setUsers)
    }, [])

    const { loading: userLoading, fnWithLoading: fetchUsersLoad } = useLoading(fetchUsers)

    useEffect(() => { fetchUsersLoad() }, [fetchUsersLoad])

    const defaultValues = useMemo(() => ({
        ...existingFilters,
        user_type:
            existingFilters.creator_email ? "creator" :
                existingFilters.updater_email ? "updater" : undefined,
    }), [existingFilters])

    const { register, control, reset, handleSubmit } = useForm<Record<string, string>>({
        defaultValues
    })

    const submit = (data: Record<string, string>) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { user_type, ...formData } = data
        onSubmit(formData)
        onClose()
    }

    const cancel = () => {
        reset()
        onSubmit({})
        onClose()
    }

    const activeFilters = Object.values(existingFilters).filter(Boolean).length > 0

    const dateField = useWatch({ name: "date_field", control })
    const userType = useWatch({ name: "user_type", control })

    return (
        <GenericPaper sx={{ p: 2, display: "flex", gap: 2, flexDirection: "column" }} elevation={2}>
            <Stack spacing={1.5} useFlexGap direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <Stack spacing={1.5} direction="row" sx={{ alignItems: "center" }}>
                    <Badge variant="dot" color='success' invisible={!activeFilters} >
                        <CustomAvatar size='small' color='secondary' sx={{ height: "2rem", width: "2rem" }} >{ACTION_ICONS.FILTER}</CustomAvatar>
                    </Badge>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>Filtros Avanzados</Typography>
                </Stack>
                <ButtonGroup sx={{ ml: "auto" }}>
                    <CommonButton actionType='CLOSE' color="error" variant='outlined' size="small"
                        onClick={cancel}>
                        Eliminar
                    </CommonButton>
                    <CommonButton actionType='FILTER' color="secondary" variant='outlined' size="small"
                        type="submit" form={formId} >
                        Aplicar
                    </CommonButton>
                </ButtonGroup>
            </Stack>
            <form id={formId} onSubmit={handleSubmit(submit)}>
                <Stack spacing={1} divider={<Divider flexItem />}>
                    {users.length > 0 && !userLoading &&
                        <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }} >
                            {(!noCreator && !noUpdater) &&
                                //Selector auxiliar, ya que no se pueden usar ambos filtros a la vez.
                                <Box sx={FILTER_ITEM_SX} >
                                    <ControlledAutocomplete control={control} name="user_type" label="Buscar por Usuario"
                                        options={[{ label: "Creador", value: "creator" }, { label: "Modificador", value: "updater" }]}
                                        getOptionKey={o => `${o.value}`} getOptionLabel={o => o.label}
                                        returnField="value" size="small" />
                                </Box>}
                            {!noCreator && (userType === "creator" || noUpdater) &&
                                <Box sx={FILTER_ITEM_SX} >
                                    <ControlledAutocomplete control={control} name="creator_email" label="Creador"
                                        options={users} getOptionKey={o => `${o.id}`} getOptionLabel={o => `${o.name} ${o.last_name}`}
                                        returnField="email" size="small" />
                                </Box>
                            }
                            {!noUpdater && (userType === "updater" || noCreator) &&
                                <Box sx={FILTER_ITEM_SX} >
                                    <ControlledAutocomplete control={control} name="updater_email" label="Modificador"
                                        options={users} getOptionKey={o => `${o.id}`} getOptionLabel={o => `${o.name} ${o.last_name}`}
                                        returnField="email" size="small" />
                                </Box>
                            }
                            {!noActive &&
                                <Grid size="grow" sx={FILTER_ITEM_SX}>
                                    <ControlledSwitch control={control} label="Solo elementos habilitados" name="only_active" size="small" />
                                </Grid>
                            }
                        </Stack>
                    }
                    {!noDate &&
                        <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", flex: 1 }} >
                            {dateField &&
                                <>
                                    <RegisteredDateInput register={register} name="start_date" label="Fecha Inicio" size="small" sx={FILTER_ITEM_SX} />
                                    <RegisteredDateInput register={register} name="end_date" label="Fecha Fin" size="small" sx={FILTER_ITEM_SX} />
                                </>
                            }
                            <Box sx={FILTER_ITEM_SX} >
                                <ControlledAutocomplete control={control} name="date_field" label="Buscar por fecha"
                                    options={DATE_FIELD_OPTIONS} getOptionKey={o => o.value} getOptionLabel={o => o.label}
                                    returnField="value" size="small" />
                            </Box>
                        </Stack>}
                    {filterOptions.length > 0 &&
                        <Grid container sx={{ flex: 1 }}>
                            {filterOptions.map(op => {
                                return <Grid size="grow" sx={FILTER_ITEM_SX} key={op.value}>
                                    {op.options ?
                                        <ControlledAutocomplete control={control} name={op.value} label={op.label}
                                            options={op.options} getOptionKey={o => o.value} getOptionLabel={o => o.label}
                                            returnField="value" size="small" />
                                        :
                                        <RegisteredTextInput register={register} name={op.value} label={op.label} size="small" />}
                                </Grid>
                            })
                            }
                        </Grid>}
                </Stack>
            </form>
        </GenericPaper>
    )
}
