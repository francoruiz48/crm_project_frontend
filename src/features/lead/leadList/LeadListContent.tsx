
import { memo, useMemo } from "react"
import { LeadTablePresentation } from "./LeadTablePresentation"
import CommonButton from "shared/ui/buttons/CommonButton"
import { useDragAndDrop } from "src/hooks/useDragAndDrop"
import type { LeadField } from "src/types/leadFields"
import type { Lead } from "src/types/leads"
import { Link } from "react-router-dom"
import { Stack, Typography, ButtonGroup } from "@mui/material"
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import { LeadBoardPresentation } from "./board/LeadBoardPresentation"
import { Can } from "src/components/auth/Can"
import type { BoardCardFieldCode } from "../boardCardFields"

interface LeadListContentProps {
    leads: Lead[],
    leadFields: LeadField[],
    selectedFieldIds: string[],
    cardFields: BoardCardFieldCode[],
    activeFilters: number,
    modalProps: {
        openModalId?: string;
        handleOpen: (idModal: string) => void;
        handleClose: () => void;
    },
    orderProps: {
        orderBy: string | number | null;
        ascending: boolean;
        handleOrderList: (field: string | number | null) => void;
    },
    handleSelectedFieldIds: (ids: string[], closeModal?: boolean) => void,
    selectCheckboxProps: {
        checkedItems: Map<string, Lead>;
        addItem: (item: Lead | Lead[]) => void;
        removeItem: (item: Lead) => void;
        removeAllItems: () => void;
    },
    presentationMode: string,
    // Acá solo se usan para armar un query string, no hace falta el id interno.
    workspaceId?: string | number,
    campaignId?: number | string,
    filters: unknown[],
    // Texto libre buscado (ya debounceado), para que el modo Tablero -- que carga sus propios
    // leads por columna, no depende de este array `leads` -- también pueda filtrar por búsqueda.
    searchQuery?: string,
    onClearFilters?: () => void,
    // Clic simple: abre el sidebar de detalle rápido (LeadDetailsSidebar, ver LeadListPage). Ir al
    // detalle completo es explícito, con el ícono de la fila/card -- ya no hay doble clic.
    onLeadClick?: (id: string) => void,
}

/**
 * Wrapper del contenido, realiza la lógica de selectedColumns, y elige el modo de vista deseado.
 */
export const LeadListContent = memo(({ leads, leadFields, selectedFieldIds, cardFields, activeFilters = 0, modalProps, orderProps, handleSelectedFieldIds,
    selectCheckboxProps, presentationMode, workspaceId, campaignId, filters, searchQuery, onClearFilters, onLeadClick }: LeadListContentProps) => {

    //Filtra los objetos LeadField para seguir el orden del arreglo de ids.
    const selectedColumns = useMemo(() => {
        if (!leadFields || leadFields.length === 0) return []
        if (!selectedFieldIds || selectedFieldIds.length === 0) return []
        return leadFields.filter(leadField => selectedFieldIds.includes(`${leadField.id}`))
            .sort((a, b) => selectedFieldIds.indexOf(`${a.id}`) - selectedFieldIds.indexOf(`${b.id}`))
    }, [leadFields, selectedFieldIds])

    //Da los estilos y funcionalidad del drag and drop de columnas, a través de sus ids.
    const dragProps = useDragAndDrop(selectedFieldIds, (items) => handleSelectedFieldIds(items))

    // El board carga sus propios leads por columna — no depende de los arrays del padre
    if (presentationMode === "BOARD" && campaignId) {
        return <LeadBoardPresentation
            campaignId={campaignId}
            activeFilters={filters}
            searchQuery={searchQuery}
            cardFields={cardFields}
            onLeadClick={onLeadClick}
        />
    }

    if (leads.length === 0) return (
        <Stack spacing={3} sx={{ my: 3, alignItems: "center" }}>
            <Stack spacing={2} sx={{ alignItems: "center" }}>
                <Typography variant="h3">No hay leads para presentar</Typography>
                <Typography variant="h4">Agrega un lead nuevo{activeFilters > 0 && " o revisa los filtros activos"}</Typography>
            </Stack>
            <ButtonGroup>
                <Can permission="lead:create">
                    <CommonButton actionType="CREATE" color="primary" component={Link} to={`/leads/new?workspace=${workspaceId}&campaign=${campaignId}`}>
                        Agregar Lead
                    </CommonButton>
                </Can>
                {activeFilters > 0 && onClearFilters && (
                    <CommonButton
                        actionType="NONE"
                        color="secondary"
                        variant="outlined"
                        onClick={onClearFilters}
                        startIcon={<FilterAltOffIcon />}
                    >
                        Limpiar filtros
                    </CommonButton>
                )}
            </ButtonGroup>
        </Stack>
    )

    //Si hay leads, pero no hay columnas seleccionadas
    if (selectedColumns && selectedColumns?.length === 0) return (
        <Stack spacing={3} sx={{ my: 3, alignItems: "center" }}>
            <Stack spacing={2} sx={{ alignItems: "center" }}>
                <Typography variant="h3">No hay datos para presentar.</Typography>
                <Typography variant="h4">Revisa los campos seleccionados.</Typography>
            </Stack>
            <CommonButton actionType="OPTIONS" color="secondary" onClick={() => modalProps.handleOpen("columns_selector")}>
                Modificar Campos
            </CommonButton>
        </Stack>
    )

    switch (presentationMode) {
        case "LIST": return <p>Lista</p>
        case "GRID": return <p>Grid</p>
        default: return <LeadTablePresentation leads={leads} selectedColumns={selectedColumns}
            dragProps={dragProps} orderProps={orderProps} modalProps={modalProps} selectCheckboxProps={selectCheckboxProps}
            onLeadClick={onLeadClick} />
    }
})
