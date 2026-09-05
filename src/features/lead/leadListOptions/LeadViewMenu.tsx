import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ControlledRadio } from "shared/ui/forms/CustomMultipleInputs";
import PaginationComponent from "shared/ui/lists/PaginationComponent";
import { FormErrorMessage } from "shared/ui/forms/FormFeedback";
import { ChipTooltip } from 'shared/ui/details/ChipTooltip';
import CommonButton from 'shared/ui/buttons/CommonButton';
import { useListPagination } from "src/hooks/useListPagination";
import { type Paginable, type DictionaryItem } from 'src/types/shared';
import type { LeadView, LeadViewParams } from 'src/types/leads';
import { setFormErrors } from "src/utils/forms";
import { deleteView, getLeadViews } from "../leadService";
import { useDictionaryContext } from 'src/stores/DictionaryContext';
import { useForm, useWatch } from 'react-hook-form';
import { IconButton, TextField, List, ListItem, ListItemButton, ListItemText, Popover, Stack, Typography, Box } from '@mui/material';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import TableChartIcon from '@mui/icons-material/TableChart';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import WindowIcon from '@mui/icons-material/Window';
import CloseIcon from '@mui/icons-material/Close'
import SortIcon from '@mui/icons-material/Sort';
import EditIcon from '@mui/icons-material/Edit'
import { useLoading } from 'src/hooks/useLoading';
import { showToast } from 'src/utils/feedback';
import { Can } from 'src/components/auth/Can';

interface LeadViewMenuProps {
    saveView: (name: string, visibility: string, existingView?: LeadView) => Promise<unknown>;
    loadView: (view: LeadView) => void;
    currentView: LeadViewParams | undefined;
    // Se usa solo como filtro de getLeadViews, que el backend ya resuelve de forma genérica.
    campaignId: string
}

export const LeadViewMenu = ({ saveView, loadView, campaignId }: LeadViewMenuProps) => {
    const [viewAnchor, setViewAnchor] = React.useState<null | HTMLElement>(null);
    const open = Boolean(viewAnchor);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setViewAnchor(event.currentTarget);
    };
    const handleClose = () => {
        setViewAnchor(null);
    };

    const [currentViews, setCurrentViews] = useState<Paginable<LeadView> | null>(null)

    const { fetchPage, pageComponentProps, pageSize } = useListPagination(currentViews, 12)

    const fetchLeadViews = useCallback((page: number) => {
        return getLeadViews({ only_active: true, page_size: pageSize, page: page, campaign_id: campaignId })
            .then(setCurrentViews)
    }, [campaignId, pageSize])

    useEffect(() => {
        fetchLeadViews(fetchPage)
    }, [fetchPage, fetchLeadViews])

    const handleDelete = (viewId: string) => {
        if (!currentViews || currentViews.items.length === 0) return
        deleteView(viewId)
            .then(() => fetchLeadViews(fetchPage))
    }

    const handleCreate = (name: string, visibility: string, existingView?: LeadView | undefined) => {
        return saveView(name, visibility, existingView)?.then(() => fetchLeadViews(fetchPage))
    }

    const menuRef = useRef(null)

    const [viewFormAnchor, setViewFormAnchor] = React.useState<null | HTMLElement>(null);

    const { dictionaries } = useDictionaryContext()
    const visibilities = useMemo(() => dictionaries.lead_view_visibilities ?? [], [dictionaries.lead_view_visibilities])

    const [editView, setEditView] = useState<undefined | LeadView>(undefined)
    const handleEditView = (view: LeadView) => {
        setEditView(view)
        setViewFormAnchor(menuRef.current)
    }
    const handleCloseForm = () => {
        setEditView(undefined)
        setViewFormAnchor(null)
    }

    return (
        <>
            <ChipTooltip title='Vistas' color="primary">
                <CommonButton variant="outlined" actionType='SETTINGS' color="primary" onClick={handleClick} />
            </ChipTooltip>
            <Popover anchorEl={viewAnchor} open={open} onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}           >
                <Stack spacing={.5} ref={menuRef}>
                    <Typography variant="h4" component="h2" sx={{ px: 2, pt: 2 }} >Vistas Creadas</Typography>
                    <List sx={{ maxHeight: "30rem", minWidth: "15rem", maxWidth: "25rem", overflowY: "auto" }} dense >
                        {currentViews?.items && currentViews?.items?.length > 0 &&
                            currentViews.items.map(view => (
                                <ListItem key={`list-${view.id}`} disablePadding
                                    secondaryAction={
                                        <Stack direction="row" sx={{ mr: -1 }}>
                                            <Can permission="lead_view:update">
                                                <IconButton title="Renombrar" edge="end" size='small' onClick={() => { handleEditView(view) }}><EditIcon fontSize='small' /></IconButton>
                                            </Can>
                                            <Can permission="lead_view:delete">
                                                <IconButton title="Eliminar" edge="end" size='small' onClick={() => { handleDelete(view.id) }}><CloseIcon color='error' fontSize='small' /></IconButton>
                                            </Can>
                                        </Stack>
                                    }
                                >
                                    <ListItemButton onClick={() => loadView(view)} sx={{ py: .5 }}>
                                        <ListItemText sx={{ my: 0, mr: 3 }} secondary={
                                            <Stack spacing={3} direction="row" sx={{ justifyContent: "space-between" }}>
                                                {visibilities.find(i => i.code === view.visibility)?.label}
                                                <Stack direction="row" sx={{ flexWrap: "wrap", color: "text.secondary", mr: .5 }}>
                                                    {view.filters?.filters && view.filters?.filters.length > 0 &&
                                                        <FilterAltIcon fontSize="small" />
                                                    }
                                                    {view.sort_config?.order_by && view.sort_config?.ascending !== undefined &&
                                                        <SortIcon fontSize="small" />
                                                    }
                                                    {view.view_type === "TABLE" && <TableChartIcon fontSize="small" />}
                                                    {view.view_type === "LIST" && <FormatListBulletedIcon fontSize="small" />}
                                                    {view.view_type === "GRID" && <WindowIcon fontSize="small" />}
                                                </Stack>
                                            </Stack>}
                                            primary={view.name} />
                                    </ListItemButton>
                                </ListItem>
                            ))
                        }
                    </List >
                    {
                        pageComponentProps.totalPages > 1 &&
                        <PaginationComponent {...pageComponentProps} />
                    }
                    <Can permission="lead_view:create">
                        <Box sx={{ px: 2, pb: 2 }}>
                            <CommonButton actionType="CREATE" variant='text' onClick={() => setViewFormAnchor(menuRef.current)} fullWidth>Crear Vista</CommonButton>
                        </Box>
                    </Can>
                </Stack >
            </Popover>
            <ViewForm existingView={editView} visibilities={visibilities} formAnchor={viewFormAnchor} handleClose={handleCloseForm} handleCreate={handleCreate} />
        </>
    )
}

