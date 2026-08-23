import { useEffect, useState, useCallback, useRef } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Box, CircularProgress, alpha } from '@mui/material';
import { LeadBoardColumn } from './LeadBoardColumn';
import { changeContactStateLead } from '../../leadService';
import { getLeadContactStates } from 'src/features/orgProperties/contactState/contactStatesServices';
import type { LeadContactState } from 'src/types/orgProperties';
import type { BoardCardFieldCode } from '../../boardCardFields';

interface LeadBoardPresentationProps {
    campaignId: number | string;
    activeFilters: unknown[];
    searchQuery?: string;
    cardFields: BoardCardFieldCode[];
    // Clic simple: abre el sidebar de detalle rápido. Ir al detalle completo es explícito, con el
    // ícono de la card.
    onLeadClick?: (id: string) => void;
}

export const LeadBoardPresentation = ({ campaignId, activeFilters, searchQuery, cardFields, onLeadClick }: LeadBoardPresentationProps) => {
    const [columns, setColumns] = useState<LeadContactState[]>([]);
    const [loading, setLoading] = useState(true);

    const scrollContainerRef = useRef<HTMLElement | null>(null);
    const isDraggingRef = useRef(false);

    // 1. Cargar estados
    useEffect(() => {
        getLeadContactStates({ page_size: 0, only_active: true })
            .then(res => setColumns(res.items))
            .finally(() => setLoading(false));
    }, []);

    // 2. Motor de auto-scroll horizontal durante drag de leads
    useEffect(() => {
        let animationFrameId: number;
        let currentMouseX = -1;

        const handleMouseMove = (e: MouseEvent) => { currentMouseX = e.clientX; };
        const handleMouseUp = () => { isDraggingRef.current = false; };

        const autoScroll = () => {
            if (isDraggingRef.current && scrollContainerRef.current && currentMouseX !== -1) {
                const container = scrollContainerRef.current;
                const rect = container.getBoundingClientRect();
                const scrollZone = 150;
                const speed = 15;
                if (currentMouseX > rect.left && currentMouseX < rect.left + scrollZone) {
                    container.scrollLeft -= speed;
                } else if (currentMouseX < rect.right && currentMouseX > rect.right - scrollZone) {
                    container.scrollLeft += speed;
                }
            }
            animationFrameId = requestAnimationFrame(autoScroll);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp, { capture: true });
        animationFrameId = requestAnimationFrame(autoScroll);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp, { capture: true });
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const onDragStart = useCallback(() => {
        isDraggingRef.current = true;
    }, []);

    // Solo maneja leads — columnas ya no son arrastrables
    const onDragEnd = useCallback(async (result: DropResult) => {
        isDraggingRef.current = false;
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // leadId (draggableId) y destinationId (droppableId) son los uuid de Lead y
        // LeadContactState -- antes se forzaban a Number(), lo que mandaba NaN a
        // changeContactStateLead y rompía el cambio de estado al arrastrar una card entre
        // columnas.
        const leadId = draggableId;
        const sourceId = source.droppableId;
        const destinationId = destination.droppableId;

        window.dispatchEvent(new CustomEvent('lead-moved', {
            detail: { leadId, sourceId, destinationId, sourceIndex: source.index, destinationIndex: destination.index }
        }));

        if (sourceId !== destinationId) {
            try {
                await changeContactStateLead(leadId, destinationId);
            } catch (error) {
                console.error("Error al cambiar el estado del lead", error);
                window.dispatchEvent(new CustomEvent('lead-moved', {
                    detail: {
                        leadId,
                        sourceId: destinationId,
                        destinationId: sourceId,
                        sourceIndex: destination.index,
                        destinationIndex: source.index
                    }
                }));
            }
        }
    }, []);

    if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;

    return (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <Box
                ref={(node: HTMLElement | null) => { scrollContainerRef.current = node; }}
                className="scrollbar-thin"
                sx={{
                    display: 'flex',
                    overflowX: 'auto',
                    height: 'calc(100vh - 250px)',
                    gap: 2,
                    p: 2,
                    borderRadius: 3,
                    background: theme => `
                        radial-gradient(ellipse at 15% 10%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 45%),
                        radial-gradient(ellipse at 85% 85%, ${alpha(theme.palette.secondary.main, 0.08)} 0%, transparent 45%),
                        ${theme.palette.background.default}
                    `,
                }}
            >
                {columns.map((column) => (
                    <LeadBoardColumn
                        key={column.id}
                        column={column}
                        campaignId={campaignId}
                        activeFilters={activeFilters}
                        searchQuery={searchQuery}
                        cardFields={cardFields}
                        onLeadClick={onLeadClick}
                    />
                ))}
            </Box>
        </DragDropContext>
    );
};