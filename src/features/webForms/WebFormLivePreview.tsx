import { memo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useWatch, type Control } from 'react-hook-form';
import type { WebFormPost } from 'src/types/webForms';
import { DEFAULT_THEME_CONFIG } from 'src/types/webForms';
import type { LeadField } from 'src/types/leadFields';
import GenericPaper from 'src/components/layout/container/GenericPaper';
import { WebFormFieldRenderer, type WebFormFieldOptionLite } from './WebFormFieldRenderer';

interface WebFormLivePreviewProps {
  control: Control<WebFormPost>;
  leadFields: LeadField[];
  // Opciones de nomenclador por campo (clave = LeadField.id) -- para que los SELECTOR/CHECKBOX
  // de la vista previa muestren las opciones reales en vez de un desplegable vacío.
  fieldOptionsMap?: Record<string, WebFormFieldOptionLite[]>;
}

type PreviewFieldValue = string | boolean;

/**
 * Vista previa en vivo de "cómo va quedando" el formulario completo (título, descripción, campos
 * elegidos en la pestaña "Campos" y estilo elegido en "Estilo") -- se muestra siempre al costado,
 * sin importar en qué pestaña de configuración esté el usuario. Usa su propio `useWatch` (en vez
 * de recibir los valores ya resueltos por props) para aislar los re-renders del resto del
 * formulario, mismo criterio que el componente `Description` en AutomationForm.tsx.
 *
 * Es interactiva (se puede escribir, tildar, etc.) para poder "probar" el formulario, pero ese
 * estado (`previewValues`/`showSuccess`) es enteramente local y descartable -- no toca el formulario
 * real ni el botón "Guardar" de arriba. El botón "Enviar" de acá simula el envío y muestra el
 * mensaje de éxito configurado, con un link para volver.
 */
export const WebFormLivePreview = memo(({ control, leadFields, fieldOptionsMap = {} }: WebFormLivePreviewProps) => {
  const title = useWatch({ control, name: 'title' });
  const description = useWatch({ control, name: 'description' });
  const themeConfig = useWatch({ control, name: 'theme_config' });
  const successMessage = useWatch({ control, name: 'success_message' });
  const fields = useWatch({ control, name: 'fields' }) ?? [];

  const theme = themeConfig ?? DEFAULT_THEME_CONFIG;
  const visibleFields = fields.filter(f => !f.hidden_value);

  const [previewValues, setPreviewValues] = useState<Record<string, PreviewFieldValue>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePreviewChange = (key: string, value: PreviewFieldValue) => {
    setPreviewValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Stack spacing={1} sx={{ position: 'sticky', top: 90 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" color="text.secondary">Vista previa en vivo</Typography>
        <Typography variant="caption" color="text.secondary">
          Podés probarla -- no guarda nada
        </Typography>
      </Stack>
      <GenericPaper elevation={0} sx={{ p: 0, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <Box
          sx={{
            p: { xs: 2.5, sm: 4 },
            backgroundColor: theme.background_color || DEFAULT_THEME_CONFIG.background_color,
            color: theme.text_color || DEFAULT_THEME_CONFIG.text_color,
            fontFamily: theme.font_family || DEFAULT_THEME_CONFIG.font_family,
          }}
        >
          {showSuccess ? (
            <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: theme.primary_color || DEFAULT_THEME_CONFIG.primary_color }} />
              <Typography variant="h6" sx={{ color: 'inherit', fontFamily: 'inherit' }}>
                {successMessage || 'Formulario enviado exitosamente.'}
              </Typography>
              <Box
                component="button"
                type="button"
                onClick={() => setShowSuccess(false)}
                sx={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  textDecoration: 'underline',
                  fontFamily: 'inherit',
                  opacity: 0.75,
                  fontSize: '0.8125rem',
                }}
              >
                ← Volver a ver el formulario
              </Box>
            </Stack>
          ) : (
            <Stack spacing={3}>
              <Stack spacing={1}>
                {theme.image_url && (
                  <Box
                    component="img"
                    src={theme.image_url}
                    sx={{ maxWidth: '100%', maxHeight: 80, display: 'block', mx: 'auto', mb: 1 }}
                  />
                )}
                <Typography
                  variant="h1"
                  component="h1"
                  sx={{ color: 'inherit', fontFamily: 'inherit', textAlign: 'center', fontWeight: 700 }}
                >
                  {title || 'Título del formulario'}
                </Typography>
                {description && (
                  <Typography
                    variant="body1"
                    sx={{ color: 'inherit', fontFamily: 'inherit', opacity: 0.85, textAlign: 'center' }}
                  >
                    {description}
                  </Typography>
                )}
              </Stack>

              {visibleFields.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'inherit', fontFamily: 'inherit', opacity: 0.6, textAlign: 'center' }}>
                  Agregá campos en la pestaña "Campos" para verlos acá.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {visibleFields.map((f, idx) => {
                    const leadField = leadFields.find(lf => lf.id === f.lead_field_id);
                    const previewKey = f.lead_field_id || `field-${idx}`;
                    return (
                      <WebFormFieldRenderer
                        key={`${previewKey}-${idx}`}
                        label={f.custom_label || leadField?.name || 'Campo'}
                        typeCode={leadField?.field_type_code}
                        subtypeCode={leadField?.field_subtype_code}
                        placeholder={f.custom_placeholder}
                        required={f.is_required}
                        options={fieldOptionsMap[f.lead_field_id] ?? []}
                        value={previewValues[previewKey] ?? ''}
                        onChange={value => handlePreviewChange(previewKey, value)}
                        borderRadius={theme.border_radius || DEFAULT_THEME_CONFIG.border_radius}
                      />
                    );
                  })}
                </Stack>
              )}

              {visibleFields.some(f => f.is_required) && (
                <Typography variant="caption" sx={{ color: 'inherit', fontFamily: 'inherit', opacity: 0.75 }}>
                  Los campos con * son obligatorios.
                </Typography>
              )}

              <Box
                component="button"
                type="button"
                onClick={() => setShowSuccess(true)}
                sx={{
                  border: 'none',
                  cursor: 'pointer',
                  py: 1.2,
                  fontFamily: 'inherit',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  backgroundColor: theme.primary_color || DEFAULT_THEME_CONFIG.primary_color,
                  color: theme.button_text_color || DEFAULT_THEME_CONFIG.button_text_color,
                  borderRadius: theme.border_radius || DEFAULT_THEME_CONFIG.border_radius,
                }}
              >
                Enviar
              </Box>
            </Stack>
          )}
        </Box>
      </GenericPaper>
    </Stack>
  );
});
