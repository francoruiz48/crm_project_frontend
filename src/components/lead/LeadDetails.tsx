import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { getLead } from "./leadService.ts"
import { Box, Chip, Container, Divider, Grid, Paper, Typography } from "@mui/material"
import type { Lead } from "../../types/leads.ts"

export const LeadDetails = () => {

    const { id } = useParams()
    const [lead, setLead] = useState<Lead | null>(null)

    useEffect(() => {
        if (id) {
            console.log(parseInt(id))
            getLead(parseInt(id)).then(setLead)
        }
        return () => setLead(null)
    }, [id])

    console.log(lead)
    return (
        <>
        <Container maxWidth={false}>
            <Grid container spacing={3}>
                <Grid size={3} >
                    <Paper sx={{ minHeight: "100%", p: 2, borderRadius:"1em" }}>
                        
                        <Box sx={{ display: "flex", justifyContent:"end", alignItems:"center", flexWrap:"wrap" }}>
                        <Typography variant="h2" sx={{flexGrow: 1, minWidth: "fit"}}>{lead?.field_values[0].value}</Typography>
                            <Chip label={lead?.active ? "Habilitado" : "Deshabilitado"} color={lead?.active ? "success" : "error"} sx={{justifySelf:"end"}}/>
                        </Box>

                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h3">Información General</Typography>

                        {lead?.field_values.map((item, idx) => {
                            if (idx > 0) {
                                return (
                                    <div key={`${idx}`} >
                                        <Typography sx={{ fontWeight: "bold" }}>{item.field.name}</Typography>
                                        <Typography>{item.value}</Typography>
                                    </div>
                                )

                            }
                        })}
                        <Divider sx={{ my: 2 }} />
                        <Typography sx={{ fontWeight: "bold" }}>Fecha de Creación</Typography>
                        <Typography>{lead?.created_at}</Typography>
                        <Typography sx={{ fontWeight: "bold" }}>Fecha de Última Modificación</Typography>
                        <Typography>{lead?.updated_at}</Typography>
                    </Paper>
                </Grid>
                <Grid size={9}>
                    <Paper sx={{ minHeight: "100%", p: 2, borderRadius:"1em" }}>
                        <Typography variant="h2">Actividades</Typography>
                    </Paper>
                </Grid>
            </Grid>

        </Container>
        </>
    )
}
