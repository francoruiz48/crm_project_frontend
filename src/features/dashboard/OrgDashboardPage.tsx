import { useEffect, useState } from "react"
import {
    Box, Chip, CircularProgress, Divider,
    Paper, Stack, useTheme,
} from "@mui/material"
import {
    LeaderboardOutlined, PeopleOutlined, TrendingUpOutlined,
} from "@mui/icons-material"
import { getOrgDashboard, type OrgDashboard, type LeadsByState } from "src/features/dashboard/dashboardServices"
import { useUserContext } from "src/stores/UserContext"
import { showCommonErrorToast } from "src/utils/feedback"
import { UserAvatar } from "src/components/ui/details/UserAvatar"
import { CommonCRMText, CommonCRMTitle } from "src/components/ui/details/CommonText"
import StatCard from "src/components/ui/details/StatCard"

// ── Shared donut ──────────────────────────────────────────────────────────────
const PALETTE_A = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"]
const PALETTE_B = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"]

interface DonutProps { data: LeadsByState[]; colors?: string[] }

function DonutChart({ data, colors = PALETTE_B }: DonutProps) {
    const { palette } = useTheme()
    const [hovered, setHovered] = useState<number | null>(null)

    const total = data.reduce((s, d) => s + d.total, 0)
    const size = 150
    const cx = size / 2, cy = size / 2, r = 56, gap = 0.025

    if (total === 0) return (
        <Stack sx={{ height: size, alignItems: "center", justifyContent: "center" }}>
            <CommonCRMText variant="body2" color="text.secondary">Sin datos</CommonCRMText>
        </Stack>
    )

    // Ángulo de inicio acumulado de cada porción, derivado de los totales previos
    // (equivalente a ir sumando `angle` porción a porción, pero sin mutar variables durante el render)
    const starts = data.map((_, i) => data.slice(0, i).reduce((sum, d) => sum + d.total, 0))
    const slices = data.map((item, i) => {
        const pct = item.total / total
        const sweep = pct * 2 * Math.PI - gap
        const start = -Math.PI / 2 + (starts[i] / total) * 2 * Math.PI + gap / 2
        const end = start + sweep
        const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
        const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end)
        const large = sweep > Math.PI ? 1 : 0
        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
        const color = item.color ?? colors[i % colors.length]
        return { path, color, item, pct }
    })

    const active = hovered !== null ? slices[hovered] : null

    return (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width={size} height={size} style={{ display: "block" }}>
                    {slices.map((s, i) => (
                        <path key={i} d={s.path} fill={s.color}
                            opacity={hovered === null || hovered === i ? 0.92 : 0.3}
                            style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}>
                            <title>{s.item.state_name}: {s.item.total}</title>
                        </path>
                    ))}
                    <circle cx={cx} cy={cy} r={r * 0.55} fill={palette.background.paper} />
                </svg>
                <Box sx={{ position: "absolute", textAlign: "center", pointerEvents: "none" }}>
                    {active ? (
                        <>
                            <CommonCRMTitle titleLevel="h6" component="p" font="display" sx={{ lineHeight: 1, color: active.color }}>{active.item.total}</CommonCRMTitle>
                            <CommonCRMText variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 62, lineHeight: 1.2 }}>
                                {active.item.state_name}
                            </CommonCRMText>
                        </>
                    ) : (
                        <>
                            <CommonCRMTitle titleLevel="h5" component="p" font="display" sx={{ lineHeight: 1 }}>{total}</CommonCRMTitle>
                            <CommonCRMText variant="caption" color="text.secondary">leads</CommonCRMText>
                        </>
                    )}
                </Box>
            </Box>

            {/* Leyenda */}
            <Stack spacing={0.8} sx={{ flex: 1, minWidth: 0 }}>
                {slices.map((s, i) => (
                    <Box key={s.item.state_id}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                        sx={{ cursor: "default", opacity: hovered === null || hovered === i ? 1 : 0.4, transition: "opacity 0.15s" }}>
                        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.2 }}>
                            <Stack direction="row" spacing={0.7} sx={{ alignItems: "center" }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color, flexShrink: 0 }} />
                                <CommonCRMText variant="caption" noWrap sx={{ lineHeight: 1 }}>{s.item.state_name}</CommonCRMText>
                            </Stack>
                            <CommonCRMText variant="caption" sx={{ color: s.color, ml: 1, flexShrink: 0 }}>
                                {s.item.total}
                            </CommonCRMText>
                        </Stack>
                        <Box sx={{ height: 4, bgcolor: "action.hover", borderRadius: 3, overflow: "hidden" }}>
                            <Box sx={{ height: "100%", width: `${(s.pct * 100).toFixed(1)}%`, bgcolor: s.color, borderRadius: 3, transition: "width 0.5s ease" }} />
                        </Box>
                    </Box>
                ))}
            </Stack>
        </Stack>
    )
}

