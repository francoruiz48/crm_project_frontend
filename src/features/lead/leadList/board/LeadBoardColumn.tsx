import { useState, useEffect, useCallback, useRef } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Stack, Typography, Box, alpha, CircularProgress, Chip, useTheme } from '@mui/material';
import type { LeadContactState } from 'src/types/orgProperties';
import type { Lead } from 'src/types/leads';
import { getFilteredLeads } from '../../leadService';
import { LeadBoardCard } from './LeadBoardCard';
import { getColorShades } from 'src/utils/formatters';
import type { BoardCardFieldCode } from '../../boardCardFields';

interface LeadBoardColumnProps {
    column: LeadContactState;
    campaignId: number | string;
    activeFilters: unknown[];
    searchQuery?: string;
    cardFields: BoardCardFieldCode[];
    onLeadClick?: (id: string) => void;
}

export const LeadBoardColumn = ({ column, campaignId, activeFilters, searchQuery, cardFields, onLeadClick }: LeadBoardColumnProps) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const theme = useTheme()

    const colorShades = getColorShades(column.color, theme)

    const leadsRef = useRef<Lead[]>([]);
    useEffect(() => {
        leadsRef.current = leads;
    }, [leads]);

    // Referencia para el intersection observer (scroll infinito)
    const observer = useRef<IntersectionObserver | null>(null);
    const lastLeadElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    // Resetea la paginación cuando cambian los filtros, la búsqueda de texto o la campaña,
    // para que el fetch siguiente siempre empiece desde la página 1
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage(1);
        setLeads([]);
        setHasMore(true);
        setTotalCount(0);
    }, [campaignId, column.id, activeFilters, searchQuery]);

    // Fetch leads — usa un flag para ignorar respuestas de requests cancelados
    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        // Enviamos el contact_state_id como filtro para esta columna específica
        const filters = [...activeFilters, { field_id: "contact_state_id", operator: "eq", value: column.id }];

        // campaignId antes se forzaba a Number(); eso mandaba NaN como filtro y rompía la carga
        // de leads del tablero. `query` (searchQuery) es el texto libre buscado desde el header
        // de LeadListPage -- antes nunca llegaba hasta acá, así que buscar por texto no filtraba
        // nada en modo Tablero.
        getFilteredLeads({ filters }, { campaign_id: campaignId, page, page_size: 15, query: searchQuery })
            .then(res => {
                if (cancelled) return;
                setLeads(prev => page === 1 ? res.items : [...prev, ...res.items]);
                setHasMore(res.page < res.total_pages);
                setTotalCount(res.total);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [campaignId, column.id, page, activeFilters, searchQuery]);

    useEffect(() => {
        const handleLeadMoved = (e: unknown) => {
            const { leadId, sourceId, destinationId, sourceIndex, destinationIndex } = e.detail;

            if (sourceId === String(column.id) && destinationId === String(column.id)) {
                setLeads(prevLeads => {
                    const newLeads = Array.from(prevLeads);
                    const [movedLead] = newLeads.splice(sourceIndex, 1);
                    newLeads.splice(destinationIndex, 0, movedLead);
                    return newLeads;
                });
                return;
            }

            if (sourceId === String(column.id)) {
                // 1. Buscamos el lead de forma pura y síncrona con useRef
                const leadToMove = leadsRef.current.find(l => l.id === leadId);

                // 2. Disparamos el evento AFUERA del setLeads (soluciona el bug del +2)
                if (leadToMove) {
                    // Nota: lead.contact_state_id sigue siendo el id interno (int, sin migrar),
                    // pero acá solo llega el uuid (destinationId) de la columna destino. No hay
                    // forma de reconstruir el int desde el frontend; este campo queda inconsistente
                    // en el objeto optimista, pero ninguna card lo lee (la posición en el tablero
                    // es puramente por columna/index), así que es inofensivo.
                    window.dispatchEvent(new CustomEvent('receive-lead', {
                        detail: { lead: { ...leadToMove, contact_state_id: destinationId }, destinationId, destinationIndex }
                    }));
                }

                // 3. Modificamos el estado normalmente
                setTotalCount(prev => Math.max(0, prev - 1));
                setLeads(prevLeads => prevLeads.filter(l => l.id !== leadId));
            }
        };

        const handleReceiveLead = (e: unknown) => {
            const { lead, destinationId, destinationIndex } = e.detail;
            if (destinationId === String(column.id)) {
                setTotalCount(prev => prev + 1);
                setLeads(prevLeads => {
                    const newLeads = Array.from(prevLeads);
                    if (!newLeads.find(l => l.id === lead.id)) {
                        newLeads.splice(destinationIndex, 0, lead);
                    }
                    return newLeads;
                });
            }
        };

        window.addEventListener('lead-moved', handleLeadMoved);
        window.addEventListener('receive-lead', handleReceiveLead);
        return () => {
            window.removeEventListener('lead-moved', handleLeadMoved);
            window.removeEventListener('receive-lead', handleReceiveLead);
        };
    }, [column.id]);

    return (
        <Box sx={{
            minWidth: 300,
            maxWidth: 300,
            backgroundColor: theme => theme.palette.mode === 'dark'
                ? 'rgba(18, 18, 35, 0.80)'
                : 'rgba(255, 255, 255, 0.78)',
            border: '1px solid',
            borderColor: theme => theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.9)',
            boxShadow: `
                inset 0 1px 0 rgba(255,255,255,0.18),
                0 -3px 20px ${alpha(colorShades.MAIN || '#888', 0.35)},
                0 4px 8px rgba(0,0,0,0.06),
                0 12px 32px rgba(0,0,0,0.10),
                0 24px 64px rgba(0,0,0,0.06)
            `,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            borderTop: `4px solid ${colorShades.MAIN || '#ccc'}`,
            height: '100%',
        }}>
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: theme => theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.06)',
                    userSelect: 'none',
                    background: `linear-gradient(to bottom, ${alpha(colorShades.MAIN || '#888', 0.14)}, ${alpha(colorShades.MAIN || '#888', 0.02)})`,
                    borderRadius: '12px 12px 0 0',
                }}
            >
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                        {column.name}
                    </Typography>
                    <Chip
                        label={totalCount}
                        size="small"
                        sx={{
                            backgroundColor: alpha(colorShades.MAIN || '#888', 0.18),
                            color: colorShades.MAIN || 'text.primary',
                            fontWeight: 'bold',
                            height: 22,
                            fontSize: '0.72rem',
                            border: `1px solid ${alpha(colorShades.MAIN || '#888', 0.3)}`,
                            '& .MuiChip-label': { px: 1 },
                        }}
                    />
                </Stack>
            </Box>

            <Droppable droppableId={String(column.id)} type="card">
                {(provided, snapshot) => (
                    <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="scrollbar-thin"
                        style={{ '--scrollbar-color': alpha(colorShades.MAIN || '#888', 0.45) } as React.CSSProperties}
                        sx={{
                            flexGrow: 1,
                            p: 1.5,
                            overflowY: 'auto',
                            minHeight: 120,
                            backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                            transition: 'background-color 0.2s ease',
                        }}
                    >
                        {leads.map((lead, index) => {
                            const isLast = index === leads.length - 1;
                            return (
                                <LeadBoardCard
                                    key={lead.id}
                                    lead={lead}
                                    index={index}
                                    columnColor={colorShades.MAIN}
                                    observerRef={isLast ? lastLeadElementRef : undefined}
                                    cardFields={cardFields}
                                    onLeadClick={onLeadClick}
                                />
                            );
                        })}
                        {provided.placeholder}
                        {loading && <CircularProgress size={24} sx={{ display: 'block', margin: 'auto', my: 2 }} />}
                    </Box>
                )}
            </Droppable>
        </Box>
    );
};