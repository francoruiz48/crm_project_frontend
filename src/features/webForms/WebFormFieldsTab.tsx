import { useMemo } from 'react';
import { Stack, Typography, Box, IconButton, MenuItem, TextField } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Controller, useFieldArray, useWatch, type Control, type UseFormRegister } from 'react-hook-form';
import type { WebFormPost } from 'src/types/webForms';
import type { LeadField } from 'src/types/leadFields';
import GenericPaper from 'src/components/layout/container/GenericPaper';
import CommonButton from 'src/components/ui/buttons/CommonButton';
import { CommonIconButton } from 'src/components/ui/buttons/CommonIconButton';
import { RegisteredTextInput, ControlledCheckbox } from 'src/components/ui/forms/CustomInputs';
import { ControlledFieldSelector } from 'src/components/ui/forms/FieldSelector';
import { ChipTooltip } from 'src/components/ui/details/ChipTooltip';
import { CustomAlert } from 'src/components/ui/feedback/CustomAlert';
import CustomChip from 'src/components/ui/details/CustomChip';
import type { WebFormFieldOptionLite } from './WebFormFieldRenderer';

interface WebFormFieldsTabProps {
  control: Control<WebFormPost>;
  register: UseFormRegister<WebFormPost>;
  fields: LeadField[];
  // Opciones de nomenclador por campo (clave = LeadField.id) -- si el campo elegido en esta fila
  // tiene nomenclador, "valor oculto" se muestra como un <Select> con esas opciones en vez de
  // texto libre (evita que se cargue un valor que no exista en la lista real).
  fieldOptionsMap?: Record<string, WebFormFieldOptionLite[]>;
  readOnly: boolean;
}

