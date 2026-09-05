import { memo, useCallback, useMemo, useState } from "react"
import { CommonIconButton } from "shared/ui/buttons/CommonIconButton"
import { SelectableTableRow } from "shared/ui/lists/CustomTableRow"
import { EnabledIcon } from "shared/ui/lists/Icons"
import type { LeadFieldDetailed } from "src/types/leadFields"
import { Accordion, AccordionDetails, Box, Checkbox, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, useTheme, type Palette } from "@mui/material"
import React from 'react'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { ReorderFieldsIds } from "./LeadFieldList"
import { useDragAndDrop } from "src/hooks/useDragAndDrop"
import CommonButton from "src/components/ui/buttons/CommonButton"
import { stopPropagationEvent } from "src/utils/lists"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import { getFieldsBySections } from "./leadFieldUtils"
import { ColoredAccordionSummary } from "src/components/layout/container/ColoredHeaders"
import GenericPaper from "src/components/layout/container/GenericPaper"
import { updateFieldSection } from "../orgProperties/fieldSections/fieldSectionsServices"
import { showCommonErrorToast } from "src/utils/feedback"
import { Can } from "src/components/auth/Can"
import { useUserContext } from "src/stores/UserContext"

const MIN_FIELDS = 10

interface LeadFieldTableSectionsProps {
    leadFields: LeadFieldDetailed[]
    newFieldsBySectionIds: ReorderFieldsIds[],
    setNewFieldsBySectionIds: React.Dispatch<React.SetStateAction<ReorderFieldsIds[]>>,
    handleToggle: (field: LeadFieldDetailed) => void,
    isReordering: boolean,
    handleSidebarWrapper: (mode: string, entity?: LeadFieldDetailed | null | undefined) => void,
    checkedItems: Map<number, LeadFieldDetailed>;
    checkedItemsArray: LeadFieldDetailed[];
    addItem: (item: LeadFieldDetailed | LeadFieldDetailed[]) => void;
    removeItem: (item: LeadFieldDetailed | LeadFieldDetailed[]) => void;
    onSectionRenamed: (sectionId: number, newName: string) => void;
    openSectionIds: Set<number>,
    setOpenSectionIds: React.Dispatch<React.SetStateAction<Set<number>>>,
}

