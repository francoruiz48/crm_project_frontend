import { useEffect, useMemo, useState } from "react"
import {
    Box, CircularProgress, InputAdornment, Paper, Stack,
    Table, TableBody, TableCell, TableHead, TableRow,
    TextField, useTheme,
} from "@mui/material"
import { BusinessOutlined, GroupOutlined, LeaderboardOutlined, SearchOutlined } from "@mui/icons-material"
import { getAdminDashboard, type AdminDashboard } from "src/features/dashboard/dashboardServices"
import { showCommonErrorToast } from "src/utils/feedback"
import { UserAvatar } from "src/components/ui/details/UserAvatar"
import { CommonCRMText, CommonCRMTitle } from "src/components/ui/details/CommonText"
import StatCard from "src/components/ui/details/StatCard"
import CustomChip from "src/components/ui/details/CustomChip"

// ── Header card ───────────────────────────────────────────────────────────────
function DashboardHeader() {
    const { palette } = useTheme()
    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 2,
                overflow: "hidden",
                background: `linear-gradient(135deg, ${palette.primary.dark} 0%, ${palette.primary.main} 60%, ${palette.secondary.main} 100%)`,
                color: "#fff",
                p: 3,
            }}
        >
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Box sx={{ bgcolor: "rgba(255,255,255,0.15)", borderRadius: 2, p: 1.2, display: "flex" }}>
                    <BusinessOutlined sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                    <CommonCRMTitle titleLevel="h3" font="display">Panel Global</CommonCRMTitle>
                    <CommonCRMText variant="body2" color="textSecondary">
                        Vista de administración del sistema
                    </CommonCRMText>
                </Box>
            </Stack>
        </Paper>
    )
}

// ── Activity chip ─────────────────────────────────────────────────────────────
function LastActivityChip({ date }: { date: string | null }) {
    // Snapshot de "ahora" tomado una sola vez: evita llamar a Date.now() durante el render
    const [now] = useState(() => Date.now())
    if (!date) return <CustomChip label="Sin actividad" size="small" variant="outlined" sx={{ fontSize: 11 }} />
    const days = Math.floor((now - new Date(date).getTime()) / 86400000)
    if (days === 0) return <CustomChip label="Hoy" size="small" chipColor="success" sx={{ fontSize: 11 }} />
    if (days <= 7) return <CustomChip label={`Hace ${days}d`} size="small" chipColor="primary" variant="outlined" sx={{ fontSize: 11 }} />
    if (days <= 30) return <CustomChip label={`Hace ${days}d`} size="small" chipColor="warning" variant="outlined" sx={{ fontSize: 11 }} />
    return <CustomChip label={`Hace ${days}d`} size="small" chipColor="error" variant="outlined" sx={{ fontSize: 11 }} />
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function GlobalDashboardPage() {
    const [data, setData] = useState<AdminDashboard | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const { palette } = useTheme()

    useEffect(() => {
        getAdminDashboard()
            .then(setData)
            .catch(showCommonErrorToast)
            .finally(() => setLoading(false))
    }, [])

    const filtered = useMemo(() => {
        if (!data) return []
        const q = search.trim().toLowerCase()
        return data.orgs
            .filter(o => !q || o.org_name.toLowerCase().includes(q) || o.owner_name?.toLowerCase().includes(q))
            .sort((a, b) => b.total_leads - a.total_leads)
    }, [data, search])

    if (loading) return (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 10 }}>
            <CircularProgress />
        </Box>
    )
    if (!data) return null

    const maxLeads = Math.max(...data.orgs.map(o => o.total_leads), 1)

    return (
        <Stack spacing={3} sx={{ p: 3 }}>
            {/* Header card */}
            <DashboardHeader />

            {/* Stat cards */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <StatCard label="Orgs activas" value={data.total_active_orgs} icon={<BusinessOutlined fontSize="small" />} color={palette.primary.main} />
                <StatCard label="Usuarios totales" value={data.total_users} icon={<GroupOutlined fontSize="small" />} color="#10b981" />
                <StatCard label="Leads totales" value={data.total_leads} icon={<LeaderboardOutlined fontSize="small" />} color="#f59e0b" />
            </Stack>

            {/* Tabla de organizaciones */}
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                {/* Header */}
                <Box sx={{ px: 4, pt: 4, pb: 3, borderBottom: `1px solid ${palette.divider}` }}>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 3 }}>
                        <Box>
                            <CommonCRMTitle titleLevel="h2" sx={{ lineHeight: 1.1 }}>
                                Organizaciones
                            </CommonCRMTitle>
                            <CommonCRMText variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                                {filtered.length} de {data.orgs.length} registradas
                            </CommonCRMText>
                        </Box>
                        <TextField
                            size="small"
                            placeholder="Buscar por org o propietario..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            sx={{ width: 300 }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchOutlined fontSize="small" sx={{ color: "text.disabled" }} />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                    </Stack>
                </Box>

                <Table size="small">
                    <TableHead sx={{ bgcolor: "action.hover" }}>
                        <TableRow>
                            <TableCell><strong>Organización</strong></TableCell>
                            <TableCell><strong>Propietario</strong></TableCell>
                            <TableCell align="right"><strong>Usuarios</strong></TableCell>
                            <TableCell align="right"><strong>Leads</strong></TableCell>
                            <TableCell align="center"><strong>Última actividad</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map(org => {
                            const barPct = (org.total_leads / maxLeads) * 100
                            return (
                                <TableRow key={org.org_id} hover>
                                    {/* Organización */}
                                    <TableCell>
                                        <Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}>
                                            <Box sx={{
                                                width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
                                                bgcolor: `${palette.primary.main}18`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                            }}>
                                                <CommonCRMText variant="caption" sx={{ color: palette.primary.main }}>
                                                    {org.org_name.charAt(0).toUpperCase()}
                                                </CommonCRMText>
                                            </Box>
                                            <CommonCRMText variant="body2">{org.org_name}</CommonCRMText>
                                        </Stack>
                                    </TableCell>

                                    {/* Propietario */}
                                    <TableCell>
                                        {org.owner_name ? (
                                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                                <UserAvatar name={org.owner_name} size={26} tooltip />
                                                <CommonCRMText variant="body2" color="text.secondary">{org.owner_name}</CommonCRMText>
                                            </Stack>
                                        ) : (
                                            <CommonCRMText variant="body2" color="text.disabled">—</CommonCRMText>
                                        )}
                                    </TableCell>

                                    {/* Usuarios */}
                                    <TableCell align="right">
                                        <CommonCRMText variant="body2">{org.total_users}</CommonCRMText>
                                    </TableCell>

                                    {/* Leads con barra */}
                                    <TableCell align="right">
                                        <Stack spacing={0.4} sx={{ alignItems: "flex-end" }}>
                                            <CommonCRMText variant="body2">{org.total_leads}</CommonCRMText>
                                            <Box sx={{ width: 64, height: 5, bgcolor: "action.hover", borderRadius: 3, overflow: "hidden" }}>
                                                <Box sx={{
                                                    height: "100%",
                                                    width: `${barPct}%`,
                                                    bgcolor: palette.primary.main,
                                                    borderRadius: 3,
                                                    opacity: 0.7,
                                                }} />
                                            </Box>
                                        </Stack>
                                    </TableCell>

                                    {/* Última actividad */}
                                    <TableCell align="center">
                                        <LastActivityChip date={org.last_activity} />
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <CommonCRMText variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                        {search ? "Sin resultados para la búsqueda" : "Sin organizaciones"}
                                    </CommonCRMText>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </Stack>
    )
}
