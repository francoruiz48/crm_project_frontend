import { LoginFormPage } from "src/features/auth/LoginForm";
import { SignupFormPage } from "src/features/auth/SignupForm";
import { OnboardingPage } from "src/pages/OnboardingPage";
import { PublicWebFormPage } from "src/features/webForms/PublicWebFormPage";
import { PageTitle } from "./PageTitle";
import { ROUTE_LIST_OUTLET_PROCESSED, type RouteListProps } from "./routeList";

/** Lista de rutas que se muestran sin Navbar */
const ROUTE_LIST_ROOT: RouteListProps[] = [
    { path: "/login", element: <LoginFormPage />, title: "Iniciar Sesión" },
    { path: "/signup", element: <SignupFormPage />, title: "Crear Cuenta" },
    { path: "/onboarding", element: <OnboardingPage />, title: "Onboarding" },
    // Sin auth, se embebe en sitios de terceros -- por eso vive en ROUTE_LIST_ROOT (sin
    // MainLayout/Navbar) y no en ROUTE_LIST_OUTLET como el resto del CRM.
    { path: "/forms/:uuid", element: <PublicWebFormPage />, title: "Formulario" },
]

/**Agrega un wrapper para usar el hook de title.
 * Sin eso, no funciona el hook, al estar fuera del RouteProvider */
export const ROUTE_LIST_ROOT_PROCESSED = ROUTE_LIST_ROOT.map(i => ({
    ...i,
    element: <PageTitle title={i.title}>{i.element}</PageTitle>
}))

export const ROUTE_LIST_OUTLET: RouteListProps[] = ROUTE_LIST_OUTLET_PROCESSED

export const ROUTE_LIST_FULL = [...ROUTE_LIST_ROOT_PROCESSED, ...ROUTE_LIST_OUTLET]

export const GLOBAL_NAVBAR = ROUTE_LIST_OUTLET.filter(i => i.globalNavbar)
export const REGULAR_NAVBAR = ROUTE_LIST_OUTLET.filter(i => i.regularNavbar)