export const LeadFieldTableSections = ({ leadFields, newFieldsBySectionIds, setNewFieldsBySectionIds, handleToggle, isReordering,
    handleSidebarWrapper, checkedItems, checkedItemsArray, addItem, removeItem, openSectionIds, setOpenSectionIds, onSectionRenamed }: LeadFieldTableSectionsProps) => {

    const { palette } = useTheme()
    const [showAll, setShowAll] = useState<boolean>(false)

    //Renombrar sección modifica LeadFieldSection (PUT /lead_field_sections/{id}) -> permiso propio,
    //no "lead_field:update".
    const { hasPermission } = useUserContext()
    const canRenameSection = hasPermission("lead_field_section:update")

    //-------------------------- Renombrar sección con doble clic sobre su nombre --------------------------
    //Se guarda tanto el id de la sección en edición como el borrador de texto (en vez de mutar
    //directamente `newFieldsBySectionIds`) para no interferir con el estado de reordenamiento.
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null)
    const [editingSectionName, setEditingSectionName] = useState("")

    const startEditingSectionName = useCallback((sectId: number, currentName: string) => {
        setEditingSectionId(sectId)
        setEditingSectionName(currentName)
    }, [])

    const cancelEditingSectionName = useCallback(() => {
        setEditingSectionId(null)
        setEditingSectionName("")
    }, [])

    const saveEditingSectionName = useCallback((sectId: number, currentColor: string | undefined, originalName: string) => {
        const trimmed = editingSectionName.trim()
        //Sin cambios (o vacío): no hace falta llamar al backend.
        if (!trimmed || trimmed === originalName) return cancelEditingSectionName()
        //Sale del modo edición ya mismo (optimista), antes de esperar la respuesta: si no, un Enter
        //seguido de un blur casi inmediato (o viceversa) dispararía el guardado dos veces, porque el
        //campo seguiría montado y con el mismo texto "distinto al original" hasta que la promesa
        //resuelva y recién ahí se llame a cancelEditingSectionName.
        cancelEditingSectionName()
        return updateFieldSection({ name: trimmed, color: currentColor ?? "primary" }, sectId)
            .then(res => onSectionRenamed(sectId, res.name))
            .catch(e => showCommonErrorToast(e, "No se ha podido renombrar la sección"))
    }, [editingSectionName, cancelEditingSectionName, onSectionRenamed])

    // Deshabilitación de campos (toggle individual delegado al manager del listado)

    /**Devuelve la cantidad de items seleccionados por sección */
    const checkedBySectionId = useMemo(() => {
        const map = new Map<number, number>()
        for (const item of checkedItemsArray) {
            const sectId = item.lead_field_section.id
            map.set(sectId, (map.get(sectId) ?? 0) + 1)
        }
        return map
    }, [checkedItemsArray])

    //Reordena las secciones, no los campos.
    const { handleDragEnter, handleDragOver, handleDragStart, handleDrop, dragStyles } = useDragAndDrop(newFieldsBySectionIds, (i) => setNewFieldsBySectionIds(i))

    const fieldsMapBySection = useMemo(() => {
        if (!leadFields || leadFields.length === 0) return new Map()
        const sectionArray = getFieldsBySections(leadFields).map(section => ([section.id, section] as const))
        return new Map(sectionArray)
    }, [leadFields])

    return (
        <Box>
            {newFieldsBySectionIds.map((section, idx) => {
                const sectFields = showAll ? section.fields : section.fields.slice(0, MIN_FIELDS)
                const leadFieldsData = fieldsMapBySection.get(section.sectId)
                const sectionCheckedItems = checkedBySectionId.get(section.sectId) ?? 0
                if (!leadFieldsData) return
                return (
                    <Accordion expanded={openSectionIds.has(section.sectId)} component={GenericPaper} elevation={1} key={`${section.sectId}-acc`}
                        onChange={(_, expanded) => setOpenSectionIds(prev => {
                            const next = new Set(prev)
                            if (expanded) next.add(section.sectId)
                            else next.delete(section.sectId)
                            return next
                        })}
                        sx={[{ p: 0 }, isReordering ? dragStyles(idx, palette, "column", true) : {}]}
                        {...(isReordering ? {
                            onDragEnter: () => handleDragEnter(idx),
                            onDragOver: handleDragOver,
                            onDrop: () => handleDrop(idx)
                        } : {})}>
                        <ColoredAccordionSummary isFirst={idx === 0} isLast={idx === newFieldsBySectionIds.length - 1}
                            color={leadFieldsData.sectionData.color} expandIcon={<ExpandMoreIcon />}
                            aria-controls={`${section.sectId}-content`} id={`${section.sectId}-header`}>
                            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                                {!isReordering ?
                                    <Checkbox
                                        checked={section.fields.length === sectionCheckedItems}
                                        indeterminate={sectionCheckedItems > 0 && section.fields.length !== sectionCheckedItems}
                                        onClick={stopPropagationEvent()}
                                        onChange={(_, checked) => checked ? addItem(leadFieldsData.fields) : removeItem(leadFieldsData.fields)} /> :
                                    <CommonButton actionType="DRAG" draggable variant="contained" onlyTooltip color="primary"
                                        onClick={stopPropagationEvent()}
                                        onDragStart={() => handleDragStart(idx)} sx={{ cursor: "grab", px: 1.5, minWidth: 0 }} />
                                }
                                {editingSectionId === section.sectId ? (
                                    <TextField
                                        autoFocus
                                        variant="standard"
                                        value={editingSectionName}
                                        onChange={e => setEditingSectionName(e.target.value)}
                                        //Evita que el clic/doble-clic dentro del campo (posicionar el
                                        //cursor, seleccionar texto) burbujee hasta el AccordionSummary
                                        //y pliegue/despliegue la sección mientras se está escribiendo.
                                        onClick={stopPropagationEvent()}
                                        onDoubleClick={stopPropagationEvent()}
                                        onKeyDown={e => {
                                            if (e.key === "Enter") {
                                                e.preventDefault()
                                                saveEditingSectionName(section.sectId, leadFieldsData.sectionData.color, section.sectName)
                                            }
                                            if (e.key === "Escape") {
                                                e.preventDefault()
                                                cancelEditingSectionName()
                                            }
                                        }}
                                        onBlur={() => saveEditingSectionName(section.sectId, leadFieldsData.sectionData.color, section.sectName)}
                                        sx={{ flexGrow: 1, py: .5, "& .MuiInputBase-input": { fontSize: "1.25rem", fontWeight: 500 } }} />
                                ) : (
                                    <Typography variant="h3" sx={{ py: .5, flexGrow: 1, cursor: isReordering ? "default" : "text" }}
                                        //El nombre de la sección deja de reaccionar al clic simple (no
                                        //pliega/despliega si se toca justo el texto), para que un doble
                                        //clic pueda entrar en modo edición sin que el acordeón parpadee
                                        //abriéndose y cerrándose de paso. El resto del encabezado (fondo,
                                        //checkbox, flecha) sigue plegando/desplegando con un clic normal.
                                        onClick={stopPropagationEvent()}
                                        onDoubleClick={(isReordering || !canRenameSection) ? undefined : stopPropagationEvent(() => startEditingSectionName(section.sectId, section.sectName))}>
                                        {section.sectName}
                                    </Typography>
                                )}
                                {sectionCheckedItems > 0 &&
                                    <Typography variant="body1" sx={{ fontStyle: "italic", py: .5, flexGrow: 1 }}>
                                        {`- ${sectionCheckedItems === 1 ? "1 item seleccionado" : `${sectionCheckedItems} items seleccionados`} `}
                                    </Typography>
                                }
                            </Stack>
                        </ColoredAccordionSummary>
                        <AccordionDetails>
                            <TableContainer component={Paper} elevation={4} key={`section-${section.sectId}`}>
                                <LeadFieldTable sectLeadFields={leadFieldsData.fields} orderFieldsIds={sectFields}
                                    setOrderFieldsIds={setNewFieldsBySectionIds} sectIdx={idx} palette={palette} isReordering={isReordering}
                                    handleSidebar={handleSidebarWrapper} handleToggle={handleToggle} checkedItems={checkedItems}
                                    addItem={addItem} removeItem={removeItem} />
                                {sectFields.length > MIN_FIELDS &&
                                    <CommonButton actionType={showAll ? "MINUS" : "CREATE"} onClick={() => setShowAll(!showAll)} fullWidth>
                                        {showAll ? "Mostrar Menos" : "Mostrar Todos"}
                                    </CommonButton>}
                            </TableContainer>
                        </AccordionDetails>
                    </Accordion >
                )
            })
            }
        </Box >
    )
}

