import { useMemo } from "react"
import { CommentInstance } from "./LeadComments"
import { FormErrorMessage } from "shared/ui/forms/FormFeedback"
import CommonButton from "shared/ui/buttons/CommonButton"
import { useLoading } from "src/hooks/useLoading"
import type { LeadComment, LeadCommentPost } from "src/types/leads"
import { createComment, updateComment } from "./leadActivitiesService"
import { setFormErrors } from "src/utils/forms"
import { showToast } from "src/utils/feedback"
import { useForm } from "react-hook-form"
import { Box, Stack, TextField, Typography } from "@mui/material"
import { UserAvatar } from "shared/ui/details/UserAvatar"
import { useUserContext } from "src/stores/UserContext"
import { formatUserFullName } from "src/utils/formatters"

interface CommentFromNoteProps {
    leadId: number,
    existingComment: LeadComment,
    onUpdate: (com: LeadComment) => void,
    onClose: () => void,
}

export const UpdateCommentFromNote = ({ existingComment, leadId, onUpdate, onClose }: CommentFromNoteProps) => {

    const postComment = ((data: LeadCommentPost) => {
        return updateComment({ ...data }, existingComment.id).then((res) => {
            onUpdate(res)
            showToast("Comentario modificado con éxito.")
        })
    })

    return (
        <CommentInstance comment={existingComment} onDelete={onClose} title="Modificar comentario">
            <CommentForm existingComment={existingComment} leadId={leadId} submit={postComment}
                onClose={onClose} size="small" />
        </CommentInstance>
    )
}

interface CommentWrapperProps {
    leadId: number,
    onCreate: (com: LeadComment) => void,
}

/**
 * Composer arriba de la lista (antes iba abajo). Restyle minimalista: avatar del usuario actual +
 * campo de texto sin recuadro de color alrededor. El selector de color por comentario se sacó del
 * formulario (ver nota en `CommentForm`): no aportaba funcionalidad clara y quedaba raro en la burbuja.
 */
export const CreateCommentWrapper = ({ leadId, onCreate }: CommentWrapperProps) => {

    const { user } = useUserContext()

    const postComment = ((data: LeadCommentPost) => {
        return createComment(data).then(res => {
            onCreate(res)
            showToast("Comentario creado con éxito.")
        })
    })

    const userName = formatUserFullName(user) ?? "Vos"

    return (
        <Box sx={{ display: "flex", gap: 1.5 }}>
            <UserAvatar name={userName} size={36} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <CommentForm leadId={leadId} submit={postComment} size="medium" isNew />
            </Box>
        </Box>
    )
}

interface CommentFormProps {
    existingComment?: LeadComment,
    leadId: number,
    submit: (data: LeadCommentPost) => Promise<void>,
    onClose?: () => void,
    size?: "small" | "medium",
    isNew?: boolean,
}

//Nota: `color` ya no se expone en el formulario (el usuario decidió que no aporta funcionalidad y
//resultaba raro visualmente). El campo se deja intacto en el backend (`LeadCommentBase.color`) por
//si en el futuro se le encuentra un uso, pero como acá no se incluye en `defaultValues` ni se
//registra ningún input para él, nunca viaja en el payload de creación/edición: en edición el backend
//aplica `exclude_unset=True`, así que el color ya guardado de comentarios viejos queda intacto.
const CommentForm = ({ existingComment, leadId, onClose, submit, size = "medium", isNew = false }: CommentFormProps) => {

    const defaultValues = useMemo(() => ({
        lead_id: leadId,
        // Antes era `existingComment?.content` (sin fallback): al crear un comentario nuevo eso
        // queda en `undefined`, y react-hook-form no limpia un input registrado (uncontrolled)
        // cuando `reset()` recibe `undefined` para esa clave — el texto ya tipeado quedaba pegado
        // en el campo después de guardar. Con `""` como valor concreto, `reset(defaultValues)`
        // sí vacía el campo tras crear el comentario.
        content: existingComment?.content ?? "",
    }), [existingComment, leadId])

    const { register, handleSubmit, reset, watch, setError, formState: { errors } } = useForm<LeadCommentPost>({ defaultValues })

    const contentValue = watch("content")

    const onSubmit = ((data: LeadCommentPost) => {
        return submit(data)
            .then(() => {
                reset(defaultValues)
                if (onClose) onClose()
            })
            .catch(e => setFormErrors(e, setError))
    })

    const { fnWithLoading: submitLoad, loading } = useLoading(onSubmit)

    return (
        <form onSubmit={handleSubmit(submitLoad)}>
            <Stack spacing={1}>
                <TextField {...register("content")} placeholder="Escribí un comentario para el equipo…"
                    error={!!errors.content?.message} multiline minRows={isNew ? 2 : 1} fullWidth size={size}
                    onKeyDown={e => {
                        //Ctrl/Cmd + Enter envía, igual que en la referencia.
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            handleSubmit(submitLoad)()
                        }
                    }} />
                {errors.content?.message && typeof errors.content.message === "string" &&
                    <FormErrorMessage>{errors.content.message}</FormErrorMessage>
                }
                <Stack direction="row" spacing={1.5} useFlexGap
                    sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                    {isNew ?
                        <Typography variant="caption" color="text.secondary">
                            Ctrl/Cmd + Enter para enviar
                        </Typography>
                        : <span />
                    }
                    <CommonButton actionType={isNew ? "CREATE" : "SAVE"} variant="contained" color="primary" loading={loading}
                        type="submit" size={size} disabled={isNew && !contentValue?.trim()}>
                        {isNew ? "Comentar" : "Guardar"}
                    </CommonButton>
                </Stack>
            </Stack>
        </form>
    )
}
