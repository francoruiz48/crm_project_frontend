import '@mui/material/styles';

export type ColorTypes = "primary" | "secondary" | "contrast" | "info" | "success" | "warning" | "error"

export const colorTypesArray = ["primary", "secondary", "contrast", "info", "success", "warning", "error"]

declare module '@mui/material/styles' {
  interface Palette {
    contrast: Palette['primary'];
  }
  interface PaletteOptions {
    contrast?: PaletteOptions['primary'];
  }
  interface PaletteColor {
    lighter: string;
    darker: string;
    50: string,
    100: string,
    200: string,
    300: string,
    400: string,
    500: string,
    600: string,
    700: string,
    800: string,
    900: string,

  }

  interface SimplePaletteColorOptions {
    lighter: string;
    darker: string;
    50: string,
    100: string,
    200: string,
    300: string,
    400: string,
    500: string,
    600: string,
    700: string,
    800: string,
    900: string,

  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    contrast: true;
  }
  interface ChipOwnProps {
    defaultColor?: ColorTypes;
    chipColor?: string | null,
    // Menor border-radius que el chip por defecto (.75rem) -- pensado para diferenciar
    // visualmente las etiquetas (tags) del resto de los chips (etapa, referencia, etc.).
    squared?: boolean,
  }
}
declare module '@mui/material/Chip' {
  interface ChipPropsSizeOverrides {
    small: true;
    medium: true;
    large: true;
    xlarge: true;
  }
}
declare module '@mui/material/LinearProgress' {
  interface LinearProgressProps {
    size?: "small" | "medium";
  }
}
declare module '@mui/material/ListItem' {
  interface ListItemOwnProps {
    isSelected?: boolean;
    alwaysShowSecondary?: boolean;
    color?: ColorTypes;
  }
}
declare module '@mui/material/ListItemAvatar' {
  interface ListItemAvatarProps {
    color?: ColorTypes;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    contrast: true;
  }
}

declare module '@mui/material/Paper' {
  interface PaperOwnProps {
    "data-noborder"?: true;
  }
}

declare module '@mui/material/Avatar' {
  interface AvatarOwnProps {
    "size"?: "small" | "medium";
  }
}
