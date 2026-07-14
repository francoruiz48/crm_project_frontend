import { useCallback, useEffect, useMemo, useState } from "react"
import { CustomTimelineItem } from "shared/ui/lists/CustomTimelineItem"
import { CustomListItemAvatar } from "shared/ui/lists/CustomListItem"
import PaginationComponent from "shared/ui/lists/PaginationComponent"
import { MetadataShort } from "shared/ui/details/DetailsMetadata"
import LoadingScreenWrapper from "src/components/ui/feedback/LoadingScreen"
import CustomChip from "shared/ui/details/CustomChip"
import { useListPagination } from "src/hooks/useListPagination"
import { useLoading } from "src/hooks/useLoading"
import type { ColorTypes } from "src/types/mui-theme.d"
import type { Paginable } from "src/types/shared"
import type { LeadAudit, LeadDetailed } from "src/types/leads"
import { getAudit } from "./leadActivitiesService"
import { showCommonErrorToast } from "src/utils/feedback"
import { Avatar, Box, Button, Card, CardActionArea, CardActions, CardContent, CardHeader, Collapse, Divider, Stack, Typography } from "@mui/material"
import { timelineItemClasses } from "@mui/lab/TimelineItem"
import Timeline from '@mui/lab/Timeline';
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import EditIcon from "@mui/icons-material/Edit"
import AddIcon from "@mui/icons-material/Add"
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ContactPageIcon from '@mui/icons-material/ContactPage';

const MAX_ITEMS_NUM = 3

