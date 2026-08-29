import type { Metadata } from "./shared";

export const TriggerEventEnum = {
  ON_CREATE: "ON_CREATE",
  ON_UPDATE: "ON_UPDATE",
} as const;
export type TriggerEventEnum = typeof TriggerEventEnum[keyof typeof TriggerEventEnum];

export const LogicalOperatorEnum = {
  AND: "AND",
  OR: "OR",
} as const;
export type LogicalOperatorEnum = typeof LogicalOperatorEnum[keyof typeof LogicalOperatorEnum];

export const ConditionOperatorEnum = {
  EQUALS: "EQUALS",
  NOT_EQUALS: "NOT_EQUALS",
  CONTAINS: "CONTAINS",
  NOT_CONTAINS: "NOT_CONTAINS",
  GREATER_THAN: "GREATER_THAN",
  LESS_THAN: "LESS_THAN",
  IS_EMPTY: "IS_EMPTY",
  IS_NOT_EMPTY: "IS_NOT_EMPTY",
  // Agregados 2026-08-15: ya existían en el backend (ConditionOperatorEnum,
  // AUTOMATION_COMPATIBILITY_MATRIX) pero nunca se habían sumado acá -- una condición
  // guardada con alguno de estos operadores no matcheaba ningún MenuItem del selector
  // (ver ConditionRow.tsx), mostrándose vacía/rota en el detalle.
  STARTS_WITH: "STARTS_WITH",
  ENDS_WITH: "ENDS_WITH",
  IS_PAST: "IS_PAST",
  IS_FUTURE: "IS_FUTURE",
} as const;
export type ConditionOperatorEnum = typeof ConditionOperatorEnum[keyof typeof ConditionOperatorEnum];

export const ActionTypeEnum = {
  SET_VALUE: "SET_VALUE",
  CLEAR_VALUE: "CLEAR_VALUE",
  COPY_FROM_FIELD: "COPY_FROM_FIELD",
  SET_CURRENT_DATE: "SET_CURRENT_DATE",
  SET_CURRENT_DATETIME: "SET_CURRENT_DATETIME",
  // Agregados 2026-08-15: mismo caso que los operadores de arriba -- ya existían en el
  // backend (ActionTypeEnum, AUTOMATION_COMPATIBILITY_MATRIX) pero el selector de
  // "Tipo de acción" (ActionRow.tsx) solo ofrecía 3 de los 13 tipos reales, así que una
  // acción guardada con alguno de estos no se podía mostrar ni editar bien.
  INCREMENT: "INCREMENT",
  DECREMENT: "DECREMENT",
  APPEND_TO_LIST: "APPEND_TO_LIST",
  REMOVE_FROM_LIST: "REMOVE_FROM_LIST",
  SET_DATE_OFFSET: "SET_DATE_OFFSET",
  SET_VALUE_IF_EMPTY: "SET_VALUE_IF_EMPTY",
  NORMALIZE_TEXT: "NORMALIZE_TEXT",
  CONCAT_FIELDS: "CONCAT_FIELDS",
} as const;
export type ActionTypeEnum = typeof ActionTypeEnum[keyof typeof ActionTypeEnum];

// ==========================================
// INTERFACES
// ==========================================
export interface RuleCondition {
  id?: string;
  type?: 'condition';
  // string (public_uuid) para campos custom, number (negativo) para campos nativos --
  // mismo criterio que LeadField.id (ver types/leadFields.ts). Antes decía solo
  // `string | null`, lo que no reflejaba que también se pueden armar condiciones sobre
  // campos nativos (Usuario Creador, Fecha de creación, etc.).
  field_id: string | number | null;
  operator: ConditionOperatorEnum;
  value?: string | number | boolean | null;
}

export interface RuleGroup {
  id?: string;
  type?: 'group';
  operator: LogicalOperatorEnum;
  rules: (RuleCondition | RuleGroup)[];
}

export interface AutomationAction {
  id?: string;
  type: ActionTypeEnum;
  // Mismo criterio que RuleCondition.field_id de arriba (antes decía solo `number`, lo
  // que no reflejaba los campos custom con public_uuid string).
  target_field_id: string | number | null;
  value?: string | number | boolean | null;
  source_field_id?: string | number | null;
  // Usado solo por CONCAT_FIELDS (varios campos de origen, no uno solo).
  source_field_ids?: (string | number)[] | null;
}

export interface FieldAutomationPost {
  name: string;
  description?: string;
  campaign_id: string;
  trigger_events: TriggerEventEnum[];
  priority: number;
  conditions: RuleGroup;
  actions: AutomationAction[];
}

export interface FieldAutomation extends FieldAutomationPost {
  id: string;
}

export interface FieldAutomationDetailed extends FieldAutomation, Metadata {
  // Resumen legible ("Si <condiciones> entonces <acciones>") armado por el backend al vuelo
  // (ver backend/app/services/field_automation_summary.py) -- no viene en create/update, solo
  // en GET detallado. Se muestra como subtítulo en AutomationList.tsx en vez de `description`
  // (texto libre manual, pedido por el usuario 2026-08-29).
  summary?: string | null;
}

