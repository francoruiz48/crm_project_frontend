import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack, Tab, Tabs, Typography, Paper, alpha, Grid } from '@mui/material';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import { useForm } from 'react-hook-form';
import type { WebFormDetailed, WebFormField, WebFormFieldPost, WebFormPost } from 'src/types/webForms';
import { DEFAULT_THEME_CONFIG } from 'src/types/webForms';
import type { LeadField } from 'src/types/leadFields';
import { WebFormGeneralTab } from './WebFormGeneralTab';
import { WebFormFieldsTab } from './WebFormFieldsTab';
import { WebFormThemeTab } from './WebFormThemeTab';
import { WebFormEmbedTab } from './WebFormEmbedTab';
import { WebFormLivePreview } from './WebFormLivePreview';
import type { WebFormFieldOptionLite } from './WebFormFieldRenderer';
import { showCommonErrorToast, showToast } from 'src/utils/feedback';
import GenericPaper from 'src/components/layout/container/GenericPaper';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`web-form-tabpanel-${index}`}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface WebFormFormProps {
  initialData?: WebFormDetailed | null;
  campaignId: string;
  onSave: (data: WebFormPost) => Promise<unknown>;
  fields?: LeadField[];
  // Opciones de nomenclador por campo (clave = LeadField.id), precargadas en WebFormPage --
  // alimenta el selector de "valor oculto" (WebFormFieldsTab) y las opciones reales del
  // SELECTOR/CHECKBOX en la vista previa (WebFormLivePreview).
  fieldOptionsMap?: Record<string, WebFormFieldOptionLite[]>;
  readOnly?: boolean;
  submitRef?: React.RefObject<(() => void) | null>;
}

const fieldToPost = (f: WebFormField): WebFormFieldPost => ({
  // OJO: f.lead_field_id (backend, WebFormFieldResponse) es el id INTERNO crudo de la columna
  // FK, no el public_uuid -- a diferencia de prácticamente todo el resto de la API, este campo
  // puntual nunca se resolvió del lado del backend (bug preexistente, no conviene tocarlo ahí:
  // WebFormFieldResponse se valida vía Pydantic desde la ORM cruda, y tipearlo `str` rompe
  // cualquier GET/PUT antes de poder "unresolverlo"). Se usa en cambio `f.lead_field.id`, que
  // LeadFieldLiteResponse SÍ expone correctamente como public_uuid (BaseResponse.id) -- mismo
  // valor que `LeadField.id` en la lista de campos de la campaña, así matchea en el selector de
  // "Campos" y en la vista previa. Bug real encontrado 2026-08-18 (reportado por el usuario): sin
  // esto, el campo elegido se guardaba bien pero al reabrir el formulario aparecía sin selección.
  lead_field_id: f.lead_field?.id ?? '',
  order: f.order,
  custom_label: f.custom_label,
  custom_placeholder: f.custom_placeholder,
  is_required: f.is_required,
  hidden_value: f.hidden_value,
});

