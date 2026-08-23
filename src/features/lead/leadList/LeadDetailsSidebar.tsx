import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import { alpha, Box, CircularProgress, Collapse, IconButton, LinearProgress, Stack, Tooltip, useTheme } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import { DisableConfirmDialog } from "shared/ui/feedback/ConfirmationDialog"
import { showToast, showCommonErrorToast } from "src/utils/feedback"
import type { LeadDetailed } from "src/types/leads"
import { LeadInfo } from "../details/LeadDetails"
import { getLeadTitleArray, getLeadSubtitleArray } from "../leadUtils"
import { enableLead, disableLead } from "../leadService"

interface LeadDetailsSidebarProps {
    isOpen: boolean
    lead: LeadDetailed | null
    loading?: boolean
    onClose: () => void
    onUpdate: (lead: LeadDetailed) => void
}

// Ancho ajustable arrastrando el borde izquierdo (pedido del usuario): antes era fijo
// (clamp(26rem, 40vw, 50rem)) -- ahora ese mismo clamp es solo el valor por defecto (y un poco
// más chico, también pedido), y el usuario puede agrandar/achicar arrastrando, con un mínimo y
// máximo. El ancho elegido se guarda en localStorage para la próxima vez.
const SIDEBAR_WIDTH_STORAGE_KEY = "leadDetailsSidebarWidth"
const MIN_WIDTH = 352 // 22rem
const MAX_WIDTH = 672 // 42rem
const DEFAULT_WIDTH_VW = 34 // vw preferido antes de tocar el handle, mismo criterio que el clamp original pero más chico
const DEFAULT_WIDTH_CSS = `clamp(${MIN_WIDTH / 16}rem, ${DEFAULT_WIDTH_VW}vw, ${MAX_WIDTH / 16}rem)`

const clampWidth = (w: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w))

/**
 * Sidebar de detalle "rápido" de un lead, abierto con un solo clic desde el listado (Tabla o
 * Tablero) -- pedido del usuario para poder editar datos del lead sin perder de vista el
 * listado (hoy un clic navegaba directo a /leads/{id}, sacando de la lista).
 *
 * Reutiliza LeadInfo tal cual (el mismo "lado izquierdo" del detalle completo: título,
 * Estado/Etapa, Etiquetas, Usuario/Equipo asignado + metadata, y las secciones de campos
 * editables) -- deliberadamente NO incluye LeadActivities (columna derecha del detalle completo,
 * timeline de auditoría/comentarios), que sigue siendo exclusiva del detalle de página completa.
 *
 * A DIFERENCIA de Workspace/Team (que usan GenericSidebar, un Drawer que flota encima de todo con
 * un backdrop invisible), este panel va EMBEBIDO en el layout de LeadListPage -- ocupa espacio
 * real, no tapa nada. Motivo (pedido explícito del usuario): el backdrop de un Drawer temporary
 * captura cualquier clic afuera del panel, así que clickear otro lead con el sidebar abierto
 * primero lo cerraba (backdrop) en vez de abrir el lead nuevo -- hacía falta un clic de más. Sin
 * backdrop, cambiar de lead es un solo clic. LeadListPage además oculta el menú global y el panel
 * de filtros mientras este panel está abierto (ver handleLeadClick/closeLeadSidebarAndRestore ahí),
 * para hacerle lugar.
 *
 * Como ya no hay Drawer, "clic afuera cierra" no aplica. Formas de cerrar (pedido del usuario,
 * para no depender solo de ir hasta la cruz): el botón X de siempre, tecla Escape, una flechita en
 * el borde izquierdo del panel (más cómoda, está justo donde está la vista puesta), y clickear de
 * nuevo la fila/card del lead que ya está abierto (toggle -- ver handleLeadClick en LeadListPage).
 *
 * Ir al detalle completo desde el listado es siempre explícito, con un ícono en la fila/card (ver
 * LeadTablePresentation/LeadBoardCard). Acá dentro se repite el mismo ícono, junto al botón de
 * cerrar, dentro de una franja superior con fondo (mismo criterio visual que tenía GenericSidebar
 * vía headerActions, pero armado acá directo ya que no hay Drawer del que colgarlo).
 *
 * Las secciones de campos (LeadFieldSections, vía forceExpandSections) quedan siempre desplegadas
 * y no se pueden plegar -- a diferencia del detalle de página completa, donde sí es un acordeón.
 *
 * Ancho: el default es más chico que antes (pedido del usuario) y además ajustable arrastrando
 * el borde izquierdo, con un mínimo y máximo (ver MIN_WIDTH/MAX_WIDTH acá arriba) -- el ancho
 * elegido se recuerda entre sesiones (localStorage).
 */
