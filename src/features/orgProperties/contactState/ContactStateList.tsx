import { useCallback, useEffect, useState } from 'react'
import { ContactStateForm } from './ContactStateForm'
import { EntityConfirmDialog } from 'src/components/ui/feedback/EntityConfirmDialog'
import { useEntityActionManager } from 'src/hooks/useEntityActionManager'
import PaginationComponent from 'shared/ui/lists/PaginationComponent'
import { ResponsiveListItem } from 'shared/ui/lists/CustomListItem'
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen'
import GenericPaper from 'shared/layout/container/GenericPaper'
import CommonButton from 'shared/ui/buttons/CommonButton'
import CustomChip from 'shared/ui/details/CustomChip'
import { EnabledIcon } from 'shared/ui/lists/Icons'
import { useListPagination } from 'src/hooks/useListPagination'
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists'
import { useLoading } from 'src/hooks/useLoading'
import type { Paginable } from 'src/types/shared'
import { showCommonErrorToast } from 'src/utils/feedback'
import { Divider, Grid, ListItemText, Stack, Typography } from '@mui/material'
import { OrderSearchMenu } from 'shared/ui/lists/OrderMenu'
import type { LeadContactStateDetailed } from 'src/types/orgProperties'
import { getLeadContactStates } from './contactStatesServices'
import { NoItemsMessage } from 'src/components/ui/lists/NoItemsMessage'
import { Can } from 'src/components/auth/Can'
import { useUserContext } from 'src/stores/UserContext'

const ORDER_STATE_FIELDS = [
    { name: "name", label: "Orden Alfabético" },
    { name: "order", label: "Orden de Presentación" },
]

const SEARCH_STATE_FIELDS = [
    { name: "name", label: "Nombre" },
]

export const ContactStateList = () => {

    const [states, setStates] = useState<Paginable<LeadContactStateDetailed> | null>(null)

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(states)

    const { fetchParams, changeHandlers } = useOrderSeachList("states")

    const fetchStates = useCallback((fetchPage: number, pageSize: number) => {
        return getLeadContactStates({
            detailed: true, page: fetchPage, page_size: pageSize, ...fetchParams
        })
            .then(setStates)
            .catch(e => showCommonErrorToast(e, "Error recuperando la lista de estados"))
    }, [fetchParams])

    const { fnWithLoading: fetchStatesLoad, loading } = useLoading(fetchStates)

    useEffect(() => {
        fetchStatesLoad(fetchPage, pageSize)
    }, [fetchStatesLoad, fetchPage, pageSize])

    const [editingState, setEditingState] = useState<LeadContactStateDetailed | null | undefined>(null)

    const updateList = useCallback((entity?: LeadContactStateDetailed, update: boolean = false) => {
        if (update) {
            if (!states || !entity) return
            const statesCopy = [...states.items]
            const idx = statesCopy.findIndex(state => entity.id === state.id)
            if (idx === -1) return
            statesCopy[idx] = entity
            return setStates({ ...states, items: statesCopy })

        } else fetchStatesLoad(fetchPage, pageSize)
    }, [fetchPage, fetchStatesLoad, pageSize, states])

    return (
        <Stack spacing={2}>
            <Stack spacing={2} direction="row" useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                {(states?.items && states.items.length > 0) &&
                    <Can permission="lead_contact_state:create">
                        <CommonButton actionType="CREATE" variant="contained" sx={{ alignSelf: "start" }}
                            onClick={() => setEditingState(undefined)}>Agregar</CommonButton>
                    </Can>}
                <OrderSearchMenu searchOptions={SEARCH_STATE_FIELDS} orderOptions={ORDER_STATE_FIELDS} {...changeHandlers} />
            </Stack>

            <LoadingScreenWrapper loading={loading}>
                {(states?.items && states.items.length > 0) ?
                    <Stack spacing={2}>
                        <ContactStateListData states={states.items}
                            toggleUpdate={(state: LeadContactStateDetailed) => setEditingState(state)}
                            updateList={updateList} />
                        <PaginationComponent {...pageComponentProps} />
                    </Stack>
                    :
                    <NoItemsMessage search={fetchParams.search}
                        emptyFetchMessage="No se han encontrado estados...">
                        <Can permission="lead_contact_state:create">
                            <CommonButton actionType="CREATE" variant="contained"
                                onClick={() => setEditingState(undefined)}>Agregar</CommonButton>
                        </Can>
                    </NoItemsMessage>
                }
            </LoadingScreenWrapper >
            {editingState !== null &&
                <Can permission="lead_contact_state:update">
                    <Divider />
                    <GenericPaper elevation={4} sx={{ px: 3, py: 2 }}>
                        <Stack spacing={2}>
                            <ContactStateForm existingState={editingState}
                                onClose={() => setEditingState(null)} onSubmit={updateList} />
                        </Stack>
                    </GenericPaper>
                </Can>
            }
        </Stack>
    )
}

interface ContactStateListDataProps {
    states: LeadContactStateDetailed[],
    toggleUpdate: (state: LeadContactStateDetailed) => void,
    updateList: (entity?: LeadContactStateDetailed, update?: boolean) => void
}

export const ContactStateListData = ({ states, toggleUpdate, updateList }: ContactStateListDataProps) => {

    const { hasPermission } = useUserContext()

    const actions = useEntityActionManager<LeadContactStateDetailed>({
        modelName: "LeadContactState",
        entityTypeName: "el estado",
        onSuccess: () => updateList(),
    })

    return (
        <>
            <Grid container sx={{ marginInline: 1, alignItems: "stretch" }}>
                {states.map((state, idx) =>
                    <Grid key={`state-${idx}`} size="grow" sx={{ minWidth: "15rem", minHeight: "100%" }}>
                        <ResponsiveListItem disablePadding sx={{ height: "100%" }}
                            onClick={() => hasPermission("lead_contact_state:update") && toggleUpdate(state)}
                            actions={[
                                {
                                    template: "MODIFY", onClick: () => toggleUpdate(state),
                                    permission: "lead_contact_state:update"
                                },
                                ...actions.listActionsFor(state),
                            ]}>
                            <ListItemText sx={{ mr: 4 }} primary={
                                <Stack spacing={1} direction="row" color="inherit" sx={{ width: "100%", alignItems: "center" }}>
                                    <EnabledIcon active={state.active} />
                                    <Typography color="inherit">{state.name}</Typography>
                                    {state.is_initial &&
                                        <CustomChip chipColor='info' label="Inicial" size="small" />}
                                </Stack>
                            } />
                        </ResponsiveListItem>
                    </Grid>
                )}
            </Grid >
            <EntityConfirmDialog idModal='conf-delete-contact' controller={actions} />
        </>
    )
}
