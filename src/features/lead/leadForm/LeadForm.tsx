import { useCallback, useEffect, useMemo, useState } from "react"
import { LeadFormBool, LeadFormDate, LeadFormFile, LeadFormNumber, LeadFormText } from "../shared/LeadFormFields"
import { DependentLeadFormSelector, LeadFormRelatedLead, LeadFormSelector } from "../shared/LeadFormMultipleFields"
import LoadingScreenWrapper from "src/components/ui/feedback/LoadingScreen"
import { FormErrorMessage } from "shared/ui/forms/FormFeedback"
import CommonButton from "shared/ui/buttons/CommonButton"
import { useLoading } from "src/hooks/useLoading"
import type { LeadField, LeadFieldValue } from "src/types/leadFields"
import type { Lead, LeadPost, LeadPostValue } from "src/types/leads"
import type { NomenclatorItem } from "src/types/nomenclators"
import { getLeads } from "../leadService"
import { getNomenclatorItems } from "features/nomenclators/nomenclatorService"
import { getLeadFields } from "features/leadFields/leadFieldServices"
import { createFormDataFromLead, setLeadFormErrors, updateSelectorOptions } from "../leadUtils"
import { getListField } from "src/utils/lists"
import { useFieldArray, useForm, type Control, type Path, type UseFormRegister, type UseFormSetValue } from "react-hook-form"
import { Accordion, AccordionDetails, Grid, ButtonGroup, Stack, Typography, Box } from "@mui/material"
import { ExpandMore } from "@mui/icons-material"
import { getLeadFormFieldsBySections, orderFieldsBySections } from "src/features/leadFields/leadFieldUtils"
import GenericPaper from "src/components/layout/container/GenericPaper"
import { ColoredAccordionSummary } from "src/components/layout/container/ColoredHeaders"

export interface LeadPostFormValues extends LeadPostValue {
    fieldData: LeadField
}
export interface LeadPostForm extends LeadPost {
    values: LeadPostFormValues[]
}

interface LeadFormProps {
    existingValues?: LeadFieldValue[],
    existingLeadFields?: LeadField[],
    // Al crear recibe el uuid de Campaign (selectedCampaign.id), pero al editar llega el id
    // interno (lead.campaign_id, FK embebida todavía sin migrar). Ambas formas funcionan como
    // filtro de getLeadFields gracias al resolver genérico de FKs del backend; solo importa
    // el uuid al crear un lead nuevo.
    campaignId?: string | number,
    onSubmit: (data: FormData) => Promise<void>,
    submitBtnLabel?: string,
    onCancel?: () => void,
    setCampaignError?: (error?: string) => void,
    formId?: string,
    hideButtons?: boolean,
    setExternalLoading?: (loading: boolean) => void
}

