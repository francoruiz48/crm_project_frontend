import React, { memo } from 'react';
import { Box, Button, Paper, Typography, ToggleButton, ToggleButtonGroup, IconButton, Tooltip, Collapse } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/CreateNewFolder';
import { v4 as uuidv4 } from 'uuid';
import { LogicalOperatorEnum, ConditionOperatorEnum, LOGICAL_OPERATOR_LABELS, } from '../../types/automation';
import type { RuleGroup, RuleCondition } from '../../types/automation';
import { ConditionRow } from './ConditionRow';
import type { LeadField } from '../../types/leadFields';
import type { NativeFieldOptions } from 'src/features/lead/nativeLeadFields';
import type { AutomationCompatibility } from 'src/types/shared';

interface ConditionBuilderProps {
  group: RuleGroup;
  onChange: (group: RuleGroup) => void;
  onDelete?: () => void;
  depth?: number;
  isRoot?: boolean;
  fields?: LeadField[];
  nativeOptions?: NativeFieldOptions;
  compatibilityMatrix?: AutomationCompatibility;
  readOnly?: boolean;
}

const MAX_DEPTH = 5;

const createEmptyCondition = (): RuleCondition => ({
  id: uuidv4(),
  type: 'condition',
  field_id: null,
  operator: ConditionOperatorEnum.EQUALS,
  value: null,
});

const createEmptyGroup = (): RuleGroup => ({
  id: uuidv4(),
  type: 'group',
  operator: LogicalOperatorEnum.AND,
  rules: [createEmptyCondition()],
});

export const ConditionBuilder = memo(({
  group,
  onChange,
  onDelete,
  depth = 0,
  isRoot = false,
  fields = [],
  nativeOptions,
  compatibilityMatrix,
  readOnly = false,
}: ConditionBuilderProps) => {
  const handleOperatorChange = (
    _: React.MouseEvent<HTMLElement>,
    newOperator: LogicalOperatorEnum | null
  ) => {
    if (newOperator) {
      onChange({ ...group, operator: newOperator });
    }
  };

  const handleAddCondition = () => {
    onChange({
      ...group,
      rules: [...group.rules, createEmptyCondition()],
    });
  };

  const handleAddGroup = () => {
    if (depth < MAX_DEPTH) {
      onChange({
        ...group,
        rules: [...group.rules, createEmptyGroup()],
      });
    }
  };

  const handleUpdateRule = (index: number, updatedRule: RuleCondition | RuleGroup) => {
    const newRules = [...group.rules];
    newRules[index] = updatedRule;
    onChange({ ...group, rules: newRules });
  };

  const handleDeleteRule = (index: number) => {
    if (group.rules.length > 1) {
      const newRules = group.rules.filter((_, i) => i !== index);
      onChange({ ...group, rules: newRules });
    }
  };

  // Mantiene la rotación de colores originales para el borde izquierdo
  const getBorderColor = () => {
    const colors = ['primary.main', 'secondary.main', 'warning.main', 'success.main'];
    return colors[depth % colors.length];
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderLeft: 4,
        borderColor: getBorderColor(),
        // FIX PARA MODO OSCURO:
        // En lugar de 'grey.50', usamos 'background.default'
        // Esto alterna entre el color de las "tarjetas" y el color del "fondo" del CRM
        bgcolor: depth % 2 === 0 ? 'background.paper' : 'background.default',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {isRoot ? 'Condiciones' : `Grupo (nivel ${depth + 1})`}
          </Typography>

          <ToggleButtonGroup
            value={group.operator}
            disabled={readOnly}
            exclusive
            onChange={handleOperatorChange}
            size="small"
          >
            <ToggleButton value={LogicalOperatorEnum.AND} sx={{ px: 2 }}>
              <Tooltip title={LOGICAL_OPERATOR_LABELS[LogicalOperatorEnum.AND]}>
                <span>Y</span>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value={LogicalOperatorEnum.OR} sx={{ px: 2 }}>
              <Tooltip title={LOGICAL_OPERATOR_LABELS[LogicalOperatorEnum.OR]}>
                <span>O</span>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {!isRoot && onDelete && !readOnly && (
          <Tooltip title="Eliminar grupo">
            <IconButton size="small" onClick={onDelete} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {group.rules.map((rule, index) => (
          <Collapse key={rule.id} in={true}>
            <Box>
              {index > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    py: 1,
                    color: 'text.secondary',
                    fontWeight: 600,
                  }}
                >
                  {group.operator === LogicalOperatorEnum.AND ? '— Y —' : '— O —'}
                </Typography>
              )}

              {rule.type === 'condition' ? (
                <ConditionRow
                  condition={rule as RuleCondition}
                  onUpdate={(updated) => handleUpdateRule(index, updated)}
                  onDelete={() => handleDeleteRule(index)}
                  isOnly={group.rules.length === 1 && isRoot}
                  fields={fields}
                  nativeOptions={nativeOptions}
                  compatibilityMatrix={compatibilityMatrix}
                  readOnly={readOnly}
                />
              ) : (
                <ConditionBuilder
                  group={rule as RuleGroup}
                  onChange={(updated) => handleUpdateRule(index, updated)}
                  onDelete={() => handleDeleteRule(index)}
                  depth={depth + 1}
                  fields={fields}
                  nativeOptions={nativeOptions}
                  compatibilityMatrix={compatibilityMatrix}
                  readOnly={readOnly}
                />
              )}
            </Box>
          </Collapse>
        ))}
      </Box>

      {!readOnly && (
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddCondition}
            variant="outlined"
          >
            Agregar condición
          </Button>

          {depth < MAX_DEPTH && (
            <Tooltip title="Agregar un grupo de condiciones anidado">
              <Button
                size="small"
                startIcon={<FolderIcon />}
                onClick={handleAddGroup}
                variant="outlined"
                color="secondary"
              >
                Agregar grupo
              </Button>
            </Tooltip>
          )}
        </Box>
      )}
    </Paper>
  );
})