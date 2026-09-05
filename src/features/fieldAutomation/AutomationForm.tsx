import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Typography, Divider, Paper, alpha, Stack, Accordion, AccordionSummary, AccordionDetails, Grid, } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { v4 as uuidv4 } from 'uuid';
import { TriggerEventEnum, LogicalOperatorEnum, ConditionOperatorEnum, ActionTypeEnum, TRIGGER_EVENT_LABELS, } from 'src/types/automation';
import type { FieldAutomationPost, RuleGroup, FieldAutomationDetailed, AutomationAction, RuleCondition } from 'src/types/automation';
import { ConditionBuilder } from './ConditionBuilder';
import { ActionBuilder } from './ActionBuilder';
import type { LeadField } from 'src/types/leadFields';
import type { NativeFieldOptions } from 'src/features/lead/nativeLeadFields';
import type { AutomationCompatibility } from 'src/types/shared';
import GenericPaper from 'src/components/layout/container/GenericPaper';
import CustomChip from 'src/components/ui/details/CustomChip';
import { showCommonErrorToast, showToast } from 'src/utils/feedback';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { ControlledNumber, RegisteredTextInput } from 'src/components/ui/forms/CustomInputs';
import { ControlledAutocomplete } from 'src/components/ui/forms/CustomMultipleInputs';
import { ChipTooltip } from 'src/components/ui/details/ChipTooltip';
import { CustomAlert } from 'src/components/ui/feedback/CustomAlert';

// ==========================================
// FUNCIONES DE INICIALIZACIÓN Y REHIDRATACIÓN
// ==========================================
const createEmptyCondition = (): RuleCondition => ({
  id: uuidv4(), type: 'condition', field_id: null, operator: ConditionOperatorEnum.EQUALS, value: null,
});

const createInitialConditions = (): RuleGroup => ({
  id: uuidv4(), type: 'group', operator: LogicalOperatorEnum.AND, rules: [createEmptyCondition()],
});

const createInitialActions = (): AutomationAction[] => [
  { type: ActionTypeEnum.SET_VALUE, target_field_id: null, value: null },
];

// REHIDRATAR: Le devuelve los IDs y el 'type' a la data que viene del Backend
const rehydrateConditions = (node?: RuleCondition | RuleGroup): RuleCondition | RuleGroup => {
  if (!node) return createInitialConditions();

  if ('rules' in node && Array.isArray(node.rules)) {
    return {
      ...node,
      id: node.id ?? uuidv4(),
      type: 'group',
      rules: node.rules.map(rehydrateConditions),
    };
  } else {
    return {
      ...node as RuleCondition,
      id: node.id ?? uuidv4(),
      type: 'condition',
    };
  }
};

interface AutomationFormProps {
  initialData?: FieldAutomationDetailed | null; // Si viene data, estamos editando
  campaignId: string;
  onSave: (data: FieldAutomationPost) => Promise<unknown>;
  fields?: LeadField[];
  nativeOptions?: NativeFieldOptions;
  compatibilityMatrix?: AutomationCompatibility;
  readOnly?: boolean;
  isDuplicating?: boolean;
  submitRef?: React.RefObject<(() => void) | null>
}

