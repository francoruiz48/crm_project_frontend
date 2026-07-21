import { useCallback, useEffect, useState, type ReactNode } from "react"
import { CreateCommentWrapper, UpdateCommentFromNote } from "./LeadCommentForm"
import { DisableConfirmDialog } from "src/components/ui/feedback/ConfirmationDialog"
import PaginationComponent from "shared/ui/lists/PaginationComponent"
import LoadingScreenWrapper from "src/components/ui/feedback/LoadingScreen"
import { useListPagination } from "src/hooks/useListPagination"
import { useLoading } from "src/hooks/useLoading"
import type { LeadComment } from "src/types/leads"
import type { Paginable } from "src/types/shared"
import { deleteComment, getComments } from "./leadActivitiesService"
import { showCommonErrorToast, showToast } from "src/utils/feedback"
import { Box, IconButton, Paper, Stack, Typography } from "@mui/material"
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { formatDate, formatUserFullName } from "src/utils/formatters"
import { UserAvatar } from "shared/ui/details/UserAvatar"
import { useUserContext } from "src/stores/UserContext"

export const LeadComments = ({ leadId }: { leadId: number }) => {

    const [comments, setComments] = useState<Paginable<LeadComment> | null>(null)
    const [selectedCommentId, setSelectedCommentId] = useState<number | null>(null)
    const { fetchPage, pageSize, pageComponentProps } = useListPagination(comments, 12)

    // Mismo criterio que el backend (LeadCommentService._assert_can_modify_comment): solo el
    // autor del comentario, el owner de la organización o un superadmin pueden editarlo/eliminarlo.
    // Se replica acá para no mostrar los íconos si de todos modos el backend los va a rechazar
    // con un 403 (evita el papelón de un toast de error al primer clic).
    const { user, activeOrg } = useUserContext()
    const isOrgOwner = !!(activeOrg && user?.organizations_access.some(
        a => a.organization_id === activeOrg.id && a.is_owner
    ))
    const canModifyComment = (com: LeadComment) =>
        !!user && (user.is_superuser || isOrgOwner || com.created_by === user.id)

    const fetchComments = useCallback(async (leadId: number, fetchPage: number, pageSize: number) => {
        if (!leadId) return
        return getComments({ detailed: true, lead_id: leadId, page: fetchPage, page_size: pageSize })
            .then(setComments)
            .catch(e => showCommonErrorToast(e))
    }, [])

    const { fnWithLoading: fetchComLoad, loading } = useLoading(fetchComments)

    useEffect(() => {
        fetchComLoad(leadId, fetchPage, pageSize)
    }, [fetchComLoad, fetchPage, pageSize, leadId])

    const onDeleteComment = (delId: number) => {
        return deleteComment(delId)
            .then(() => {
                showToast("Comentario eliminado.")
                fetchComments(leadId, fetchPage, pageSize)
            })
            .catch(e => showCommonErrorToast(e, "No se ha podido eliminar el comentario"))
    }
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

    const [deletingCom, setDeletingCom] = useState<LeadComment | null>(null)

    return (
        <LoadingScreenWrapper loading={loading}>
            <Stack spacing={3}>
                {/* El campo para comentar ahora va arriba de la lista (antes estaba abajo, separado
                    por un Divider), siguiendo el diseño de referencia que pasó el usuario. */}
                <CreateCommentWrapper leadId={leadId} onCreate={onCreateComment} />
                <Stack spacing={2}>
                    {comments?.items.map(com =>
                        com.id !== selectedCommentId ? (
                            <CommentInstance key={com.id} comment={com}
                                onEdit={canModifyComment(com) ? () => setSelectedCommentId(com.id) : undefined}
                                onDelete={canModifyComment(com) ? () => setDeletingCom(com) : undefined}>
                                {com.content}
                            </CommentInstance>
                        ) : (
                            <UpdateCommentFromNote key={com.id} leadId={leadId} existingComment={com}
                                onUpdate={onUpdateCommentList} onClose={() => setSelectedCommentId(null)} />
                        )
                    )}
                </Stack>
                {pageComponentProps.totalPages > 1 &&
                    <PaginationComponent {...pageComponentProps} />
                }
            </Stack>
            <DisableConfirmDialog idModal="del-com" onConfirm={() => onDeleteComment(deletingCom!.id)} entity={deletingCom}
                clearEntity={() => setDeletingCom(null)} entityTypeName="el comentario" onlyDelete />
        </LoadingScreenWrapper>
    )
}

interface CommentInstanceProps {
    comment?: LeadComment,
    onEdit?: () => void,
    onDelete?: () => void,
    title?: ReactNode,
    children: ReactNode
}

/**
 * Restyle "moderno y minimalista" (según la referencia que pasó el usuario, un .rar de una versión
 * previa de la app): antes era una tarjeta con borde de color a la izquierda + franjas de
 * header/footer separadas; ahora es una burbuja simple con el avatar del autor al costado, como
 * una lista de chat. El avatar SIEMPRE usa el color propio de `UserAvatar` (hash del nombre,
 * `nameToColor`), igual que en el resto de la app.
 * El color propio del comentario (`comment.color`) ya NO se muestra acá: el usuario lo probó
 * (primero tiñendo el avatar, después el contorno de la burbuja) y decidió que no le encontraba
 * utilidad real y quedaba raro visualmente. La burbuja ahora es siempre neutra (`Paper variant="outlined"`
 * sin overrides). El campo sigue existiendo en el backend por si se le encuentra un uso más adelante,
 * simplemente dejó de leerse acá.
 * `comment.updated_by` solo se setea cuando el comentario pasó por un PUT real (nunca en la
 * creación), así que sirve como señal directa de "fue editado" sin tener que comparar fechas.
 */
export const CommentInstance = ({ comment, title, onEdit, onDelete, children }: CommentInstanceProps) => {

    const author = comment?.updater ?? comment?.creator ?? null
    const authorName = formatUserFullName(author) ?? "Usuario"
    const dateText = comment ? formatDate(comment.updated_at ?? comment.created_at, "custom", "DD/MM/YYYY HH:mm") : null
    const wasEdited = !!comment?.updated_by

    return (
        <Box sx={{ display: "flex", gap: 1.5 }}>
            <UserAvatar name={authorName} size={36} sx={{ fontSize: 13 }} />
            <Paper variant="outlined" sx={{
                flexGrow: 1, minWidth: 0, p: 1.5, borderRadius: 2,
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
                                <IconButton aria-label="edit" size="small" onClick={onEdit} sx={{ color: "text.secondary" }}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            }
                            {onDelete &&
                                <IconButton aria-label="delete" size="small" onClick={onDelete} sx={{ color: "text.secondary" }}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
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
