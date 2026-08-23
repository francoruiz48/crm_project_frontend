/**
 * Elementos togglables de la tarjeta del tablero (LeadBoardCard). El Título (campos
 * title_order) queda siempre fijo -- es el identificador principal de la tarjeta, no tiene
 * sentido ocultarlo -- así que no forma parte de esta lista. El Estado (contact_state) tampoco
 * se ofrece como opción: las columnas del tablero ya agrupan por ese campo, mostrarlo de nuevo
 * en la tarjeta sería redundante.
 *
 * Se persiste igual que selectedFieldIds (columnas de la tabla): localStorage por campaña +
 * ui_config.card_fields de la vista guardada (ver LeadListPage.tsx).
 */
export const BOARD_CARD_FIELD_OPTIONS = [
    { code: 'reference', label: 'Referencia' },
    { code: 'subtitle', label: 'Subtítulo' },
    { code: 'current_state', label: 'Etapa' },
    { code: 'team', label: 'Equipo asignado' },
    { code: 'assigned_user', label: 'Asignado a' },
] as const

export type BoardCardFieldCode = typeof BOARD_CARD_FIELD_OPTIONS[number]['code']

/** Default cuando no hay nada configurado todavía (campaña nueva, vista sin ui_config.card_fields): se muestra todo. */
export const DEFAULT_BOARD_CARD_FIELDS: BoardCardFieldCode[] = BOARD_CARD_FIELD_OPTIONS.map(o => o.code)
