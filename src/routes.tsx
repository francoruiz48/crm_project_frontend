import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./components/common/mainLayout";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <div className="">Login</div>,
    },
    {
        path: "/signup",
        element: <div className="">Signup</div>,
    },
    {
        path: "/signup",
        element: <div className="">Signup</div>,
    },
    {
        //Layout principal
        path: "/",
        Component: MainLayout,
        children: [
            //Rutas dentro del layout
            {
                path: "/",
                element: <div>Home Test</div>
            },
            {
                path: "*", //Si no coincide con nada más.
                Component: NotFound
            },
        ]
    }
])