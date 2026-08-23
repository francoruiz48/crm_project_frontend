import React, { useEffect, useMemo, useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, TextField, IconButton, Paper, Tooltip, Chip, alpha, } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { ConditionOperatorEnum, CONDITION_OPERATOR_LABELS, } from '../../types/automation';
import { getNomenclatorItems } from '../nomenclators/nomenclatorService';
import type { LeadField } from '../../types/leadFields';
import type { RuleCondition } from '../../types/automation';
import type { NomenclatorItem } from '../../types/nomenclators';
import type { NativeFieldOptions } from 'src/features/lead/nativeLeadFields';
import type { AutomationCompatibility } from 'src/types/shared';
import { FieldSelector } from 'src/components/ui/forms/FieldSelector';

interface ConditionRowProps {
  condition: RuleCondition;
  onUpdate: (condition: RuleCondition) => void;
  onDelete: () => void;
  isOnly: boolean;
  fields: LeadField[];
  nativeOptions?: NativeFieldOptions;
  compatibilityMatrix?: AutomationCompatibility;
  readOnly?: boolean;
}

// CHECKBOX/NATIVE_ID no tienen entrada propia en AUTOMATION_COMPATIBILITY_MATRIX (backend,
// app/core/dictionaries.py) -- se comportan igual que SELECTOR (un valor de una lista fija de
// opciones). CALCULATED tampoco tiene entrada propia -- son campos numéricos derivados, se
// tratan como NUMBER. BOOLEAN es un alias legado de BOOL que en la práctica no se usa, pero se
// mapea por las dudas.
const MATRIX_TYPE_ALIAS: Record<string, string> = {
  CHECKBOX: 'SELECTOR',
  NATIVE_ID: 'SELECTOR',
  CALCULATED: 'NUMBER',
  BOOLEAN: 'BOOL',
};

// Devuelve las opciones reales {id, label} de un campo nativo tipo NATIVE_ID según su nativeKey
// (mismo criterio que LeadFilters.tsx en la lista de leads).
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

// IS_PAST/IS_FUTURE tampoco necesitan valor: comparan el campo contra "ahora" (ver
// AutomationEngine._evaluate_condition en el backend, que ni siquiera lee condition.value
// para estos dos operadores).
const NO_VALUE_OPERATORS: ConditionOperatorEnum[] = [
  ConditionOperatorEnum.IS_EMPTY,
  ConditionOperatorEnum.IS_NOT_EMPTY,
  ConditionOperatorEnum.IS_PAST,
  ConditionOperatorEnum.IS_FUTURE,
];

