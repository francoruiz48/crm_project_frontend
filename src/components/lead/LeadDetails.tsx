import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { getLead } from "./leadService.ts"
import { Box, Container, Divider, Grid, Paper, Typography } from "@mui/material"

export const LeadDetails = () => {

    const { id } = useParams()
    const [lead, setLead] = useState(null)

    useEffect(() => {
        if (id) {
            console.log(parseInt(id))
            getLead(parseInt(id)).then(setLead)
        }
        return () => setLead(null)
    }, [id])

    console.log(lead)
    return (
        <Container maxWidth='xl'>
            <Grid container spacing={4}>
                <Grid size={4} >
                    <Paper sx={{minHeight:"100%", p:2}}>
                        <Typography variant="h2">{lead?.field_values[0].value}</Typography>
                        <Typography>{lead?.active ? "Activo" : "Deshabilitado"}</Typography>
                        <Divider sx={{my:2}}/>
                        <Typography variant="h3">Información General</Typography>

                        {lead?.field_values.map((item, idx) => {
                            if (idx > 0) {
                                return (<Typography key={`${idx}`} ><strong>{item.field.name}</strong> {item.value}</Typography>)

                            }
                        })}

                    </Paper>
                </Grid>
                <Grid size={8}>
                    <Paper sx={{minHeight:"100%", p:2}}>
                        <Typography variant="h2">Actividades</Typography>
                    </Paper>
                </Grid>
            </Grid>

        </Container>
    )
}