// ==========================================
// LABELS Y DESCRIPCIONES
// ==========================================
export const TRIGGER_EVENT_LABELS: Record<TriggerEventEnum, string> = {
  [TriggerEventEnum.ON_CREATE]: 'Al crear registro',
  [TriggerEventEnum.ON_UPDATE]: 'Al actualizar registro',
};

export const CONDITION_OPERATOR_LABELS: Record<ConditionOperatorEnum, string> = {
  [ConditionOperatorEnum.EQUALS]: 'Es igual a',
  [ConditionOperatorEnum.NOT_EQUALS]: 'No es igual a',
  [ConditionOperatorEnum.CONTAINS]: 'Contiene',
  [ConditionOperatorEnum.NOT_CONTAINS]: 'No contiene',
  [ConditionOperatorEnum.GREATER_THAN]: 'Mayor que',
  [ConditionOperatorEnum.LESS_THAN]: 'Menor que',
  [ConditionOperatorEnum.IS_EMPTY]: 'Está vacío',
  [ConditionOperatorEnum.IS_NOT_EMPTY]: 'No está vacío',
  [ConditionOperatorEnum.STARTS_WITH]: 'Empieza con',
  [ConditionOperatorEnum.ENDS_WITH]: 'Termina con',
  [ConditionOperatorEnum.IS_PAST]: 'Es una fecha pasada',
  [ConditionOperatorEnum.IS_FUTURE]: 'Es una fecha futura',
};

export const ACTION_TYPE_LABELS: Record<ActionTypeEnum, string> = {
  [ActionTypeEnum.SET_VALUE]: 'Establecer valor',
  [ActionTypeEnum.CLEAR_VALUE]: 'Limpiar valor',
  [ActionTypeEnum.COPY_FROM_FIELD]: 'Copiar de otro campo',
  [ActionTypeEnum.SET_CURRENT_DATE]: 'Establecer fecha actual',
  [ActionTypeEnum.SET_CURRENT_DATETIME]: 'Establecer fecha y hora actual',
  [ActionTypeEnum.INCREMENT]: 'Incrementar',
  [ActionTypeEnum.DECREMENT]: 'Decrementar',
  [ActionTypeEnum.APPEND_TO_LIST]: 'Agregar a la lista',
  [ActionTypeEnum.REMOVE_FROM_LIST]: 'Quitar de la lista',
  [ActionTypeEnum.SET_DATE_OFFSET]: 'Establecer fecha relativa a hoy',
  [ActionTypeEnum.SET_VALUE_IF_EMPTY]: 'Establecer valor si está vacío',
  [ActionTypeEnum.NORMALIZE_TEXT]: 'Normalizar texto',
  [ActionTypeEnum.CONCAT_FIELDS]: 'Concatenar campos',
};

export const ACTION_TYPE_DESCRIPTIONS: Record<ActionTypeEnum, string> = {
  [ActionTypeEnum.SET_VALUE]: 'Asigna un valor específico al campo de destino',
  [ActionTypeEnum.CLEAR_VALUE]: 'Limpia/vacía el valor del campo de destino',
  [ActionTypeEnum.COPY_FROM_FIELD]: 'Copia el valor de otro campo al campo de destino',
  [ActionTypeEnum.SET_CURRENT_DATE]: 'Establece la fecha actual en el campo',
  [ActionTypeEnum.SET_CURRENT_DATETIME]: 'Establecer fecha y hora actual en el campo',
  [ActionTypeEnum.INCREMENT]: 'Suma una cantidad (1 por defecto) al valor numérico actual',
  [ActionTypeEnum.DECREMENT]: 'Resta una cantidad (1 por defecto) al valor numérico actual',
  [ActionTypeEnum.APPEND_TO_LIST]: 'Agrega un valor a la lista del campo, sin duplicarlo si ya está',
  [ActionTypeEnum.REMOVE_FROM_LIST]: 'Quita un valor de la lista del campo',
  [ActionTypeEnum.SET_DATE_OFFSET]: 'Establece una fecha relativa a hoy, en días (positivo = futuro, negativo = pasado)',
  [ActionTypeEnum.SET_VALUE_IF_EMPTY]: 'Asigna un valor solo si el campo de destino está vacío -- no pisa un valor ya cargado',
  [ActionTypeEnum.NORMALIZE_TEXT]: 'Convierte el texto a mayúsculas, minúsculas, o le quita espacios sobrantes',
  [ActionTypeEnum.CONCAT_FIELDS]: 'Une el valor de varios campos en uno solo, separados por un texto',
};

export const LOGICAL_OPERATOR_LABELS: Record<LogicalOperatorEnum, string> = {
  [LogicalOperatorEnum.AND]: 'Y (todas deben cumplirse)',
  [LogicalOperatorEnum.OR]: 'O (al menos una debe cumplirse)',
};
