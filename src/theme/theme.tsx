import { createTheme } from '@mui/material/styles';
import { darkTheme, lightTheme } from './themePalette';
import { FONT_FAMILY, textTheme } from './typographyTheme';
import { getBorderAlpha } from './paperUtils';

const theme = createTheme({
  colorSchemes: {
    light: {
      palette: lightTheme.palette
    },
    dark: {
      palette: darkTheme.palette
    }
  },
  shape: {
    borderRadius: ".5em",
  },
  // Tipografía
  typography: {
    fontFamily: FONT_FAMILY.body,
    ...textTheme.title,
    ...textTheme.variants
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '#root': {
          ...textTheme.root,
          fontOpticalSizing: "auto",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        sizeMedium: {
          padding: '.5rem 1rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          }
        }
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          marginBlock: ".25rem"
        }
      },
    },
    MuiInputBase: {
      defaultProps: {
        disableInjectingGlobalStyles: true,
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme, ownerState }) => {
          const elevation = ownerState.elevation ?? 0
          const borderAlpha = getBorderAlpha(elevation)
          return {
            ...theme.applyStyles("light", {
              '&:not([data-noborder])': {
                border: `1px solid ${theme.alpha(theme.palette.divider, borderAlpha)}`,
              }
            }),
            ...theme.applyStyles("dark", {
              '&:not([data-noborder])': {
                border: `1px solid ${theme.palette.divider}`,
                borderTop: `1px solid ${theme.alpha(theme.palette.divider, .3)}`,
                borderBottom: `1px solid ${theme.alpha(theme.palette.divider, .05)}`,
              }
            })
          }
        }
      }
    }
  },
});

export default theme;