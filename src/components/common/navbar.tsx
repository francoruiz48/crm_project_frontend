
import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { Link as RouterLink } from 'react-router-dom'; // Usamos Link de React Router

// Define las propiedades que podría recibir el Navbar (ej: una función para abrir un menú lateral)
interface NavbarProps {
  onMenuClick?: () => void;
}

// Estilos básicos de la AppBar que usarán los colores del tema
const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {

  const marginSize = 0.5;
  return (
    <Box sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}>
    <AppBar position="static" sx={{ mt: 0 }}> 
      <Toolbar>
        {/* Ícono de Menú (ej: para abrir un Sidebar en móvil) */}
        <IconButton
          size="large"
          edge="start"
          color="inherit" // 'inherit' hace que tome el color contrastText del color primario
          aria-label="menu"
          sx={{ mr: 2 }}
          onClick={onMenuClick}
        >
          <MenuIcon />
        </IconButton>

        {/* Título de la Aplicación */}
        <Typography 
          variant="h6" 
          component={RouterLink} // Usamos RouterLink para hacerlo clickeable
          to="/" // Ruta a la que te lleva el logo/título
          sx={{ 
            flexGrow: 1, // Hace que el título ocupe el espacio restante
            textDecoration: 'none', // Quita el subrayado del link
            color: 'inherit',
          }}
        >
          CRM
        </Typography>

        {/* Contenedor para los enlaces de navegación */}
        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
          {/* Botones de Navegación */}
          <Button color="inherit" component={RouterLink} to="/products">
            Productos
          </Button>
          <Button color="inherit" component={RouterLink} to="/users">
            Usuarios
          </Button>
          
          {/* Botón de Perfil/Cuenta */}
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            color="inherit"
            component={RouterLink} 
            to="/profile"
          >
            <AccountCircle />
          </IconButton>
        </Box>
        
        {/* Nota: En un proyecto grande, deberías tener un Drawer (menú lateral) 
           para mostrar los botones de navegación en dispositivos móviles (xs) */}
      </Toolbar>
    </AppBar>
    </Box>
  );
};

export default Navbar;