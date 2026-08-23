import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import LabelImportantIcon from '@mui/icons-material/LabelImportant';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import StoreIcon from '@mui/icons-material/Store';
import TuneIcon from '@mui/icons-material/Tune';
import LockIcon from '@mui/icons-material/Lock';
import GroupIcon from '@mui/icons-material/Group';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import CampaignIcon from '@mui/icons-material/Campaign';
import EditNoteIcon from '@mui/icons-material/EditNote';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';

const ROUTE_ICONS = {
    DASHBOARD: <DashboardIcon />,
    LEADS: <PersonIcon />,
    LEADFIELD: <EditNoteIcon />,
    CAMPAIGNS: <CampaignIcon />,
    WORKSPACES: <WorkIcon />,
    NOMENCLATORS: <LabelImportantIcon />,
    AUTOMATIONS: <AutoFixHighIcon />,
    WEB_FORMS: <DynamicFormIcon />,
    ORGANIZATIONS: <StoreIcon />,
    ORG_PROPERTIES: <TuneIcon />,
    ROLES: <LockIcon />,
    TEAMS: <GroupIcon />,
    ROUTING: <VpnKeyIcon />,
    AUDIT: <FindInPageIcon />,
}

export type RouteType = keyof typeof ROUTE_ICONS

export default ROUTE_ICONS