export const LeadForm = ({ existingValues, existingLeadFields, campaignId, onSubmit, submitBtnLabel = "Guardar",
    onCancel, formId = "lead-form", hideButtons = false, setExternalLoading, setCampaignError }: LeadFormProps) => {

    const defaultValues = useMemo(() => ({
        campaign_id: campaignId,
        values: []
    }), [campaignId])

    const { register, control, handleSubmit, setError, reset, setValue, formState: { errors } } = useForm<LeadPostForm>({ defaultValues })

    useEffect(() => {
        reset(defaultValues)
    }, [defaultValues, reset])

    const { fields, replace } = useFieldArray({ name: "values", control })

    //Mapa de field_id -> path del valor en el fieldArray, para que un campo dependiente pueda "observar" a su padre
    const fieldIdToValuePath = useMemo(() => {
        const map = new Map<string, Path<LeadPostForm>>()
        fields.forEach((f, idx) => map.set(f.field_id, `values.${idx}.value` as Path<LeadPostForm>))
        return map
    }, [fields])

    const submit = useCallback((data: LeadPostForm) => {
        return onSubmit(createFormDataFromLead(data))
            .catch(e => setLeadFormErrors(fields, e, setError))
    }, [fields, onSubmit, setError])

    const { loading: submitLoading, fnWithLoading: submitLoad } = useLoading(submit, setExternalLoading)

    //Setea el mensaje de error al selector, en el caso de createLead
    useEffect(() => {
        if (setCampaignError) { setCampaignError(errors?.campaign_id?.message) }
    }, [errors.campaign_id, setCampaignError])

    const [leadFields, setLeadFields] = useState<LeadField[]>(existingLeadFields ?? [])
    const [relatedLeads, setRelatedLeads] = useState<Map<string, Lead[]>>(new Map())
    const [selectors, setSelectors] = useState<Map<string, NomenclatorItem[]>>(new Map())

    const isFieldActive = (field: LeadField) => {
        const f = field as unknown as { active?: boolean }
        return f.active === undefined || f.active !== false
    }

    const visibleFieldFilter = (field: LeadField) =>
        field.field_type_code !== "CALCULATED" && field.is_visible && isFieldActive(field)

    const visibleValueFilter = (value: LeadFieldValue) =>
        visibleFieldFilter(value.field)

    //Cuando se cargan los leadFields, se formatean y ubican en fieldArray
    const loadFieldValues = useCallback((newLeadFields: LeadField[], existingValues?: LeadFieldValue[]) => {
        //Si ya hay valores, formatea los values para asignarlos al fieldArray. Asigna listas de ids a value.
        if (existingValues) {
            replace(
                orderFieldsBySections(existingValues.filter(visibleValueFilter))
                    .map(fieldValue => {
                        let value: unknown = fieldValue.value
                        //Si no hay valor, es selector o related_leads. Trae el id, o arreglo de ids
                        if (!value && fieldValue.nomenclator_items.length > 0) {
                            value = getListField(fieldValue.nomenclator_items, "id",
                                ["SELECTOR_MULTIPLE", "CHECKBOX_MULTIPLE"].includes(fieldValue.field.field_subtype_code!))
                        }
                        else if (!value && fieldValue.related_leads.length > 0) {
                            value = getListField(fieldValue.related_leads, "id", true)
                        }
                        return ({
                            field_id: fieldValue.field_id,
                            fieldData: fieldValue.field,
                            value: value
                        }) as LeadPostFormValues
                    })
            )
            //Si no hay valores, solo trae los datos de los leadFields.
        } else {
            replace(
                orderFieldsBySections(newLeadFields.filter(visibleFieldFilter))
                    .map(field => ({
                        field_id: field.id,
                        fieldData: field
                    }) as unknown as LeadPostFormValues))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [replace])

    //Actualiza los leadFields respecto al campaignId seleccionado. Si ya hay existingLeadFields, no busca.
    const fetchLeadFields = useCallback(async (campaignId: string, existingLeadFields?: LeadField[], existingValues?: LeadFieldValue[]) => {
        if (campaignId == null) return
        if (existingLeadFields) {
            setLeadFields(existingLeadFields)
            loadFieldValues(existingLeadFields, existingValues)
            return
        }
        return getLeadFields({ only_active: true, campaign_id: campaignId, "page_size": 0 }).then(res => {
            const leadFields = res.items.sort((a, b) => a.order - b.order)
            setLeadFields(leadFields)
            loadFieldValues(leadFields, existingValues)
        })
    }, [loadFieldValues])

    const { loading: fieldsLoading, fnWithLoading: fetchFieldsLoad } = useLoading(fetchLeadFields)

    useEffect(() => {
        fetchFieldsLoad(campaignId, existingLeadFields, existingValues)
    }, [fetchFieldsLoad, campaignId, existingLeadFields, existingValues])

    useEffect(() => {
        updateSelectorOptions(leadFields, "related_campaign_id", relatedLeads, ["LEAD"],
            (related_campaign_id: string) => getLeads({ only_active: true, campaign_id: related_campaign_id, page_size: 0 }).then((res) => res.items))
            .then(map => setRelatedLeads(map)).catch(() => setError("root", { message: "No se ha podido obtener la lista de leads relacionados" }))
        updateSelectorOptions(leadFields, "nomenclator_id", selectors, ["SELECTOR", "CHECKBOX"],
            (nomenclator_id: string) => getNomenclatorItems({ only_active: true, nomenclator_id: nomenclator_id, page_size: 0 }).then((res) => res.items))
            .then(map => setSelectors(map)).catch(() => setError("root", { message: "No se ha podido obtener la lista del selector" }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadFields, setError])

    const fieldsBySection = useMemo(() => {
        return getLeadFormFieldsBySections(fields)
    }, [fields])

    return (
        <LoadingScreenWrapper loading={fieldsLoading}>
            <form onSubmit={handleSubmit(submitLoad)} id={formId}>
                {/* campaign_id es el uuid de Campaign (string) al crear un lead. Antes se forzaba
                    Number(value), lo que convertía el uuid en NaN y el submit terminaba mandando
                    campaign_id: null. Se deja el valor tal cual (string), sin coerción numérica. */}
                <input type="text" {...register("campaign_id", { setValueAs: value => (value === "" || value == null) ? null : value })} hidden />
                <Stack spacing={3}>
                    <Box>
                        {campaignId &&
                            fieldsBySection.map((section, idx) => {
                                return <Accordion key={`section-lead-${section.id}`} defaultExpanded={idx === 0}
                                    component={GenericPaper} elevation={1} sx={{ p: 0, overflow: "hidden" }}>
                                    <ColoredAccordionSummary isFirst={idx === 0} isLast={idx === fieldsBySection.length - 1}
                                        expandIcon={<ExpandMore />} color={section.sectionData?.color}>
                                        <Typography variant="h3">{section.name}</Typography>
                                    </ColoredAccordionSummary>
                                    <AccordionDetails sx={{ mt: 2 }}>
                                        <Grid container sx={{ gap: ".25rem .5rem " }}>
                                            {section.fields.map(sectField => {
                                                const fieldData = sectField.field?.fieldData
                                                return (
                                                    <Grid size="grow" sx={{ alignItems: "center", minWidth: "20rem" }} key={sectField.field.id}>
                                                        <LeadFormFieldType register={register} control={control} name={`values.${sectField.globalIdx}.value`}
                                                            leadField={sectField.field.fieldData}
                                                            relatedLeads={fieldData?.related_campaign_id ? relatedLeads.get(fieldData.related_campaign_id) : undefined}
                                                            selectors={fieldData?.nomenclator_id ? selectors.get(fieldData?.nomenclator_id) : undefined}
                                                            parentName={fieldData.depends_on_field_id
                                                                ? fieldIdToValuePath.get(fieldData.depends_on_field_id)
                                                                : undefined}
                                                            setValue={setValue}
                                                            errorMessage={errors?.values?.[sectField.globalIdx]?.value?.message} />
                                                    </Grid>)
                                            })}
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            })
                        }
                    </Box>
                    {errors.root &&
                        <FormErrorMessage>{errors.root.message}</FormErrorMessage>}
                    {!hideButtons &&
                        <ButtonGroup sx={{ alignSelf: "end" }}>
                            {onCancel && <CommonButton actionType="CLOSE" variant="outlined" color="error"
                                onClick={onCancel} disabled={submitLoading}>Cancelar</CommonButton>}
                            {campaignId &&
                                <CommonButton actionType={existingValues ? "MODIFY" : "CREATE"} loading={submitLoading}
                                    type="submit" variant="contained">{submitBtnLabel}</CommonButton>}
                        </ButtonGroup>
                    }
                </Stack>
            </form>

        </LoadingScreenWrapper >
    )
}

/***************************************** Mostrar un campo respecto al tipo de dato. ******************************************* */
interface LeadFormFieldTypeProps {
    register: UseFormRegister<LeadPostForm>,
    control: Control<LeadPostForm>,
    name: Path<LeadPostForm>,
    leadField: LeadField,
    relatedLeads?: Lead[],
    selectors?: NomenclatorItem[],
    //Path del valor del campo padre (si este campo depende de otro, ver depends_on_field_id) y setValue para poder limpiarlo
    parentName?: Path<LeadPostForm>,
    setValue?: UseFormSetValue<LeadPostForm>,
    errorMessage?: string
}

const LeadFormFieldType = ({ register, control, name, leadField, relatedLeads, selectors, parentName, setValue, errorMessage }: LeadFormFieldTypeProps) => {

    const label = leadField.name
    const typeCode = leadField.field_type_code
    const subtypeCode = leadField.field_subtype_code ?? undefined
    const required = leadField.required

    switch (typeCode) {
        case "LEAD":
            return (<LeadFormRelatedLead control={control} name={name} options={relatedLeads}
                label={label} required={required} errorMessage={errorMessage} showAdornment />)
        case "FILE":
            return (<LeadFormFile control={control} name={name} label={label} required={required}
                errorMessage={errorMessage} showAdornment subtype={subtypeCode} />)
        case "SELECTOR":
            //Si depende de otro campo, sus opciones se resuelven en cascada a partir del valor elegido en el padre
            if (leadField.depends_on_field_id && parentName && setValue) {
                return (<DependentLeadFormSelector control={control} name={name} parentName={parentName} setValue={setValue}
                    label={label} subtype={subtypeCode} required={required} errorMessage={errorMessage} showAdornment />)
            }
            return (<LeadFormSelector control={control} name={name} options={selectors}
                label={label} subtype={subtypeCode} required={required} errorMessage={errorMessage} showAdornment />)
        case "BOOL":
            return (<LeadFormBool control={control} name={name} label={label} errorMessage={errorMessage} />)
        case "DATE_TIME": case "DATE":
            return (<LeadFormDate register={register} name={name} label={label}
                subtype={subtypeCode} required={leadField.required} errorMessage={errorMessage} showAdornment />)
        case "NUMBER": case "INT":
            return (<LeadFormNumber control={control} name={name} label={label}
                subtype={subtypeCode} required={leadField.required} errorMessage={errorMessage} showAdornment />)
        case "STRING":
            return <LeadFormText register={register} name={name} label={label} subtype={subtypeCode}
                required={leadField.required} errorMessage={errorMessage} showAdornment />
    }
}