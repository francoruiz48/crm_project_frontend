import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, TextField, Paper, Typography, Chip, alpha, Stack, Autocomplete, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { ActionTypeEnum, ACTION_TYPE_LABELS, ACTION_TYPE_DESCRIPTIONS, } from '../../types/automation';
import type { LeadField } from '../../types/leadFields';
import type { FieldAutomationPost } from '../../types/automation';
import { getNomenclatorItems } from '../nomenclators/nomenclatorService';
import type { NomenclatorItem } from '../../types/nomenclators';
import type { AutomationCompatibility } from 'src/types/shared';
import { useWatch, type Control, type Path, type UseFormRegister } from 'react-hook-form';
import { showCommonErrorToast } from 'src/utils/feedback';
import { useLoading } from 'src/hooks/useLoading';
import { ControlledAutocomplete } from 'src/components/ui/forms/CustomMultipleInputs';
import { ChipTooltip } from 'src/components/ui/details/ChipTooltip';
import { CommonIconButton } from 'src/components/ui/buttons/CommonIconButton';
import { ControlledNumber, RegisteredDateInput, RegisteredTextInput } from 'src/components/ui/forms/CustomInputs';
import { WRITABLE_NATIVE_KEYS, type NativeFieldOptions } from 'src/features/lead/nativeLeadFields';
import { ControlledFieldSelector } from 'src/components/ui/forms/FieldSelector';

// Devuelve las opciones reales {id, label} de un campo nativo tipo NATIVE_ID según su nativeKey
// (mismo criterio que ConditionRow.tsx/LeadFilters.tsx).
const getNativeIdOptions = (nativeKey: string | undefined, nativeOptions?: NativeFieldOptions): { id: number, label: string }[] => {
  if (!nativeKey || !nativeOptions) return [];
  switch (nativeKey) {
    case 'contact_state_id':
      return nativeOptions.contactStates.map(s => ({ id: s.id, label: s.name }));
    case 'current_state_id':
      return nativeOptions.leadStates.map(s => ({ id: s.id, label: s.name }));
    case 'team_id':
      return nativeOptions.teams.map(t => ({ id: t.id, label: t.name }));
    case 'assigned_to_user_id': case 'created_by': case 'updated_by':
      return nativeOptions.users.map(u => ({ id: u.id, label: u.name + (u.last_name ? ` ${u.last_name}` : '') }));
    default:
      return [];
  }
};

// Mismo alias que ConditionRow.tsx (ver ese archivo para la explicación completa): CHECKBOX/
// NATIVE_ID se comportan como SELECTOR, CALCULATED como NUMBER, BOOLEAN es un alias legado de
// BOOL -- ninguno de estos 4 tiene entrada propia en AUTOMATION_COMPATIBILITY_MATRIX (backend).
const MATRIX_TYPE_ALIAS: Record<string, string> = {
  CHECKBOX: 'SELECTOR',
  NATIVE_ID: 'SELECTOR',
  CALCULATED: 'NUMBER',
  BOOLEAN: 'BOOL',
};

// Usado como opciones del selector de "Tipo de acción" hasta que se elige un campo destino (sin
// campo no sabemos qué acciones tienen sentido) -- mismas 3 que ofrecía el selector antes de
// sumar la matrix completa.
const FALLBACK_ACTION_TYPES: ActionTypeEnum[] = [
  ActionTypeEnum.SET_VALUE, ActionTypeEnum.CLEAR_VALUE, ActionTypeEnum.COPY_FROM_FIELD,
];

const getActionColor = (type: ActionTypeEnum) => {
  switch (type) {
    case ActionTypeEnum.SET_VALUE: return 'primary';
    case ActionTypeEnum.CLEAR_VALUE: return 'error';
    case ActionTypeEnum.COPY_FROM_FIELD: return 'secondary';
    default: return 'primary';
  }
};

interface ActionRowProps {
  control: Control<FieldAutomationPost, unknown, FieldAutomationPost>,
  register: UseFormRegister<FieldAutomationPost>,
  onUpdate: (name: Path<FieldAutomationPost>, value?: string | number | boolean | (string | number)[] | null) => void
  onDelete: () => void;
  isOnly: boolean;
  index: number;
  fields: LeadField[];
  nativeOptions?: NativeFieldOptions;
  compatibilityMatrix?: AutomationCompatibility;
  readOnly?: boolean;
}

