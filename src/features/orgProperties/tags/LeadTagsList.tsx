import { useCallback, useEffect, useState } from 'react'
import { DisableConfirmDialog } from 'src/components/ui/feedback/ConfirmationDialog'
import PaginationComponent from 'shared/ui/lists/PaginationComponent'
import { ResponsiveListItem } from 'shared/ui/lists/CustomListItem'
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen'
import GenericPaper from 'shared/layout/container/GenericPaper'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { EnabledIcon } from 'shared/ui/lists/Icons'
import { useListPagination } from 'src/hooks/useListPagination'
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists'
import { useLoading } from 'src/hooks/useLoading'
import type { Paginable } from 'src/types/shared'
import { showCommonErrorToast, showToast } from 'src/utils/feedback'
import { Divider, Grid, ListItemText, Stack, Typography } from '@mui/material'
import { OrderSearchMenu } from 'shared/ui/lists/OrderMenu'
import { deleteTag, getTags } from './LeadTagService'
import { TagFormSidebarWrapper } from './LeadTagForm'
import type { LeadTagDetailed } from 'src/types/orgProperties'
import { NoItemsMessage } from 'src/components/ui/lists/NoItemsMessage'
import { Can } from 'src/components/auth/Can'
import { useUserContext } from 'src/stores/UserContext'

const ORDER_TAG_FIELDS = [
    { name: "name", label: "Orden Alfabético" },
]

const SEARCH_TAG_FIELDS = [
    { name: "name", label: "Nombre" },
]

export const LeadTagsList = () => {

    const [tags, setTags] = useState<Paginable<LeadTagDetailed> | null>(null)

    const { fetchPage, pageSize, pageComponentProps } = useListPagination(tags)

    const { fetchParams, changeHandlers } = useOrderSeachList("tags")

    const fetchTags = useCallback((fetchPage: number, pageSize: number) => {
        return getTags({
            detailed: true, page: fetchPage, page_size: pageSize, ...fetchParams
        })
            .then(setTags)
            .catch(e => showCommonErrorToast(e, "Error recuperando la lista de etiquetas"))
    }, [fetchParams])

    const { fnWithLoading: fetchTagsLoad, loading } = useLoading(fetchTags)

    useEffect(() => {
        fetchTagsLoad(fetchPage, pageSize)
    }, [fetchTagsLoad, fetchPage, pageSize])

    const [editingTag, setEditingTag] = useState<LeadTagDetailed | null | undefined>(null)

    const updateList = useCallback((entity?: LeadTagDetailed, update: boolean = false) => {
        if (update) {
            if (!tags || !entity) return
            const tagsCopy = [...tags.items]
            const idx = tagsCopy.findIndex(tag => entity.id === tag.id)
            if (idx === -1) return
            tagsCopy[idx] = entity
            return setTags({ ...tags, items: tagsCopy })

        } else fetchTagsLoad(fetchPage, pageSize)
    }, [fetchPage, fetchTagsLoad, pageSize, tags])

    return (
        <Stack spacing={2}>
            <OrderSearchMenu searchOptions={SEARCH_TAG_FIELDS} orderOptions={ORDER_TAG_FIELDS}
                {...changeHandlers}>
                {(tags?.items && tags.items.length > 0) &&
                    <Can permission="tag:create">
                        <CommonButton actionType="CREATE" variant="contained"
                            onClick={() => setEditingTag(undefined)}>Agregar</CommonButton>
                    </Can>}
            </OrderSearchMenu>
            <Stack spacing={2}>
                <LoadingScreenWrapper loading={loading}>
                    {(tags?.items && tags.items.length > 0) ?
                        <Stack spacing={2}>
                            <LeadTagsListData tags={tags.items}
                                toggleUpdate={(tag: LeadTagDetailed) => setEditingTag(tag)}
                                updateList={updateList} />
                            <PaginationComponent {...pageComponentProps} />
                        </Stack>
                        :
                        <NoItemsMessage search={fetchParams.search}
                            emptyFetchMessage="No se han encontrado etiquetas de lead...">
                            <Can permission="tag:create">
                                <CommonButton actionType="CREATE" variant="contained"
                                    onClick={() => setEditingTag(undefined)}>Agregar</CommonButton>
                            </Can>
                        </NoItemsMessage>
                    }
                </LoadingScreenWrapper >
                {editingTag !== null &&
                    <Can>
                        <Divider />
                        <GenericPaper elevation={2} sx={{ px: 3, py: 2 }}>
                            <Stack spacing={2}>
                                <TagFormSidebarWrapper existingTag={editingTag}
                                    onClose={() => setEditingTag(null)} onSubmit={updateList} />
                            </Stack>
                        </GenericPaper>
                    </Can>
                }
            </Stack>
        </Stack>
    )
}

interface LeadTagsListDataProps {
    tags: LeadTagDetailed[],
    toggleUpdate: (tag: LeadTagDetailed) => void,
    updateList: (entity?: LeadTagDetailed, update?: boolean) => void
}

export const LeadTagsListData = ({ tags, toggleUpdate, updateList }: LeadTagsListDataProps) => {

    const { hasPermission } = useUserContext()

    const [deletingTag, setDeletingTag] = useState<LeadTagDetailed | null>(null)

    const handleDelete = useCallback((id: number) => {
        return deleteTag(id)
            .then(() => {
                showToast("Estado eliminado permanentemente.", "success")
                updateList()
            })
            .catch(e => { showCommonErrorToast(e, "Error eliminando la etiqueta.") })
    }, [updateList])

    return (
        <>
            <Grid container sx={{ marginInline: 1, alignItems: "stretch" }}>
                {tags.map((tag, idx) =>
                    <Grid key={`tag-${idx}`} size="grow" sx={{ minWidth: "15rem", minHeight: "100%" }}>
                        <ResponsiveListItem disablePadding sx={{ height: "100%" }}
                            onClick={() => hasPermission("tag:update") && toggleUpdate(tag)}
                            actions={[
                                { template: "MODIFY", onClick: () => toggleUpdate(tag), permission: "tag:update" },
                                { template: "DELETE", onClick: () => setDeletingTag(tag), permission: "tag:delete" },
                            ]}>
                            <ListItemText sx={{ mr: 4 }} primary={
                                <Stack spacing={1} direction="row" color="inherit" sx={{ width: "100%", alignItems: "center" }}>
                                    <EnabledIcon active={tag.active} />
                                    <Typography color="inherit">{tag.name}</Typography>
                                </Stack>
                            } />
                        </ResponsiveListItem>
                    </Grid>
                )}
            </Grid >
            {deletingTag &&
                <DisableConfirmDialog idModal='conf-delete-tag' entity={deletingTag} clearEntity={() => setDeletingTag(null)} entityTypeName="la etiqueta"
                    onConfirm={() => handleDelete(deletingTag?.id)} onlyDelete />
            }
        </>
    )
}