/**Formulario */
export const AutomationForm: React.FC<AutomationFormProps> = ({ initialData, onSave,
  campaignId = "", fields = [], nativeOptions, compatibilityMatrix = {}, readOnly = false, isDuplicating = false, submitRef = null }) => {

  // INICIALIZACIÓN
  const defaultValues = useMemo(() => {
    if (initialData) {
      return {
        ...initialData,
        conditions: rehydrateConditions(initialData.conditions),
        actions: initialData.actions,
      } as FieldAutomationPost
    }
    return {
      name: '',
      description: '',
      campaign_id: campaignId,
      trigger_events: [TriggerEventEnum.ON_UPDATE],
      priority: 1,
      conditions: createInitialConditions(),
      actions: createInitialActions(),
    } as FieldAutomationPost
  }, [initialData, campaignId])

  const { register, control, handleSubmit, setValue } = useForm<FieldAutomationPost>({ defaultValues })

  const defaultConditions = useMemo(() =>
    initialData ? rehydrateConditions(initialData.conditions) as RuleGroup
      : createInitialConditions() as RuleGroup
    , [initialData])

  const [conditions, setConditions] = useState<RuleGroup>(defaultConditions)

  const handleConditionsChange = useCallback((conditions: RuleGroup) => {
    setConditions(conditions);
  }, [])

  const validateAutomation = useCallback(
    (automation: FieldAutomationPost, conditions: RuleGroup): string[] => {
      const errors: string[] = [];

      if (!automation.name.trim()) {
        errors.push('El nombre es requerido');
      }

      if (automation.trigger_events.length === 0) {
        errors.push('Debe seleccionar al menos un evento disparador');
      }

      // Validar condiciones
      const validateConditions = (group: RuleGroup) => {
        for (const rule of group.rules) {
          if (rule.type === 'condition') {
            if (rule.field_id === null) {
              errors.push('Todas las condiciones deben tener un campo seleccionado');
            }
          } else {
            validateConditions(rule as RuleGroup);
          }
        }
      };
      validateConditions(conditions);

      // Validar acciones
      for (const action of automation.actions) {
        if (action.target_field_id === null) {
          errors.push('Todas las acciones deben tener un campo destino');
        }
        if (action.type === ActionTypeEnum.COPY_FROM_FIELD && !action.source_field_id) {
          errors.push('Las acciones de copiar deben tener un campo origen');
        }
        if (action.type === ActionTypeEnum.CONCAT_FIELDS && (!action.source_field_ids || action.source_field_ids.length === 0)) {
          errors.push('Las acciones de concatenar deben tener al menos un campo a unir');
        }
        if ((action.type === ActionTypeEnum.SET_VALUE || action.type === ActionTypeEnum.SET_VALUE_IF_EMPTY) && action.value === null) {
          errors.push('Las acciones de establecer valor deben tener un valor');
        }
      }

      return [...new Set(errors)];
    }, [])

  const handleSave = useCallback(
    async (automation: FieldAutomationPost, conditions: RuleGroup) => {
      const errors = validateAutomation(automation, conditions);
      if (errors.length > 0) {
        showToast(errors[0], "error")
        return;
      }

      // Limpiamos los IDs internos de la UI
      const cleanConditions = (group: RuleGroup): RuleGroup => ({
        operator: group.operator,
        rules: group.rules.map(rule => {
          if (rule.type === 'condition') {
            return {
              field_id: rule.field_id,
              operator: rule.operator,
              ...(rule.value !== null && { value: rule.value }),
            };
          }
          return cleanConditions(rule as RuleGroup);
        }),
      });

      const cleanActions = automation.actions.map(action => ({
        type: action.type,
        target_field_id: action.target_field_id,
        ...(action.value !== null && { value: action.value }),
        ...(action.source_field_id && { source_field_id: action.source_field_id }),
        // CONCAT_FIELDS: faltaba acá -- se armaba bien en el formulario (ActionRow) pero se
        // perdía al limpiar el payload antes de mandarlo al backend (bug real encontrado
        // 2026-08-15, mientras se sumaba soporte para este tipo de acción).
        ...(action.source_field_ids && action.source_field_ids.length > 0 && { source_field_ids: action.source_field_ids }),
      }));

      const payloadToBackend: FieldAutomationPost = {
        name: automation.name,
        description: automation.description || undefined,
        campaign_id: campaignId,
        trigger_events: automation.trigger_events,
        priority: automation.priority,
        conditions: cleanConditions(conditions),
        actions: cleanActions,
      };

      try {
        await onSave(payloadToBackend);
        showToast('Automatización guardada con éxito')
      } catch (error) {
        showCommonErrorToast(error, 'Error al guardar la automatización.')
      }
    }, [campaignId, onSave, validateAutomation])


  // eslint-disable-next-line react-hooks/exhaustive-deps
  const submitHandler = useCallback(
    handleSubmit(data => handleSave(data, conditions)),
    [handleSubmit, handleSave, conditions])

  useEffect(() => {
    if (submitRef) {
      submitRef.current = submitHandler;
    }
  }, [submitRef, submitHandler]);

  /*
  const handleCopyJson = useCallback((actions: AutomationAction[], conditions:RuleGroup) => {
    const automation = getValues()
    // Preparar el JSON sin los IDs internos
    const cleanConditions = (group: RuleGroup): object => ({
      operator: group.operator,
      rules: group.rules.map((rule) => {
        if (rule.type === 'condition') {
          return {
            field_id: rule.field_id,
            operator: rule.operator,
            ...(rule.value !== null && { value: rule.value }),
          };
        }
        return cleanConditions(rule);
      }),
    });

    const cleanActions = actions.map((action) => ({
      type: action.type,
      target_field_id: action.target_field_id,
      ...(action.value !== null && { value: action.value }),
      ...(action.source_field_id && { source_field_id: action.source_field_id }),
    }));

    const jsonData = {
      name: automation.name,
      description: automation.description,
      campaign_id: automation.campaign_id,
      trigger_events: automation.trigger_events,
      priority: automation.priority,
      conditions: cleanConditions(conditions),
      actions: cleanActions,
    };

    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
    showToast("JSON copiado al portapapeles", "info")
  },[])
*/

  return (
    <form onSubmit={submitHandler}>
      <Stack spacing={2} sx={{ py: 3, px: 2 }}>
        {/* Header */}
        {isDuplicating && (
          <CustomAlert
            severity="info"
            icon={<ContentCopyIcon />}
            sx={{ border: '1px solid', borderColor: 'info.light', color: "text.primary" }}
          >
            <Typography variant="subtitle2">Estás creando un duplicado</Typography>
            <Typography variant="body2">
              Los datos fueron copiados de otra automatización. Revisa las condiciones y haz clic en <b>Guardar</b> para confirmar la creación de esta nueva regla.
            </Typography>
          </CustomAlert>
        )}
        <Paper
          elevation={1}
          sx={(theme) => ({
            p: 3,
            background: readOnly
              ? alpha(theme.palette.text.disabled, 0.1) // Más tenue si es solo lectura
              : `linear-gradient(190deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.dark} 80%)`,
            color: readOnly ? 'text.primary' : 'white',
            border: readOnly ? '1px dashed' : 'none',
            borderColor: 'divider',
            ...theme.applyStyles("dark", {
              background: readOnly
                ? alpha(theme.palette.text.disabled, 0.1) // Más tenue si es solo lectura
                : `linear-gradient(190deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary[600]} 70%)`,
            })
          })}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }} >
            <AutoFixHighIcon sx={{ fontSize: 40, opacity: readOnly ? 0.5 : 1 }} />
            <Stack spacing={1}>
              <Typography variant="h4" component="p">
                Configuración de Reglas
              </Typography>
              <Typography variant="body2" sx={{ opacity: .9 }}>
                {readOnly
                  ? 'Los cambios están deshabilitados. Pulsa el botón "Editar" en la parte superior para modificar.'
                  : 'Define disparadores y acciones para automatizar tu flujo de leads.'
                }
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* General Info Section */}
        <Accordion disableGutters defaultExpanded
          component={GenericPaper} elevation={0} sx={{ p: 0, borderRadius: 1 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`gen-info-content`}
            id={`gen-info-header`}
            sx={{
              '&:hover': { bgcolor: 'action.hover' },
            }}>
            <Typography component="span" sx={{ fontWeight: 500 }}>Información General</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Divider sx={{ mb: 2, mx: -2 }} />
            <Grid container spacing={1}>
              <RegisteredTextInput
                register={register}
                name="name"
                disabled={readOnly}
                label="Nombre de la automatización"
                fullWidth
                required
                placeholder="Ej: Autocompletar provincia según nomenclador"
              />
              <RegisteredTextInput
                register={register}
                name="description"
                disabled={readOnly}
                label="Descripción (opcional)"
                fullWidth
                multiline
                rows={2}
                placeholder="Describe qué hace esta automatización..."
              />
              <Grid size="grow" sx={{ flexGrow: 5 }}>
                <ControlledAutocomplete
                  control={control}
                  name="trigger_events"
                  options={Object.values(TriggerEventEnum)}
                  getOptionLabel={op => TRIGGER_EVENT_LABELS[op]}
                  getOptionKey={op => op}
                  disabled={readOnly}
                  label="Eventos disparadores"
                  multiple
                />
              </Grid>
              <Grid size="grow" sx={{ flexGrow: 2 }}>
                <ChipTooltip title="Orden de ejecución" color="info" boxed>
                  <ControlledNumber
                    control={control}
                    name="priority"
                    type="field"
                    label="Orden"
                    min={1}
                    max={100}
                  />
                </ChipTooltip>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Conditions Section */}
        <Accordion disableGutters defaultExpanded
          component={GenericPaper} elevation={0} sx={{ p: 0, borderRadius: 1 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`gen-info-content`}
            id={`gen-info-header`}
            sx={{
              '&:hover': { bgcolor: 'action.hover' },
            }}>
            <Stack direction="row" spacing={2}>
              <Typography component="span" sx={{ fontWeight: 500 }}>Condiciones</Typography>
              <CustomChip
                label={`${conditions.rules.length} regla${conditions.rules.length > 1 ? "s" : ""}`}
                size="small"
                variant="outlined"
                color="primary"
              />
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Divider sx={{ mb: 2, mx: -2 }} />
            <CustomAlert severity="info" sx={{ mb: 2, color: "text.primary" }} >
              Define las condiciones que deben cumplirse para ejecutar las acciones. Puedes crear
              grupos anidados con operadores Y/O.
            </CustomAlert>
            <ConditionBuilder
              group={conditions}
              onChange={handleConditionsChange}
              isRoot
              fields={fields}
              nativeOptions={nativeOptions}
              compatibilityMatrix={compatibilityMatrix}
              readOnly={readOnly}
            />
          </AccordionDetails>
        </Accordion>


        {/* Actions Section */}
        <ActionBuilder control={control} register={register} leadFields={fields} nativeOptions={nativeOptions}
          compatibilityMatrix={compatibilityMatrix} readOnly={readOnly} setValue={setValue} />

        {/* Preview Section */}
        <Description control={control} conditions={conditions} fields={fields} />
      </Stack >
    </form>
  );
};

