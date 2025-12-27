import React, { useState } from 'react';
import Navbar from './navbar'; 
import { 
  Box, 
  Drawer, 
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';


const MainLayout: React.FC = () => {
  const theme = useTheme();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const drawerWidth = '250px'; 


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', backgroundColor: theme.palette.background.default }}>
      
      <Navbar onMenuClick={toggleDrawer} />

      <Drawer
          variant="temporary"
          anchor="left"
          open={isDrawerOpen}
          onClose={toggleDrawer}
          ModalProps={{ keepMounted: true }}
          BackdropProps={{ invisible: true }}
          PaperProps={{
            sx: {
              width: drawerWidth,
              mt: '64px',                 
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              boxSizing: 'border-box',
            }
          }}
        >

        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Menú</Typography>
          <List>
            <ListItem ><ListItemText primary="Elemento 1" /></ListItem>
            <ListItem ><ListItemText primary="Elemento 2" /></ListItem>
          </List>
        </Box>
      </Drawer>

      <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr",  // principal 75% - derecho 25%
            gap: 2,
            height: "100%",  // ocupa todo el alto disponible
            width: "100%",
            m: 1
          }}
        >

          {/* Columna Principal */}
          <Box
            sx={{
              border: "1px solid #d4cdcdc3",
              p: 2,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <Typography variant="h5" textAlign="center">
              Contenido Principal
            </Typography>

            <Outlet />
          </Box>

          {/* Columna Derecha */}
          <Box
            sx={{
              border: "1px solid #d4cdcdc3",
              p: 2,
              height: "100%",
            }}
          >
            <Typography variant="subtitle1" gutterBottom>
              Panel Derecho
            </Typography>
          </Box>

        </Box>
    </Box>
  );
};

export default MainLayout;