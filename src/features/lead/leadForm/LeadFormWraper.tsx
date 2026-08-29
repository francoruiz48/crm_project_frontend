import { useCallback, useEffect, useMemo, useState } from "react"
import { LeadForm } from "./LeadForm"
import { GenericContainer } from "shared/layout/container/GenericContainer"
import { FormErrorMessage } from "shared/ui/forms/FormFeedback"
import type { LeadField, LeadFieldDetailed, LeadFieldValue } from "src/types/leadFields"
import type { Campaign, Workspace } from "src/types/campaigns"
import type { LeadDetailed } from "src/types/leads"
import { getLeadTitleArray } from "../leadUtils"
import { createLead, getLead, simulateCreateLead, updateLead } from "../leadService"
import { getWorkspaces } from "src/features/workspaces/workspaceServices"
import { getCampaigns } from "src/features/campaigns/campaignServices"
import { showToast } from "src/utils/feedback"
import { useUserContext } from "src/stores/UserContext"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Autocomplete, ButtonGroup, Grid, Stack, TextField, Typography } from "@mui/material"
import GenericPaper from "src/components/layout/container/GenericPaper"
import { CustomAvatar } from "src/components/ui/details/CustomAvatar"
import ACTION_ICONS from "shared/ui/icons/ActionIcons"
import CommonButton from "src/components/ui/buttons/CommonButton"
import { GenericPaperColoredSection } from "src/components/layout/container/ColoredHeaders"
import GenericModal, { ModalContentWrapper } from "src/components/layout/container/GenericModal"
import { usePageTitle } from "src/hooks/usePageTitle"