interface WebFormFieldRowProps {
  control: Control<WebFormPost>;
  register: UseFormRegister<WebFormPost>;
  index: number;
  selectableFields: LeadField[];
  fieldOptionsMap: Record<string, WebFormFieldOptionLite[]>;
  readOnly: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

// Fila individual, separada del map principal porque necesita su propio `useWatch` (para
// reaccionar al campo elegido y decidir si "valor oculto" es texto libre o un <Select> de
// nomenclador) -- los hooks no se pueden llamar dentro de un callback de `.map()`.
const WebFormFieldRow = ({
  control, register, index, selectableFields, fieldOptionsMap, readOnly,
  isFirst, isLast, onMoveUp, onMoveDown, onRemove,
}: WebFormFieldRowProps) => {
  const selectedLeadFieldId = useWatch({ control, name: `fields.${index}.lead_field_id` });
  const options = selectedLeadFieldId ? fieldOptionsMap[selectedLeadFieldId] ?? [] : [];
  const hasNomenclatorOptions = options.length > 0;

  return (
    <GenericPaper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <CustomChip label={`${index + 1}`} size="small" sx={{ fontWeight: 700, mt: 1 }} />

        <Stack spacing={1.5} sx={{ flexGrow: 1, minWidth: '16rem' }}>
          <Box sx={{ maxWidth: '24rem' }}>
            <ControlledFieldSelector
              control={control}
              name={`fields.${index}.lead_field_id`}
              fields={selectableFields}
              label="Campo de la campaña"
              disabled={readOnly}
              showTypeCaption
            />
          </Box>

          <ChipTooltip title="Reemplaza el nombre del campo tal como lo ve el visitante. Si lo dejás vacío, se usa el nombre del campo configurado en el sistema.">
            <Box sx={{ maxWidth: '24rem' }}>
              <RegisteredTextInput
                register={register}
                name={`fields.${index}.custom_label`}
                label="Etiqueta personalizada (opcional)"
                disabled={readOnly}
                size="small"
              />
            </Box>
          </ChipTooltip>

          <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <ControlledCheckbox
              control={control}
              name={`fields.${index}.is_required`}
              label="Obligatorio en este formulario"
              title=""
            />
            <ChipTooltip title="Si se completa, el campo queda oculto para el visitante y siempre se guarda con este valor fijo.">
              <Box sx={{ minWidth: '14rem' }}>
                {hasNomenclatorOptions ? (
                  <Controller
                    control={control}
                    name={`fields.${index}.hidden_value`}
                    render={({ field }) => (
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Valor oculto (opcional)"
                        disabled={readOnly}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value || null)}
                      >
                        <MenuItem value="">-- Sin valor fijo --</MenuItem>
                        {options.map(opt => (
                          <MenuItem key={opt.id} value={opt.id}>{opt.value}</MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                ) : (
                  <RegisteredTextInput
                    register={register}
                    name={`fields.${index}.hidden_value`}
                    label="Valor oculto (opcional)"
                    disabled={readOnly}
                    size="small"
                  />
                )}
              </Box>
            </ChipTooltip>
          </Stack>
        </Stack>

        {!readOnly && (
          <Stack spacing={0} sx={{ alignItems: 'center' }}>
            <IconButton size="small" disabled={isFirst} onClick={onMoveUp} aria-label="Mover arriba">
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" disabled={isLast} onClick={onMoveDown} aria-label="Mover abajo">
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
            <CommonIconButton actionType="DISABLE" size="small" color="error" onClick={onRemove} title="Quitar campo" />
          </Stack>
        )}
      </Stack>
    </GenericPaper>
  );
};

export const WebFormFieldsTab = ({ control, register, fields, fieldOptionsMap = {}, readOnly }: WebFormFieldsTabProps) => {
  // Los campos nativos (Estado, Etapa, Usuario Creador, etc.) tienen id numérico negativo y NO se
  // pueden agregar a un formulario web -- _validate_form_fields (backend) los rechaza porque no
  // son filas reales de LeadField. `fields` acá ya viene filtrado de CALCULATED/LEAD/FILE desde
  // WebFormPage, pero no de nativos -- se filtra acá también.
  const selectableFields = useMemo(() => fields.filter(f => typeof f.id === 'string'), [fields]);

  const { fields: rows, append, remove, move } = useFieldArray({ name: 'fields', control, keyName: 'idField' });

  const selectedIds = useWatch({ control, name: 'fields' })?.map(f => f.lead_field_id) ?? [];

  const availableToAdd = useMemo(
    () => selectableFields.filter(f => !selectedIds.includes(f.id as string)),
    [selectableFields, selectedIds]
  );

  const handleAdd = () => {
    if (availableToAdd.length === 0) return;
    append({
      lead_field_id: '',
      order: rows.length + 1,
      custom_label: null,
      custom_placeholder: null,
      is_required: false,
      hidden_value: null,
    });
  };

  return (
    <Stack spacing={2}>
      <CustomAlert severity="info">
        Elegí qué campos de la campaña va a completar el visitante y si son obligatorios <b>en este
        formulario</b> -- puede ser distinto de lo obligatorio a nivel sistema, ya que acá el lead se
        autocompleta solo. Si le cargás un "valor oculto" a un campo, ese campo no se muestra al
        visitante y se guarda siempre con ese valor fijo.
      </CustomAlert>

      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          Todavía no agregaste campos a este formulario.
        </Typography>
      )}

      <Stack spacing={1.5}>
        {rows.map((row, index) => (
          <WebFormFieldRow
            key={row.idField}
            control={control}
            register={register}
            index={index}
            selectableFields={selectableFields}
            fieldOptionsMap={fieldOptionsMap}
            readOnly={readOnly}
            isFirst={index === 0}
            isLast={index === rows.length - 1}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onRemove={() => remove(index)}
          />
        ))}
      </Stack>

      {!readOnly && (
        <CommonButton actionType="CREATE" variant="outlined" onClick={handleAdd} disabled={availableToAdd.length === 0} sx={{ alignSelf: 'start' }}>
          Agregar campo
        </CommonButton>
      )}
    </Stack>
  );
};
