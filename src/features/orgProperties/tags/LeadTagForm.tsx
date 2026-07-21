import { useCallback, useEffect, useMemo, useState } from "react"
import { FormErrorMessage } from "shared/ui/forms/FormFeedback"
import CommonButton from "shared/ui/buttons/CommonButton"
import { useLoading } from "src/hooks/useLoading"
import type { LeadTag, LeadTagDetailed, LeadTagPost } from "src/types/orgProperties"
import { setFormErrors } from "src/utils/forms"
import { showToast } from "src/utils/feedback"
import { useForm } from "react-hook-form"
import { ButtonGroup, Stack, TextField, Typography } from "@mui/material"
import { ControlledColorPicker } from "src/components/ui/forms/ColorPicker"
import { createTag, updateTag } from "./LeadTagService"
import { CustomAvatar } from "src/components/ui/details/CustomAvatar"
import ACTION_ICONS from "src/components/ui/buttons/ActionIcons"


interface TagFormSidebarProps {
    onClose: () => void,
    onSubmit: (entity?: LeadTagDetailed | undefined, update?: boolean) => void
    existingTag?: LeadTagDetailed | null
}

export const TagFormSidebarWrapper = ({ existingTag, onClose, onSubmit }: TagFormSidebarProps) => {

    const [color, setColor] = useState<string>(existingTag?.color ?? "primary")

    const onPostTag = useCallback((data: LeadTagPost) => {
        if (existingTag) {
            return updateTag(data, existingTag.id)
                .then(res => {
                    onSubmit(res, true)
                    showToast(`Etiqueta "${res.name}" actualizada con éxito`)
                    onClose()
                })
        }
        return createTag(data)
            .then(res => {
                onSubmit()
                showToast(`Etiqueta "${res.name}" creada con éxito`)
                onClose()
            })
    }, [existingTag, onClose, onSubmit])

    return (
        <Stack spacing={2}>
            <Stack spacing={2} direction="row" sx={{ alignItems: "center" }}>
                <CustomAvatar size="small" color={color}>{ACTION_ICONS[existingTag ? "MODIFY" : "CREATE"]}</CustomAvatar>
                <Typography variant="h3">{existingTag ? `Modificar Etiqueta "${existingTag.name}"` : "Crear Etiqueta"}</Typography>
            </Stack>
            <LeadTagForm existingTag={existingTag} onCancel={onClose} onSubmit={onPostTag} setColor={setColor} />
        </Stack>
    )
}

interface LeadTagFormProps {
    existingTag?: LeadTag | null,
    onCancel: () => void,
    onSubmit: (data: LeadTagPost) => Promise<void>,
    popover?: boolean,
    setColor?: React.Dispatch<React.SetStateAction<string>>
}

const LeadTagForm = ({ existingTag, onCancel, onSubmit, popover = false, setColor }: LeadTagFormProps) => {

    const defaultValues = useMemo(() => ({
        name: existingTag?.name ?? undefined,
        color: existingTag?.color ?? "secondary"
    }), [existingTag])

    const { register, control, formState: { errors }, reset, handleSubmit, setError } = useForm<LeadTagPost>({
        defaultValues
    })

    useEffect(() => {
        reset(defaultValues)
    }, [defaultValues, reset])

    const onPostTag = (data: LeadTagPost) => {
        return onSubmit(data)
            .then(() => reset(defaultValues))
            .catch(e => setFormErrors(e, setError))
    }

    const { fnWithLoading: postLoad, loading } = useLoading(onPostTag)

    const handleCancel = () => {
        reset(defaultValues)
        onCancel()
    }

    return (
        <form onSubmit={handleSubmit(postLoad)} style={{ minWidth: "15rem" }}>
            <Stack spacing={2}>
                <Stack spacing={1}>
                    <TextField id="tag-name" label="Nombre" size={popover ? "small" : "medium"} {...register("name")} />
                    {errors?.name?.message && <FormErrorMessage>{errors?.name?.message}</FormErrorMessage>}
                </Stack>
                <ControlledColorPicker control={control} name="color" size={popover ? "small" : "medium"} row
                    onBeforeChange={(color) => setColor ? setColor(color) : undefined} />
                <ButtonGroup fullWidth={popover} sx={{ alignSelf: "end" }}>
                    <CommonButton actionType="CLOSE" variant="outlined" color="error" onClick={handleCancel} disabled={loading}>
                        Cancelar
                    </CommonButton>
                    <CommonButton actionType={existingTag ? "MODIFY" : "CREATE"} variant="contained" type="submit" loading={loading}>
                        Guardar
                    </CommonButton>
                </ButtonGroup>
            </Stack>
        </form>
    )
}

