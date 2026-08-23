import { createContext, useContext, useState, type ReactNode } from "react"

// Antes el estado abierto/cerrado del menú global vivía como useState local, adentro de
// Sidebar.tsx -- no había forma de controlarlo desde otra pantalla. Se necesita acá porque el
// sidebar de detalle rápido de leads (LeadDetailsSidebar) ahora ocupa espacio real en el layout
// (ya no es un Drawer flotante) y necesita poder ocultar el menú global para hacerle lugar.

interface LayoutSidebarContextProps {
    open: boolean
    setOpen: (open: boolean) => void
}

const LayoutSidebarContext = createContext<LayoutSidebarContextProps | undefined>(undefined)

export const LayoutSidebarProvider = ({ children }: { children: ReactNode }) => {
    const [open, setOpen] = useState(false)

    return (
        <LayoutSidebarContext.Provider value={{ open, setOpen }}>
            {children}
        </LayoutSidebarContext.Provider>
    )
}

export const useLayoutSidebar = () => {
    const context = useContext(LayoutSidebarContext)
    if (context === undefined) {
        throw new Error('useLayoutSidebar debe usarse dentro de un LayoutSidebarProvider')
    }
    return context
}
