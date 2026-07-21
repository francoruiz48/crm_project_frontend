import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { Box, ButtonGroup, Stack, Typography } from "@mui/material"
import { ControlledAutocomplete } from "shared/ui/forms/CustomMultipleInputs"
import { GenericSidebar, SidebarContentWrapper, SidebarContentActionsWrapper } from "shared/layout/container/GenericContainer"
import ACTION_ICONS from "shared/ui/buttons/ActionIcons"
import CommonButton from "shared/ui/buttons/CommonButton"
import { useLoading } from "src/hooks/useLoading"
import { getLeadFields, updateLeadFieldTitle, updateLeadFieldSubtitle } from "src/features/leadFields/leadFieldServices"
import { LeadTitleConfigPreview } from "./LeadTitleConfigPreview"
import { showCommonErrorToast, showToast } from "src/utils/feedback"
import type { LeadFieldDetailed, LeadFieldValueDetailed } from "src/types/leadFields"
import LoadingScreenWrapper from "src/components/ui/feedback/LoadingScreen"
import CustomChip from "src/components/ui/details/CustomChip"
import { CustomAlert } from "src/components/ui/feedback/CustomAlert"

export const NOT_TITLE_TYPES_SUBTYPES = [
    "LEAD", "SELECTOR_MULTIPLE", "CHECKBOX_MULTIPLE", //Valores múltiples
    "PASSWORD", "CREDIT_CARD_SIMPLE", //Valores sensibles
    "HTML", "MARKDOWN", "FILE", "BOOL", //Valores inválidos
] as const

type NotTitleType = typeof NOT_TITLE_TYPES_SUBTYPES[number]

export const isFieldValidForTitle = (field: LeadFieldDetailed) =>
    !(
        NOT_TITLE_TYPES_SUBTYPES.includes(field.field_type_code as NotTitleType) ||
        NOT_TITLE_TYPES_SUBTYPES.includes((field.field_subtype?.code ?? "") as NotTitleType) ||
        NOT_TITLE_TYPES_SUBTYPES.includes((field.field_template_code ?? "") as NotTitleType)
    )

interface TitleConfigForm {
    order1: LeadFieldDetailed | null
    order2: LeadFieldDetailed | null
    //Subtítulo: línea secundaria debajo del título (ej. Cargo + Empresa). Mismo mecanismo que el
    //título (subtitle_order), pero con solo 2 slots — alcanza para el caso de uso pensado y evita
    //complicar más este formulario. A diferencia del título, es opcional: no tiene equivalente a
    //"Sin título" si queda vacío, simplemente no se muestra nada.
    subOrder1: LeadFieldDetailed | null
    subOrder2: LeadFieldDetailed | null
}

interface LeadTitleConfigSidebarProps {
    open: boolean
    onClose: () => void
    campaignId?: number
    fieldValues?: LeadFieldValueDetailed[] | undefined
    onSave?: (fields: Record<number, LeadFieldDetailed>) => void
}

