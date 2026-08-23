import { Draggable } from '@hello-pangea/dnd';
import { Card, Typography, Box, Avatar, IconButton, Stack, Tooltip, alpha } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CancelIcon from '@mui/icons-material/Cancel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { Lead } from 'src/types/leads';
import { getLeadTitleArray, getLeadSubtitleArray } from '../../leadUtils';
import CustomChip from 'shared/ui/details/CustomChip';
import ReferenceChip from 'shared/ui/details/ReferenceChip';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from 'shared/ui/details/UserAvatar';
import { CATEGORY_CONFIG } from 'src/features/leadFlows/leadFlowServices/leadFlowUtils';
import type { StateCategory } from 'src/types/leadFlow';
import type { BoardCardFieldCode } from '../../boardCardFields';
import { formatUserFullName } from 'src/utils/formatters';

interface LeadBoardCardProps {
    lead: Lead;
    index: number;
    columnColor?: string;
    observerRef?: (node: HTMLDivElement | null) => void;
    cardFields: BoardCardFieldCode[];
    // Clic simple: abre el sidebar de detalle rápido (si no se pasa, cae al comportamiento viejo
    // de navegar directo). Ir al detalle completo ahora es siempre explícito, con el ícono de la
    // esquina superior derecha -- ya no hay doble clic.
    onLeadClick?: (id: string) => void;
}

// Mismo criterio que getCategoryIcon en LeadDetailsState.tsx (detalle del lead) -- se repite acá
// en chico en vez de exportarlo, para no acoplar ese componente (pensado para la vista de
// detalle) a la tarjeta del tablero.
const getCategoryIcon = (category: StateCategory, sx?: object) => {
    switch (category) {
        case 'WON': return <EmojiEventsIcon sx={sx} />
        case 'LOST': return <CancelIcon sx={sx} />
        default: return null
    }
}

