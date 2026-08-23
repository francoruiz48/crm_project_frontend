import React, { memo } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Divider, Stack, Typography, } from '@mui/material';
import { ActionTypeEnum } from 'src/types/automation';
import type { AutomationAction, FieldAutomationPost } from 'src/types/automation';
import { ActionRow } from './ActionRow';
import type { LeadField } from 'src/types/leadFields';
import type { NativeFieldOptions } from 'src/features/lead/nativeLeadFields';
import type { AutomationCompatibility } from 'src/types/shared';
import { useFieldArray, type Control, type Path, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import CommonButton from 'src/components/ui/buttons/CommonButton';
import GenericPaper from 'src/components/layout/container/GenericPaper';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CustomChip from 'src/components/ui/details/CustomChip';
import { CustomAlert } from 'src/components/ui/feedback/CustomAlert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface ActionBuilderProps {
  leadFields: LeadField[];
  nativeOptions?: NativeFieldOptions;
  compatibilityMatrix?: AutomationCompatibility;
  readOnly?: boolean;
  control: Control<FieldAutomationPost, unknown, FieldAutomationPost>,
  register: UseFormRegister<FieldAutomationPost>,
  setValue: UseFormSetValue<FieldAutomationPost>
}

const createEmptyAction = (): AutomationAction => ({
  type: ActionTypeEnum.SET_VALUE,
  target_field_id: null,
  value: null,
});

export const ActionBuilder = memo(({ control, register, leadFields, nativeOptions, compatibilityMatrix, readOnly = false, setValue }: ActionBuilderProps) => {

  const { fields, append, remove } = useFieldArray({ name: "actions", control, keyName: "idField" })

  const handleAddAction = () => {
    append(createEmptyAction())
  };

  const handleDeleteAction = (index: number) => {
    if (fields.length > 1) { remove(index) }
  };

  // Ensanchado para aceptar arrays (source_field_ids, CONCAT_FIELDS) además de los valores
  // simples de siempre.
  const handleUpdateAction = (name: Path<FieldAutomationPost>, value?: string | number | boolean | (string | number)[] | null) => {
    setValue(name, value)
  };

  return (
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
          <Typography component="span" sx={{ fontWeight: 500 }}>Acciones a Ejecutar</Typography>
          <CustomChip
            label={`${fields.length} acci${fields.length > 1 ? "ones" : "ón"}`}
            size="small"
            chipColor="success"
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Divider sx={{ mb: 2, mx: -2 }} />
        <CustomAlert severity="success" sx={{ mb: 2 }} icon={<PlayArrowIcon />}>
          Las acciones se ejecutarán en orden cuando las condiciones se cumplan.
        </CustomAlert>
        <Stack spacing={2} sx={{ alignItems: "start" }}>
          <Stack spacing={1} sx={{ width: "100%" }}>
            {fields.map((action, index) => (
              <React.Fragment key={action.idField}>
                {index > 0 && (
                  <Typography
                    variant="subtitle2"
                    sx={{
                      display: 'block',
                      textAlign: 'center',
                      color: 'text.secondary',
                      fontWeight: 600,
                      pt: 1
                    }}
                  >
                    — LUEGO —
                  </Typography>
                )}
                <ActionRow
                  control={control}
                  register={register}
                  onDelete={() => handleDeleteAction(index)}
                  isOnly={fields.length === 1}
                  index={index}
                  fields={leadFields}
                  nativeOptions={nativeOptions}
                  compatibilityMatrix={compatibilityMatrix}
                  readOnly={readOnly}
                  onUpdate={handleUpdateAction}
                />
              </React.Fragment>
            ))}
          </Stack>
          {!readOnly && (<CommonButton
            actionType='CREATE'
            size="small"
            onClick={handleAddAction}
            variant="outlined"
            color="success">
            Agregar acción
          </CommonButton>)}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
)