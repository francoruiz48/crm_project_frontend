import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import { CircularProgress } from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import LowPriorityIcon from '@mui/icons-material/LowPriority';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload'
import TuneIcon from '@mui/icons-material/Tune'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ReplayIcon from '@mui/icons-material/Replay';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';

const ACTION_ICONS = {
    NONE: <></>,
    MODIFY: <EditIcon sx={{ display: "block" }} />,
    CLOSE: <CloseIcon sx={{ display: "block" }} />,
    CREATE: <AddIcon sx={{ display: "block" }} />,
    DISABLE: <DeleteIcon sx={{ display: "block" }} />,
    ENABLE: <RestoreFromTrashIcon sx={{ display: "block" }} />,
    DETAILS: <SearchIcon sx={{ display: "block" }} />,
    SAVE: <SaveOutlinedIcon sx={{ display: "block" }} />,
    FILTER: <FilterAltIcon sx={{ display: "block" }} />,
    OPTIONS: <SettingsInputComponentIcon sx={{ display: "block" }} />,
    SETTINGS: <SettingsIcon sx={{ display: "block" }} />,
    RETURN: <ArrowBackIcon sx={{ display: "block" }} />,
    LOGIN: <PersonIcon sx={{ display: "block" }} />,
    SIGNUP: <PersonAddIcon sx={{ display: "block" }} />,
    LIST: <FormatListBulletedIcon sx={{ display: "block" }} />,
    CHECK: <TaskAltIcon sx={{ display: "block" }} />,
    LOADING: <CircularProgress size={24} sx={{ display: "block" }} />,
    MINUS: <RemoveIcon sx={{ display: "block" }} />,
    REORDER: <LowPriorityIcon sx={{ display: "block" }} />,
    OPEN_LIST: <KeyboardArrowDownIcon sx={{ display: "block" }} />,
    CLOSE_LIST: <KeyboardArrowUpIcon sx={{ display: "block" }} />,
    DRAG: <DragIndicatorIcon sx={{ display: "block" }} />,
    RENAME: <DriveFileRenameOutlineIcon sx={{ display: "block" }} />,
    DUPLICATE: <ContentCopyIcon sx={{ display: "block" }} />,
    AUTOMATE: <AutoFixHighIcon sx={{ display: "block" }} />,
    DOWNLOAD: <DownloadIcon sx={{ display: "block" }} />,
    UPLOAD: <UploadIcon sx={{ display: "block" }} />,
    IMPORT: <UploadIcon sx={{ display: "block" }} />,
    PARAMETERS: <TuneIcon sx={{ display: "block" }} />,
    USER: <PersonIcon sx={{ display: "block" }} />,
    CALENDAR: <CalendarMonthIcon sx={{ display: "block" }} />,
    TIME: <AccessTimeIcon sx={{ display: "block" }} />,
    REPEAT: <ReplayIcon sx={{ display: "block" }} />,
    NAVIGATE: <OpenInNewIcon sx={{ display: "block" }} />,
    MENU: <MenuIcon sx={{ display: "block" }} />,
    CLOSE_MENU: <MenuOpenIcon sx={{ display: "block" }} />,
}

export type ActionType = keyof typeof ACTION_ICONS

export default ACTION_ICONS
