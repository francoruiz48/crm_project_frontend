import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MuiAppBar, { type AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import { styled, useColorScheme, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import { HeaderSearchBar } from 'features/search/GeneralSearchBar';
import { drawerWidth } from './Sidebar';
import UserInfo from './HeaderMenu';
import { Divider, Stack } from '@mui/material';
import MaterialUISwitch from './ThemeSlider';
import { CommonCRMTitle } from 'src/components/ui/details/CommonText';

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const HeaderBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  variants: [
    {
      props: ({ open }) => open,
      style: {
        marginLeft: `${drawerWidth}rem`,
        width: `calc(100% - ${drawerWidth}rem)`,
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
    },
  ],
}));

interface HeaderProps extends MuiAppBarProps {
  handleDrawerOpen: () => void,
  open: boolean;
}

export default function Header({ handleDrawerOpen, open }: HeaderProps) {

  const { setMode } = useColorScheme();
  const { palette } = useTheme();

  const handleMode = (darkMode: boolean) => {
    if (darkMode) return setMode("dark")
    else setMode("light")
  }

  return (
    <HeaderBar position="sticky" elevation={4} data-noborder open={open}  >
      <Toolbar >
        <IconButton size="large" edge="start" aria-label="open drawer"
          sx={[
            {
              marginRight: 5,
            },
            open && { display: 'none' },
          ]}
          onClick={handleDrawerOpen}
        >
          <MenuIcon />
        </IconButton>
        <CommonCRMTitle titleLevel='h3' font='display' noWrap color='primary'
          sx={{ display: { xs: 'none', sm: 'block' } }} >MUI</CommonCRMTitle>
        <Box sx={{ flexGrow: 1 }} />
        <HeaderSearchBar />
        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <MaterialUISwitch checked={palette.mode === "dark"}
            onChange={(_, checked) => handleMode(checked)} />
          <UserInfo />
        </Stack>
      </Toolbar>
      <Divider />
    </HeaderBar>
  );
}