interface LeadFieldTableProps {
    sectLeadFields: LeadFieldDetailed[],
    orderFieldsIds: string[],
    setOrderFieldsIds: React.Dispatch<React.SetStateAction<ReorderFieldsIds[]>>,
    sectIdx: number,
    handleSidebar: (mode: string, entity: LeadFieldDetailed) => void,
    handleToggle: (field: LeadFieldDetailed) => void,
    isReordering: boolean,
    palette: Palette,
    checkedItems: Map<number, LeadFieldDetailed>,
    addItem: (item: LeadFieldDetailed | LeadFieldDetailed[]) => void,
    removeItem: (item: LeadFieldDetailed | LeadFieldDetailed[]) => void

}

export const LeadFieldTable = memo(({ sectLeadFields, orderFieldsIds, setOrderFieldsIds, sectIdx, palette,
    isReordering = false, handleSidebar, handleToggle, checkedItems, addItem, removeItem }: LeadFieldTableProps) => {

    const handleFieldChange = (fields: string[]) => {
        setOrderFieldsIds(prev => {
            const newList = [...prev]
            newList[sectIdx].fields = fields
            return newList
        })
    }

    const { handleDragEnter, handleDragOver, handleDragStart, handleDrop, dragStyles } = useDragAndDrop(orderFieldsIds, handleFieldChange)

    //Precalcula el estilo para evitar rerenderizados
    const dragStyleList = useMemo(() => {
        return orderFieldsIds.map((_, idx) => dragStyles(idx, palette, "column", true))
    }, [dragStyles, orderFieldsIds, palette])

    return (
        <Table size='small'>
            <TableHead>
                <TableRow>
                    <TableCell>
                    </TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell align="left">Tipo</TableCell>
                    <TableCell align="right">Obligatorio</TableCell>
                    <TableCell align="right">Único</TableCell>
                    <TableCell align="right">Visible</TableCell>
                    {!isReordering && <TableCell align="right">Acciones</TableCell>}
                </TableRow>
            </TableHead>
            <TableBody>
                {orderFieldsIds
                    .map((rowId, idx) => {
                        const rowData = sectLeadFields.find(field => field.id === rowId)
                        if (!rowData) return
                        return <SelectableTableRow key={rowData.id} onClick={() => !isReordering ? handleSidebar("DETAILS_FIELD", rowData) : {}}
                            sx={isReordering ? dragStyleList[idx] : {}}
                            {...(isReordering ? {
                                onDragEnter: () => handleDragEnter(idx),
                                onDragOver: handleDragOver,
                                onDrop: () => handleDrop(idx)
                            } : {})}>
                            <TableCell padding="checkbox" onClick={stopPropagationEvent()}>
                                {!isReordering ?
                                    <Checkbox onClick={stopPropagationEvent()} checked={checkedItems.has(rowData.id)}
                                        onChange={(_, checked) => checked ? addItem(rowData) : removeItem(rowData)} /> :
                                    <CommonButton actionType="DRAG" draggable variant="contained" onlyTooltip color="primary"
                                        size="small" onClick={stopPropagationEvent()}
                                        onDragStart={() => handleDragStart(idx)} sx={{ cursor: "grab", px: 2, minWidth: 0 }} />
                                }
                            </TableCell>
                            <LeadFieldTableCells row={rowData} />
                            {!isReordering &&
                                <TableCell align="right">
                                    <Stack direction="row" sx={{ justifyContent: "end" }} className="table-actions">
                                        <CommonIconButton actionType="DETAILS" title="Detalle" tooltipSize="small" size="small"
                                            onClick={stopPropagationEvent(() => handleSidebar("DETAILS_FIELD", rowData))} />
                                        {orderFieldsIds.length > 1 &&
                                            <>
                                                <Can permission="lead_field:update">
                                                    <CommonIconButton actionType="MODIFY" title="Modificar" tooltipSize="small" size="small"
                                                        onClick={stopPropagationEvent(() => handleSidebar("UPDATE_FIELD", rowData))} />
                                                </Can>
                                                <Can permission={rowData.active ? "lead_field:delete" : "lead_field:update"}>
                                                    <CommonIconButton actionType={rowData.active ? "DISABLE" : "ENABLE"} tooltipSize="small" size="small"
                                                        title={rowData.active ? "Deshabilitar" : "Habilitar"}
                                                        onClick={stopPropagationEvent(() => handleToggle(rowData))} color={rowData.active ? "error" : "success"} />
                                                </Can>
                                            </>}
                                    </Stack>
                                </TableCell>
                            }
                        </SelectableTableRow>
                    })
                }
            </TableBody>
        </Table>
    )
})

export const LeadFieldTableCells = memo(({ row }: { row: LeadFieldDetailed }) => {
    return (
        <>
            <TableCell component="th">
                <Stack spacing={1} direction="row">
                    <EnabledIcon active={row.active} size="small" />
                    <Box sx={{ fontWeight: "bold" }}>{row.name} </Box>
                </Stack>
            </TableCell>
            <TableCell align="left">
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <span>{row.field_type.description}</span>
                    {row.field_subtype ? <>
                        <ArrowForwardIcon fontSize="small" />
                        <span>{row.field_subtype?.description}</span>
                    </> : ""}
                </Stack>
            </TableCell>
            <TableCell align="right">
                <EnabledIcon active={row.required} trueTooltip='Obligatorio' falseTooltip='Opcional' size="small" />
            </TableCell>
            <TableCell align="right">
                <EnabledIcon active={row.is_primary} trueTooltip='Único' falseTooltip='Repetible' size="small" />
            </TableCell>
            <TableCell align="right">
                <EnabledIcon active={row.is_visible} trueTooltip='Visible' falseTooltip='Oculto' size="small" />
            </TableCell>
        </>
    )
})