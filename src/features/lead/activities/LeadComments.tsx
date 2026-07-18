import { useCallback, useEffect, useState, type ReactNode } from "react"
import { CreateCommentWrapper, UpdateCommentFromNote } from "./LeadCommentForm"
import { DisableConfirmDialog } from "src/components/ui/feedback/ConfirmationDialog"
import PaginationComponent from "shared/ui/lists/PaginationComponent"
import { MetadataShort } from "shared/ui/details/DetailsMetadata"
import LoadingScreenWrapper from "src/components/ui/feedback/LoadingScreen"
import GenericPaper from "shared/layout/container/GenericPaper"
import { useListPagination } from "src/hooks/useListPagination"
import { useLoading } from "src/hooks/useLoading"
import type { LeadComment } from "src/types/leads"
import type { Paginable } from "src/types/shared"
import { deleteComment, getComments } from "./leadActivitiesService"
import { showCommonErrorToast, showToast } from "src/utils/feedback"
import { Box, Divider, Grid, IconButton, Paper, Stack, Typography } from "@mui/material"
import { styled } from "@mui/material/styles"
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { formatUserFullName, getColorShades } from "src/utils/formatters"
import { UserAvatar } from "shared/ui/details/UserAvatar"

export const LeadComments = ({ leadId }: { leadId: number }) => {

    const [comments, setComments] = useState<Paginable<LeadComment> | null>(null)
    const [selectedCommentId, setSelectedCommentId] = useState<number | null>(null)
    const { fetchPage, pageSize, pageComponentProps } = useListPagination(comments, 12)

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
                showToast("Comentario eliminado definitivamente.")
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
            <Stack spacing={2} sx={{ height: "100%" }}>
                <Stack spacing={2} component={GenericPaper} elevation={1} sx={{
                    flexGrow: 1, justifyContent: "space-between", alignItems: "end"
                }}>
                    <Grid container spacing={2} sx={{
                        justifyContent: "end", alignItems: "start", alignContent: "start",
                        width: "100%", minWidth: "15rem"
                    }}>
                        {comments?.items.map(com =>
                            <Grid key={com.id} size="grow" sx={{ minWidth: "15rem" }}>
                                {com.id !== selectedCommentId ? (
                                    <CommentInstance comment={com} onEdit={() => setSelectedCommentId(com.id)}
                                        onDelete={() => setDeletingCom(com)} title={<MetadataShort metadata={com} onlyUser noIcon />}
                                        footerContent={<MetadataShort metadata={com} onlyDate containerProps={{ sx: { ml: "auto" } }} />} >
                                        {com.content}
                                    </CommentInstance>
                                )
                                    : <UpdateCommentFromNote leadId={leadId} existingComment={com} onUpdate={onUpdateCommentList} onClose={() => setSelectedCommentId(null)} />
                                }
                            </Grid>
                        )}
                    </Grid>
                    <PaginationComponent {...pageComponentProps} />
                </Stack>
                <Divider />
                <CreateCommentWrapper leadId={leadId} onCreate={onCreateComment} />
            </Stack>
            <DisableConfirmDialog idModal="del-com" onConfirm={() => onDeleteComment(deletingCom!.id)} entity={deletingCom}
                clearEntity={() => setDeletingCom(null)} entityTypeName="el comentario" onlyDelete />
        </LoadingScreenWrapper>
    )
}

// Restyle más plano tipo "burbuja de chat": en vez de bandas de color arriba/abajo,
// se usa un borde de acento a la izquierda + avatar de color por autor (lógica de color
// por comentario sin cambios, sigue viniendo de comment.color).
const CommentNote = styled(Paper)(({ theme, ...props }) => {

    const colorShades = getColorShades(props.color ?? "secondary", theme)

    return ([{
        borderRadius: "0 1rem 1rem 1rem",
        borderLeft: `4px solid ${colorShades.MAIN}`,
        overflow: "hidden",
        color: theme.palette.text.primary,
        backgroundColor: theme.alpha(colorShades.LIGHT, .1),
        "& .comment-footer, .comment-header": {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
        },
        "& .comment-footer": {
            borderTop: `1px solid ${theme.alpha(colorShades.MAIN, .25)}`,
        },
        "& .comment-main": {
            minHeight: "3rem",
        },
    },
    theme.applyStyles('dark', {
        backgroundColor: theme.alpha(colorShades.DARK, .12),
        "& .comment-footer": {
            borderTop: `1px solid ${theme.alpha(colorShades.DARK, .3)}`,
        },
    })
    ])
})

interface CommentInstanceProps {
    comment?: LeadComment,
    color?: string,
    isCreating?: boolean,
    onEdit?: () => void,
    onDelete?: () => void,
    footerContent?: ReactNode,
    title?: ReactNode,
    children: ReactNode
}

export const CommentInstance = ({ comment, title, color, footerContent, onEdit, onDelete, children }: CommentInstanceProps) => {

    const author = comment?.updater ?? comment?.creator ?? null
    const authorName = formatUserFullName(author)

    return (
        <CommentNote color={comment?.color ?? color ?? "secondary"}>
            <Box className="comment-header" sx={{ px: 2, py: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", overflow: "hidden" }}>
                    {authorName && <UserAvatar name={authorName} size={28} />}
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>{title}</Typography>
                </Stack>
                <Stack direction="row">
                    {onEdit && <IconButton aria-label="edit" size="small" onClick={() => onEdit()} color="inherit">
                        <EditIcon fontSize="small" />
                    </IconButton>}
                    {onDelete && <IconButton aria-label="delete" size="small" onClick={() => onDelete()} color="inherit">
                        <CloseIcon fontSize="small" />
                    </IconButton>}
                </Stack>
            </Box>
            <Box className="comment-main" sx={{ px: 2, py: 1.5 }}>
                {children}
            </Box>
            {footerContent &&
                <Box className="comment-footer" sx={{ px: 1, py: .5 }}>
                    {footerContent}
                </Box>
            }
        </CommentNote>
    )
}
