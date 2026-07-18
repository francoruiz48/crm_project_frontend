import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { LeadFieldSections } from "./LeadDetailsSections"
import { LeadTags } from "src/features/orgProperties/tags/LeadTagsMenu.tsx"
import { LeadActivities } from "../activities/LeadActivities"
import { DisableConfirmDialog } from "src/components/ui/feedback/ConfirmationDialog.tsx"
import LoadingScreenWrapper from "src/components/ui/feedback/LoadingScreen.tsx"
import GenericPaper from "shared/layout/container/GenericPaper"
import TitleAndActive from "shared/ui/details/TitleAndActive"
import CommonButton from "shared/ui/buttons/CommonButton"
import { CommonIconButton } from "shared/ui/buttons/CommonIconButton"
import { useLoading } from "src/hooks/useLoading.ts"
import type { LeadDetailed } from "src/types/leads.ts"
import type { Campaign } from "src/types/campaigns.ts"
import { disableLead, enableLead, getLead } from "../leadService.ts"
import { getCampaign } from "src/features/campaigns/campaignServices.ts"
import { getLeadTitleArray } from "../leadUtils.ts"
import { LeadTitleConfigSidebar } from "src/features/lead/leadTitleConfig/LeadTitleConfigSidebar"
import { showCommonErrorToast, showToast } from "src/utils/feedback.ts"
import { useLeadNavigation } from "../stores/LeadNavigationContext.tsx"
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom"
import { Grid, Typography, ButtonGroup, Stack, Breadcrumbs, Link, Box, CircularProgress, Fab, Slide, Tooltip, Button } from "@mui/material"
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import CallIcon from '@mui/icons-material/Call';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import { LeadDetailsState } from "./LeadDetailsState.tsx"
import type { LeadFieldDetailed } from "src/types/leadFields.ts"
import { UserAvatar } from "shared/ui/details/UserAvatar.tsx"
import { formatDate } from "src/utils/formatters.ts"

