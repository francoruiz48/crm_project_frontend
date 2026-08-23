import { Stack, Grid, Typography, TextField, MenuItem, Box } from '@mui/material';
import { Controller, useFieldArray, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import type { WebFormPost } from 'src/types/webForms';
import { DEFAULT_THEME_CONFIG } from 'src/types/webForms';
import { RegisteredTextInput } from 'src/components/ui/forms/CustomInputs';
import { InlineColorPickerButton } from 'src/components/ui/forms/ColorPicker';
import GenericPaper from 'src/components/layout/container/GenericPaper';
import CommonButton from 'src/components/ui/buttons/CommonButton';
import { CommonIconButton } from 'src/components/ui/buttons/CommonIconButton';
import { CUSTOM_CSS_TARGET_OPTIONS, getCssTargetOption } from './webFormCssTargets';

interface WebFormThemeTabProps {
  control: Control<WebFormPost>;
  register: UseFormRegister<WebFormPost>;
  setValue: UseFormSetValue<WebFormPost>;
  readOnly: boolean;
}

interface ColorFieldProps {
  control: Control<WebFormPost>;
  name: `theme_config.${'primary_color' | 'background_color' | 'text_color' | 'button_text_color'}`;
  label: string;
  readOnly: boolean;
}

// Fila "texto hex + botón de color libre", mismo patrón que el selector de color de una etiqueta
// nueva (LeadTagsMenu.tsx) -- InlineColorPickerButton ya trae el Popover con HexColorPicker.
const ColorField = ({ control, name, label, readOnly }: ColorFieldProps) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <InlineColorPickerButton
          color={field.value ?? '#000000'}
          onChange={color => field.onChange(color)}
          ariaLabel={label}
        />
        <TextField
          fullWidth
          size="small"
          label={label}
          disabled={readOnly}
          value={field.value ?? ''}
          onChange={e => field.onChange(e.target.value)}
        />
      </Stack>
    )}
  />
);

interface CssRuleRowProps {
  control: Control<WebFormPost>;
  index: number;
  readOnly: boolean;
  onRemove: () => void;
}

// Fila "elemento + CSS de ese elemento" -- separada del map principal porque necesita su propio
// `useWatch` para mostrar el hint correcto según el elemento elegido (los hooks no se pueden llamar
// dentro de un callback de `.map()`, mismo criterio que WebFormFieldRow en WebFormFieldsTab.tsx).
const CssRuleRow = ({ control, index, readOnly, onRemove }: CssRuleRowProps) => {
  const target = useWatch({ control, name: `theme_config.custom_css_rules.${index}.target` });
  const option = getCssTargetOption(target);

  return (
    <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <Stack spacing={1} sx={{ flexGrow: 1, minWidth: '16rem' }}>
        <Box sx={{ maxWidth: '20rem' }}>
          <Controller
            control={control}
            name={`theme_config.custom_css_rules.${index}.target`}
            render={({ field }) => (
              <TextField
                select
                fullWidth
                size="small"
                label="Elemento"
                disabled={readOnly}
                value={field.value ?? 'container'}
                onChange={field.onChange}
              >
                {CUSTOM_CSS_TARGET_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            )}
          />
        </Box>
        <Controller
          control={control}
          name={`theme_config.custom_css_rules.${index}.css`}
          render={({ field }) => (
            <TextField
              fullWidth
              multiline
              rows={3}
              size="small"
              label={option?.className ? `CSS (dentro de .${option.className} { ... })` : 'CSS'}
              disabled={readOnly}
              value={field.value ?? ''}
              onChange={field.onChange}
              helperText={option?.hint}
              sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.8125rem' } }}
            />
          )}
        />
      </Stack>
      {!readOnly && (
        <CommonIconButton actionType="DISABLE" size="small" color="error" onClick={onRemove} title="Quitar regla" />
      )}
    </Stack>
  );
};

// La vista previa de estilo (colores/tipografía/bordes aplicados) se muestra ahora en
// WebFormLivePreview, siempre visible al costado del formulario sin importar la pestaña activa --
// mantener una segunda acá sería redundante (pedido del usuario, 2026-08-17).
export const WebFormThemeTab = ({ control, register, setValue, readOnly }: WebFormThemeTabProps) => {
  const handleResetTheme = () => {
    setValue('theme_config', DEFAULT_THEME_CONFIG);
  };

  const { fields: cssRows, append: appendCssRule, remove: removeCssRule } = useFieldArray({
    name: 'theme_config.custom_css_rules',
    control,
    keyName: 'idRule',
  });

  const handleAddCssRule = () => {
    appendCssRule({ target: 'container', css: '' });
  };

  return (
    <Stack spacing={2}>
      <GenericPaper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h4">Colores</Typography>
            {!readOnly && (
              <CommonButton actionType="NONE" variant="text" size="small" onClick={handleResetTheme}>
                Restablecer
              </CommonButton>
            )}
          </Stack>
          <Stack spacing={2}>
            <ColorField control={control} name="theme_config.primary_color" label="Color primario (botón, acentos)" readOnly={readOnly} />
            <ColorField control={control} name="theme_config.background_color" label="Fondo del formulario" readOnly={readOnly} />
            <ColorField control={control} name="theme_config.text_color" label="Color del texto" readOnly={readOnly} />
            <ColorField control={control} name="theme_config.button_text_color" label="Color del texto del botón" readOnly={readOnly} />
          </Stack>
        </Stack>
      </GenericPaper>

      <GenericPaper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h4">Estilo</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RegisteredTextInput
                register={register}
                name="theme_config.border_radius"
                label="Bordes redondeados (ej: 6px)"
                disabled={readOnly}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RegisteredTextInput
                register={register}
                name="theme_config.font_family"
                label="Tipografía (CSS font-family)"
                disabled={readOnly}
                size="small"
              />
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary">
            Mirá los cambios en la vista previa de la derecha.
          </Typography>
        </Stack>
      </GenericPaper>

      <GenericPaper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h4">CSS personalizado</Typography>
          <Typography variant="body2" color="text.secondary">
            Elegí qué elemento del formulario querés estilar y escribí las declaraciones CSS para
            ese elemento (sin el selector -- ya se aplica solo). Se ve reflejado en el formulario
            público real, no acá en la vista previa de la derecha (esa vista comparte pantalla con
            el resto del CRM y CSS libre podría romperla).
          </Typography>

          {cssRows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              Todavía no agregaste ninguna regla de CSS.
            </Typography>
          )}

          <Stack spacing={2}>
            {cssRows.map((row, index) => (
              <CssRuleRow key={row.idRule} control={control} index={index} readOnly={readOnly} onRemove={() => removeCssRule(index)} />
            ))}
          </Stack>

          {!readOnly && (
            <CommonButton actionType="CREATE" variant="outlined" onClick={handleAddCssRule} sx={{ alignSelf: 'start' }}>
              Agregar regla de CSS
            </CommonButton>
          )}
        </Stack>
      </GenericPaper>
    </Stack>
  );
};
