import { useState } from 'react';
import { LeadComments } from './LeadComments';
import { LeadAuditList } from './LeadAudit';
import { useUserContext } from 'src/stores/UserContext';
import { Box, Divider, Stack, Tab, Tabs, Typography } from '@mui/material'
import type { LeadDetailed } from 'src/types/leads';
import { LeadIndicators } from '../details/LeadIndicators';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{ height: "100%" }}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

export const LeadActivities = ({ lead, reloadAudit }: { lead: LeadDetailed, reloadAudit: number }) => {

  const { hasPermission } = useUserContext()
  const canViewComments = hasPermission("lead_comment:view")
  const canViewAudit = hasPermission("lead_activity_history:view")

  const [openTab, setOpenTab] = useState<number>(canViewComments ? 0 : 1)

  return (
    <Stack sx={{ height: "100%" }} spacing={3}>
      <LeadIndicators indicators={lead.indicators} />
      {lead.indicators && <Divider sx={{ opacity: .6 }} />}
      <Typography variant="h2">Actividades</Typography>
      <Stack sx={{ height: "100%" }} spacing={2}>
        <Tabs value={openTab} onChange={(_, val) => { setOpenTab(val) }} aria-label="activities tabs">
          {canViewComments && <Tab value={0} label="Comentarios" id="tab-comments" />}
          {canViewAudit && <Tab value={1} label="Auditoría" id="tab-audit" />}
        </Tabs>
        <Box sx={{ height: "100%" }}>
          {canViewComments &&
            <CustomTabPanel value={openTab} index={0}>
              <LeadComments leadId={lead.id} />
            </CustomTabPanel>
          }
          {canViewAudit &&
            <CustomTabPanel value={openTab} index={1}>
              <LeadAuditList lead={lead} reloadAudit={reloadAudit} />
            </CustomTabPanel>
          }
        </Box>
      </Stack>
    </Stack>
  )
}