export const LeadDetailsLayout = () => {

    const { id } = useParams()

    const numId = useMemo(() => {
        if (id === undefined) return id
        const numId = parseInt(id)
        if (isNaN(numId)) return undefined
        return numId
    }, [id])

    const [lead, setLead] = useState<LeadDetailed | null>(null)
    const [campaign, setCampaign] = useState<Campaign | null>(null)
    const nav = useNavigate()
    const [lastMove, setLastMove] = useState<"next" | "prev" | false>(false)

    const { getNextLeadId, getPrevLeadId, isLoadingNavigation, isFirstItem, isLastItem, isNavigationValid } = useLeadNavigation();

    const handleNext = async () => {
        if (numId === undefined) return
        setLoading(true)
        setLastMove("next")
        const nextId = await getNextLeadId(numId);
        if (nextId) nav(`/leads/${nextId}`);
        else setLoading(false)
    };

    const handlePrev = async () => {
        if (numId === undefined) return
        setLoading(true)
        setLastMove("prev")
        const prevId = await getPrevLeadId(numId);
        if (prevId) nav(`/leads/${prevId}`);
        else setLoading(false)
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Evitamos navegar si el usuario está enfocado en un campo de texto
            const activeTag = document.activeElement?.tagName;
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
                return;
            }
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numId]);

    const fetchLeads = useCallback(async (numId: number) => {
        try {
            if (numId === undefined) return
            await getLead(numId).then(async (lead) => {
                setLead(prev => prev?.id !== lead.id ? lead : prev)
                if (!lead.campaign_id) return
                if (lead.campaign_id === campaign?.id) return
                await getCampaign(lead.campaign_id).then(setCampaign)
            })
        } catch (e) {
            showCommonErrorToast(e)
        }
    }, [campaign?.id])

    const { loading, setLoading, fnWithLoading } = useLoading(fetchLeads)

    useEffect(() => {
        if (!numId) return
        fnWithLoading(numId)
    }, [numId, fnWithLoading])

    const handleActive = (lead: LeadDetailed) => {
        if (!lead.active) return enableLead(lead.id).then(() => {
            showToast(`"${leadTitle}" habilitado con éxito`)
            setLead({ ...lead, active: true })
        })
        else return disableLead(lead.id).then(res => {
            if (res.action === "deleted") {
                showToast(`"${leadTitle}" eliminado definitivamente`)
                return nav(`/leads?workspace=${campaign?.workspace_id}&campaign=${campaign?.id}`)
            }
            else {
                showToast(`"${leadTitle}" deshabilitado con éxito`)
                return setLead({ ...lead, active: false })
            }
        })
    }

    const updateLeadInfo = (newLead: LeadDetailed, reloadAudits: boolean = false) => {
        setLead(newLead)
        if (reloadAudits) setReloadAudit(prev => prev + 1)
    }

    const leadTitle = useMemo(() => {
        if (!lead) return null
        return getLeadTitleArray(lead)
    }, [lead])

    //reconoce cambios para actualizar la lista de audit
    const [reloadAudit, setReloadAudit] = useState<number>(0)

    const setSlideDirection = useMemo(() => {
        if (!lastMove) return undefined
        if (lastMove === "next") return (isLoadingNavigation || loading) ? "right" : "left"
        else return (isLoadingNavigation || loading) ? "left" : "right"
    }, [lastMove, isLoadingNavigation, loading])

    const [isDeleting, setIsDeleting] = useState<LeadDetailed | null>(null)

    //Configuración de título
    const [titleConfigOpen, setTitleConfigOpen] = useState(false)

    const saveNewTitleValues = (newFields: Record<number, LeadFieldDetailed>) => {
        setLead(prevLead => {
            if (!prevLead) return prevLead
            const newFieldValues = prevLead.field_values.map(fv => {
                const updatedField = newFields[fv.field_id]
                if (!updatedField) return fv
                return { ...fv, field: updatedField }
            })
            return { ...prevLead, field_values: newFieldValues }
        })
    }

    //TO DO: Error de id no disponible
    if (numId === undefined) return <p>Id inválido</p>
    return (
        <LoadingScreenWrapper loading={loading && !lastMove}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'stretch', pb: 3 }}>
                {isNavigationValid(numId) &&
                    <Box sx={{ flexShrink: 0, width: "2.5rem", position: "relative" }}>
                        <Box sx={{ position: 'sticky', top: '50vh', transform: 'translateY(-50%)', zIndex: 10 }}>
                            <Fab
                                color="primary"
                                size="small"
                                onClick={handlePrev}
                                disabled={isLoadingNavigation || loading || isFirstItem(numId)}
                            >
                                {isLoadingNavigation || loading ? <CircularProgress size={24} color="inherit" /> : <ArrowBackIosNewIcon />}
                            </Fab>
                        </Box>
                    </Box>}

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Slide in={!loading && !isLoadingNavigation} appear={false} unmountOnExit
                        direction={setSlideDirection}>
                        <Stack spacing={2}>
                            {campaign &&
                                <Breadcrumbs aria-label="breadcrumb">
                                    <Link component={RouterLink} to={`/leads?workspace=${campaign?.workspace_id}&campaign=${campaign?.id}`}
                                        sx={{ underline: "hover", fontWeight: 600 }} >
                                        {campaign?.name}
                                    </Link>
                                    <Typography sx={{ color: 'text.primary' }}>{leadTitle?.join(" ")}</Typography>
                                </Breadcrumbs>}
                            {lead &&
                                <Grid container spacing={2}>
                                    <Grid size="grow" sx={{ minWidth: "20rem", flexGrow: 2 }} >
                                        <LeadInfo lead={lead} handleActive={() => setIsDeleting(lead)} leadTitle={leadTitle}
                                            updateLeadInfo={updateLeadInfo} onOpenTitleConfig={() => setTitleConfigOpen(true)} />
                                    </Grid>
                                    <Grid size="grow" sx={{ minWidth: "22rem", flexGrow: 3 }} component={GenericPaper} >
                                        <LeadActivities lead={lead} reloadAudit={reloadAudit} />
                                    </Grid>
                                </Grid >
                            }
                        </Stack >
                    </Slide>
                </Box>

                {isNavigationValid(numId) &&
                    <Box sx={{ flexShrink: 0, width: '40px' }}>
                        <Box sx={{ position: 'sticky', top: '50vh', transform: 'translateY(-50%)', zIndex: 10 }}>
                            <Fab
                                color="primary"
                                size="small"
                                onClick={handleNext}
                                disabled={isLoadingNavigation || loading || isLastItem(numId)}
                            >
                                {isLoadingNavigation || loading ? <CircularProgress size={24} color="inherit" /> : <ArrowForwardIosIcon />}
                            </Fab>
                        </Box>
                    </Box>}
            </Stack >
            <DisableConfirmDialog entity={isDeleting} clearEntity={() => setIsDeleting(null)}
                idModal="del-lead-det" onConfirm={() => handleActive(lead!)} entityTypeName="el lead" onlyDelete />
            <LeadTitleConfigSidebar open={titleConfigOpen} onClose={() => setTitleConfigOpen(false)} onSave={saveNewTitleValues}
                campaignId={campaign?.id} fieldValues={lead?.field_values} />
        </LoadingScreenWrapper>
    )
}

