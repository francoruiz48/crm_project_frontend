import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  // Paleta de Colores (Tu configuración original)
  palette: {
    primary: {
      main: '#60d3e2ff', 
      light: '#9de4faff', 
      dark: '#155580ff',                      
      contrastText: '#1b1b1bff',
    },
    secondary: {
      main: '#dd854bff', 
      light: '#f7a57fff', 
      dark: '#9e651bff',                      
      contrastText: '#FFFBFC',
    },
    contrast: {
      main: '#000000',
      light: '#333333',
      dark: '#000000',
      contrastText: '#FFFFFF',
    }
    ,
    background: {
      default: '#f8f9fa', 
      paper: '#ffffff', 
    },
  },

  // Tipografía
  typography: {
    fontFamily: [
      'Roboto', 
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    }
  },

  // AGREGADO IMPORTANTE: Estilos Globales
  components: {
    // 1. CssBaseline: Controla los estilos globales del HTML y Body
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          width: '100%',
          height: '100%',
        },
        body: {
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0,
        },
        '#root': {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
      },
    },
    // 2. Tus overrides de botones
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          }
        }
      },
    },
  },
});

export default theme;