interface ViewFormProps {
    existingView?: LeadView,
    formAnchor: null | HTMLElement,
    handleClose: () => void,
    visibilities: DictionaryItem[]
    handleCreate: (name: string, visibility: string, existingView?: LeadView) => Promise<unknown>;
    children?: React.ReactNode
}

interface LeadViewCreate {
    name: string,
    visibility: string,
    team_id: number
}

export const ViewForm = ({ existingView, visibilities, formAnchor, handleClose, handleCreate, children }: ViewFormProps) => {

    const defaultValues = useMemo(() => ({
        name: existingView?.name ?? "",
        visibility: existingView?.visibility ?? "PRIVATE",
        team_id: undefined
    }), [existingView])


    const { register, control, formState: { errors }, reset, handleSubmit, setError } = useForm<LeadViewCreate>({
        defaultValues
    })

    useEffect(() => { reset(defaultValues) }, [defaultValues, reset])

    const onSubmit = useCallback((data: LeadViewCreate) => {
        return handleCreate(data.name, data.visibility, existingView).then(() => {
            reset(defaultValues)
            handleClose()
        })
            .then(() => showToast("Se ha guardado la vista actual."))
            .catch(e => setFormErrors(e, setError))
    }, [defaultValues, existingView, handleClose, handleCreate, reset, setError])

    const { loading, fnWithLoading: saveViewLoad } = useLoading(onSubmit)

    const visibility = useWatch({ control, name: "visibility" })

    return (
        <Popover
            disableScrollLock
            disableAutoFocus
            id="basic-menu"
            anchorEl={formAnchor}
            open={Boolean(formAnchor)}
            onClose={handleClose}
            anchorOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
        >
            <Stack spacing={2} sx={{ p: 2 }}>
                <Typography variant="h4" component="h3">{existingView ? `Renombrar "${existingView.name}"` : "Crear Vista"}</Typography>
                <form onSubmit={handleSubmit(saveViewLoad)}>
                    <Stack spacing={1}>
                        <Stack spacing={.5}>
                            <TextField id="viewtag-name" label="Nombre" size="small" {...register("name")} />
                            {errors?.name?.message && <FormErrorMessage>{errors?.name?.message}</FormErrorMessage>}
                        </Stack>
                        {!existingView && <>
                            <ControlledRadio control={control} label="Visibilidad" name="visibility" options={visibilities}
                                errorMessage={errors?.visibility?.message} row returnField="code" getRadioLabel={option => option.label}
                                keyField="code" />
                            {visibility === "TEAM" &&
                                <>
                                    <TextField id="viewtag-team-id" label="Equipo" size="small" {...register("team_id")} />
                                    {errors?.team_id?.message && <FormErrorMessage>{errors?.team_id?.message}</FormErrorMessage>}
                                </>
                            }
                        </>}
                        {children}
                        {errors?.root?.message &&
                            <FormErrorMessage>{errors?.root?.message}</FormErrorMessage>}
                        <Stack spacing={.5}>
                            <CommonButton actionType='CLOSE' variant="text" onClick={handleClose} disabled={loading} color="error">
                                Cancelar
                            </CommonButton>
                            <CommonButton actionType={existingView ? "MODIFY" : "CREATE"} variant="contained" type="submit" loading={loading}>
                                Guardar
                            </CommonButton>
                        </Stack>
                    </Stack>
                </form>
            </Stack>
        </Popover >
    )
}
