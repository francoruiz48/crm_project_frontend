import { useState } from 'react';
import { Stack, Typography, Box } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import type { WebFormDetailed } from 'src/types/webForms';
import GenericPaper from 'src/components/layout/container/GenericPaper';
import CommonButton from 'src/components/ui/buttons/CommonButton';
import { CustomAlert } from 'src/components/ui/feedback/CustomAlert';

interface WebFormEmbedTabProps {
  webForm: WebFormDetailed;
}

// WebFormDetailed.id es el public_uuid del formulario (BaseResponse alias id<-public_uuid) --
// el mismo valor que espera GET/POST /public/forms/{uuid} (sin auth). La página pública se monta
// sin login en ROUTE_LIST_ROOT bajo "/forms/:uuid" (ver routeListExports.tsx).
const buildPublicUrl = (uuid: string) => `${window.location.origin}/forms/${uuid}`;

const buildIframeCode = (uuid: string) =>
  `<iframe src="${buildPublicUrl(uuid)}" width="100%" height="700" style="border:none;" title="Formulario de contacto"></iframe>`;

export const WebFormEmbedTab = ({ webForm }: WebFormEmbedTabProps) => {
  const [copied, setCopied] = useState<'url' | 'iframe' | null>(null);

  const publicUrl = buildPublicUrl(webForm.id);
  const iframeCode = buildIframeCode(webForm.id);

  const handleCopy = (text: string, which: 'url' | 'iframe') => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(prev => (prev === which ? null : prev)), 2000);
  };

  return (
    <Stack spacing={3}>
      <CustomAlert severity="info">
        Pegá este código en el HTML de tu página para mostrar el formulario y recibir leads
        directamente en esta campaña.
      </CustomAlert>

      {!webForm.active && (
        <CustomAlert severity="warning">
          Este formulario está inactivo -- mientras esté así, el iframe va a mostrar un error y no va a aceptar envíos.
        </CustomAlert>
      )}

      <GenericPaper sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="h4">Código para embeber</Typography>
          <Box
            component="pre"
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'action.hover',
              overflowX: 'auto',
              fontSize: '0.8125rem',
              fontFamily: 'monospace',
            }}
          >
            {iframeCode}
          </Box>
          <CommonButton
            actionType="NONE"
            variant="outlined"
            onClick={() => handleCopy(iframeCode, 'iframe')}
            sx={{ alignSelf: 'start' }}
          >
            {copied === 'iframe' ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            {copied === 'iframe' ? 'Copiado' : 'Copiar código'}
          </CommonButton>
        </Stack>
      </GenericPaper>

      <GenericPaper sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="h4">Enlace directo</Typography>
          <Typography variant="body2" color="text.secondary">
            Si preferís no usar un iframe, podés compartir este enlace directamente (por ejemplo, en un botón o un mensaje).
          </Typography>
          <Box
            component="pre"
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'action.hover',
              overflowX: 'auto',
              fontSize: '0.8125rem',
              fontFamily: 'monospace',
            }}
          >
            {publicUrl}
          </Box>
          <CommonButton
            actionType="NONE"
            variant="outlined"
            onClick={() => handleCopy(publicUrl, 'url')}
            sx={{ alignSelf: 'start' }}
          >
            {copied === 'url' ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            {copied === 'url' ? 'Copiado' : 'Copiar enlace'}
          </CommonButton>
        </Stack>
      </GenericPaper>

      {webForm.allowed_domains && webForm.allowed_domains.length > 0 && (
        <CustomAlert severity="warning">
          Este formulario solo acepta envíos desde: {webForm.allowed_domains.join(', ')}. Si lo
          embebés en otro dominio, los envíos van a ser rechazados -- podés cambiar esto en la
          pestaña "General".
        </CustomAlert>
      )}
    </Stack>
  );
};
