import { Box, Paper, Stack } from '@mui/material'
import type { ReactNode } from 'react'
import { CommonCRMText, CommonCRMTitle } from 'src/components/ui/details/CommonText'

interface StatCardProps {
    label: string
    value: number | string
    icon: ReactNode
    color: string
}

/** Tarjeta de métrica para dashboards: valor destacado, ícono teñido y etiqueta. */
const StatCard = ({ label, value, icon, color }: StatCardProps) => {
    return (
        <Paper variant="outlined" sx={{ flex: 1, p: 2.5, borderRadius: 2, borderLeft: `4px solid ${color}` }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ color, bgcolor: `${color}18`, borderRadius: 1.5, p: 1, display: 'flex' }}>{icon}</Box>
                <Box>
                    <CommonCRMTitle titleLevel="h2" component="p" font="display">{value}</CommonCRMTitle>
                    <CommonCRMText variant="subtitle2" color="textSecondary">{label}</CommonCRMText>
                </Box>
            </Stack>
        </Paper>
    )
}

export default StatCard