export const LeadTitleConfigSidebar = ({ open, onClose, campaignId, fieldValues, onSave }: LeadTitleConfigSidebarProps) => {

    const [fields, setFields] = useState<LeadFieldDetailed[]>([])

    //Ubica en un Record el fieldValue, con su id, valor y active
    const titleFieldValues = useMemo(() => {
        if (!fieldValues) return undefined
        const map: Record<number, unknown> = {}
        for (const fv of fieldValues) {
            map[fv.field_id] = fv.value ?? fv.nomenclator_items ?? fv.related_leads
        }
        return map
    }, [fieldValues])

    const fetchFields = useCallback((campaignId: number) => {
        return getLeadFields({ campaign_id: campaignId, page_size: 0, detailed: true, only_active: false })
            .then(res => setFields(res.items.filter(isFieldValidForTitle)))
            .catch(e => showCommonErrorToast(e, "No se ha podido recuperar los campos de lead."))
    }, [])

    const { fnWithLoading: fetchLoad, loading: fetching } = useLoading(fetchFields)

    useEffect(() => {
        if (!open || !campaignId) return
        fetchLoad(campaignId)
    }, [open, campaignId, fetchLoad])

    const defaultValues = useMemo(() => ({
        order1: fields.find(f => f.title_order === 1) ?? null,
        order2: fields.find(f => f.title_order === 2) ?? null,
        subOrder1: fields.find(f => f.subtitle_order === 1) ?? null,
        subOrder2: fields.find(f => f.subtitle_order === 2) ?? null,
    }), [fields])

    const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<TitleConfigForm>({ defaultValues })

    useEffect(() => {
        reset(defaultValues)
    }, [defaultValues, reset])

    const order1Val = useWatch({ control, name: "order1" })
    const order2Val = useWatch({ control, name: "order2" })
    const subOrder1Val = useWatch({ control, name: "subOrder1" })
    const subOrder2Val = useWatch({ control, name: "subOrder2" })

    const watchedFields = [order1Val, order2Val]
    const selectedFields = watchedFields.filter(Boolean) as LeadFieldDetailed[]

    const watchedSubFields = [subOrder1Val, subOrder2Val]
    const selectedSubFields = watchedSubFields.filter(Boolean) as LeadFieldDetailed[]

    //Alerts
    const optionalFields = selectedFields.filter(f => !f.required)
    const allOptional = selectedFields.length > 0 && optionalFields.length === selectedFields.length

    const disabledSelectedFields = selectedFields.filter(f => !f.active)
    const hasDisabledField = disabledSelectedFields.length > 0

    const disabledSelectedSubFields = selectedSubFields.filter(f => !f.active)
    const hasDisabledSubField = disabledSelectedSubFields.length > 0

    //Options
    const activeFields = useMemo(() => fields.filter(f => f.active), [fields])

    const slot1Options = activeFields.filter(f => f.id !== order2Val?.id)
    const slot2Options = activeFields.filter(f => f.id !== order1Val?.id)

    const subSlot1Options = activeFields.filter(f => f.id !== subOrder2Val?.id)
    const subSlot2Options = activeFields.filter(f => f.id !== subOrder1Val?.id)

    const getOptionLabel = (option: LeadFieldDetailed) => `${option.name} — ${option.field_type.description}`
    const getOptionKey = (option: LeadFieldDetailed) => String(option.id)

    const onSubmit = useCallback(async (data: TitleConfigForm) => {
        const orderMap = new Map<number, number | null>()
        const subOrderMap = new Map<number, number | null>()

        if (selectedFields.length === 0) {
            setError("root", { message: "Debe seleccionarse por lo menos un campo" })
            return
        }

        if (selectedFields.length === disabledSelectedFields.length) {
            setError("root", { message: "Debe haber por lo menos un campo habilitado" })
            return
        }

        if (data.order1) orderMap.set(data.order1.id, 1)
        if (data.order2) orderMap.set(data.order2.id, 2)

        //El subtítulo es opcional (a diferencia del título), no exige mínimo de campos
        if (data.subOrder1) subOrderMap.set(data.subOrder1.id, 1)
        if (data.subOrder2) subOrderMap.set(data.subOrder2.id, 2)

        //Lista de cambios a enviar a backend
        const updates: { fieldId: number, newOrder: number | null }[] = []
        const subUpdates: { fieldId: number, newOrder: number | null }[] = []

        for (const field of fields) {
            const newOrder = orderMap.get(field.id)
            const oldOrder = field.title_order
            if (newOrder === undefined) {
                //Si el campo no es parte del nuevo título, pero tiene un orden preexistente, lo setea a null.
                if (oldOrder !== null) {
                    updates.push({ fieldId: field.id, newOrder: null })
                }
            }
            //Si el campo nuevo es diferente al original, lo actualiza. Si es igual, no modifica nada.
            else if (oldOrder !== newOrder) {
                updates.push({ fieldId: field.id, newOrder })
            }

            //Mismo tratamiento, en paralelo, para subtitle_order.
            const newSubOrder = subOrderMap.get(field.id)
            const oldSubOrder = field.subtitle_order
            if (newSubOrder === undefined) {
                if (oldSubOrder !== null) {
                    subUpdates.push({ fieldId: field.id, newOrder: null })
                }
            } else if (oldSubOrder !== newSubOrder) {
                subUpdates.push({ fieldId: field.id, newOrder: newSubOrder })
            }
        }

        if (updates.length === 0 && subUpdates.length === 0) {
            onClose()
            return
        }

        const results = await Promise.all([
            ...updates.map(u => updateLeadFieldTitle(u.newOrder, u.fieldId)),
            ...subUpdates.map(u => updateLeadFieldSubtitle(u.newOrder, u.fieldId)),
        ])
        const resultRecord: Record<number, LeadFieldDetailed> = results.reduce(
            (acc, field) => {
                acc[field.id] = field
                return acc
            }, {} as Record<number, LeadFieldDetailed>
        )
        if (onSave) onSave(resultRecord)
        showToast("Configuración de título y subtítulo actualizada con éxito")
        onClose()
    }, [fields, onClose, onSave, selectedFields.length, disabledSelectedFields.length, setError])

    const { loading: submitting, fnWithLoading: submitLoad } = useLoading(onSubmit)

    const autocompleteSlots = [
        { name: "order1" as const, label: "Campo 1", options: slot1Options },
        { name: "order2" as const, label: "Campo 2", options: slot2Options },
    ]

    const subAutocompleteSlots = [
        { name: "subOrder1" as const, label: "Campo 1", options: subSlot1Options },
        { name: "subOrder2" as const, label: "Campo 2", options: subSlot2Options },
    ]

    return (
        <GenericSidebar isSidebarOpen={open} closeSidebar={onClose}>
            <SidebarContentWrapper title="Configurar Título y Subtítulo" subtitle="Renombrar Lead"
                icon={ACTION_ICONS.RENAME}>
                <SidebarContentActionsWrapper
                    actions={
                        <ButtonGroup>
                            <CommonButton actionType="CLOSE" color="error" variant="outlined" onClick={onClose} loading={submitting}>
                                Cancelar
                            </CommonButton>
                            <CommonButton type="submit" actionType="SAVE" form="rename-lead" loading={submitting}>
                                Guardar
                            </CommonButton>
                        </ButtonGroup>
                    }>
                    <LoadingScreenWrapper loading={fetching}>
                        <form onSubmit={handleSubmit(submitLoad)} id="rename-lead">
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <Typography variant="body1" color="text.secondary">
                                    Elige los campos que formarán el título de cada lead.
                                    Se concatenarán en el orden indicado.
                                </Typography>

                                {autocompleteSlots.map((slot, idx) => (
                                    <ControlledAutocomplete
                                        key={slot.name}
                                        control={control}
                                        name={slot.name}
                                        label={slot.label}
                                        options={slot.options}
                                        getOptionLabel={getOptionLabel}
                                        getOptionKey={getOptionKey}
                                        returnField={null}
                                        size="medium"
                                        required={false}
                                        disabled={fields.length === 0}
                                        errorMessage={(watchedFields[idx] && !watchedFields[idx]?.active) ? "Campo Deshabilitado" : undefined}
                                        placeholder="Seleccionar campo..."
                                        renderOption={(props: React.HTMLAttributes<HTMLLIElement> & { key: React.Key }, option: LeadFieldDetailed) => {
                                            const { key, ...liProps } = props
                                            return (
                                                <Box component="li" key={key} {...liProps}>
                                                    <Stack direction="row" spacing={1} sx={{ flexGrow: 1, alignItems: "center" }}>
                                                        <Typography variant="body2" sx={{ width: "100%" }}>{option.name}</Typography>
                                                        {!option.required && (
                                                            <CustomChip label="Opcional" size="small" chipColor="warning" />
                                                        )}
                                                        <CustomChip label={option.field_type.description} size="small" chipColor="secondary" />
                                                    </Stack>
                                                </Box>
                                            )
                                        }}
                                    />
                                ))}

                                {!allOptional && optionalFields.length > 0 && (
                                    <CustomAlert severity="info" sx={{ py: 0 }}>
                                        {optionalFields.length === 1
                                            ? `El campo "${optionalFields[0].name}" es opcional — puede no aparecer en el título.`
                                            : `Los campos ${optionalFields.map((f, idx) => `${idx === optionalFields.length - 1 ? "y " : ""}"${f.name}"`).join(", ")
                                            } son opcionales, pueden no aparecer en el título.`}
                                    </CustomAlert>
                                )}
                                {allOptional && watchedFields.length > 0 && (
                                    <CustomAlert severity="warning" sx={{ py: 0 }}>
                                        Todos los campos seleccionados son opcionales. Si no tienen valor, el título se mostrará como &quot;Sin título&quot;.
                                    </CustomAlert>
                                )}
                                {hasDisabledField && (
                                    <CustomAlert severity="warning" sx={{ py: 0 }}>
                                        Hay campos deshabilitados. No se mostrarán en el título hasta que se habiliten.
                                    </CustomAlert>
                                )}
                                {errors.root && (
                                    <CustomAlert severity="error" sx={{ py: 0 }}>
                                        {errors.root.message}
                                    </CustomAlert>
                                )}
                                <LeadTitleConfigPreview selectedFields={selectedFields} fieldValues={titleFieldValues} />

                                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                                    Subtítulo (opcional): se muestra debajo del título, en el detalle del lead
                                    y en las tarjetas del tablero. Ej: Cargo + Empresa.
                                </Typography>

                                {subAutocompleteSlots.map((slot, idx) => (
                                    <ControlledAutocomplete
                                        key={slot.name}
                                        control={control}
                                        name={slot.name}
                                        label={slot.label}
                                        options={slot.options}
                                        getOptionLabel={getOptionLabel}
                                        getOptionKey={getOptionKey}
                                        returnField={null}
                                        size="medium"
                                        required={false}
                                        disabled={fields.length === 0}
                                        errorMessage={(watchedSubFields[idx] && !watchedSubFields[idx]?.active) ? "Campo Deshabilitado" : undefined}
                                        placeholder="Seleccionar campo..."
                                        renderOption={(props: React.HTMLAttributes<HTMLLIElement> & { key: React.Key }, option: LeadFieldDetailed) => {
                                            const { key, ...liProps } = props
                                            return (
                                                <Box component="li" key={key} {...liProps}>
                                                    <Stack direction="row" spacing={1} sx={{ flexGrow: 1, alignItems: "center" }}>
                                                        <Typography variant="body2" sx={{ width: "100%" }}>{option.name}</Typography>
                                                        {!option.required && (
                                                            <CustomChip label="Opcional" size="small" chipColor="warning" />
                                                        )}
                                                        <CustomChip label={option.field_type.description} size="small" chipColor="secondary" />
                                                    </Stack>
                                                </Box>
                                            )
                                        }}
                                    />
                                ))}

                                {hasDisabledSubField && (
                                    <CustomAlert severity="warning" sx={{ py: 0 }}>
                                        Hay campos deshabilitados en el subtítulo. No se mostrarán hasta que se habiliten.
                                    </CustomAlert>
                                )}
                            </Stack>
                        </form>
                    </LoadingScreenWrapper>
                </SidebarContentActionsWrapper>
            </SidebarContentWrapper>
        </GenericSidebar>
    )
}