export const LeadBoardCard = ({ lead, index, columnColor, observerRef, cardFields, onLeadClick }: LeadBoardCardProps) => {
    const navigate = useNavigate();
    const titleArray = getLeadTitleArray(lead);
    //Antes esto tomaba solo el primer campo del título como "nombre" y dejaba el resto (ej.
    //Apellido) como subtítulo de relleno, a falta de un subtítulo real. Ahora que existe
    //subtitle_order (Cargo/Empresa, configurable desde "Configurar título"), el título se muestra
    //completo y el subtítulo usa ese campo real en su lugar.
    const mainTitle = titleArray.join(" ") || "Sin nombre";
    // El título (mainTitle) siempre se muestra -- es el identificador principal de la tarjeta,
    // no forma parte de la configuración de "Elementos de la Tarjeta". El resto sí es condicional.
    const showSubtitle = cardFields.includes('subtitle');
    const showStage = cardFields.includes('current_state');
    const showTeam = cardFields.includes('team');
    const showAssignedUser = cardFields.includes('assigned_user');
    const showReference = cardFields.includes('reference');
    const subTitle = showSubtitle ? getLeadSubtitleArray(lead).join(" ") : "";
    // Tooltips: antes mostraban el rótulo genérico ("Equipo asignado" / "Usuario asignado") en
    // vez del valor -- lo que interesa al pasar el mouse es a quién/qué equipo está asignado.
    const teamName = lead.team?.name || "Equipo asignado";
    const assignedUserName = formatUserFullName(lead.assigned_to_user) || lead.assigned_to_user?.email || "Usuario asignado";

    return (
        <Draggable draggableId={String(lead.id)} index={index}>
            {(provided, snapshot) => (
                <Card
                    ref={(node) => {
                        provided.innerRef(node);
                        if (observerRef) observerRef(node);
                    }}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    elevation={0}
                    onClick={() => {
                        if (snapshot.isDragging) return
                        if (onLeadClick) onLeadClick(String(lead.id)); else navigate(`/leads/${lead.id}`)
                    }}
                    sx={{
                        p: 2,
                        mb: 1.5,
                        borderRadius: 2,
                        cursor: snapshot.isDragging ? 'grabbing' : 'pointer',
                        // Fondo sólido para que se distinga claramente del fondo del board
                        backgroundColor: 'background.paper',
                        // Accent border izquierdo con el color de la columna
                        borderLeft: `3px solid ${columnColor || 'transparent'}`,
                        // Sombra en capas: cercanía + profundidad + tinte del color de columna
                        boxShadow: columnColor
                            ? `0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)`
                            : `0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)`,
                        transition: snapshot.isDragging
                            ? 'none'
                            : 'transform 0.15s ease, box-shadow 0.15s ease',
                        ...(!snapshot.isDragging && {
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: columnColor
                                    ? `0 4px 8px rgba(0,0,0,0.1), 0 12px 28px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04), 0 0 16px ${alpha(columnColor, 0.15)}`
                                    : `0 4px 8px rgba(0,0,0,0.1), 0 12px 28px rgba(0,0,0,0.12)`,
                            },
                        }),
                    }}
                    // VITAL: físicas exactas calculadas por la librería (evita el salto lateral)
                    style={provided.draggableProps.style}
                >
                    <Stack spacing={1.5}>
                        {/* Etiquetas arriba de todo (como en Trello) -- pedido del usuario para
                            que sean lo primero que se ve y no compitan por espacio con el título.
                            `squared` las distingue del resto de los chips de la tarjeta (etapa,
                            referencia), que mantienen el redondeo original. */}
                        {lead.tags && lead.tags.length > 0 && (
                            <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }} useFlexGap>
                                {lead.tags.map(tag => (
                                    <CustomChip
                                        key={tag.id}
                                        label={tag.name}
                                        chipColor={tag.color}
                                        size="small"
                                        squared
                                    />
                                ))}
                            </Stack>
                        )}

                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <UserAvatar
                                name={mainTitle}
                                src={lead.picture_avatar_url || undefined}
                                size={40}
                                sx={columnColor ? {
                                    outline: `2px solid ${alpha(columnColor, 0.4)}`,
                                    outlineOffset: '1px',
                                } : undefined}
                            />
                            <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
                                {/* Tooltip solo en título/subtítulo -- son los únicos datos de la
                                    tarjeta que hoy se truncan (noWrap); el resto de los chips no
                                    tienen ancho máximo fijado, así que no se cortan. */}
                                <Tooltip title={mainTitle}>
                                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: "bold" }}>
                                        {mainTitle}
                                    </Typography>
                                </Tooltip>
                                {subTitle && (
                                    <Tooltip title={subTitle}>
                                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                                            {subTitle}
                                        </Typography>
                                    </Tooltip>
                                )}
                            </Box>
                            <Tooltip title="Ver detalle completo">
                                <IconButton size="small" onClick={e => { e.stopPropagation(); navigate(`/leads/${lead.id}`) }}>
                                    <OpenInNewIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Stack>

                        {showStage && lead.current_state && (
                            <Box>
                                <CustomChip
                                    chipColor={lead.current_state.color || CATEGORY_CONFIG[lead.current_state.category]?.color || "secondary"}
                                    icon={getCategoryIcon(lead.current_state.category, { fontSize: "inherit" }) ?? undefined}
                                    label={lead.current_state.name}
                                    size="small"
                                />
                            </Box>
                        )}

                        {((showReference && lead.reference) || (showTeam && lead.team_id) || (showAssignedUser && lead.assigned_to_user_id)) && (
                            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }} spacing={1}>
                                {/* Referencia siempre en esta esquina (izquierda), aunque no haya
                                    equipo/usuario asignado -- por eso el Box (no un Fragment): con
                                    justifyContent "space-between" hace falta un segundo elemento
                                    para que el grupo de la derecha no termine pegado a la izquierda. */}
                                <Box>
                                    {showReference && lead.reference && (
                                        <ReferenceChip reference={lead.reference} />
                                    )}
                                </Box>
                                <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
                                    {showTeam && lead.team_id && (
                                        <Tooltip title={teamName}>
                                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'secondary.main' }}>
                                                <GroupsIcon sx={{ fontSize: 16 }} />
                                            </Avatar>
                                        </Tooltip>
                                    )}
                                    {showAssignedUser && lead.assigned_to_user_id && (
                                        <Tooltip title={assignedUserName}>
                                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                                                <PersonIcon sx={{ fontSize: 16 }} />
                                            </Avatar>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Stack>
                        )}
                    </Stack>
                </Card>
            )
            }
        </Draggable >
    );
};