interface DescriptionProps {
  control: Control<FieldAutomationPost, unknown, FieldAutomationPost>,
  conditions: RuleGroup,
  fields: LeadField[]
  ,
}
//Separado para evitar que useWatch laguee el formulario entero.
const Description = memo(({ control, conditions, fields }: DescriptionProps) => {
  const triggerEvents = useWatch({ control, name: "trigger_events" })
  const actions = useWatch({ control, name: "actions" })

  const generateDescription = useMemo(() => {
    const triggers = triggerEvents
      .map((e) => TRIGGER_EVENT_LABELS[e].toLowerCase())
      .join(' o ');

    const describeCondition = (group: RuleGroup): string => {
      if (!group || !group.rules) return '';
      const conditions = group.rules.map(rule => {
        if (rule.type === 'condition') {
          const field = fields.find(f => f.id === rule.field_id);
          return field ? `${field.name}` : 'campo';
        }
        return `(${describeCondition(rule as RuleGroup)})`;
      });
      return conditions.join(group.operator === LogicalOperatorEnum.AND ? ' y ' : ' o ');
    };

    const actionsDesc = actions
      .map((action) => {
        const targetField = fields.find((f) => f.id === action.target_field_id);
        return targetField ? targetField.name : 'campo';
      })
      .join(', ');

    return `Cuando se ejecute "${triggers}", si ${describeCondition(conditions)}, entonces modificar: ${actionsDesc}`;
  }, [actions, conditions, fields, triggerEvents])

  return (
    <GenericPaper sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Resumen: {generateDescription}
      </Typography>
    </GenericPaper>
  )
}
)