export const WebFormForm = ({ initialData, campaignId, onSave, fields = [], fieldOptionsMap = {}, readOnly = false, submitRef = null }: WebFormFormProps) => {
  const [tab, setTab] = useState(0);

  const defaultValues = useMemo((): WebFormPost => {
    if (initialData) {
      return {
        name: initialData.name,
        title: initialData.title,
        description: initialData.description,
        theme_config: { ...DEFAULT_THEME_CONFIG, ...(initialData.theme_config ?? {}) },
        success_message: initialData.success_message,
        redirect_url: initialData.redirect_url,
        allowed_domains: initialData.allowed_domains ?? [],
        require_captcha: initialData.require_captcha,
        active: initialData.active,
        campaign_id: campaignId,
        fields: [...initialData.fields].sort((a, b) => a.order - b.order).map(fieldToPost),
      };
    }
    return {
      name: '',
      title: '',
      description: '',
      theme_config: DEFAULT_THEME_CONFIG,
      success_message: '',
      redirect_url: '',
      allowed_domains: [],
      require_captcha: false,
      active: true,
      campaign_id: campaignId,
      fields: [],
    };
  }, [initialData, campaignId]);

  const { register, control, handleSubmit, setValue } = useForm<WebFormPost>({ defaultValues });

  const validate = useCallback((data: WebFormPost): string[] => {
    const errors: string[] = [];
    if (!data.name.trim()) errors.push('El nombre del formulario es requerido.');
    (data.fields ?? []).forEach((f, idx) => {
      if (!f.lead_field_id) errors.push(`El campo #${idx + 1} de la lista "Campos" no tiene un campo de la campaña seleccionado.`);
    });
    if (data.redirect_url && !/^https?:\/\//.test(data.redirect_url)) {
      errors.push('La URL de redirección debe empezar con http:// o https://');
    }
    return [...new Set(errors)];
  }, []);

  const handleSave = useCallback(async (data: WebFormPost) => {
    const errors = validate(data);
    if (errors.length > 0) {
      showToast(errors[0], 'error');
      return;
    }

    const cleanFields = (data.fields ?? []).map((f, idx) => ({
      lead_field_id: f.lead_field_id,
      order: idx + 1,
      custom_label: f.custom_label || null,
      custom_placeholder: f.custom_placeholder || null,
      is_required: f.is_required,
      hidden_value: f.hidden_value || null,
    }));

    const payload: WebFormPost = {
      name: data.name,
      title: data.title || null,
      description: data.description || null,
      theme_config: data.theme_config,
      success_message: data.success_message || null,
      redirect_url: data.redirect_url || null,
      allowed_domains: (data.allowed_domains ?? []).filter(d => d.trim() !== ''),
      require_captcha: data.require_captcha,
      active: data.active,
      campaign_id: campaignId,
      fields: cleanFields,
    };

    try {
      await onSave(payload);
      showToast('Formulario guardado con éxito');
    } catch (error) {
      showCommonErrorToast(error, 'Error al guardar el formulario.');
    }
  }, [campaignId, onSave, validate]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const submitHandler = useCallback(handleSubmit(handleSave), [handleSubmit, handleSave]);

  useEffect(() => {
    if (submitRef) {
      submitRef.current = submitHandler;
    }
  }, [submitRef, submitHandler]);

  const isEditing = Boolean(initialData);

  return (
    <form onSubmit={submitHandler}>
      <Stack spacing={2} sx={{ py: 3, px: 2 }}>
        <Paper
          elevation={1}
          sx={(theme) => ({
            p: 3,
            background: readOnly
              ? alpha(theme.palette.text.disabled, 0.1)
              : `linear-gradient(190deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.dark} 80%)`,
            color: readOnly ? 'text.primary' : 'white',
            border: readOnly ? '1px dashed' : 'none',
            borderColor: 'divider',
            ...theme.applyStyles('dark', {
              background: readOnly
                ? alpha(theme.palette.text.disabled, 0.1)
                : `linear-gradient(190deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary[600]} 70%)`,
            }),
          })}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <DynamicFormIcon sx={{ fontSize: 40, opacity: readOnly ? 0.5 : 1 }} />
            <Stack spacing={1}>
              <Typography variant="h4" component="p">Formulario Web</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {readOnly
                  ? 'Los cambios están deshabilitados. Pulsa el botón "Editar" en la parte superior para modificar.'
                  : 'Elegí los campos, el estilo y el texto que va a ver el visitante al completar este formulario.'}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <GenericPaper elevation={0} sx={{ p: 0 }}>
              <Box sx={{ px: 2, pt: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="web form tabs" variant="scrollable">
                  <Tab label="General" id="tab-wf-general" />
                  <Tab label="Campos" id="tab-wf-fields" />
                  <Tab label="Estilo" id="tab-wf-theme" />
                  {isEditing && <Tab label="Insertar" id="tab-wf-embed" />}
                </Tabs>
              </Box>
              <Box sx={{ p: 2 }}>
                <CustomTabPanel value={tab} index={0}>
                  <WebFormGeneralTab register={register} control={control} setValue={setValue} readOnly={readOnly} />
                </CustomTabPanel>
                <CustomTabPanel value={tab} index={1}>
                  <WebFormFieldsTab control={control} register={register} fields={fields} fieldOptionsMap={fieldOptionsMap} readOnly={readOnly} />
                </CustomTabPanel>
                <CustomTabPanel value={tab} index={2}>
                  <WebFormThemeTab control={control} register={register} setValue={setValue} readOnly={readOnly} />
                </CustomTabPanel>
                {isEditing && initialData && (
                  <CustomTabPanel value={tab} index={3}>
                    <WebFormEmbedTab webForm={initialData} />
                  </CustomTabPanel>
                )}
              </Box>
            </GenericPaper>
          </Grid>

          {/* Vista previa en vivo, siempre visible sin importar la pestaña activa a la izquierda
              (pedido del usuario, 2026-08-17) -- por eso vive acá y no dentro de cada tab. */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <WebFormLivePreview control={control} leadFields={fields} fieldOptionsMap={fieldOptionsMap} />
          </Grid>
        </Grid>
      </Stack>
    </form>
  );
};