export const ConditionRow: React.FC<ConditionRowProps> = ({
  condition,
  onUpdate,
  onDelete,
  isOnly,
  fields,
  nativeOptions,
  compatibilityMatrix = {},
  readOnly = false,
}) => {
  // 1. FILTRAMOS CAMPOS INVÁLIDOS PARA CONDICIONES (Incluyendo LEAD)
  const allowedFields = useMemo(() => {
    const invalidTypes = ['FILE', 'CALCULATED', 'LEAD'];
    const invalidSubtypes = ['PASSWORD']; // Se pueden agregar otros subtipos no lógicos aquí

    return fields.filter(f => {
      // Rechazar si coincide el tipo principal
      if (invalidTypes.includes(f.field_type.code)) return false;
      // Rechazar si coincide el subtipo (ojo: puede venir nulo)
      if (f.field_subtype_code && invalidSubtypes.includes(f.field_subtype_code)) return false;
      // Si pasa ambos filtros, se permite
      return true;
    });
  }, [fields]);

  const selectedField = allowedFields.find(f => f.id === condition.field_id);

  const [selectorOptions, setSelectorOptions] = useState<NomenclatorItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      const isSelector = selectedField?.field_type?.code?.startsWith('SELECTOR');
      if (isSelector && selectedField?.nomenclator_id) {
        setLoadingOptions(true);
        try {
          const response = await getNomenclatorItems({
            nomenclator_id: `${selectedField.nomenclator_id}`,
            page_size: 0,
            only_active: true
          });
          setSelectorOptions(response.items);
        } catch (error) {
          console.error("Error cargando opciones del selector:", error);
        } finally {
          setLoadingOptions(false);
        }
      } else {
        setSelectorOptions([]);
      }
    };
    fetchOptions();
  }, [selectedField?.id, selectedField?.nomenclator_id, selectedField?.field_type?.code]);

  // Fallback usado solo si la matrix todavía no cargó (primer render) o no tiene entrada para
  // el tipo -- mismo listado, más chico, que había antes de sumar la matrix. Cuando la matrix
  // sí tiene el tipo, ES la fuente de verdad (evita que este listado se desactualice respecto
  // al backend de nuevo, como pasó con STARTS_WITH/ENDS_WITH/IS_PAST/IS_FUTURE -- ver
  // hallazgo 2026-08-15).
  const getFallbackOperators = (field: LeadField): ConditionOperatorEnum[] => {
    switch (field.field_type.code) {
      case 'NUMBER': case 'INT': case 'CALCULATED': case 'DATE': case 'DATE_TIME':
        return [
          ConditionOperatorEnum.EQUALS, ConditionOperatorEnum.NOT_EQUALS,
          ConditionOperatorEnum.GREATER_THAN, ConditionOperatorEnum.LESS_THAN,
          ConditionOperatorEnum.IS_EMPTY, ConditionOperatorEnum.IS_NOT_EMPTY,
        ];
      case 'BOOL': case 'BOOLEAN':
        return [
          ConditionOperatorEnum.EQUALS, ConditionOperatorEnum.NOT_EQUALS,
          ConditionOperatorEnum.IS_EMPTY, ConditionOperatorEnum.IS_NOT_EMPTY,
        ];
      case 'SELECTOR': case 'CHECKBOX': case 'NATIVE_ID':
        return [
          ConditionOperatorEnum.EQUALS, ConditionOperatorEnum.NOT_EQUALS,
          ConditionOperatorEnum.IS_EMPTY, ConditionOperatorEnum.IS_NOT_EMPTY,
        ];
      default:
        return [
          ConditionOperatorEnum.EQUALS, ConditionOperatorEnum.NOT_EQUALS,
          ConditionOperatorEnum.CONTAINS, ConditionOperatorEnum.NOT_CONTAINS,
          ConditionOperatorEnum.IS_EMPTY, ConditionOperatorEnum.IS_NOT_EMPTY,
        ];
    }
  };

  const getAvailableOperators = (field: LeadField | undefined): ConditionOperatorEnum[] => {
    if (!field) return [ConditionOperatorEnum.EQUALS];

    const matrixKey = MATRIX_TYPE_ALIAS[field.field_type.code] ?? field.field_type.code;
    const fromMatrix = compatibilityMatrix[matrixKey]?.operators;
    if (fromMatrix && fromMatrix.length > 0) {
      // Filtro defensivo: si el backend algún día agrega un operador nuevo a la matrix antes
      // de que el frontend sepa mostrarlo (sin label/UI), no lo ofrecemos en el selector en
      // vez de romper -- mismo criterio que llevó a este arreglo.
      const known = fromMatrix.filter((op): op is ConditionOperatorEnum => op in ConditionOperatorEnum);
      if (known.length > 0) return known;
    }
    return getFallbackOperators(field);
  };

  const renderValueInput = () => {
    if (NO_VALUE_OPERATORS.includes(condition.operator)) return null;

    if (!selectedField) {
      return (
        <TextField
          disabled={readOnly}
          size="small"
          label="Valor"
          value={condition.value ?? ''}
          onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
          sx={{ flex: 1, minWidth: 150 }}
        />
      );
    }

    switch (selectedField.field_type.code) {
      case 'SELECTOR':
        return (
          <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
            <InputLabel>{loadingOptions ? 'Cargando...' : 'Valor'}</InputLabel>
            <Select
              disabled={readOnly || loadingOptions}
              value={condition.value ?? ''}
              label={loadingOptions ? 'Cargando...' : 'Valor'}
              onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
            >
              {selectorOptions.map((opt) => (
                <MenuItem key={opt.id} value={opt.id}>{opt.value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'NATIVE_ID': {
        const nativeIdOptions = getNativeIdOptions(selectedField.nativeKey, nativeOptions);
        return (
          <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
            <InputLabel>Valor</InputLabel>
            <Select
              disabled={readOnly}
              value={condition.value ?? ''}
              label="Valor"
              onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
            >
              {nativeIdOptions.map((opt) => (
                <MenuItem key={opt.id} value={opt.id}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      }
      case 'BOOL':
        return (
          <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
            <InputLabel>Valor</InputLabel>
            <Select
              disabled={readOnly}
              value={condition.value?.toString() ?? ''}
              label="Valor"
              onChange={(e) => onUpdate({ ...condition, value: e.target.value === 'true' })}
            >
              <MenuItem value="true">Sí</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </Select>
          </FormControl>
        );
      case 'NUMBER': case 'INT':
        return (
          <TextField
            size="small"
            type="number"
            label="Valor numérico"
            disabled={readOnly}
            value={condition.value ?? ''}
            onChange={(e) => onUpdate({ ...condition, value: Number(e.target.value) })}
            sx={{ flex: 1, minWidth: 150 }}
          />
        );
      case 'DATE': case 'DATE_TIME': {
        const isDateTime = selectedField.field_type.code === 'DATE_TIME';
        // Revisamos si el valor actual es una de nuestras variables mágicas
        const dynamicOptions = ['{{CURRENT_DATE}}', '{{CURRENT_DATETIME}}', '{{YESTERDAY}}', '{{TOMORROW}}'];
        const isDynamic = dynamicOptions.includes(String(condition.value));
        const selectValue = isDynamic ? String(condition.value) : 'EXACT';

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 250 }}>
            {/* SELECTOR DE TIPO DE FECHA */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                disabled={readOnly}
                value={selectValue}
                onChange={(e) => {
                  const val = e.target.value;
                  // Si elige exacta, borramos la variable mágica para que use el calendario
                  if (val === 'EXACT') onUpdate({ ...condition, value: '' });
                  else onUpdate({ ...condition, value: val });
                }}
              >
                <MenuItem value="EXACT"><em>Fecha exacta</em></MenuItem>
                <MenuItem value="{{CURRENT_DATE}}">Hoy</MenuItem>
                <MenuItem value="{{YESTERDAY}}">Ayer</MenuItem>
                <MenuItem value="{{TOMORROW}}">Mañana</MenuItem>
                {isDateTime && <MenuItem value="{{CURRENT_DATETIME}}">Ahora mismo</MenuItem>}
              </Select>
            </FormControl>

            {/* INPUT CALENDARIO (Solo se muestra si elige Fecha Exacta) */}
            {!isDynamic && (
              <TextField
                size="small"
                type={isDateTime ? "datetime-local" : "date"}
                value={condition.value ?? ''}
                onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
                disabled={readOnly}
              />
            )}
          </Box>
        );
      }
      default:
        return (
          <TextField
            size="small"
            label="Valor texto"
            disabled={readOnly}
            value={condition.value ?? ''}
            onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
            sx={{ flex: 1, minWidth: 150 }}
          />
        );
    }
  };

  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        bgcolor: theme.palette.mode === 'dark' ? 'background.default' : alpha(theme.palette.contrast[50], 0.5),
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      })}
    >
      <Chip label="SI" size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />

      <Box sx={{ minWidth: 180 }}>
        <FieldSelector
          fields={allowedFields}
          disabled={readOnly}
          value={condition.field_id ?? null}
          onChange={(fieldId) => onUpdate({
            ...condition,
            // Bug real encontrado 2026-08-15: acá se forzaba fieldId a string (`${fieldId}`)
            // siempre, pero los campos nativos (Usuario Creador, Equipo, Etapa, etc.) tienen
            // id numérico negativo -- forzarlo a string rompía el `f.id === condition.field_id`
            // de selectedField (arriba), así que cualquier condición sobre un campo nativo
            // perdía su operador/input correcto (caía al fallback genérico). FieldSelector ya
            // entrega el id con su tipo real (string uuid o number nativo, ver FieldSelector.tsx).
            field_id: fieldId ?? null,
            value: null,
            operator: getAvailableOperators(allowedFields.find(f => f.id === fieldId))[0]
          })}
        />
      </Box>

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Operador</InputLabel>
        <Select
          disabled={readOnly}
          value={condition.operator}
          label="Operador"
          onChange={(e) => onUpdate({
            ...condition,
            operator: e.target.value as ConditionOperatorEnum,
            value: NO_VALUE_OPERATORS.includes(e.target.value as ConditionOperatorEnum) ? null : condition.value,
          })}
        >
          {getAvailableOperators(selectedField).map((op) => (
            <MenuItem key={op} value={op}>
              {CONDITION_OPERATOR_LABELS[op]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {renderValueInput()}

      <Tooltip title={isOnly ? "Debe haber al menos una condición" : "Eliminar condición"}>
        <span>
          <IconButton
            size="small"
            onClick={onDelete}
            disabled={isOnly || readOnly}
            color="error"
            sx={{ ml: 'auto' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
};