interface LeadInfoProps {
    lead: LeadDetailed,
    handleActive: (lead: LeadDetailed) => void,
    leadTitle: (string | undefined)[] | null,
    updateLeadInfo: (lead: LeadDetailed, reloadAudits?: boolean) => void
    onOpenTitleConfig?: () => void
}

export const LeadInfo = ({ lead, leadTitle, handleActive, updateLeadInfo, onOpenTitleConfig }: LeadInfoProps) => {

    const titleText = (leadTitle && leadTitle?.length > 0) ? leadTitle?.join(" ") : "Título no encontrado"

    return (
        <Stack spacing={2}>
            <GenericPaper elevation={0}>
                <Stack spacing={3} sx={{ alignItems: "start" }}>
                    <Stack direction="row" spacing={2} sx={{ width: "100%", alignItems: "center" }}>
                        <UserAvatar name={titleText} src={lead.picture_avatar_url || undefined} size={56} />
                        <Stack spacing={1} sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                <Typography sx={{ textOverflow: "ellipsis" }} variant="h1">
                                    {titleText}
                                </Typography>
                                {onOpenTitleConfig &&
                                    <CommonIconButton actionType="RENAME" title="Configurar título"
                                        onClick={onOpenTitleConfig} size="small" />
                                }
                            </Stack>
                        </Stack>
                    </Stack>
                    <LeadQuickActions />
                    <ButtonGroup fullWidth>
                        <CommonButton actionType={lead.active ? "DISABLE" : "ENABLE"} variant="outlined"
                            color={lead.active ? "error" : "success"} onClick={() => handleActive(lead)}>
                            {lead.active ? "Eliminar" : "Habilitar"}
                        </CommonButton>
                        <CommonButton actionType="MODIFY" variant="contained" color="primary"
                            component={RouterLink} to={`/leads/modify/${lead?.id}`}>
                            Modificar
                        </CommonButton>
                    </ButtonGroup>
                    <LeadTags lead={lead} updateLeadInfo={updateLeadInfo} />
                    <LeadDetailsState lead={lead} updateLeadInfo={updateLeadInfo} contactState={lead.contact_state} flowState={lead.current_state} />
                    <LeadMetaInfo lead={lead} />
                </Stack>
            </GenericPaper>
            <LeadFieldSections lead={lead} updateLeadInfo={updateLeadInfo} />
        </Stack>
    )
}

/**
 * Botones de acciones rápidas (Correo, Llamar, Reunión). Por ahora son solo visuales,
 * sin funcionalidad ni datos asociados (a definir más adelante de dónde sale el email/teléfono).
 */
const LeadQuickActions = () => {
    const actions: { label: string, icon: ReactNode }[] = [
        { label: "Correo", icon: <MailOutlineIcon fontSize="small" /> },
        { label: "Llamar", icon: <CallIcon fontSize="small" /> },
        { label: "Reunión", icon: <EventIcon fontSize="small" /> },
    ]
    return (
        <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            {actions.map(action =>
                <Button key={action.label} variant="outlined" color="primary"
                    fullWidth disabled startIcon={action.icon}>
                    {action.label}
                </Button>
            )}
        </Stack>
    )
}

/**
 * Meta-datos del lead: propietario (usuario/equipo asignado), creación y última actividad.
 * El backend todavía no expone `assigned_to_user`/`team` en el detalle del lead (solo en el
 * listado), así que por ahora se muestran solo las etiquetas de Propietario sin resolver
 * el nombre, como recordatorio para agregar ese dato en el backend más adelante.
 */
const LeadMetaInfo = ({ lead }: { lead: LeadDetailed }) => {
    const rows: { icon: ReactNode, label: string, value?: string }[] = [
        ...(lead.assigned_to_user_id ? [{ icon: <PersonIcon fontSize="small" />, label: "Usuario asignado" }] : []),
        ...(lead.team_id ? [{ icon: <GroupsIcon fontSize="small" />, label: "Equipo asignado" }] : []),
        { icon: undefined, label: "Creado", value: formatDate(lead.created_at, "date") },
        ...(lead.updated_at ? [{ icon: undefined, label: "Última actividad", value: formatDate(lead.updated_at, "date") }] : []),
    ]

    return (
        <Stack spacing={.5} sx={{ width: "100%" }}>
            {rows.map(row =>
                <Stack key={row.label} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {row.icon &&
                        <Tooltip title={row.label}>
                            <Stack sx={{ color: "text.secondary" }}>{row.icon}</Stack>
                        </Tooltip>
                    }
                    <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                    {row.value &&
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{row.value}</Typography>
                    }
                </Stack>
            )}
        </Stack>
    )
}