export const ActionRow = ({ control, register, onDelete, isOnly, index, fields, nativeOptions, compatibilityMatrix = {}, readOnly = false, onUpdate }: ActionRowProps) => {
  // 1. FILTRADO DE CAMPOS PARA ACCIONES
  const allowedTargetFields = useMemo(() => {
    const invalidTargetTypes = ['CALCULATED', 'LEAD', 'FILE'];
    const invalidTargetSubtypes = ['PASSWORD'];

    return fields.filter(f => {
      if (invalidTargetTypes.includes(f.field_type.code)) return false;
      if (f.field_subtype_code && invalidTargetSubtypes.includes(f.field_subtype_code)) return false;
      // Campos nativos de solo lectura (Fecha de creación/actualización, Usuario Creador/Modificación).
      // Se pueden leer en condiciones y usar como origen de "Copiar de otro campo", pero no "setearlos" a mano.
      if (f.id < 0 && f.nativeKey && !WRITABLE_NATIVE_KEYS.includes(f.nativeKey)) return false;
      return true;
    });
  }, [fields]);

  const allowedSourceFields = useMemo(() => {
    const invalidSourceTypes = ['LEAD', 'FILE'];
    const invalidSourceSubtypes = ['PASSWORD'];

    return fields.filter(f => {
      if (invalidSourceTypes.includes(f.field_type.code)) return false;
      if (f.field_subtype_code && invalidSourceSubtypes.includes(f.field_subtype_code)) return false;
      return true;
    });
  }, [fields]);

  // Qué tipos de acción tiene sentido ofrecer para un campo destino dado -- viene de
  // AUTOMATION_COMPATIBILITY_MATRIX (backend, app/core/dictionaries.py) en vez de una lista
  // hardcodeada acá, que es justo lo que causaba el bug real encontrado 2026-08-15: el selector
  // solo ofrecía 3 de los 13 tipos de acción reales, así que una acción guardada con alguno de
  // los otros 10 no se podía ni mostrar ni editar bien ("muestra cualquier cosa").
  const getAvailableActionTypes = useCallback((field?: LeadField): ActionTypeEnum[] => {
    if (!field) return FALLBACK_ACTION_TYPES;
    const matrixKey = MATRIX_TYPE_ALIAS[field.field_type.code] ?? field.field_type.code;
    const fromMatrix = compatibilityMatrix[matrixKey]?.actions;
    if (fromMatrix && fromMatrix.length > 0) {
      const known = fromMatrix.filter((a): a is ActionTypeEnum => a in ActionTypeEnum);
      if (known.length > 0) return known;
    }
    return FALLBACK_ACTION_TYPES;
  }, [compatibilityMatrix]);

  const currentActionType = useWatch({ control, name: `actions.${index}.type` })

  useEffect(() => {
    // Solo estos dos tipos leen source_field_id / source_field_ids -- se limpian los que no
    // correspondan al tipo actual (antes solo se limpiaba source_field_id, y solo al pasar a
    // SET_VALUE/CLEAR_VALUE -- se generaliza acá para cubrir todos los tipos nuevos también).
    if (currentActionType !== ActionTypeEnum.COPY_FROM_FIELD) {
      onUpdate(`actions.${index}.source_field_id`, null)
    }
    if (currentActionType !== ActionTypeEnum.CONCAT_FIELDS) {
      onUpdate(`actions.${index}.source_field_ids`, null)
    }
    // Estos tipos no leen `value` en absoluto (ver AutomationEngine._apply_actions, backend).
    const NO_VALUE_ACTIONS: ActionTypeEnum[] = [
      ActionTypeEnum.CLEAR_VALUE, ActionTypeEnum.COPY_FROM_FIELD,
      ActionTypeEnum.SET_CURRENT_DATE, ActionTypeEnum.SET_CURRENT_DATETIME,
    ];
    if (NO_VALUE_ACTIONS.includes(currentActionType)) {
      onUpdate(`actions.${index}.value`, null)
    }
  }, [currentActionType, index, onUpdate])

  const currentTargetId = useWatch({ control, name: `actions.${index}.target_field_id` })
  const targetField = useMemo(() => allowedTargetFields.find(f => f.id === currentTargetId), [allowedTargetFields, currentTargetId]);

  const availableActionTypes = useMemo(() => getAvailableActionTypes(targetField), [getAvailableActionTypes, targetField]);

  const actionColor = useMemo(() => getActionColor(currentActionType), [currentActionType]);

  // Al cambiar el campo destino: si el tipo de acción actual ya no tiene sentido para el nuevo
  // campo (según la matrix), se reemplaza por el primero disponible -- mismo criterio que
  // ConditionRow.tsx al cambiar de campo (ahí resetea el operador). También se limpia el valor
  // (y source_field_id/ids, vía el useEffect de arriba que reacciona al cambio de tipo).
  const updateTypeValue = (value?: LeadField | LeadField[] | null) => {
    const field = (!value || Array.isArray(value)) ? undefined : value
    const allowed = getAvailableActionTypes(field)
    if (!allowed.includes(currentActionType)) {
      onUpdate(`actions.${index}.type`, allowed[0])
    }
    if (!field) onUpdate(`actions.${index}.value`, null)
    else if (["NUMBER", "INT"].includes(field.field_type.code)) onUpdate(`actions.${index}.value`, 0)
    else onUpdate(`actions.${index}.value`, null)
  }

  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        p: 2,
        bgcolor: alpha(theme.palette[actionColor].main, 0.04),
        border: '1px solid',
        borderColor: alpha(theme.palette[actionColor].main, 0.2),
        borderRadius: 2,
      })}
    >
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Chip label={`${index + 1}`} size="small" color={actionColor} sx={{ fontWeight: 700, minWidth: 32 }} />

        {/* Campo destino PRIMERO (antes iba después del tipo de acción): el tipo de acción
            depende del campo elegido (vía la matrix), así que elegir el campo primero evita
            mostrar acciones que no aplican y tener que corregir después. */}
        <Box sx={{ flexGrow: 1 }}>
          <ControlledFieldSelector
            control={control}
            name={`actions.${index}.target_field_id`}
            fields={allowedTargetFields}
            label='Campo destino'
            disabled={readOnly}
            size="small"
            onChangeBefore={updateTypeValue}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }}>
          <ControlledAutocomplete
            control={control}
            name={`actions.${index}.type`}
            options={availableActionTypes}
            label='Tipo de acción'
            disabled={readOnly}
            size="small"
            getOptionKey={op => op} getOptionLabel={op => ACTION_TYPE_LABELS[op]}
            renderOption={({ key, ...props }, op) => (
              <ChipTooltip title={ACTION_TYPE_DESCRIPTIONS[op]} key={key} placement='right'>
                <Typography {...props}>{ACTION_TYPE_LABELS[op]}</Typography>
              </ChipTooltip>
            )}
          />
        </Box>

        <ValueInput control={control} register={register} index={index} currentActionType={currentActionType} onUpdate={onUpdate}
          targetField={targetField} allowedSourceFields={allowedSourceFields} nativeOptions={nativeOptions} readOnly={readOnly} />

        {!readOnly && (
          <ChipTooltip title={isOnly ? "Debe haber al menos una acción" : "Eliminar acción"} color={isOnly ? "contrast" : "error"}>
            <span style={{ marginLeft: 'auto' }}>
              <CommonIconButton
                actionType='DISABLE'
                noTooltip
                size="small"
                onClick={onDelete}
                disabled={isOnly}
                color="error" />
            </span>
          </ChipTooltip>
        )}
      </Stack>
    </Paper >
  );
};

