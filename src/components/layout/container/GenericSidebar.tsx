import { type ReactNode } from "react"
import { GenericSidebarContent, GenericSidebarHeader } from "./ColoredHeaders"
import GenericPaper from "./GenericPaper"
import { CommonIconButton } from "shared/ui/buttons/CommonIconButton"
import { Drawer, Stack, useMediaQuery, useTheme, type DrawerProps, Typography, Box, styled, type StackProps, alpha } from "@mui/material"
import { CustomAvatar, CustomAvatarEnabled } from "src/components/ui/details/CustomAvatar"

const SidebarPaper = styled(GenericPaper)({ padding: 0 })

interface GenericSidebarProps extends DrawerProps {
    isSidebarOpen?: boolean,
    closeSidebar: () => void,
    children: ReactNode,
    sidebarWidth?: string,
    // Si se pasa, el botón de cerrar deja de flotar solo y se muestra junto a estas acciones,
    // dentro de una franja fina con fondo (para no quedar "en el aire" sobre el contenido). Si no
    // se pasa, el cierre sigue flotando exactamente igual que antes (comportamiento sin cambios
    // para el resto de los sidebars que ya usan este componente).
    headerActions?: ReactNode
}
export const GenericSidebar = ({ isSidebarOpen = false, closeSidebar, children, sidebarWidth, headerActions, ...props }: GenericSidebarProps) => {

    const theme = useTheme()

    const mdScreen = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Drawer
            open={isSidebarOpen}
            onClose={closeSidebar}
            anchor={mdScreen ? "bottom" : "right"}
            slotProps={{
                paper: {
                    component: SidebarPaper,
                    "data-noborder": true,
                    elevation: 0,
                    sx: [{
                        minHeight: '100vh',
                        width: sidebarWidth ?? '40rem',
                        height: "100%",
                        position: "fixed",
                        borderLeft: `1px solid ${theme.palette.divider}`,
                        borderRadius: 0,
                        [theme.breakpoints.down('md')]: {
                            width: '100vw',
                            borderLeft: "none",
                        },
                    },
                    theme.applyStyles("light", {
                        backgroundColor: theme.palette.contrast[50]
                    })]
                }
            }}
            sx={{ zIndex: 1202 }}
            {...props}
        >
            {headerActions ?
                <Stack direction="row" spacing={1} sx={{
                    position: "absolute", top: 0, left: 0, right: 0, zIndex: 1,
                    alignItems: "center", justifyContent: "space-between",
                    minHeight: "3.25rem", px: "1.25rem",
                    backgroundColor: alpha(theme.palette.background.paper, 0.9),
                    backdropFilter: "blur(6px)",
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}>
                    <Stack direction="row" spacing={0.5}>{headerActions}</Stack>
                    <CommonIconButton actionType="CLOSE" title="Cerrar" onClick={closeSidebar} />
                </Stack>
                :
                <CommonIconButton actionType="CLOSE" title="Cerrar" onClick={closeSidebar}
                    sx={{ position: "absolute", top: "3rem", right: "2rem", transform: "translateY(-50%)" }} />
            }
            {children}
        </Drawer >
    )
}

interface SidebarContentWrapperProps {
    title?: ReactNode,
    subtitle?: ReactNode,
    actions?: ReactNode,
    children?: ReactNode,
    //Header
    active?: boolean,
    icon?: ReactNode,
    iconColor?: string
    ringColor?: string
    avatarTooltip?: string
}
/**Wrapper que le agrega al contenido de un sidebar un header formateado.
 * Si se asigna actions, se muestran en un footer, si no, se deja solo el contenido.
 */
export const SidebarContentWrapper = ({ title, subtitle, actions, children,
    active, icon, iconColor, ringColor, avatarTooltip }: SidebarContentWrapperProps) => {

    const headerColor = (
        active !== undefined ?
            (ringColor ?? (active ? "success" : "error")) :
            iconColor
    )
    return (
        <Stack sx={{ height: "100%" }} useFlexGap>
            <GenericSidebarHeader color={headerColor} >
                <Stack direction="row" spacing={2} sx={{ height: "100%", width: "100%", alignItems: "center" }}>
                    {active !== undefined ?
                        <CustomAvatarEnabled active={active}
                            overrideIcon={icon} overrideColor={iconColor}
                            overrideRingColor={ringColor} overrideTooltip={avatarTooltip} />
                        :
                        <CustomAvatar ring color={iconColor} ringColor={ringColor} tooltipText={avatarTooltip}>{icon}</CustomAvatar>
                    }
                    <Stack>
                        <Typography variant="subtitle2" color="textSecondary"
                            sx={{ textTransform: "uppercase", fontWeight: "bold" }} >{subtitle}</Typography>
                        <Typography variant="h2" >{title}</Typography>
                    </Stack>
                </Stack>
            </GenericSidebarHeader >
            <GenericSidebarContent >
                {actions ?
                    <SidebarContentActionsWrapper actions={actions}>
                        {children}
                    </SidebarContentActionsWrapper>
                    : children}
            </GenericSidebarContent >
        </Stack >
    )
}

interface SidebarContentActionsWrapperProps extends StackProps {
    actions?: ReactNode,
    unstyled?: boolean,
    children: ReactNode
}

/**Contenedor que permite formatear el contenido solo de un Sidebar, sin el header.
 * Sirve como un contenedor utilizable incluso fuera de un sidebar, ya que no afecta el contenido.
 * @param unstyled fuerza que no se muestre el estilo común. Ejemplo: formulario reutilizable para sidebar, y fuera del mismo
 * Caso: NomenclatorItemForm, para reutilizar el formulario como inline, sin perder el estilo de sidebar
 */
export const SidebarContentActionsWrapper = ({ actions, unstyled = false, children, ...props }: SidebarContentActionsWrapperProps) => {
    return (
        <Stack sx={{ height: "100%" }} {...props}>
            <Box className={!unstyled ? "sidebar-content" : undefined}>
                {children}
            </Box>
            {actions &&
                <Box className={!unstyled ? "sidebar-footer" : undefined}>{actions}</Box>}
        </Stack>
    )
}
