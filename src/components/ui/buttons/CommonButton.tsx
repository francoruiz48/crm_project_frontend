import { cloneElement, type ComponentProps, type ReactNode } from 'react';
import ACTION_ICONS, { type ActionType } from '../icons/ActionIcons';
import { ChipTooltip } from '../details/ChipTooltip';
import type { ColorTypes } from 'src/types/mui-theme.d';
import { Avatar, Stack, type AvatarProps, Button, type ButtonProps, Box } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles';


type MuiButtonProps = ComponentProps<typeof Button>;

export interface CommonBtnProps extends MuiButtonProps, ButtonProps {
    actionType?: ActionType,
    loading?: boolean,
    children?: ReactNode,
    //Se pasan en btnProps
    component?: React.ElementType,
    to?: string,
    onlyTooltip?: boolean,
    variableWidth?: boolean
}

/**Version de Button que aclara el texto en outlined (dark mode) para aumentar su legibilidad.  */
const LightButton = styled(Button)(({ theme, color = "primary", variant = "contained" }) => {
    if (!["outlined", "text"].includes(variant)) return []
    const styles = [
        theme.applyStyles('dark', {
            color: theme.palette[color as ColorTypes].light
        }
        )]
    if (variant === "outlined") {
        styles.push({
            backgroundColor: theme.alpha(theme.palette.background.paper, .7),
            backdropFilter: "blur(4px)",
        })
    }
    return styles
})
/**
 * Componente basado en Button, que agrega un ícono a su contenido segun el tipo de acción
 */
const CommonButton = ({ actionType = "NONE", onlyTooltip = false, loading = false, children, className, ...btnProps }: CommonBtnProps) => {

    const color = btnProps.color === "inherit" ? "primary" : (btnProps.color ?? "primary")

    const styleIcon = (actionType: ActionType) => {
        if (actionType === "NONE") return ACTION_ICONS.NONE
        if (actionType === "LOADING") return cloneElement(
            ACTION_ICONS[actionType], { size: (btnProps.size === "small" ? 18 : 24), sx: { ml: 0 } }
        )
        return cloneElement(
            ACTION_ICONS[actionType],
            { fontSize: btnProps.size }
        )
    }

    const actionIcon = loading ? styleIcon("LOADING") : styleIcon(actionType)

    return (
        <Stack direction="row" sx={{ justifyContent: "end" }} className={className}>
            {onlyTooltip ?
                (btnProps.disabled || loading) ?
                    <LightButton variant='contained' disabled={loading} {...btnProps}>
                        <Stack direction="row" sx={{ alignItems: "center", textAlign: "center" }}>
                            {actionIcon}
                        </Stack>
                    </LightButton>
                    :
                    <ChipTooltip title={children} color={color} >
                        <LightButton variant='contained' disabled={loading} {...btnProps}>
                            <Stack direction="row" sx={{ alignItems: "center", textAlign: "center" }}>
                                {actionIcon}
                            </Stack>
                        </LightButton>
                    </ChipTooltip>
                :
                <LightButton variant='contained' disabled={loading} {...btnProps}>
                    <Stack direction="row" sx={{ alignItems: "center", textAlign: "center" }}>
                        {actionIcon}
                        <Box>
                            {loading ? "Cargando" : children}
                        </Box>
                    </Stack>
                </LightButton>}
        </Stack>
    )
}

export default CommonButton


export interface CommonAvatarProps extends AvatarProps {
    actionType?: ActionType,
    color?: ColorTypes,
    size?: "small" | "medium",
    children?: ReactNode,
}
/**
 * Componente basado en Avatar, que agrega un ícono a su contenido segun el tipo de acción.
 * Se puede agregar un children en lugar de actionType
 */
export const CommonAvatar = ({ actionType = "NONE", color = "primary", size = "medium", children, ...props }: CommonAvatarProps) => {

    const { palette } = useTheme()

    const styleIcon = (actionType: ActionType) => {
        if (actionType === "NONE") return ACTION_ICONS.NONE
        if (actionType === "LOADING") return cloneElement(
            ACTION_ICONS[actionType], { size: (size === "small" ? 18 : 24), sx: { ml: 0 } }
        )
        return cloneElement(
            ACTION_ICONS[actionType],
            { fontSize: size }
        )
    }

    const sizeValue = size === "medium" ? 42 : 32

    return (
        <Avatar variant='rounded' sx={{ backgroundColor: palette[color].main, height: sizeValue, width: sizeValue, ...props.sx }} {...props}>
            <Stack spacing={.5} useFlexGap direction="row" sx={{ alignItems: "center", textAlign: "center" }}>
                {children ?? (actionType && styleIcon(actionType))}
            </Stack>
        </Avatar>
    )
}

