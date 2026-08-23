import { useRef, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import type { WebFormPost } from 'src/types/webForms';
import CommonButton from 'src/components/ui/buttons/CommonButton';
import { CommonIconButton } from 'src/components/ui/buttons/CommonIconButton';
import { showCommonErrorToast } from 'src/utils/feedback';
import { uploadWebFormImage } from './webFormImageService';

interface WebFormImageFieldProps {
  control: Control<WebFormPost>;
  setValue: UseFormSetValue<WebFormPost>;
  readOnly: boolean;
}

/**
 * Imagen opcional del formulario (logo u otra) -- se sube al tocar "Subir imagen" (sin esperar al
 * botón "Guardar" general, ya que necesita el viaje de ida y vuelta a /storage/upload para tener
 * una URL) y la URL resultante queda en theme_config.image_url. Reutiliza StorageService/el
 * endpoint genérico de subida (backend, ya usado para fotos de lead) -- no hay endpoint nuevo.
 */
export const WebFormImageField = ({ control, setValue, readOnly }: WebFormImageFieldProps) => {
  const imageUrl = useWatch({ control, name: 'theme_config.image_url' });
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadWebFormImage(file);
      setValue('theme_config.image_url', url, { shouldDirty: true });
    } catch (error) {
      showCommonErrorToast(error, 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setValue('theme_config.image_url', null, { shouldDirty: true });
  };

  return (
    <Stack spacing={1}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>Imagen (opcional)</Typography>
      <Typography variant="caption" color="text.secondary">
        Se muestra arriba del título, tanto en la vista previa como en el formulario público real.
      </Typography>
      {imageUrl ? (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box
            component="img"
            src={imageUrl}
            sx={{ height: 64, maxWidth: 180, objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider', p: 0.5 }}
          />
          {!readOnly && (
            <CommonIconButton actionType="DISABLE" size="small" color="error" onClick={handleRemove} title="Quitar imagen" />
          )}
        </Stack>
      ) : (
        !readOnly && (
          <CommonButton actionType="CREATE" variant="outlined" size="small" component="label" loading={uploading} sx={{ alignSelf: 'start' }}>
            Subir imagen
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
          </CommonButton>
        )
      )}
    </Stack>
  );
};
