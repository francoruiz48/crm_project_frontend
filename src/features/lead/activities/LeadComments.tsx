import { useCallback, useEffect, useState, type ReactNode } from "react"
import { CreateCommentWrapper, UpdateCommentFromNote } from "./LeadCommentForm"
import { EntityConfirmDialog } from "src/components/ui/feedback/EntityConfirmDialog"
import { useEntityActionManager } from "src/hooks/useEntityActionManager"
import PaginationComponent from "shared/ui/lists/PaginationComponent"
import { OrderSearchMenu } from "shared/ui/lists/OrderMenu"
import LoadingScreenWrapper from "src/components/ui/feedback/LoadingScreen"
import { useListPagination } from "src/hooks/useListPagination"
import { useLoading } from "src/hooks/useLoading"
import { useOrderSeachList } from "src/hooks/useOrderSearchLists"
import type { LeadComment } from "src/types/leads"
import type { Paginable } from "src/types/shared"
import { getComments } from "./leadActivitiesService"
import { showCommonErrorToast } from "src/utils/feedback"
import { alpha, Box, IconButton, Paper, Stack, Typography } from "@mui/material"
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { formatDate, formatUserFullName } from "src/utils/formatters"
import { UserAvatar, nameToColor } from "shared/ui/details/UserAvatar"
import { useUserContext } from "src/stores/UserContext"
import { Can } from "src/components/auth/Can"

const SEARCH_COMMENTS_FIELDS = [
    { name: "content", label: "Contenido" },
]

const ORDER_COMMENTS_FIELDS = [
    { name: "updated_by", label: "Escritor" },
]
export const LeadComments = ({ leadId }: { leadId: string }) => {

    const [comments, setComments] = useState<Paginable<LeadComment> | null>(null)
    const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
    const { fetchPage, pageSize, pageComponentProps, goToPageOne } = useListPagination(comments, 12)
    const { fetchParams, changeHandlers } = useOrderSeachList("lead_comments", leadId)

    const onOrderChange = useCallback((orderBy?: string, asc?: boolean) => {
        changeHandlers.handleOrderChange(orderBy, asc)
        goToPageOne()
    }, [changeHandlers, goToPageOne])

    const onSearchChange = useCallback((search?: string, searchField?: string) => {
        changeHandlers.handleSearchChange(search, searchField)
        goToPageOne()
    }, [changeHandlers, goToPageOne])

    // Mismo criterio que el backend (LeadCommentService._assert_can_modify_comment): solo el
    // autor del comentario, el owner de la organización o un superadmin pueden editarlo/eliminarlo.
    // Se replica acá para no mostrar los íconos si de todos modos el backend los va a rechazar
    // con un 403 (evita el papelón de un toast de error al primer clic).
    // Nota: la rama "owner de la organización" se quitó por deuda de Fase 3 -- organizations_access
    // expone organization_id (id interno) y no hay forma de correlacionarlo con activeOrg.id (uuid).
    // Esa comparación nunca matcheaba en runtime (is_owner era código muerto), así que este fichero
    // no pierde nada; si se arregla el backend (exponer el uuid de la org), hay que reinstalarla.
    const { user } = useUserContext()
    // Antes comparaba com.created_by === user.id. Ese campo se sacó del response por ser
    // redundante con creator, que ya trae el id del autor -- se usa ese en su lugar.
    const canModifyComment = (com: LeadComment) =>
        !!user && (user.is_superuser || com.creator?.id === user.id)

    const fetchComments = useCallback(async (leadId: string, fetchPage: number, pageSize: number) => {
        if (!leadId) return
        return getComments({ detailed: true, lead_id: leadId, page: fetchPage, page_size: pageSize, ...fetchParams })
            .then(setComments)
            .catch(e => showCommonErrorToast(e))
    }, [fetchParams])

    const { fnWithLoading: fetchComLoad, loading } = useLoading(fetchComments)

    useEffect(() => {
        fetchComLoad(leadId, fetchPage, pageSize)
    }, [fetchComLoad, fetchPage, pageSize, leadId])

    const onCreateComment = () => {
        return fetchComments(leadId, fetchPage, pageSize)
    }
    const onUpdateCommentList = (newCom: LeadComment) => {
        const newComments = [...(comments?.items ?? [])]
        const commentListIdx = newComments.findIndex(listCom => listCom.id === newCom.id)
        if (commentListIdx === -1) return
        newComments[commentListIdx] = newCom
        setComments({ ...comments, items: newComments } as Paginable<LeadComment> | null)
        setSelectedCommentId(null)
    }

    // LeadComment es SOFT_DELETE_ALWAYS: el borrado desde la UI es un soft-delete
    // (el ítem deja de listarse), el manager lo resuelve con el DELETE genérico.
    const actions = useEntityActionManager<LeadComment>({
        modelName: "LeadComment",
        entityTypeName: "el comentario",
        onSuccess: () => fetchComments(leadId, fetchPage, pageSize),
    })

    return (
        <Stack spacing={2} sx={{ height: "100%" }}>
            <OrderSearchMenu
                searchOptions={SEARCH_COMMENTS_FIELDS}
                orderOptions={ORDER_COMMENTS_FIELDS}
                {...changeHandlers}
                handleSearchChange={onSearchChange}
                handleOrderChange={onOrderChange}
            />
            <LoadingScreenWrapper loading={loading}>
                <Stack spacing={3}>
                    <Can permission="lead_comment:create">
                        <CreateCommentWrapper leadId={leadId} onCreate={onCreateComment} />
                    </Can>
                    <Stack spacing={2}>
                        {comments?.items.map(com =>
                            com.id !== selectedCommentId ? (
                                <CommentInstance key={com.id} comment={com}
                                    onEdit={canModifyComment(com) ? () => setSelectedCommentId(com.id) : undefined}
                                    onDelete={canModifyComment(com) ? () => actions.requestDelete(com) : undefined}>
                                    {com.content}
                                </CommentInstance>
                            ) : (
                                <UpdateCommentFromNote key={com.id} leadId={leadId} existingComment={com}
                                    onUpdate={onUpdateCommentList} onClose={() => setSelectedCommentId(null)} />
                            )
                        )}
                    </Stack>
                    <PaginationComponent {...pageComponentProps} />
                </Stack>
            </LoadingScreenWrapper>
            <EntityConfirmDialog idModal="del-com" controller={actions} />
        </Stack >
    )
}

