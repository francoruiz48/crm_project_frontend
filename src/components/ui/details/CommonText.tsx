import { Typography, type TypographyProps } from '@mui/material'
import { FONT_FAMILY, FONT_SIZES } from 'src/theme/typographyTheme'


interface CommonCRMTextProps extends TypographyProps {
    size?: keyof typeof FONT_SIZES
}

export const CommonCRMText = ({ children, color, size, variant, sx, ...props }: CommonCRMTextProps) => {

    const fontSize = size ? FONT_SIZES[size] : undefined

    return (
        <Typography color={color} variant={variant} sx={{ fontSize, ...sx }} {...props}>{children}</Typography>
    )
}

interface CommonCRMTitleProps extends TypographyProps {
    titleLevel: "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
    font?: "CRM" | "display"
}

export const CommonCRMTitle = ({ children, titleLevel, font = "CRM", color, sx, ...props }: CommonCRMTitleProps) => {

    return (
        <Typography variant={titleLevel} color={color} sx={{ fontFamily: font === "display" ? FONT_FAMILY.display : undefined, ...sx }}
            {...props}>
            {children}
        </Typography>
    )
}
