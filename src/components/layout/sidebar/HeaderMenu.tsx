import React, { memo, useState } from 'react'
import { useUserContext } from 'src/stores/UserContext';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Button, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { UserAvatar } from 'src/components/ui/details/UserAvatar'
import { useTheme } from '@mui/material/styles';
import { AccountCircle, Check, Close, PersonOutlined, PersonAddOutlined } from '@mui/icons-material';
import MoreIcon from '@mui/icons-material/More';
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen';
import type { UserContextItems } from 'src/stores/UserContext';
import { InviteDialog } from 'src/features/organizations/InviteDialog';
import { showCommonErrorToast } from 'src/utils/feedback';
import type { Organization } from 'src/types/campaigns';

function useRoleLabel(user: UserContextItems["user"], activeOrg: UserContextItems["activeOrg"]) {
    if (!user) return ""
    if (user.is_superuser) return "Administrador"
    if (activeOrg) {
        const membership = user.organizations_access.find(a => a.organization_id === activeOrg.id)
        if (membership?.is_owner) return "Propietario"
    }
    return "Usuario"
}

const HeaderMenu = memo(() => {
    const nav = useNavigate()
    const [inviteOpen, setInviteOpen] = useState(false)

    const { user, logout, orgHeaderList, activeOrg, setActiveOrg, loadingOrgs, savedAccounts, switchAccount, removeSavedAccount } = useUserContext()

    const fullName = user ? [user.name, user.last_name].filter(Boolean).join(" ") : ""
    const roleLabel = useRoleLabel(user, activeOrg)

    // Solo owners y superusers pueden invitar (no aplica a Panel Global, is_system)
    const canInvite = user?.is_superuser || (
        activeOrg && user?.organizations_access.some(
            a => a.organization_id === activeOrg.id && a.is_owner
        )
    )

    const handleLogout = async () => {
        await logout()
        //Si logout() pasó a otra cuenta guardada, esto simplemente refresca la pantalla para esa cuenta;
        //si no quedaba ninguna, el usuario ya quedó sin sesión y el layout lo manda a /login solo.
        nav("/dashboard", { replace: true })
    }

    const handleOrgSwitch = (org: Organization) => {
        setActiveOrg(org)
        nav("/dashboard")
        handleMenuClose()
    }

    const handleAccountSwitch = async (userId: string) => {
        if (userId === user?.id) { handleMenuClose(); return }
        handleMenuClose()
        try {
            await switchAccount(userId)
            nav("/dashboard")
        } catch (e) {
            showCommonErrorToast(e, "No se pudo cambiar a esa cuenta, iniciá sesión de nuevo.")
        }
    }

    const handleRemoveAccount = (e: React.MouseEvent, userId: string) => {
        e.stopPropagation()
        removeSavedAccount(userId).catch(err => showCommonErrorToast(err, "No se pudo quitar la cuenta."))
    }


    const { palette } = useTheme();


    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState<null | HTMLElement>(null);

    const isMenuOpen = Boolean(anchorEl);
    const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setMobileMoreAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        handleMobileMenuClose();
    };

    const handleMobileMenuClose = () => {
        setMobileMoreAnchorEl(null);
    };

    const menuId = 'primary-search-account-menu';
    const renderProfileMenu = (
        <Menu anchorEl={anchorEl}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            id={menuId} keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={isMenuOpen}
            onClose={handleMenuClose}
        >
            <MenuItem>
                <ListItemText>Cuentas</ListItemText>
                <Divider />
            </MenuItem>
            {savedAccounts.map(acc => (
                <MenuItem dense key={acc.userId} onClick={() => handleAccountSwitch(acc.userId)}>
                    {acc.userId === user?.id &&
                        <ListItemIcon><Check /></ListItemIcon>
                    }
                    <ListItemText inset={acc.userId !== user?.id}
                        primary={[acc.name, acc.last_name].filter(Boolean).join(" ") || acc.email}
                        secondary={acc.userId !== user?.id ? acc.email : undefined} />
                    {acc.userId !== user?.id &&
                        <IconButton size="small" edge="end" title="Quitar cuenta" onClick={(e) => handleRemoveAccount(e, acc.userId)}>
                            <Close fontSize="small" />
                        </IconButton>
                    }
                </MenuItem>
            ))}
            <MenuItem dense component={Link} to="/login" onClick={handleMenuClose}>
                <ListItemIcon><PersonAddOutlined fontSize="small" /></ListItemIcon>
                <ListItemText>Agregar cuenta</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem>
                <ListItemText>Organizaciones</ListItemText>
                <Divider />
            </MenuItem>
            <LoadingScreenWrapper loading={loadingOrgs} sx={{ minWidth: "15rem", height: "10rem" }}>
                {
                    orgHeaderList?.map(org => (
                        <MenuItem dense key={org.id} onClick={() => handleOrgSwitch(org)}>
                            {org.id === activeOrg?.id &&
                                <ListItemIcon><Check /></ListItemIcon>
                            }
                            <ListItemText inset={org.id !== activeOrg?.id} primary={org.name} />
                        </MenuItem>
                    ))
                }
            </LoadingScreenWrapper>
            <Divider />
            <MenuItem dense component={Link} to="/profile" onClick={handleMenuClose}>
                <ListItemIcon><PersonOutlined fontSize="small" /></ListItemIcon>
                <ListItemText>Mi perfil</ListItemText>
            </MenuItem>
            {canInvite && activeOrg && !activeOrg.is_system && (
                <MenuItem dense onClick={() => { handleMenuClose(); setInviteOpen(true) }}>
                    <ListItemIcon><PersonAddOutlined fontSize="small" /></ListItemIcon>
                    <ListItemText>Invitar a la organizacion</ListItemText>
                </MenuItem>
            )}
            <MenuItem dense onClick={() => handleLogout()} sx={{ "&:hover": { color: palette.error.main } }}>
                <ListItemText>Cerrar Sesion</ListItemText>
            </MenuItem>
        </Menu>
    );

    const mobileMenuId = 'primary-search-account-menu-mobile';
    const renderMobileMenu = (
        <Menu
            anchorEl={mobileMoreAnchorEl}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            id={mobileMenuId} keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={isMobileMenuOpen}
            onClose={handleMobileMenuClose}
        >
            <MenuItem onClick={handleProfileMenuOpen}>
                <IconButton
                    aria-label="account of current user"
                    aria-controls="primary-search-account-menu"
                    aria-haspopup="true"
                    color="inherit"
                >
                    <UserAvatar name={fullName || user?.email || "?"} />
                </IconButton>
                <Stack>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{fullName || user?.email}</Typography>
                    <Typography variant="body2" color="text.secondary">{roleLabel}</Typography>
                </Stack>
            </MenuItem>
        </Menu>
    );

    if (user) return (
        <>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: "center" }}>
                <Stack>
                    <Typography variant="body2" sx={{ textAlign: "end", fontWeight: 600 }}>{fullName || user.email}</Typography>
                    <Typography variant="body2" sx={{ textAlign: "end" }} color="text.secondary">{roleLabel}</Typography>
                </Stack>
                <IconButton
                    size="large"
                    edge="end"
                    aria-label="account of current user"
                    aria-controls={menuId}
                    aria-haspopup="true"
                    onClick={handleProfileMenuOpen}
                >
                    <UserAvatar name={fullName || user.email} />
                </IconButton>
            </Box>
            <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                <IconButton
                    size="large"
                    aria-label="show more"
                    aria-controls={mobileMenuId}
                    aria-haspopup="true"
                    onClick={handleMobileMenuOpen}
                    color="inherit"
                >
                    <MoreIcon />
                </IconButton>
            </Box>
            {renderMobileMenu}
            {renderProfileMenu}
            <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
        </>
    )

    return (
        <>
            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                <Button sx={{ color: 'white', borderColor: "white" }} variant='outlined' size='large' component={Link} to="/login" startIcon={<AccountCircle />}>Iniciar Sesion</Button>
            </Box>
            <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                <IconButton size="large" aria-label="login" color="inherit" component={Link} to="/login">
                    <AccountCircle />
                </IconButton>
            </Box>
        </>
    )
})

export default HeaderMenu
