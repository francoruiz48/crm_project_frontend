import { type ReactNode } from "react";
import { Box, Divider, IconButton, Stack } from "@mui/material";
import { styled, useTheme, type CSSObject, type Theme } from "@mui/material/styles";
import MuiDrawer from '@mui/material/Drawer';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Header from "./Header";
import Navbar from "./Navbar";
import { useLayoutSidebar } from "src/stores/LayoutSidebarContext";

export const drawerWidth = "15"; //rem

/************************************ Transición de apertura y cierre ****************************************/
const openedMixin = (theme: Theme): CSSObject => ({
    width: `${drawerWidth}rem`,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: `calc(${theme.spacing(7)} + 1px)`,
    [theme.breakpoints.up('sm')]: {
        width: `calc(${theme.spacing(8)} + 1px)`,
    },
});

const DrawerHeader = styled('div')(({ theme }) => ([{
    backgroundColor: theme.palette.contrast.light,
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 1),
    color: theme.palette.contrast.contrastText,
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
},
theme.applyStyles("dark", {
    backgroundColor: theme.palette.background.paper,

})]));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme }) => ([{
        width: `${drawerWidth}rem`,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        '& .MuiDrawer-paper': {
            backgroundColor: theme.palette.contrast.main,
            color: theme.palette.contrast.contrastText
        },
        variants: [
            {
                props: ({ open }) => open,
                style: {
                    ...openedMixin(theme),
                    '& .MuiDrawer-paper': openedMixin(theme),
                },
            },
            {
                props: ({ open }) => !open,
                style: {
                    ...closedMixin(theme),
                    '& .MuiDrawer-paper': closedMixin(theme),
                },
            },
        ],
    },
    theme.applyStyles("dark", {
        '& .MuiDrawer-paper': {
            backgroundColor: theme.palette.background.paper,
        },
    })])
);

/************************************ Componente ****************************************/

interface SidebarProps {
    children?: ReactNode
}

export default function LayoutSidebar({ children }: SidebarProps) {
    const theme = useTheme();
    // Antes era useState local -- ahora vive en Context (ver LayoutSidebarContext.tsx) para que
    // otras pantallas (ej. LeadDetailsSidebar) puedan ocultar el menú global cuando necesitan el
    // espacio.
    const { open, setOpen } = useLayoutSidebar();

    const handleDrawerOpen = () => {
        setOpen(true);
    };

    const handleDrawerClose = () => {
        setOpen(false);
    };

    return (
        <Stack sx={{ minHeight: "100vh", height: "100%", width: "100%", minWidth: 0 }}>
            <Header handleDrawerOpen={handleDrawerOpen} open={open} />
            <Stack direction="row" sx={{ flexGrow: 1, minHeight: 0, minWidth: 0, height: "100%" }}>
                <Drawer variant="permanent" open={open}
                    slotProps={{
                        paper: {
                            elevation: 1,
                            "data-noborder": true
                        }
                    }}>
                    <DrawerHeader >
                        <IconButton onClick={handleDrawerClose} color="inherit">
                            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                        </IconButton>
                    </DrawerHeader>
                    <Divider />
                    <Navbar open={open} />
                </Drawer>
                <Stack direction="row" sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box
                        component="main"
                        id="main-window"
                        sx={{ flexGrow: 1, p: 3, minWidth: 0 }}>
                        {children}
                    </Box>
                </Stack>
            </Stack>
        </Stack >
    );
}