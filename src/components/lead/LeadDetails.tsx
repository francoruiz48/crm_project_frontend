import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { getLead } from "./leadService.ts"
import { Box, Chip, Container, Divider, Grid, Paper, Typography } from "@mui/material"
import type { Lead } from "../../types/leads.ts"
import { getFieldType } from "../../generalService.ts"

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
                        <Paper sx={{ minHeight: "100%", p: 2, borderRadius: "1em" }}>

                            {lead &&
                                <>
                                    <Box sx={{ display: "flex", justifyContent: "end", alignItems: "center", flexWrap: "wrap" }}>
                                        <Typography variant="h2" sx={{ flexGrow: 1, minWidth: "fit" }}>{lead?.field_values[0].value} {lead?.field_values[1].value}</Typography>
                                        <Chip label={lead?.active ? "Habilitado" : "Deshabilitado"} color={lead?.active ? "success" : "error"} sx={{ justifySelf: "end" }} />
                                    </Box>

                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="h3">Información General</Typography>

                                    {lead?.field_values.map((item, idx) => {
                                        if (idx > 1) {
                                            return (
                                                <LeadField key={`${idx}`} fieldName={item.field.name} value={item.value} type={item.field.field_type_code} />
                                            )
                                        }
                                    })}
                                    <Divider sx={{ my: 2 }} />
                                    <LeadField fieldName="Fecha de Creación" value={lead.created_at} type="DATE" />
                                    <LeadField fieldName="Fecha de Última Modificación" value={lead.updated_at} type="DATE" />

                                </>}
                        </Paper>
                    </Grid>
                    <Grid size={9}>
                        <Paper sx={{ minHeight: "100%", p: 2, borderRadius: "1em" }}>
                            <Typography variant="h2">Actividades</Typography>
                        </Paper>
                    </Grid>
                </Grid>

            </Container>
        </>
    )
}

interface LeadFieldProps {
    fieldName: string,
    value: string | number | boolean,
    type: string
}

export const LeadField = ({ fieldName, value, type }: LeadFieldProps) => {

    const fieldValue = useMemo(() => getFieldType(type, value), [type, value])

    if (type === "BOOL" && fieldValue) {
        return <Chip color="success" label={fieldName} sx={{ marginBlock: ".5rem", fontWeight: "bold" }} />
    }

    return (
        <>
            <Typography sx={{ fontWeight: "bold" }}>{fieldName}:</Typography>
            <Typography sx={{ paddingLeft: ".5rem" }}>{value}</Typography>
        </>
    )
}
