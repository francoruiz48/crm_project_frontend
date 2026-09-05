import { useCallback, useEffect, useState } from 'react'
import { useUserContext } from 'src/stores/UserContext'
import { UpdateCampaignFormSidebar } from './CampaignForms'
import { LeadFieldList } from '../leadFields/LeadFieldList'
import ContainerWithSidebar from 'shared/layout/container/GenericContainer'
import { EntityConfirmDialog } from 'src/components/ui/feedback/EntityConfirmDialog'
import HandleActiveButton from 'shared/ui/buttons/HandleActiveButton'
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen'
import GenericPaper from 'shared/layout/container/GenericPaper'
import DetailsMetadata from 'shared/ui/details/DetailsMetadata'
import TitleAndActive from 'shared/ui/details/TitleAndActive'
import CommonButton from 'shared/ui/buttons/CommonButton'
import { useSidebar } from 'src/hooks/useSidebar'
import { useEntityActionManager } from 'src/hooks/useEntityActionManager'
import { useLoading } from 'src/hooks/useLoading'
import type { CampaignDetailed } from 'src/types/campaigns'
import { getCampaign } from './campaignServices'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { Typography, ButtonGroup, Link, Breadcrumbs, Stack, Chip } from '@mui/material'
import { GenericPaperColoredSection } from 'src/components/layout/container/ColoredHeaders'
import { LeadTitleConfigSidebar } from 'src/features/lead/leadTitleConfig/LeadTitleConfigSidebar'
import { usePageTitle } from 'src/hooks/usePageTitle'

export const CampaignDetails = () => {
    const { id } = useParams()
    const { hasPermission } = useUserContext()
    const [campaign, setCampaign] = useState<CampaignDetailed | null>(null)

    usePageTitle(campaign && `${campaign.name} | Detalle de Campaña`)

    const { sidebarMode, handleSidebar, closeSidebar } = useSidebar<CampaignDetailed>("id")

    const fetchCmpDetails = useCallback((id: string) => (
        getCampaign(id).then(res => {
            setCampaign(res)
        })), [])

    const { fnWithLoading: fetchCmpLoad, loading } = useLoading(fetchCmpDetails)

    useEffect(() => {
        closeSidebar()
        if (!id) return
        fetchCmpLoad(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    //Define como actualizar la lista dependiendo de la acción realizada. 
    // Para CREATE se vuelve a hacer fetch de la página para no arruinar la paginación
    const updateCampaignData = useCallback((entity: CampaignDetailed) => {
        if (!campaign) return
        return setCampaign(entity)
    }, [campaign])

    // Acciones de deshabilitar/habilitar centralizadas (estrategia SOFT_DELETE_HARD_OPT de
    // Campaign → toggle con desactivación explícita). Refetch del detalle al terminar.
    const actions = useEntityActionManager<CampaignDetailed>({
        modelName: "Campaign",
        entityTypeName: "la campaña",
        onSuccess: () => id && fetchCmpLoad(id),
    })

    const [titleConfigOpen, setTitleConfigOpen] = useState(false)

    return (
        <LoadingScreenWrapper loading={loading}>
            <ContainerWithSidebar isSidebarOpen={Boolean(sidebarMode)} closeSidebar={closeSidebar}
                containerSize="xl" sidebarWidth='45rem' noPaper
                sidebarComponent={campaign &&
                    <UpdateCampaignFormSidebar existingCmp={campaign} closeSidebar={closeSidebar} updateCampaignData={updateCampaignData} />}
            >
                <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                    <Link component={RouterLink} to="/campaigns" underline="hover" color="inherit">
                        Espacios de Trabajo
                    </Link>
                    {campaign &&
                        <Typography sx={{ color: 'text.primary' }}>{campaign.name}</Typography>}
                </Breadcrumbs>
                <Stack spacing={3}>
                    <GenericPaper>
                        <Stack spacing={2}>
                            {campaign &&
                                <GenericPaperColoredSection isFirst color={campaign.active ? "success" : "error"}>
                                    <Stack direction="row" spacing={2} useFlexGap sx={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                                        <TitleAndActive active={campaign.active} >
                                            <Stack>
                                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                                    <Typography variant="h1">{campaign.name}</Typography>
                                                    <Chip label={campaign.is_public ? "Pública" : "Privada"} size="small"
                                                        color={campaign.is_public ? "default" : "warning"} variant="outlined" />
                                                </Stack>
                                                {campaign.description &&
                                                    <Typography variant="body1" color="textSecondary">{campaign.description}</Typography>}
                                            </Stack>
                                        </TitleAndActive>
                                        <Stack spacing={2} direction="row" useFlexGap sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", ml: "auto" }}>
                                            <ButtonGroup sx={{ marginLeft: "auto" }}>
                                                {hasPermission("lead:view") &&
                                                    <CommonButton component={RouterLink} variant='outlined' to={`/leads?workspace=${campaign.workspace_id}&campaign=${campaign.id}`}
                                                        actionType="LIST" onlyTooltip color="secondary">Ver Leads</CommonButton>
                                                }
                                                {hasPermission("lead_field:update") &&
                                                    <CommonButton onClick={() => setTitleConfigOpen(true)} variant='outlined' color="secondary" actionType="RENAME" onlyTooltip>
                                                        Configurar título
                                                    </CommonButton>
                                                }
                                                {hasPermission("field_automation:view") &&
                                                    <CommonButton component={RouterLink} variant='outlined' color="secondary" to={`/automations/?campaign=${campaign.id}`}
                                                        actionType="AUTOMATE" onlyTooltip>Automatizaciones</CommonButton>
                                                }
                                                {actions.canToggle && hasPermission(campaign.active ? actions.deletePerm : actions.updatePerm) &&
                                                    <HandleActiveButton active={campaign.active} handleActive={() => actions.requestToggle(campaign)} onlyTooltip />
                                                }
                                                {hasPermission("campaign:update") &&
                                                    <CommonButton onClick={() => handleSidebar("UPDATE_CMP", null)} actionType="MODIFY" onlyTooltip>Modificar</CommonButton>
                                                }
                                            </ButtonGroup>
                                        </Stack>
                                    </Stack>
                                </GenericPaperColoredSection>
                            }
                            {campaign && <>
                                <DetailsMetadata entity={campaign} />
                            </>}
                        </Stack>
                    </GenericPaper>
                    {campaign &&
                        <GenericPaper>
                            <LeadFieldList campaign={campaign} cmpSidebarMode={sidebarMode} closeCmpSidebar={closeSidebar} />
                        </GenericPaper>}
                </Stack>
                <EntityConfirmDialog idModal="conf-delete-cmp-det" controller={actions} />
                <LeadTitleConfigSidebar open={titleConfigOpen} onClose={() => setTitleConfigOpen(false)} campaignId={campaign?.id} />
            </ContainerWithSidebar >
        </LoadingScreenWrapper >
    )
}
