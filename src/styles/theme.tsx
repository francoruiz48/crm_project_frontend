import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  // Paleta de Colores (Tu configuración original)
  palette: {
    primary: {
      main: '#f64922ff', 
      light: '#f95b37ff', 
      dark: '#fe2f00ff',                      
      contrastText: '#FFFBFC',
    },
    secondary: {
      main: '#880044', 
      light: '#e30876ff', 
      dark: '#5d0330ff',                      
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