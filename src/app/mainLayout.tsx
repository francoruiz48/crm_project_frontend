import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import LayoutSidebar from 'shared/layout/sidebar/Sidebar';
import { LeadNavigationProvider } from 'src/features/lead/stores/LeadNavigationContext';
import { LayoutSidebarProvider } from 'src/stores/LayoutSidebarContext';
import { useUserContext } from 'src/stores/UserContext';
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen';
import { usePageTitle } from 'src/hooks/usePageTitle';
import { tokenStore } from 'src/lib/tokenStore';

export default function MainLayout() {
    const { user, isRestoring, orgHeaderList, loadingOrgs } = useUserContext()
    const nav = useNavigate()

    usePageTitle()

    useEffect(() => {
        if (!isRestoring && !user) nav('/login', { replace: true })
    }, [user, isRestoring, nav])

    // Si el usuario no tiene ninguna org (y ya terminaron de cargar) -> onboarding.
    // No aplica a superusuarios: ellos siempre tienen el Panel Global (organización id=1) como "hogar",
    // no necesitan crear ni que los inviten a una organización propia.
    useEffect(() => {
        if (!isRestoring && !loadingOrgs && user && !user.is_superuser && orgHeaderList.length === 0) {
            nav('/onboarding', { replace: true })
        }
    }, [user, isRestoring, loadingOrgs, orgHeaderList, nav])

    useEffect(() => {
        if (import.meta.env.DEV) {
            console.info(tokenStore.getAccessToken())
        }
    }, [])

    if (isRestoring) return (
        <LoadingScreenWrapper loading sx={{ height: "100vh" }} />
    )

    if (!user) return null

    return (
        <LayoutSidebarProvider>
            <LayoutSidebar>
                <LeadNavigationProvider>
                    <Outlet />
                </LeadNavigationProvider>
            </LayoutSidebar>
        </LayoutSidebarProvider>
    )
}