interface CommentInstanceProps {
    comment?: LeadComment,
    onEdit?: () => void,
    onDelete?: () => void,
    title?: ReactNode,
    children: ReactNode
}

export const CommentInstance = ({ comment, title, onEdit, onDelete, children }: CommentInstanceProps) => {

    const author = comment?.updater ?? comment?.creator ?? null
    const authorName = formatUserFullName(author) ?? "Usuario"
    const dateText = comment ? formatDate(comment.updated_at ?? comment.created_at, "custom", "DD/MM/YYYY HH:mm") : null
    const wasEdited = !!comment?.updated_at && comment.updated_at !== comment.created_at
    // Mismo color por autor en todos sus comentarios. Se usa solo para distinguir quién
    // escribió cada uno sin tocar el color del texto.
    const authorColor = nameToColor(authorName)

    return (
        <Box sx={{ display: "flex", gap: 1.5 }}>
            <UserAvatar name={authorName} size={36} sx={{ fontSize: 13 }} />
            <Paper variant="outlined" sx={{
                flexGrow: 1, minWidth: 0, p: 1.5, borderRadius: 2,
                borderLeft: 4, borderLeftColor: authorColor,
                bgcolor: alpha(authorColor, 0.05),
            }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                    {title ??
                        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "baseline", flexWrap: "wrap" }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{authorName}</Typography>
                            {dateText &&
                                <Typography variant="caption" color="text.secondary">
                                    {dateText}{wasEdited && " (editado)"}
                                </Typography>
                            }
                        </Stack>
                    }
                    {(onEdit || onDelete) &&
                        <Stack direction="row" sx={{ flexShrink: 0, ml: 1 }}>
                            {onEdit &&
                                <Can permission="lead_comment:update">
                                    <IconButton aria-label="edit" size="small" onClick={onEdit} sx={{ color: "text.secondary" }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Can>
                            }
                            {onDelete &&
                                <Can permission="lead_comment:delete">
                                    <IconButton aria-label="delete" size="small" onClick={onDelete} sx={{ color: "text.secondary" }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Can>
                            }
                        </Stack>
                    }
                </Stack>
                <Typography variant="body2" color="text.primary" component="div" sx={{ mt: .5, whiteSpace: "pre-wrap" }}>
                    {children}
                </Typography>
            </Paper>
        </Box>
    )
}