/** Wrapper para presentar LeadForm de creación en una página. */
export const CreateLeadFormPage = () => {

    const [params] = useSearchParams()

    const { activeOrg } = useUserContext()

    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
    const [campaignError, setCampaignError] = useState<string | undefined>(undefined)

    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
    const nav = useNavigate()

    const [btnLoading, setBtnLoading] = useState(false)

    useEffect(() => {
        getWorkspaces({ page_size: 0, only_active: true }).then(res => {
            setWorkspaces(res.items)
            const paramWspId = params.get("workspace")
            if (!paramWspId) return
            const paramWsp = res.items.find(wsp => wsp.id === paramWspId)
            if (!paramWsp) return
            setSelectedWorkspace(paramWsp)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOrg])


    useEffect(() => {
        if (!selectedWorkspace) return
        getCampaigns({ page_size: 0, only_active: true, workspace_id: selectedWorkspace.id }).then(res => {
            setCampaigns(res.items)
            const paramCmpId = params.get("campaign")
            if (!paramCmpId) return
            const paramCmp = res.items.find(cmp => cmp.id === paramCmpId)
            if (!paramCmp) return
            setSelectedCampaign(paramCmp)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWorkspace])

    const onSubmit = useCallback((data: FormData) => {
        return createLead(data).then(lead => {
            nav(`/leads/${lead.id}`)
            showToast(`El lead fue creado con éxito`)
        })
    }, [nav])

    return (
        <GenericContainer containerSize="lg" noPaper>
            <Stack spacing={3}>
                <GenericPaper>
                    <Stack spacing={2}>
                        <GenericPaperColoredSection color="primary" isFirst>
                            <Stack direction="row" spacing={2} useFlexGap
                                sx={{ alignItems: "center", justifyContent: "space-between" }}>
                                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                                    <CustomAvatar color="primary">{ACTION_ICONS.CREATE}</CustomAvatar>
                                    <Typography variant="h1">Nuevo Lead</Typography>
                                </Stack>
                                <ButtonGroup sx={{ alignSelf: "end" }}>
                                    <CommonButton actionType="CLOSE" variant="outlined" color="error" loading={btnLoading}
                                        component={Link} to={`/leads?workspace=${selectedWorkspace?.id}&campaign=${selectedCampaign?.id}`}>
                                        Cancelar
                                    </CommonButton>
                                    <CommonButton actionType="MODIFY" variant="contained" loading={btnLoading}
                                        type="submit" form={`create-lead`}>Guardar</CommonButton>
                                </ButtonGroup>
                            </Stack>
                        </GenericPaperColoredSection>
                        <Grid container spacing={1}>
                            <Grid size="grow" sx={{ minWidth: "20rem" }}>
                                <Autocomplete options={workspaces} loading={workspaces.length === 0} disabled={workspaces.length === 0}
                                    onChange={(_, value) => setSelectedWorkspace(value)} value={selectedWorkspace}
                                    getOptionLabel={o => o.name!} renderInput={(props) =>
                                        <TextField label="Workspace" {...props} />
                                    } />
                            </Grid>
                            <Grid size="grow" sx={{ minWidth: "20rem" }}>
                                <Autocomplete options={campaigns.filter(c => c.workspace_id === selectedWorkspace?.id)}
                                    loading={campaigns.length === 0} disabled={campaigns.length === 0 && !selectedWorkspace}
                                    onChange={(_, value) => setSelectedCampaign(value)} value={selectedCampaign}
                                    getOptionLabel={o => o.name!}
                                    renderInput={(props) =>
                                        <TextField error={!!campaignError} label="Campaña" {...props} />
                                    } />
                            </Grid>
                            {campaignError &&
                                <Grid size={12}>
                                    <FormErrorMessage>{campaignError}</FormErrorMessage>
                                </Grid>
                            }
                        </Grid>
                    </Stack>
                </GenericPaper>
                <LeadForm campaignId={selectedCampaign?.id} formId="create-lead" setExternalLoading={setBtnLoading} hideButtons
                    onSubmit={onSubmit} setCampaignError={setCampaignError} />
            </Stack>
        </GenericContainer>
    )
}

//Convierte LeadFieldDetailed a LeadField
const detailedToNormalLeadField = (leadField: LeadFieldDetailed) => {
    let newFieldData: LeadField = {
        ...leadField
    }
    if (leadField.nomenclator) newFieldData = {
        ...newFieldData,
        nomenclator_id: leadField.nomenclator.id
    }
    if (leadField.related_campaign) newFieldData = {
        ...newFieldData,
        related_campaign_id: leadField.related_campaign.id
    }
    return newFieldData as LeadField
}

interface SimulateProps {
    campaign: Campaign,
    leadFields: LeadFieldDetailed[],
    onCancel: () => void,
    modalProps: {
        openModalId: string | undefined;
        handleOpen: (idModal: string) => void;
        handleClose: () => void;
    }
}
export const SimulateLeadFormModal = ({ campaign, leadFields, onCancel, modalProps }: SimulateProps) => {

    const [btnLoading, setBtnLoading] = useState(false)

    const onSubmit = useCallback((data: FormData) => {
        return simulateCreateLead(data)
            .then(() => showToast(`Formulario enviado con éxito`))
    }, [])

    //Convierte arreglo de LeadFieldDetailed a arreglo de LeadField
    const formattedLeadFields: LeadField[] = useMemo(() => {
        if (!leadFields) return []
        return leadFields
            .filter(leadField => leadField.active)
            .map(leadField => detailedToNormalLeadField(leadField))
    }, [leadFields])
    console.log(formattedLeadFields)
    return (
        <GenericModal {...modalProps} idModal="simulateLead" buttonText='Vista previa' maxWidth="xl" fullWidth
            btnProps={{ actionType: "DETAILS", variant: "outlined", color: "secondary", onlyTooltip: true }} sx={{ minWidth: "80vw" }} >
            <ModalContentWrapper icon={ACTION_ICONS.DETAILS} iconColor="primary"
                title="Simulación de Nuevo Lead"
                subtitle={`Campaña "${campaign.name}"`}
                actions={
                    <ButtonGroup sx={{ alignSelf: "end" }}>
                        {onCancel && <CommonButton actionType="CLOSE" variant="outlined" color="error"
                            onClick={onCancel} disabled={btnLoading}>Cancelar</CommonButton>}
                        {campaign.id &&
                            <CommonButton actionType="DETAILS" loading={btnLoading} form={`simulate-lead-${campaign.id}`}
                                type="submit" variant="contained">Validar Formulario</CommonButton>}
                    </ButtonGroup>
                }>
                <LeadForm campaignId={campaign.id} existingLeadFields={formattedLeadFields} setExternalLoading={setBtnLoading}
                    onSubmit={onSubmit} submitBtnLabel="Validar" formId={`simulate-lead-${campaign.id}`} hideButtons />
            </ModalContentWrapper>
        </GenericModal>

    )
}

export const UpdateLeadFormPage = () => {

    const { hasPermission } = useUserContext()
    const { id } = useParams()
    const [lead, setLead] = useState<LeadDetailed | null>(null)
    const nav = useNavigate()

    usePageTitle(lead && `${getLeadTitleArray(lead).join(" ")} | Editar Lead`)

    const [btnLoading, setBtnLoading] = useState(false)

    useEffect(() => {
        if (!id) return
        getLead(id).then(setLead)
    }, [id])

    //Formatea LeadFieldValue para el formulario.
    const formattedLeadValues: LeadFieldValue[] = useMemo(() => {
        if (!lead || !lead.field_values) return []
        return (
            lead.field_values
                .filter(value => value.active && value.field.active)
                .map(fieldValue => {
                    const newFieldData = detailedToNormalLeadField(fieldValue.field)
                    return ({ ...fieldValue, field: newFieldData }) as LeadFieldValue
                })
        )
    }, [lead])

    //Convierte arreglo de LeadFieldDetailed a arreglo de LeadField
    const formattedLeadFields: LeadField[] = useMemo(() => {
        if (!formattedLeadValues) return []
        return formattedLeadValues.map(leadField => leadField.field)
    }, [formattedLeadValues])

    const onSubmit = useCallback((data: FormData) => {
        return updateLead(data, lead!.id)
            .then(lead => {
                showToast(`El lead fue modificado con éxito`)
                nav(`/leads/${lead.id}`)
            })
    }, [nav, lead])

    const leadTitle = useMemo(() => {
        if (!lead) return "Lead no Encontrado"
        return getLeadTitleArray(lead).join(" ")
    }, [lead])

    if (lead && lead.campaign_id) return (
        <GenericContainer containerSize="lg" noPaper>
            <Stack spacing={3}>
                <GenericPaper>
                    <GenericPaperColoredSection color="primary" isFirst isLast>
                        <Stack direction="row" spacing={2} useFlexGap
                            sx={{ alignItems: "center", justifyContent: "space-between" }}>
                            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                                <CustomAvatar color="primary">{ACTION_ICONS.MODIFY}</CustomAvatar>
                                <Typography variant="h1">{`Modificar Lead: ${leadTitle}`}</Typography>
                            </Stack>
                            <ButtonGroup sx={{ alignSelf: "end" }}>
                                <CommonButton actionType="CLOSE" variant="outlined" color="error" loading={btnLoading}
                                    component={Link} to={`/leads/${lead.id}`}>Cancelar</CommonButton>
                                {lead.campaign_id && hasPermission("lead:update") &&
                                    <CommonButton actionType="MODIFY" variant="contained" loading={btnLoading}
                                        type="submit" form={`update-lead-${lead.id}`}>Guardar</CommonButton>
                                }
                            </ButtonGroup>
                        </Stack>
                    </GenericPaperColoredSection>
                </GenericPaper>
                <LeadForm existingValues={formattedLeadValues} existingLeadFields={formattedLeadFields} setExternalLoading={setBtnLoading}
                    campaignId={lead.campaign_id} onSubmit={onSubmit} formId={`update-lead-${lead.id}`} hideButtons />
            </Stack>
        </GenericContainer >
    )
}