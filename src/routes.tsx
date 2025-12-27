import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./components/common/mainLayout";

export const router = createBrowserRouter([
    {
        //Layout principal
        path: "/",
        Component: MainLayout,
        children: [
            //Rutas dentro del layout
            {
                path:"/",
                element: <div>Home Test!</div>
            }
        ]
    }
])