export const LeadAuditList = ({ lead, reloadAudit }: { lead: LeadDetailed, reloadAudit: number }) => {

  const [audit, setAudit] = useState<Paginable<LeadAudit> | null>(null)

  const { fetchPage, pageSize, pageComponentProps } = useListPagination(audit, 8)

  const fetchAuditList = useCallback((leadId: number, fetchPage: number, pageSize: number) => {
    return getAudit({ lead_id: leadId, page: fetchPage, page_size: pageSize })
      .then(setAudit)
      .catch(e => showCommonErrorToast(e))
  }, [])

  const { fnWithLoading: fetchAuditLoad, loading } = useLoading(fetchAuditList)

  useEffect(() => {
    if (!lead.id) return
    fetchAuditLoad(lead.id, fetchPage, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, fetchPage, pageSize])

  //Recarga cuando hay un cambio. No realiza cuando reloadAudit === 0 (Primera carga).
  useEffect(() => {
    if (!lead.id) return
    if (reloadAudit === 0) return
    fetchAuditLoad(lead.id, fetchPage, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadAudit])


  const [showItems, setShowItems] = useState<number>(0)

  const [showMoreItems, setShowMoreItems] = useState<boolean>(false)

  const handleShowItems = (idx: number) => {
    setShowItems(idx)
    setShowMoreItems(false)
  }

  return (
    <LoadingScreenWrapper loading={loading}>
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Timeline sx={{
          flexGrow: 1,
          [`& .${timelineItemClasses.root}:before`]: {
            flex: 0,
            padding: 0,
          },
        }}>
          {audit?.items.map((item, idx) => {
            return (
              <CustomTimelineItem selected={idx === showItems} last={idx === audit.items.length - 1} key={item.id}>
                <Card raised>
                  <CardActionArea onClick={() => handleShowItems(idx)} title="Ver detalle">
                    <LeadAuditHeader activityType={item.activity_type}
                      message={item.details.message ?? item.details.notes ??
                        (item.details?.changes && `${Object.values(item.details?.changes ?? {}).length} cambios`)} />
                  </CardActionArea>
                  <Collapse in={idx === showItems} timeout="auto" unmountOnExit>
                    <Divider />
                    {item?.details?.changes &&
                      <CardContent sx={{ py: 1 }}>
                        <Stack spacing={1} useFlexGap sx={{ alignItems: "start" }}>
                          {Object.entries(item.details.changes).map(([field_id, change], idx) => {
                            if (!showMoreItems && idx >= MAX_ITEMS_NUM) return null

                            return (
                              <Stack spacing={1} key={`audit-${item.id}-${field_id}`} sx={{ alignItems: "start" }}>
                                <Typography variant="body2" sx={{ fontWeight: "bold" }}>{change.field_name}:</Typography>
                                <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap", px: 1, alignItems: "center" }}>
                                  <Box>
                                    <LeadAuditValue value={change.old_value} id={item.id} color="error" size="small" fieldName={change.field_name} />
                                  </Box>
                                  <ArrowForwardIcon fontSize="small" />
                                  <Box>
                                    <LeadAuditValue value={change.new_value} id={item.id} color="success" size="small" fieldName={change.field_name} />
                                  </Box>
                                </Stack>
                              </Stack>
                            )
                          })}
                          {!showMoreItems && Object.values(item.details.changes)?.length > MAX_ITEMS_NUM &&
                            <Button sx={{ mx: "auto" }} onClick={() => setShowMoreItems(true)}>Ver más</Button>
                          }
                        </Stack>
                      </CardContent>
                    }
                    {item?.details?.to_state_id && item?.details?.from_state_id &&
                      <CardContent sx={{ py: 1 }}>
                        <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap", px: 1, alignItems: "center" }}>
                          <Box>
                            <LeadAuditValue value={item.details.from_state_name ?? item.details.from_state_id}
                              id={item.id} color={item.details.from_state_color ?? "secondary"} size="small" />
                          </Box>
                          <ArrowForwardIcon fontSize="small" />
                          <Box>
                            <LeadAuditValue value={item.details.to_state_name ?? item.details.to_state_id}
                              id={item.id} color={item.details.to_state_color ?? "primary"} size="small" />
                          </Box>
                        </Stack>
                      </CardContent>
                    }
                    {item.activity_type === "CONTACT_STATE_CHANGED" &&
                      <CardContent sx={{ py: 1 }}>
                        <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap", px: 1, alignItems: "center" }}>
                          <Box>
                            <LeadAuditValue value={item.details.from_contact_state_name ?? item.details.from_contact_state_id ?? null}
                              id={item.id} color={item.details.from_contact_state_color ?? "secondary"} size="small" />
                          </Box>
                          <ArrowForwardIcon fontSize="small" />
                          <Box>
                            <LeadAuditValue value={item.details.to_contact_state_name ?? item.details.to_contact_state_id}
                              id={item.id} color={item.details.to_contact_state_color ?? "primary"} size="small" />
                          </Box>
                        </Stack>
                      </CardContent>
                    }
                    {item.activity_type === "LEAD_REASSIGNED" &&
                      <CardContent sx={{ py: 1 }}>
                        <Stack spacing={1} sx={{ alignItems: "start" }}>
                          {item.details.previous_team_id !== item.details.new_team_id &&
                            <Stack spacing={1} sx={{ alignItems: "start" }}>
                              <Typography variant="body2" sx={{ fontWeight: "bold" }}>Equipo:</Typography>
                              <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap", px: 1, alignItems: "center" }}>
                                <Box>
                                  <LeadAuditValue value={item.details.previous_team_name ?? item.details.previous_team_id ?? null}
                                    id={item.id} color="error" size="small" />
                                </Box>
                                <ArrowForwardIcon fontSize="small" />
                                <Box>
                                  <LeadAuditValue value={item.details.new_team_name ?? item.details.new_team_id ?? null}
                                    id={item.id} color="success" size="small" />
                                </Box>
                              </Stack>
                            </Stack>
                          }
                          {item.details.previous_user_id !== item.details.new_user_id &&
                            <Stack spacing={1} sx={{ alignItems: "start" }}>
                              <Typography variant="body2" sx={{ fontWeight: "bold" }}>Usuario Asignado:</Typography>
                              <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap", px: 1, alignItems: "center" }}>
                                <Box>
                                  <LeadAuditValue value={item.details.previous_user_name ?? item.details.previous_user_id ?? null}
                                    id={item.id} color="error" size="small" />
                                </Box>
                                <ArrowForwardIcon fontSize="small" />
                                <Box>
                                  <LeadAuditValue value={item.details.new_user_name ?? item.details.new_user_id ?? null}
                                    id={item.id} color="success" size="small" />
                                </Box>
                              </Stack>
                            </Stack>
                          }
                        </Stack>
                      </CardContent>
                    }
                    <Divider />
                    <CardActions sx={{ py: .5 }}>
                      <Stack direction="row" spacing={.5} sx={{ alignItems: "center", justifyContent: "end", ml: "auto" }}>
                        <WatchLaterIcon fontSize="small" />
                        <MetadataShort metadata={item} noIcon containerProps={{ sx: { marginRight: ".5rem" } }} />
                      </Stack>
                    </CardActions>
                  </Collapse>
                </Card>
              </CustomTimelineItem>
            )
          })}
        </Timeline>
        <PaginationComponent {...pageComponentProps} />
      </Stack >
    </LoadingScreenWrapper>
  )
}

interface ActivityInfoProps {
  icon: React.ReactNode,
  color: ColorTypes,
  title: string
}

const LeadAuditHeader = ({ activityType, message }: { activityType?: string, message?: string }) => {

  const activityInfo = useMemo<ActivityInfoProps>(() => {
    switch (activityType) {
      case "FIELDS_UPDATED": return (
        { icon: <EditIcon />, color: "info", title: "Actualización de datos" }
      )
      case "LEAD_CREATED": return (
        { icon: <AddIcon />, color: "success", title: "Nuevo Lead" }
      )
      case "STATE_CHANGED": return (
        { icon: <AccountTreeIcon />, color: "warning", title: "Cambio de Estado" }
      )
      case "LEAD_REASSIGNED": return (
        { icon: <SwapHorizIcon />, color: "secondary", title: "Reasignación" }
      )
      case "CONTACT_STATE_CHANGED": return (
        { icon: <ContactPageIcon />, color: "primary", title: "Cambio de Estado de Contacto" }
      )
      default: return (
        { icon: <InfoOutlinedIcon />, color: "error", title: "Otro" }
      )
    }
  }, [activityType])

  return (
    <CardHeader sx={{ py: 1 }}
      avatar={<CustomListItemAvatar color={activityInfo?.color} >
        <Avatar variant="rounded" sx={{ height: "2rem", width: "2rem", mx: "auto" }}>
          {activityInfo?.icon}
        </Avatar>
      </CustomListItemAvatar>}
      title={<Typography variant="body2" sx={{ fontWeight: 600 }}>
        {activityInfo.title}
      </Typography>}
      subheader={message}
    />
  )
}


interface LeadAuditValueProps {
  value: string | number | number[] | null,
  fieldName?: string,
  size?: "small" | "medium" | "large" | "xlarge",
  color?: string,
  id: number
}

const showValue = (val: string | number | number[] | null, name: string) => {
  if (typeof val === "number") return val
  if (!val) return name
  return val.length > 50 ? name : val
}

const chipSx = {
  minWidth: "4rem",
  maxWidth: "12rem"
}

const LeadAuditValue = ({ value, fieldName, id, size = "medium", color = "primary" }: LeadAuditValueProps) => {
  if (!value) {
    return <CustomChip size={size} chipColor={color} label="---" title="Sin valor" sx={chipSx} />
  }
  if (typeof value === "number") {
    return <CustomChip size={size} chipColor={color} label={value} title={`${value}`} sx={chipSx} />
  }
  if (typeof value === "string") {
    return <CustomChip size={size} chipColor={color} label={showValue(value, fieldName!)} title={value} sx={chipSx} />
  }
  return <Stack spacing={.5} direction="row" useFlexGap sx={{ flexWrap: "wrap", direction: "row", justifyContent: "start" }}>
    {value?.map(item =>
      <CustomChip size={size} chipColor={color} key={`audit-value-${id}-${value}`} label={showValue(`${item}`, fieldName!)} title={`${item}`} sx={chipSx} />
    )}
  </Stack>
}