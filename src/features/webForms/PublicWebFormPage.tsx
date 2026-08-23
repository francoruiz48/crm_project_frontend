import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Stack, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getPublicWebForm, submitPublicWebForm } from './webFormPublicService';
import type { WebFormPublic, WebFormField } from 'src/types/webForms';
import { DEFAULT_THEME_CONFIG } from 'src/types/webForms';
import { getErrorMessage } from 'src/lib/axios';
import type { SimpleErrorBody } from 'src/types/shared';
import { isBoolType } from './webFormFieldTypeUtils';
import { WebFormFieldRenderer } from './WebFormFieldRenderer';
import { compileCustomCss } from './webFormCssTargets';

// Mismo nombre de campo que el backend (HONEYPOT_FIELD_NAME en web_form_public_controller.py) --
// se manda siempre vacío por un visitante real; si un bot lo completa, el backend "finge éxito"
// y corta sin crear el lead.
const HONEYPOT_FIELD_NAME = 'website_url_ext';

type FieldValue = string | boolean;

export const PublicWebFormPage = () => {
  const { uuid } = useParams<{ uuid: string }>();

  const [form, setForm] = useState<WebFormPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // No lleva estado de React: si un bot lo completa (rellenando todos los inputs del form a
  // ciegas), lo que importa es que el valor final quede en el DOM al momento del submit -- se lee
  // directo del ref, sin pasar por re-render, para no darle ninguna señal extra al bot.
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uuid) return;
    getPublicWebForm(uuid)
      .then(data => {
        setForm(data);
        const initial: Record<string, FieldValue> = {};
        data.fields.forEach(f => {
          if (f.hidden_value != null) return; // no se renderiza -- el backend lo autocompleta
          initial[f.id] = isBoolType(f.lead_field?.field_type_code) ? false : '';
        });
        setValues(initial);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [uuid]);

  const theme = form?.theme_config ?? DEFAULT_THEME_CONFIG;

  const visibleFields = useMemo(
    () => (form?.fields ?? []).filter(f => f.hidden_value == null).sort((a, b) => a.order - b.order),
    [form]
  );

  const hasRequiredFields = visibleFields.some(f => f.is_required);
  const compiledCustomCss = useMemo(() => compileCustomCss(theme.custom_css_rules), [theme.custom_css_rules]);

  const handleChange = (fieldId: string, value: FieldValue) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uuid || !form) return;

    // Chequeo de obligatoriedad en el cliente (además del que hace el backend) -- solo UX, la
    // fuente de verdad real es la validación server-side.
    const missing = visibleFields.filter(f => f.is_required && !values[f.id]);
    if (missing.length > 0) {
      setSubmitError(`Faltan campos requeridos: ${missing.map(f => f.custom_label || f.lead_field?.name || 'campo').join(', ')}.`);
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { [HONEYPOT_FIELD_NAME]: honeypotRef.current?.value ?? '' };
      Object.entries(values).forEach(([fieldId, value]) => {
        payload[fieldId] = typeof value === 'boolean' ? String(value) : value;
      });
      await submitPublicWebForm(uuid, payload);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(getErrorMessage(err as SimpleErrorBody, 'No se pudo enviar el formulario. Intenta de nuevo.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Stack sx={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (notFound || !form) {
    return (
      <Stack sx={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Typography variant="h5" color="text.secondary">Este formulario no está disponible.</Typography>
      </Stack>
    );
  }

  return (
    <>
      {/* CSS del dueño del formulario, compilado a partir de theme_config.custom_css_rules (una
          regla por elemento, ver webFormCssTargets.ts) -- se aplica tal cual, sin sanitizar,
          porque esta es la única página que renderiza este componente (ruta pública dedicada, no
          comparte DOM con el resto del CRM como sí pasa con WebFormLivePreview). */}
      {compiledCustomCss && <style>{compiledCustomCss}</style>}
      <Box
        className="web-form-container"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          p: { xs: 2, sm: 4 },
          backgroundColor: theme.background_color || DEFAULT_THEME_CONFIG.background_color,
          color: theme.text_color || DEFAULT_THEME_CONFIG.text_color,
          fontFamily: theme.font_family || DEFAULT_THEME_CONFIG.font_family,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 560 }}>
          {submitted ? (
            <Stack spacing={2} className="web-form-success-message" sx={{ alignItems: 'center', textAlign: 'center', py: 6 }}>
              <CheckCircleIcon sx={{ fontSize: 56, color: theme.primary_color || DEFAULT_THEME_CONFIG.primary_color }} />
              <Typography variant="h5" sx={{ color: 'inherit', fontFamily: 'inherit' }}>
                {form.success_message || 'Formulario enviado exitosamente.'}
              </Typography>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <Stack spacing={3}>
                <Stack spacing={1}>
                  {theme.image_url && (
                    <Box
                      component="img"
                      src={theme.image_url}
                      className="web-form-image"
                      sx={{ maxWidth: '100%', maxHeight: 96, display: 'block', mx: 'auto', mb: 1 }}
                    />
                  )}
                  {form.title && (
                    <Typography
                      variant="h1"
                      component="h1"
                      className="web-form-title"
                      sx={{ color: 'inherit', fontFamily: 'inherit', textAlign: 'center', fontWeight: 700 }}
                    >
                      {form.title}
                    </Typography>
                  )}
                  {form.description && (
                    <Typography variant="body1" className="web-form-description" sx={{ color: 'inherit', fontFamily: 'inherit', opacity: 0.85, textAlign: 'center' }}>
                      {form.description}
                    </Typography>
                  )}
                </Stack>

                {submitError && <Alert severity="error">{submitError}</Alert>}

                <Stack spacing={2}>
                  {visibleFields.map(field => (
                    <Box className="web-form-field" key={field.id}>
                      <PublicFieldInput
                        field={field}
                        value={values[field.id]}
                        onChange={value => handleChange(field.id, value)}
                        borderRadius={theme.border_radius || DEFAULT_THEME_CONFIG.border_radius}
                      />
                    </Box>
                  ))}
                </Stack>

                {/* Honeypot: oculto con estilos inline (no `display:none`/`type=hidden`, que muchos
                    bots ya ignoran) -- posicionado fuera de pantalla y sin foco por tabulación. */}
                <Box sx={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
                  <TextField
                    inputRef={honeypotRef}
                    tabIndex={-1}
                    autoComplete="off"
                    label="Sitio web"
                    name={HONEYPOT_FIELD_NAME}
                  />
                </Box>

                {hasRequiredFields && (
                  <Typography variant="caption" className="web-form-required-legend" sx={{ color: 'inherit', fontFamily: 'inherit', opacity: 0.75 }}>
                    Los campos con * son obligatorios.
                  </Typography>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  disableRipple
                  className="web-form-submit-button"
                  sx={{
                    backgroundColor: theme.primary_color || DEFAULT_THEME_CONFIG.primary_color,
                    color: theme.button_text_color || DEFAULT_THEME_CONFIG.button_text_color,
                    borderRadius: theme.border_radius || DEFAULT_THEME_CONFIG.border_radius,
                    fontFamily: 'inherit',
                    textTransform: 'none',
                    py: 1.2,
                    '&:hover': {
                      backgroundColor: theme.primary_color || DEFAULT_THEME_CONFIG.primary_color,
                      opacity: 0.9,
                    },
                  }}
                >
                  {submitting ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : 'Enviar'}
                </Button>
              </Stack>
            </form>
          )}
        </Box>
      </Box>
    </>
  );
};

interface PublicFieldInputProps {
  field: WebFormField;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
  borderRadius: string;
}

const PublicFieldInput = ({ field, value, onChange, borderRadius }: PublicFieldInputProps) => {
  const label = field.custom_label || field.lead_field?.name || 'Campo';
  const defaultValue = isBoolType(field.lead_field?.field_type_code) ? false : '';

  return (
    <WebFormFieldRenderer
      label={label}
      typeCode={field.lead_field?.field_type_code}
      subtypeCode={field.lead_field?.field_subtype_code}
      placeholder={field.custom_placeholder}
      required={field.is_required}
      options={field.nomenclator_items ?? []}
      value={value ?? defaultValue}
      onChange={onChange}
      borderRadius={borderRadius}
    />
  );
};