// ── Activity feed ─────────────────────────────────────────────────────────────
const ACTION_COLOR: Record<string, string> = {
    CREATED: "#10b981", UPDATED: "#3b82f6", DELETED: "#ef4444", ACTIVATED: "#f59e0b",
}
const ACTION_LABEL: Record<string, string> = {
    CREATED: "Creado", UPDATED: "Actualizado", DELETED: "Eliminado", ACTIVATED: "Activado",
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function OrgDashboardPage() {
    const { activeOrg } = useUserContext()
    const [data, setData] = useState<OrgDashboard | null>(null)
    const [loading, setLoading] = useState(true)
    const { palette } = useTheme()

    // Al cambiar de organización se reinicia el spinner: ajuste de estado durante el render
    // (patrón de React para reaccionar a cambios de props sin setState síncrono en el effect)
    const [prevOrgId, setPrevOrgId] = useState(activeOrg?.id)
    if (activeOrg?.id !== prevOrgId) {
        setPrevOrgId(activeOrg?.id)
        setLoading(true)
    }

    useEffect(() => {
        getOrgDashboard()
            .then(setData)
            .catch(showCommonErrorToast)
            .finally(() => setLoading(false))
    }, [activeOrg?.id])

    if (loading) return (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 10 }}>
            <CircularProgress />
        </Box>
    )
    if (!data) return null

    return (
        <Stack spacing={3} sx={{ p: 3 }}>
            {/* Header card */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 2, overflow: "hidden", p: 3,
                    background: `linear-gradient(135deg, ${palette.primary.dark} 0%, ${palette.primary.main} 60%, ${palette.secondary.main} 100%)`,
                    color: "#fff",
                }}
            >
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <Box sx={{ bgcolor: "rgba(255,255,255,0.15)", borderRadius: 2, p: 1.2, display: "flex" }}>
                        <LeaderboardOutlined sx={{ fontSize: 32 }} />
                    </Box>
                    <Box>
                        <CommonCRMTitle titleLevel="h3" font="display" sx={{ lineHeight: 1 }}>Dashboard</CommonCRMTitle>
                        <CommonCRMText variant="body2" sx={{ opacity: 0.8, mt: 0.3 }}>{activeOrg?.name}</CommonCRMText>
                    </Box>
                </Stack>
            </Paper>

            {/* Stat cards */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <StatCard label="Leads totales" value={data.total_leads} icon={<LeaderboardOutlined fontSize="small" />} color={palette.primary.main} />
                <StatCard label="Miembros del equipo" value={data.org_users.length} icon={<PeopleOutlined fontSize="small" />} color="#10b981" />
                <StatCard label="Etapas" value={data.leads_by_flow_state.length} icon={<TrendingUpOutlined fontSize="small" />} color="#f59e0b" />
            </Stack>

            {/* Main content: actividad | gráficos + equipo */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ alignItems: "stretch" }}>

                {/* Columna izquierda — Actividad reciente (ocupa todo el alto) */}
                <Paper variant="outlined" sx={{ flex: 1.4, p: 2.5, borderRadius: 2, display: "flex", flexDirection: "column" }}>
                    <CommonCRMTitle titleLevel="h4" sx={{ mb: 2 }}>Actividad reciente</CommonCRMTitle>
                    {data.recent_activity.length === 0
                        ? <CommonCRMText variant="body2" color="text.secondary">Sin actividad</CommonCRMText>
                        : (
                            <Stack spacing={0} sx={{ flex: 1 }}>
                                {data.recent_activity.slice(0, 15).map((a, i, arr) => {
                                    const color = ACTION_COLOR[a.action] ?? palette.text.secondary
                                    return (
                                        <Stack key={a.id} direction="row" spacing={1.5}
                                            sx={{ alignItems: "flex-start", py: 1, borderBottom: i < arr.length - 1 ? `1px solid ${palette.divider}` : "none" }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, mt: 0.65, flexShrink: 0 }} />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <CommonCRMText variant="body2" sx={{ lineHeight: 1.3 }}>
                                                    <Box component="span" sx={{ color }}>{ACTION_LABEL[a.action] ?? a.action}</Box>
                                                    {" "}{a.entity_type}
                                                </CommonCRMText>
                                                {a.user_name && (
                                                    <CommonCRMText variant="caption" color="text.secondary" noWrap>{a.user_name}</CommonCRMText>
                                                )}
                                            </Box>
                                            <CommonCRMText variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                                {new Date(a.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                                            </CommonCRMText>
                                        </Stack>
                                    )
                                })}
                            </Stack>
                        )
                    }
                </Paper>

                {/* Columna derecha — Gráficos apilados + Equipo */}
                <Stack spacing={3} sx={{ flex: 1 }}>
                    {/* Flujo */}
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                        <CommonCRMTitle titleLevel="h4" sx={{ mb: 2 }}>Etapas</CommonCRMTitle>
                        <DonutChart data={data.leads_by_flow_state} colors={PALETTE_B} />
                    </Paper>

                    {/* Contacto */}
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                        <CommonCRMTitle titleLevel="h4" sx={{ mb: 2 }}>Estados</CommonCRMTitle>
                        <DonutChart data={data.leads_by_contact_state} colors={PALETTE_A} />
                    </Paper>

                    {/* Equipo */}
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                        <CommonCRMTitle titleLevel="h4" sx={{ mb: 1.5 }}>Equipo</CommonCRMTitle>
                        <Stack divider={<Divider />}>
                            {data.org_users.map(u => (
                                <Stack key={u.id} direction="row" spacing={1.5} sx={{ alignItems: "center", py: 1 }}>
                                    <UserAvatar name={`${u.name} ${u.last_name ?? ""}`} size={34} tooltip />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <CommonCRMText variant="body2" noWrap>{u.name} {u.last_name ?? ""}</CommonCRMText>
                                        <CommonCRMText variant="caption" color="text.secondary" noWrap>{u.email}</CommonCRMText>
                                    </Box>
                                    {u.is_owner && <Chip label="Propietario" size="small" color="primary" variant="outlined" sx={{ fontSize: 11 }} />}
                                </Stack>
                            ))}
                        </Stack>
                    </Paper>
                </Stack>
            </Stack>
        </Stack>
    )
}
