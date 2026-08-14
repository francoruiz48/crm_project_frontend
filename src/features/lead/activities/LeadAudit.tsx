import { useCallback, useEffect, useMemo, useState } from "react"
import { CustomTimelineItem } from "shared/ui/lists/CustomTimelineItem"
import PaginationComponent from "shared/ui/lists/PaginationComponent"
import LoadingScreenWrapper from "shared/ui/feedback/LoadingScreen"
import { OrderSearchMenu } from "shared/ui/lists/OrderMenu"
import CustomChip from "shared/ui/details/CustomChip"
import { useOrderSeachList } from "src/hooks/useOrderSearchLists"
import { useListPagination } from "src/hooks/useListPagination"
import { useLoading } from "src/hooks/useLoading"
import type { LeadAudit, LeadDetailed } from "src/types/leads"
import type { ColorTypes } from "src/types/mui-theme.d"
import type { Paginable } from "src/types/shared"
import { getAudit } from "./leadActivitiesService"
import { showCommonErrorToast } from "src/utils/feedback"
import { Box, Button, Card, CardActionArea, CardContent, CardHeader, Divider, ListItemAvatar, Stack, Typography } from "@mui/material"
import Timeline from '@mui/lab/Timeline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import EditIcon from "@mui/icons-material/Edit"
import AddIcon from "@mui/icons-material/Add"
import { NoItemsMessage } from "src/components/ui/lists/NoItemsMessage"
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ContactPageIcon from '@mui/icons-material/ContactPage';
import { timelineOppositeContentClasses } from "@mui/lab/TimelineOppositeContent"
import { CustomAvatar } from "src/components/ui/details/CustomAvatar"

const MAX_ITEMS_NUM = 3

const AUDIT_TYPES = {
  "FIELDS_UPDATED": { icon: <EditIcon />, color: "info", label: "Actualización de datos", value: "FIELDS_UPDATED" },
  "LEAD_CREATED": { icon: <AddIcon />, color: "success", label: "Lead Creado", value: "LEAD_CREATED" },
  "STATE_CHANGED": { icon: <AccountTreeIcon />, color: "warning", label: "Cambio de Etapa", value: "STATE_CHANGED" },
  "LEAD_REASSIGNED": { icon: <SwapHorizIcon />, color: "secondary", label: "Reasignación", value: "LEAD_REASSIGNED" },
  "CONTACT_STATE_CHANGED": { icon: <ContactPageIcon />, color: "primary", label: "Cambio de Estado", value: "CONTACT_STATE_CHANGED" },
  "DEFAULT": { icon: <InfoOutlinedIcon />, color: "error", label: "Otros", value: "DEFAULT" }
}

const SEARCH_AUDIT_FIELDS = [
  { name: "activity_type", label: "Tipo", searchOptions: Array.from(Object.values(AUDIT_TYPES)) },
]
const ORDER_AUDIT_FIELDS = [
  { name: "activity_type", label: "Tipo de Actividad" },
]