const DATE_OPTIONS = [
  { value: "", label: "Fecha exacta" },
  { value: "{{CURRENT_DATE}}", label: "Hoy" },
  { value: "{{YESTERDAY}}", label: "Ayer" },
  { value: "{{TOMORROW}}", label: "Mañana" },
];

const DATETIME_OPTION = [{ value: "{{CURRENT_DATETIME}}", label: "Ahora mismo" }]

const NORMALIZE_TEXT_MODES = [
  { value: "TRIM", label: "Quitar espacios sobrantes" },
  { value: "UPPERCASE", label: "MAYÚSCULAS" },
  { value: "LOWERCASE", label: "minúsculas" },
]

interface ValueInputProps {
  control: Control<FieldAutomationPost, unknown, FieldAutomationPost>,
  register: UseFormRegister<FieldAutomationPost>,
  index: number,
  currentActionType: ActionTypeEnum,
  targetField?: LeadField,
  allowedSourceFields: LeadField[],
  nativeOptions?: NativeFieldOptions,
  readOnly: boolean,
  onUpdate: (name: Path<FieldAutomationPost>, value?: string | number | boolean | (string | number)[] | null) => void
}

const ValueInput = ({ control, register, index, currentActionType, targetField, allowedSourceFields, nativeOptions, readOnly, onUpdate }: ValueInputProps) => {

  /** Obtiene los campos del mismo tipo para duplicar (COPY_FROM_FIELD: el destino solo puede
   * recibir un valor de un campo del mismo tipo). */
  const compatibleFieldsForCopy = useMemo(() => {
    if (!targetField) return allowedSourceFields;
    return allowedSourceFields.filter(f => f.id !== targetField.id && f.field_type.code === targetField.field_type.code);
  }, [targetField, allowedSourceFields])

  /** CONCAT_FIELDS no exige mismo tipo -- el backend concatena convirtiendo cada valor a texto
   * (str(...)), así que cualquier campo sirve de origen. */
  const compatibleFieldsForConcat = useMemo(() =>
    allowedSourceFields.filter(f => f.id !== targetField?.id),
    [targetField, allowedSourceFields])

  const [selectorOptions, setSelectorOptions] = useState<NomenclatorItem[]>([]);

  /** Recupera las opciones al seleccionar un campo Selector */
  const fetchOptions = useCallback(async () => {
    const isSelector = targetField?.field_type?.code === 'SELECTOR';

    if (!isSelector || !targetField?.nomenclator_id) return setSelectorOptions([]);

    return getNomenclatorItems({
      nomenclator_id: targetField.nomenclator_id,
      page_size: 0,
      only_active: true
    })
      .then(res => setSelectorOptions(res.items))
      .catch(e => showCommonErrorToast(e, "Error cargando opciones del selector"))

  }, [targetField])

  const { fnWithLoading: fetchOptionsLoad, loading: loadingOptions } = useLoading(fetchOptions)

  useEffect(() => {
    fetchOptionsLoad();
  }, [fetchOptionsLoad]);

  const currentValue = useWatch({ control, name: `actions.${index}.value` })

  // SET_VALUE, SET_VALUE_IF_EMPTY, APPEND_TO_LIST y REMOVE_FROM_LIST comparten el mismo picker
  // de valor según el tipo del campo destino -- por eso van juntos acá (antes solo existía para
  // SET_VALUE). No hace falta filtrar por tipo de campo al armar este picker: el selector de
  // "Tipo de acción" de arriba ya solo ofrece APPEND_TO_LIST/REMOVE_FROM_LIST para campos
  // SELECTOR/NATIVE_ID (ver AUTOMATION_COMPATIBILITY_MATRIX), así que acá siempre van a caer en
  // esas ramas cuando corresponda.
  const renderValueByFieldType = () => {
    if (!targetField) {
      return (
        <>
          <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
          <RegisteredTextInput
            register={register}
            name={`actions.${index}.value`}
            disabled={readOnly}
            size="small"
            label="Valor"
          />
        </>
      );
    }

    switch (targetField.field_type.code) {
      case 'SELECTOR':
        return (
          <>
            <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
            <Box sx={{ flexGrow: 1 }}>
              <ControlledAutocomplete
                control={control}
                name={`actions.${index}.value`}
                options={selectorOptions}
                label='Valor'
                disabled={readOnly || loadingOptions}
                size="small"
                returnField="id"
                getOptionKey={op => `${op.id}`} getOptionLabel={op => `${op.value ?? op.id}`}
              />
            </Box>
          </>
        );
      case 'BOOL':
        return (
          <>
            <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
            <Box sx={{ flexGrow: 1 }}>
              <ControlledAutocomplete
                control={control}
                name={`actions.${index}.value`}
                options={[{ label: "Si", value: true }, { label: "No", value: false }]}
                label='Valor'
                disabled={readOnly}
                size="small"
                returnField="value"
                getOptionKey={op => `${op.label}`} getOptionLabel={op => op.label}
              />
            </Box>
          </>
        );
      case 'NATIVE_ID': {
        const nativeIdOptions = getNativeIdOptions(targetField.nativeKey, nativeOptions);
        return (
          <>
            <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
            <Box sx={{ flexGrow: 1 }}>
              <ControlledAutocomplete
                control={control}
                name={`actions.${index}.value`}
                options={nativeIdOptions}
                label='Valor'
                disabled={readOnly}
                size="small"
                returnField="id"
                getOptionKey={op => `${op.id}`} getOptionLabel={op => op.label}
              />
            </Box>
          </>
        );
      }
      case 'NUMBER': case 'INT':
        return (
          <>
            <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
            <ControlledNumber
              control={control}
              name={`actions.${index}.value`}
              label="Valor numérico"
              disabled={readOnly}
              size="small"
            />
          </>
        );
      case 'DATE': case 'DATE_TIME': {
        const isDateTime = targetField.field_type.code === 'DATE_TIME';
        const isTime = targetField.field_subtype?.code === 'TIME_ONLY';
        const dynamicOptions = ['{{CURRENT_DATE}}', '{{CURRENT_DATETIME}}', '{{YESTERDAY}}', '{{TOMORROW}}'];
        const showDateInput = currentValue !== null && !dynamicOptions.includes(String(currentValue));
        return (
          <>
            <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 250 }}>
              <Autocomplete
                options={[...DATE_OPTIONS, ...(isDateTime ? DATETIME_OPTION : [])]}
                disabled={readOnly} size="small"
                onChange={(_, option) => {
                  if (!option) onUpdate(`actions.${index}.value`, null)
                  else onUpdate(`actions.${index}.value`, option.value)
                }}
                getOptionLabel={op => op.label}
                renderInput={(params) =>
                  <TextField {...params} label="Valor" size="small" fullWidth />
                } />
              {showDateInput && (
                <RegisteredDateInput
                  register={register}
                  name={`actions.${index}.value`}
                  label="Fecha Exacta"
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  disabled={readOnly}
                  dateType={isDateTime ? "DATE_TIME" : (isTime ? "TIME" : "DATE")}
                />
              )}
            </Box>
          </>
        );
      }
      default:
        return (
          <>
            <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
            <RegisteredTextInput
              register={register}
              name={`actions.${index}.value`}
              disabled={readOnly}
              size="small"
              label="Valor texto"
            />
          </>
        );
    }
  };

  switch (currentActionType) {
    // Estos 4 no necesitan ningún valor -- CLEAR_VALUE lo vacía, COPY_FROM_FIELD toma el valor
    // de otro campo (ver más abajo), y las dos fechas "actuales" se calculan solas.
    case ActionTypeEnum.CLEAR_VALUE:
    case ActionTypeEnum.SET_CURRENT_DATE:
    case ActionTypeEnum.SET_CURRENT_DATETIME:
      return null;

    case ActionTypeEnum.COPY_FROM_FIELD: {
      return (
        <>
          <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
          <Box sx={{ flexGrow: 1 }}>
            <ControlledFieldSelector
              control={control}
              name={`actions.${index}.source_field_id`}
              fields={compatibleFieldsForCopy}
              label='Campo origen'
              disabled={readOnly}
              size="small"
            />
          </Box>
        </>
      );
    }

    case ActionTypeEnum.CONCAT_FIELDS: {
      return (
        <>
          <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
          <Box sx={{ flexGrow: 1, minWidth: 220 }}>
            <ControlledAutocomplete
              control={control}
              name={`actions.${index}.source_field_ids`}
              options={compatibleFieldsForConcat}
              label='Campos a unir'
              disabled={readOnly}
              size="small"
              multiple
              returnField="id"
              getOptionKey={op => `${op.id}`} getOptionLabel={op => op.name}
            />
          </Box>
          <RegisteredTextInput
            register={register}
            name={`actions.${index}.value`}
            disabled={readOnly}
            size="small"
            label="Separador"
            placeholder='Ej: " " o " - "'
          />
        </>
      );
    }

    case ActionTypeEnum.INCREMENT:
    case ActionTypeEnum.DECREMENT:
      return (
        <>
          <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
          <ControlledNumber
            control={control}
            name={`actions.${index}.value`}
            label="Cantidad (1 por defecto)"
            disabled={readOnly}
            size="small"
          />
        </>
      );

    case ActionTypeEnum.SET_DATE_OFFSET:
      return (
        <>
          <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
          <ControlledNumber
            control={control}
            name={`actions.${index}.value`}
            label="Días desde hoy (negativo = pasado)"
            disabled={readOnly}
            size="small"
            min={-3650}
            max={3650}
          />
        </>
      );

    case ActionTypeEnum.NORMALIZE_TEXT:
      return (
        <>
          <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
          <FormControl size="small" sx={{ flexGrow: 1, minWidth: 180 }}>
            <InputLabel>Modo</InputLabel>
            <Select
              disabled={readOnly}
              value={currentValue ?? 'TRIM'}
              label="Modo"
              onChange={(e) => onUpdate(`actions.${index}.value`, e.target.value)}
            >
              {NORMALIZE_TEXT_MODES.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      );

    case ActionTypeEnum.SET_VALUE:
    case ActionTypeEnum.SET_VALUE_IF_EMPTY:
    case ActionTypeEnum.APPEND_TO_LIST:
    case ActionTypeEnum.REMOVE_FROM_LIST:
      return renderValueByFieldType();

    default:
      return null;
  }
}
