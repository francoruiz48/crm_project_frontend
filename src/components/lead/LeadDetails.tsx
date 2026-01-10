import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { getLead, getLeadSections } from "./leadService.ts"
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Container, Divider, Grid, Paper, Typography } from "@mui/material"
import type { Lead, LeadFieldSection, LeadFieldValue } from "../../types/leads.ts"
import { getFieldType } from "../../generalService.ts"
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

export const LeadDetails = () => {

    const { id } = useParams()
    const [lead, setLead] = useState<Lead | null>(null)

    useEffect(() => {
        if (id) getLead(parseInt(id)).then(setLead)
        return () => setLead(null)
    }, [id])

    return (
        <Container maxWidth={false}>
            <Grid container spacing={3}>
                <Grid size={4} >

                    {lead &&
                        <Box>
                            <Paper sx={{ minHeight: "100%", p: 2, borderRadius: "1em", marginBottom: "1rem" }}>
                                <Box sx={{ display: "flex", justifyContent: "end", alignItems: "center", flexWrap: "wrap" }}>
                                    <Typography variant="h1" sx={{ flexGrow: 1, minWidth: "fit" }}>{lead?.field_values[0].value} {lead?.field_values[1].value}</Typography>
                                    <Chip label={lead?.active ? "Habilitado" : "Deshabilitado"} color={lead?.active ? "success" : "error"} sx={{ justifySelf: "end" }} />
                                </Box>
                            </Paper>
                            <Paper  sx={{ p: 1, borderRadius: "1em" }}>
                                <LeadFieldSections fields={lead.field_values} />

                                <Accordion disableGutters sx={{boxShadow:"none"}}>
                                    <AccordionSummary sx={{ height: "64px" }}
                                        expandIcon={<ArrowDropDownIcon />}
                                        aria-controls="panel2-content" id="panel2-header"
                                    >
                                        <Typography variant="h2">Creación de Lead</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ paddingTop: 0 }}>
                                        <Divider sx={{ marginBottom: "1rem" }} ></Divider>
                                        <LeadField fieldName="Fecha de Creación" value={lead.created_at} type="DATE" />
                                        <LeadField fieldName="Fecha de Última Modificación" value={lead.updated_at} type="DATE" />
                                    </AccordionDetails>
                                </Accordion>
                            </Paper>
                        </Box>}
                </Grid>
                <Grid size={8}>
                    <Paper sx={{ minHeight: "100%", p: 2, borderRadius: "1em" }}>
                        <Typography variant="h2">Actividades</Typography>
                    </Paper>
                </Grid>
            </Grid >

        </Container >
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
        return <Chip color="success" label={fieldName} sx={{ marginBottom: ".5rem", fontWeight: "bold" }} />
    }

    return (
        <>
            <Typography sx={{ fontWeight: "bold" }} component="h3">{fieldName}:</Typography>
            <Typography sx={{ paddingLeft: ".5rem" }}>{value}</Typography>
        </>
    )
}

interface LeadFieldSectionsProps {
    fields: LeadFieldValue[]
}

export const LeadFieldSections = ({ fields }: LeadFieldSectionsProps) => {

    const [leadSections, setLeadSections] = useState<LeadFieldSection[] | []>([])
    console.log(leadSections)

    useEffect(() => {
        getLeadSections().then(setLeadSections)
        return () => setLeadSections([])
    }, [])

    return (
        <>
            {
                leadSections?.length > 0 &&
                leadSections.map((sect, idx) =>
                    <Accordion key={idx} defaultExpanded={idx === 0} disableGutters sx={{boxShadow:"none"}}>
                        <AccordionSummary sx={{ height: "64px" }}
                            expandIcon={<ArrowDropDownIcon />}
                            aria-controls="panel2-content" id="panel2-header"
                        >
                            <Typography variant="h2">{sect.name}</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ paddingTop: 0 }}>
                            <Divider sx={{ marginBottom: "1rem" }} ></Divider>
                            {fields.map((field, idx) => {
                                if (field.field.lead_field_section.id === sect.id)
                                    return <LeadField fieldName={field.field.name} type={field.field.field_type_code} value={field.value} key={idx} />
                            }
                            )}

                        </AccordionDetails>
                    </Accordion>
                )
            }
        </>
    )
}