export const LeadAuditList = ({ lead, reloadAudit }: { lead: LeadDetailed, reloadAudit: number }) => {

  const [audit, setAudit] = useState<Paginable<LeadAudit> | null>(null)

  const { fetchPage, pageSize, pageComponentProps, goToPageOne } = useListPagination(audit, 8)
  const { fetchParams, changeHandlers } = useOrderSeachList("lead_audit", lead.id)

  const onOrderChange = useCallback((orderBy?: string, asc?: boolean) => {
    changeHandlers.handleOrderChange(orderBy, asc)
    goToPageOne()
  }, [changeHandlers, goToPageOne])

  const onSearchChange = useCallback((search?: string, searchField?: string) => {
    changeHandlers.handleSearchChange(search, searchField)
    goToPageOne()
  }, [changeHandlers, goToPageOne])

  const fetchAuditList = useCallback((leadId: number, fetchPage: number, pageSize: number) => {
    return getAudit({ lead_id: leadId, page: fetchPage, page_size: pageSize, ...fetchParams })
      .then(setAudit)
      .catch(e => showCommonErrorToast(e))
  }, [fetchParams])

  const { fnWithLoading: fetchAuditLoad, loading } = useLoading(fetchAuditList)

  useEffect(() => {
    if (!lead.id) return
    fetchAuditLoad(lead.id, fetchPage, pageSize)

  }, [lead.id, fetchPage, pageSize, fetchAuditLoad])

  //Recarga cuando hay un cambio. No realiza cuando reloadAudit === 0 (Primera carga).
  useEffect(() => {
    if (!lead.id) return
    if (reloadAudit === 0) return
    fetchAuditLoad(lead.id, fetchPage, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadAudit])



  const [showMoreItems, setShowMoreItems] = useState<boolean>(false)

  const handleShowItems = () => {
    setShowMoreItems(false)
  }

  return (
    <Stack spacing={2} sx={{ height: "100%" }}>
      <OrderSearchMenu
        searchOptions={SEARCH_AUDIT_FIELDS}
        orderOptions={ORDER_AUDIT_FIELDS}
        {...changeHandlers}
        handleSearchChange={onSearchChange}
        handleOrderChange={onOrderChange}
        noActive noUpdater
      />
      <LoadingScreenWrapper loading={loading}>
        {audit?.items && audit?.items.length > 0 ?
          <Stack spacing={2} sx={{ height: "100%" }}>
            <Timeline sx={{
              flexGrow: 1,
              [`& .${timelineOppositeContentClasses.root}`]: {
                flex: 0.1,
              }
            }}>
              {audit?.items.map((item, idx) => {
                return (
                  <CustomTimelineItem entity={item} selected last={idx === audit.items.length - 1} key={item.id}>
                    <Card raised>
                      <CardActionArea onClick={handleShowItems} title="Ver detalle">
                        <LeadAuditHeader activityType={item.activity_type}
                          message={item.details.message ?? item.details.notes ??
                            (item.details?.changes && `${Object.values(item.details?.changes ?? {}).length} cambios`)} />
                      </CardActionArea>
                      <Divider />
                      {item?.details?.changes &&
                        <CardContent sx={{ "&&": { py: 1 } }}>
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
                        <CardContent sx={{ "&&": { py: 1 } }}>
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
                        <CardContent sx={{ "&&": { py: 1 } }}>
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
                        <CardContent sx={{ "&&": { py: 1 } }}>
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
                          </Stack>
                        </CardContent>
                      }
                      {item.details.previous_user_id !== item.details.new_user_id &&
                        <CardContent sx={{ "&&": { py: 1 } }}>
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
                        </CardContent>
                      }
                    </Card>
                  </CustomTimelineItem>
                )
              })}
            </Timeline>
            <PaginationComponent {...pageComponentProps} />
          </Stack >
          :
          <NoItemsMessage emptyFetchMessage="No hay datos registrados al momento"
            search={fetchParams.search} genericSearchMsg />
        }
      </LoadingScreenWrapper >
    </Stack >
  )
}

interface ActivityInfoProps {
  icon: React.ReactNode,
  color: ColorTypes,
  label: string,
  value: string
}

const LeadAuditHeader = ({ activityType, message }: { activityType?: keyof typeof AUDIT_TYPES, message?: string }) => {

  const activityInfo = useMemo<ActivityInfoProps>(() =>
    (AUDIT_TYPES[activityType ?? "DEFAULT"] ?? AUDIT_TYPES.DEFAULT) as ActivityInfoProps
    , [activityType])

  return (
    <CardHeader sx={{ py: 1 }}
      avatar={<ListItemAvatar >
        <CustomAvatar color={activityInfo?.color} size="small" variant="rounded" sx={{ height: "2rem", width: "2rem", mx: "auto" }}>
          {activityInfo?.icon}
        </CustomAvatar>
      </ListItemAvatar>}
      title={<Typography variant="body2" sx={{ fontWeight: 600 }}>
        {activityInfo.label}
      </Typography>}
      subheader={message}
    />
  )
}


interface LeadAuditValueProps {
  value?: string | number | number[] | null,
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