export const LeadDetailsSidebar = ({ isOpen, lead, loading = false, onClose, onUpdate }: LeadDetailsSidebarProps) => {
    const navigate = useNavigate()
    const theme = useTheme()
    //Estado propio (no comparte idModal con LeadDetails.tsx a propósito, para no acoplar ambos
    //lugares -- nunca están montados sobre el mismo lead a la vez de todos modos).
    const [isDeleting, setIsDeleting] = useState<LeadDetailed | null>(null)

    // Ancho: null = todavía sin tocar el handle, usa el clamp por defecto (responsive según
    // viewport). Un número = el usuario ya arrastró, ancho fijo en px (clamp/eado entre
    // MIN_WIDTH/MAX_WIDTH), persistido en localStorage.
    const [customWidth, setCustomWidth] = useState<number | null>(() => {
        const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
        const parsed = stored ? Number(stored) : NaN
        return Number.isFinite(parsed) ? clampWidth(parsed) : null
    })
    const panelRef = useRef<HTMLDivElement>(null)
    const dragStateRef = useRef<{ startX: number, startWidth: number } | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const handleDragStart = useCallback((e: ReactMouseEvent) => {
        e.preventDefault()
        const startWidth = panelRef.current?.getBoundingClientRect().width ?? MIN_WIDTH
        dragStateRef.current = { startX: e.clientX, startWidth }
        setIsDragging(true)
    }, [])

    // Doble clic en el handle: vuelve al ancho por defecto (por si alguien lo arrastra a un
    // extremo raro y no encuentra cómo volver).
    const handleDragReset = useCallback(() => {
        setCustomWidth(null)
        localStorage.removeItem(SIDEBAR_WIDTH_STORAGE_KEY)
    }, [])

    useEffect(() => {
        if (!isDragging) return
        // El panel está pegado al borde derecho de la pantalla: arrastrar el handle hacia la
        // izquierda (el mouse se mueve hacia la izquierda, clientX baja) agranda el panel.
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStateRef.current) return
            const delta = dragStateRef.current.startX - e.clientX
            setCustomWidth(clampWidth(dragStateRef.current.startWidth + delta))
        }
        const handleMouseUp = () => {
            setIsDragging(false)
            dragStateRef.current = null
        }
        // Cursor consistente y sin selección de texto accidental mientras se arrastra, incluso
        // si el mouse se despega momentáneamente del handle de 5px.
        const prevCursor = document.body.style.cursor
        const prevUserSelect = document.body.style.userSelect
        document.body.style.cursor = "ew-resize"
        document.body.style.userSelect = "none"
        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        return () => {
            document.body.style.cursor = prevCursor
            document.body.style.userSelect = prevUserSelect
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [isDragging])

    // Persistir el ancho elegido para la próxima vez que se abra el sidebar.
    useEffect(() => {
        if (customWidth !== null) {
            localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(customWidth))
        }
    }, [customWidth])

    // Pedido del usuario: si scrolleó hasta un campo puntual y clickea otro lead, que no tenga que
    // volver a scrollear.
    //
    // Intento inicial (con onScroll continuo guardando la posición en cada scroll) NO funcionaba:
    // como LeadListPage vaciaba el lead a null antes de cargar el siguiente, el contenido se
    // achicaba al spinner, el navegador clampeaba el scroll a esa altura chica, y ESO disparaba un
    // evento scroll que pisaba la posición guardada con el valor ya recortado.
    //
    // Fix real (dos partes):
    // 1. LeadListPage.tsx ya no vacía el lead a null en cada cambio -- deja el lead ANTERIOR
    //    visible mientras carga el siguiente (ver handleLeadClick), así el contenedor nunca se
    //    achica de golpe durante la carga.
    // 2. Acá, en vez de guardar la posición con cada scroll (vulnerable a que un clamp posterior
    //    la pise), se la captura UNA sola vez, justo en el instante en que `loading` pasa de false
    //    a true -- en ese render puntual el contenido todavía es el del lead anterior sin tocar,
    //    así que scrollTop es el valor real y "limpio" que dejó el usuario.
    const scrollRef = useRef<HTMLDivElement>(null)
    const scrollPosRef = useRef(0)
    const prevLoadingRef = useRef(loading)
    useLayoutEffect(() => {
        if (!prevLoadingRef.current && loading && scrollRef.current) {
            scrollPosRef.current = scrollRef.current.scrollTop
        }
        if (!loading && lead && scrollRef.current) {
            scrollRef.current.scrollTop = scrollPosRef.current
        }
        prevLoadingRef.current = loading
        // Deliberado: lead?.id (no el objeto lead completo) -- así una edición inline de un campo
        // (que también cambia la referencia de `lead`, pero no el id) no reaplica el scroll en
        // cada tecleo/blur, solo al cambiar de lead de verdad.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, lead?.id])

    // Escape cierra -- una de las formas alternativas a la cruz pedidas por el usuario.
    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isOpen, onClose])

    const leadTitle = lead ? getLeadTitleArray(lead) : null
    const leadSubtitle = lead ? getLeadSubtitleArray(lead) : null

    const handleActive = (l: LeadDetailed) => {
        if (!l.active) return enableLead(l.id).then(() => {
            showToast(`Lead habilitado con éxito.`)
            onUpdate({ ...l, active: true })
        }).catch(e => showCommonErrorToast(e))
        return disableLead(l.id).then(res => {
            if (res.action === "deleted") {
                showToast(`Lead eliminado definitivamente.`)
                onClose()
            } else {
                showToast(`Lead deshabilitado con éxito.`)
                onUpdate({ ...l, active: false })
            }
        }).catch(e => showCommonErrorToast(e))
    }

    return (
        <>
            <Collapse in={isOpen} orientation="horizontal" sx={{ height: "100%", flexShrink: 0 }}>
                <Box ref={panelRef} sx={{
                    // Sin tocar el handle: clamp responsive según viewport (más chico que antes).
                    // Ya arrastrado: ancho fijo en px, elegido por el usuario y persistido.
                    width: customWidth ?? DEFAULT_WIDTH_CSS,
                    height: "100%",
                    position: "relative",
                    borderLeft: `1px solid ${theme.palette.divider}`,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    // Mientras se arrastra, ninguna transición/animación de ancho (evita que se
                    // sienta "elástico" o con delay respecto al mouse).
                    ...(isDragging && { transition: "none" }),
                }}>
                    {/* Franja superior con fondo -- mismo criterio visual que headerActions de
                        GenericSidebar, armado acá directo porque ya no hay Drawer. */}
                    <Stack direction="row" spacing={0.5} sx={{
                        alignItems: "center", justifyContent: "space-between",
                        minHeight: "3.25rem", px: "1.25rem", flexShrink: 0,
                        backgroundColor: alpha(theme.palette.background.paper, 0.9),
                        borderBottom: `1px solid ${theme.palette.divider}`,
                    }}>
                        <Stack direction="row" spacing={0.5}>
                            {lead &&
                                <Tooltip title="Ver detalle completo">
                                    <IconButton size="small" onClick={() => navigate(`/leads/${lead.id}`)}>
                                        <OpenInNewIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            }
                        </Stack>
                        <Tooltip title="Cerrar">
                            <IconButton size="small" onClick={onClose}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    {/* Barra fina de progreso al cambiar de lead con el sidebar ya abierto (ver
                        más abajo: el contenido del lead ANTERIOR se deja visible mientras carga el
                        siguiente, así que esta es la única señal de que algo está cargando). */}
                    {loading && lead && <LinearProgress sx={{ height: 2, flexShrink: 0 }} />}

                    <Box ref={scrollRef} sx={{ flex: 1, overflowY: "auto", p: 3 }}>
                        {/* Spinner grande centrado SOLO cuando todavía no hay ningún lead cargado
                            (primera apertura). Al cambiar de lead con el sidebar ya abierto, NO se
                            vacía a este spinner -- eso achicaba el contenedor de golpe y el
                            navegador clampeaba el scroll (bug real encontrado 2026-08-13, ver
                            handleLeadClick en LeadListPage.tsx). En su lugar se sigue mostrando el
                            lead anterior (ver LinearProgress arriba como única señal de carga). */}
                        {loading && !lead &&
                            <Stack sx={{ alignItems: "center", py: 8 }}>
                                <CircularProgress />
                            </Stack>
                        }
                        {lead &&
                            <LeadInfo lead={lead} leadTitle={leadTitle} leadSubtitle={leadSubtitle}
                                handleActive={() => setIsDeleting(lead)} updateLeadInfo={(l) => onUpdate(l)}
                                forceExpandSections />
                        }
                    </Box>

                    {/* Handle para agrandar/achicar arrastrando (pedido del usuario, con mínimo y
                        máximo -- ver MIN_WIDTH/MAX_WIDTH). Angosto (5px) y pegado al borde
                        interno para no invadir el espacio de la flechita de cerrar de acá abajo
                        (misma lección que esa flecha: si se sale del Box, el overflow:hidden del
                        panel lo recorta). Invisible hasta hover/arrastre para no ensuciar la UI. */}
                    <Box
                        onMouseDown={handleDragStart}
                        onDoubleClick={handleDragReset}
                        sx={{
                            position: "absolute", top: 0, left: 0,
                            width: "5px", height: "100%",
                            cursor: "ew-resize",
                            zIndex: 1,
                            bgcolor: isDragging ? alpha(theme.palette.primary.main, 0.5) : "transparent",
                            "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.35) },
                        }}
                    />

                    {/* Flecha en el borde izquierdo -- forma alternativa de cerrar, más cómoda que
                        ir hasta la cruz (pedido del usuario): pegada al borde interno del panel,
                        junto al contenido. (Antes quedaba centrada JUSTO sobre el borde -- mitad
                        adentro, mitad afuera -- y el overflow:hidden del panel recortaba la mitad
                        que sobresalía; por eso se veía cortada.) */}
                    <Tooltip title="Cerrar (Esc)" placement="right">
                        <IconButton size="small" onClick={onClose} sx={{
                            position: "absolute", top: "50%", left: "0.4rem",
                            transform: "translateY(-50%)",
                            width: 24, height: 24,
                            bgcolor: "background.paper",
                            border: `1px solid ${theme.palette.divider}`,
                            boxShadow: 1,
                            "&:hover": { bgcolor: "action.hover" },
                        }}>
                            <ChevronRightIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Collapse>
            <DisableConfirmDialog entity={isDeleting} clearEntity={() => setIsDeleting(null)}
                idModal="del-lead-sidebar" onConfirm={() => handleActive(isDeleting!)} entityTypeName="el lead" onlyDelete />
        </>
    )
}
