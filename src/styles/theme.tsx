import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  // Paleta de Colores (Tu configuración original)
  palette: {
    primary: {
      main: '#5A7ACD', 
    },
    secondary: {
      main: '#FEB05D', 
    },
    contrast: {
      main: '#2B2A2A',
    },
    background: {
      default: '#F5F2F2', 
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
      fontSize: '2em',
      fontWeight: 700,
      paddingBlock:'.5em'
    },
    h2: {
      fontSize: '1.7em',
      fontWeight: 700,
      paddingBlock:'.5em'
    },
    h3: {
      fontSize: '1.37em',
      fontWeight: 700,
      paddingBlock:'.5em'
    },
    h4: {
      fontSize: '1.2em',
      fontWeight: 700,
      paddingBlock:'.5em'
    },
    h5: {
      fontSize: '1.03em',
      fontWeight: 700,
      paddingBlock:'.5em'
    },
    h6: {
      fontSize: '0.87rem',
      fontWeight: 700,
      paddingBlock:'.5em'
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