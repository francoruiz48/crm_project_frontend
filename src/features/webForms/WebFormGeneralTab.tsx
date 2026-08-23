import { Stack, Grid, Autocomplete, TextField, Typography } from '@mui/material';
import { Controller, type Control, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import type { WebFormPost } from 'src/types/webForms';
import { RegisteredTextInput, ControlledCheckbox, ControlledSwitch } from 'src/components/ui/forms/CustomInputs';
import GenericPaper from 'src/components/layout/container/GenericPaper';
import { WebFormImageField } from './WebFormImageField';

interface WebFormGeneralTabProps {
  register: UseFormRegister<WebFormPost>;
  control: Control<WebFormPost>;
  setValue: UseFormSetValue<WebFormPost>;
  readOnly: boolean;
}

// Nota: al igual que en el resto del CRM (ver AutomationForm.tsx, priority sin disabled),
// ControlledCheckbox/ControlledSwitch no bloquean visualmente el toggle en solo-lectura --
// la protección real es que el botón "Guardar" no está disponible en ese modo.
export const WebFormGeneralTab = ({ register, control, setValue, readOnly }: WebFormGeneralTabProps) => {
  return (
    <Stack spacing={3}>
      <GenericPaper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h4">Datos internos</Typography>
          <Typography variant="body2" color="text.secondary">
            Solo se usan dentro del CRM para identificar el formulario -- el visitante nunca los ve.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <RegisteredTextInput
                register={register}
                name="name"
                label="Nombre del formulario"
                required
                disabled={readOnly}
                placeholder="Ej: Landing Ventas 2026"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <ControlledSwitch control={control} name="active" label="Activo" title="Estado" />
            </Grid>
          </Grid>
        </Stack>
      </GenericPaper>

      <GenericPaper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h4">Contenido visible</Typography>
          <Grid container spacing={2}>
            <Grid size={12}>
              <WebFormImageField control={control} setValue={setValue} readOnly={readOnly} />
            </Grid>
            <Grid size={12}>
              <RegisteredTextInput
                register={register}
                name="title"
                label="Título del formulario"
                disabled={readOnly}
                placeholder="Ej: Dejanos tus datos"
              />
            </Grid>
            <Grid size={12}>
              <RegisteredTextInput
                register={register}
                name="description"
                label="Descripción / subtítulo"
                disabled={readOnly}
                multiline
                rows={2}
              />
            </Grid>
            <Grid size={12}>
              <RegisteredTextInput
                register={register}
                name="success_message"
                label="Mensaje de éxito al enviar"
                disabled={readOnly}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </Stack>
      </GenericPaper>

      <GenericPaper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h4">Comportamiento al enviar</Typography>
          <Grid container spacing={2}>
            <Grid size={12}>
              <RegisteredTextInput
                register={register}
                name="redirect_url"
                label="Redirigir a esta URL después de enviar (opcional)"
                disabled={readOnly}
                placeholder="https://tusitio.com/gracias"
              />
            </Grid>
            <Grid size={12}>
              <Controller
                control={control}
                name="allowed_domains"
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    freeSolo
                    disabled={readOnly}
                    options={[]}
                    value={field.value ?? []}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Dominios permitidos para embeber (opcional)"
                        placeholder="tusitio.com y Enter"
                        helperText="Vacío = se permite desde cualquier sitio. Escribí un dominio y presioná Enter para agregarlo."
                      />
                    )}
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <ControlledCheckbox control={control} name="require_captcha" label="Requiere verificación CAPTCHA" title=""
                tooltip="Todavía no configuraste un proveedor de CAPTCHA (Turnstile/reCAPTCHA) -- si activás esto antes de configurarlo, nadie va a poder enviar el formulario." />
            </Grid>
          </Grid>
        </Stack>
      </GenericPaper>
    </Stack>
  );
};
