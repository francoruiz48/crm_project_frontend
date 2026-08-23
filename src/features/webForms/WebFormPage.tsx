import { useEffect, useState, useRef, useCallback } from 'react';
import { Can } from 'src/components/auth/Can';
import { useUserContext } from 'src/stores/UserContext';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Box, Typography, alpha, useTheme, Stack } from '@mui/material';
import { WebFormForm } from './WebFormForm';
import { getLeadFields } from '../leadFields/leadFieldServices';
import { getNomenclatorItems } from '../nomenclators/nomenclatorService';
import { getWebForm, createWebForm, updateWebForm } from './webFormServices';
import type { WebFormDetailed, WebFormPost } from '../../types/webForms';
import type { LeadField } from '../../types/leadFields';
import type { NomenclatorItem } from '../../types/nomenclators';
import type { WebFormFieldOptionLite } from './WebFormFieldRenderer';
import { showCommonErrorToast } from 'src/utils/feedback';
import { useLoading } from 'src/hooks/useLoading';
import GenericPaper from 'src/components/layout/container/GenericPaper';
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen';
import CustomChip from 'src/components/ui/details/CustomChip';
import { GenericContainer } from 'src/components/layout/container/GenericContainer';
import CommonButton from 'src/components/ui/buttons/CommonButton';
import { CommonIconButton } from 'src/components/ui/buttons/CommonIconButton';
import { usePageTitle } from 'src/hooks/usePageTitle';

// Solo campos "llenables por un visitante" tienen sentido en un formulario público: se excluyen
// CALCULATED (se calcula solo) y LEAD (referencia interna a otro lead) igual que en
// field_automation, más FILE (el submit público es JSON plano, sin soporte de adjuntos todavía).
const EXCLUDED_FIELD_TYPES = ['CALCULATED', 'LEAD', 'FILE'];

// Mismo criterio que _SELECTOR_FIELD_TYPES en web_form_service.py (backend): son los únicos
// tipos de campo cuyo valor sale de una lista de opciones fija (nomenclador).
const SELECTOR_FIELD_TYPES = ['SELECTOR', 'CHECKBOX'];

export const WebFormPage = () => {
  const { id } = useParams<{ id: string }>();

  const theme = useTheme();

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const campaignQueryParam = searchParams.get('campaign');
  const campaignId = campaignQueryParam ?? undefined;

  // La ruta es "/web_forms/:id", con "create" como valor literal para "nuevo formulario"
  // (mismo criterio que AutomationPage.tsx).
  const isEditing = Boolean(id && id !== 'create');

  const { hasPermission } = useUserContext()
  const canEdit = isEditing ? hasPermission("web_form:update") : hasPermission("web_form:create")

  const [readOnly, setReadOnly] = useState(isEditing && searchParams.get('edit') !== 'true');
  const effectiveReadOnly = readOnly || !canEdit
  const [initialData, setInitialData] = useState<WebFormDetailed | null>(null);

  const [fields, setFields] = useState<LeadField[]>([]);
  // Opciones de nomenclador por campo (clave = LeadField.id) -- solo para campos SELECTOR/CHECKBOX
  // que tengan un nomenclador asociado. Se precarga para TODOS los campos elegibles de la campaña
  // (no solo los ya agregados al formulario), para que estén listas apenas se agrega un campo
  // nuevo en la pestaña "Campos". Alimenta tanto el selector de "valor oculto" (WebFormFieldsTab)
  // como las opciones reales del SELECTOR/CHECKBOX en la vista previa (WebFormLivePreview).
  const [fieldOptionsMap, setFieldOptionsMap] = useState<Record<string, WebFormFieldOptionLite[]>>({});

  const formSubmitRef = useRef<() => void>(null);

  const initialLoad = useCallback(async () => {
    if (isEditing) {
      await getWebForm(id!)
        .then(setInitialData)
        .catch(e => showCommonErrorToast(e))
    }
    // detailed:true para tener LeadFieldDetailed.nomenclator (uuid real) -- sin esto no hay forma
    // de pedir los ítems del nomenclador de cada campo (LeadField "liviano" solo trae el id
    // interno crudo de nomenclator_id, FK sin migrar, ver types/leadFields.ts).
    await getLeadFields({ detailed: true, only_active: true, campaign_id: campaignId, page_size: 0 })
      .then(async data => {
        const eligibleFields = data.items.filter(f => !EXCLUDED_FIELD_TYPES.includes(f.field_type_code))
        setFields(eligibleFields)

        const selectorFields = eligibleFields.filter(
          f => SELECTOR_FIELD_TYPES.includes(f.field_type_code) && f.nomenclator?.id
        )
        const uniqueNomenclatorIds = [...new Set(selectorFields.map(f => f.nomenclator!.id))]

        const itemsByNomenclatorId: Record<string, NomenclatorItem[]> = {}
        await Promise.all(
          uniqueNomenclatorIds.map(nomId =>
            getNomenclatorItems({ nomenclator_id: nomId, only_active: true, page_size: 0 })
              .then(res => { itemsByNomenclatorId[nomId] = res.items })
          )
        ).catch(e => showCommonErrorToast(e, 'Error cargando las opciones de los nomencladores.'))

        const map: Record<string, WebFormFieldOptionLite[]> = {}
        selectorFields.forEach(f => {
          const items = itemsByNomenclatorId[f.nomenclator!.id] ?? []
          map[f.id as string] = items.map(item => ({ id: item.id, value: item.value ?? '' }))
        })
        setFieldOptionsMap(map)
      })
      .catch(e => showCommonErrorToast(e))
  }, [campaignId, id, isEditing])

  usePageTitle(
    !isEditing ? "Nuevo Formulario Web"
      : initialData?.name && `${initialData?.name} | Editar Formulario Web`
  )

  const { fnWithLoading: initialFetchLoad, loading: initialFetchLoading } = useLoading(initialLoad)

  useEffect(() => {
    initialFetchLoad()
  }, [initialFetchLoad]);

  const handleSaveToApi = async (payload: WebFormPost) => {
    if (!canEdit) return
    try {
      if (isEditing) await updateWebForm(payload, id!);
      else await createWebForm(payload);
      navigate(`/web_forms${campaignId ? `?campaign=${campaignId}` : ""}`);
    } catch (error) {
      showCommonErrorToast(error)
    }
  };

  const { fnWithLoading: handleSaveLoad, loading: saving } = useLoading(handleSaveToApi)

  return (
    <LoadingScreenWrapper loading={initialFetchLoading}>
      {campaignId ?
        <GenericContainer noPaper sx={{ bgcolor: 'transparent', minHeight: '100vh' }}>
          <GenericPaper
            elevation={0}
            sx={{
              position: 'sticky',
              top: { xs: 70, sm: 75 },
              zIndex: theme.zIndex.appBar - 1,
              px: 3,
              py: 2,
              backgroundColor: alpha(theme.palette.background.paper, 0.85),
              backdropFilter: 'blur(6px)',
            }}
          >
            <Stack direction="row" spacing={2} useFlexGap sx={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <Stack direction="row" sx={{ alignItems: 'center', rowGap: 1, columnGap: 2, flexWrap: "wrap" }}>
                <CommonIconButton actionType='RETURN' size="small" noTooltip border
                  component={Link} to={`/web_forms${campaignId ? `?campaign=${campaignId}` : ""}`} />
                <Typography variant="h2" component="h1" >
                  {isEditing ? initialData?.name : 'Nuevo Formulario Web'}
                </Typography>
                <CustomChip
                  label={effectiveReadOnly ? "Solo Lectura" : "Editando"}
                  size="small"
                  color={effectiveReadOnly ? "default" : "primary"}
                />
              </Stack>

              <Box sx={{ ml: "auto" }}>
                {effectiveReadOnly ? (
                  isEditing && (
                    <Can permission="web_form:update">
                      <CommonButton actionType='MODIFY' onClick={() => setReadOnly(false)} >
                        Editar
                      </CommonButton>
                    </Can>
                  )
                ) : (
                  <Can permission={isEditing ? "web_form:update" : "web_form:create"}>
                    <CommonButton actionType='SAVE' onClick={() => formSubmitRef.current?.()} loading={saving}>
                      Guardar
                    </CommonButton>
                  </Can>
                )}
              </Box>
            </Stack>
          </GenericPaper>

          <WebFormForm
            initialData={initialData}
            campaignId={campaignId}
            onSave={handleSaveLoad}
            fields={fields}
            fieldOptionsMap={fieldOptionsMap}
            readOnly={effectiveReadOnly}
            submitRef={formSubmitRef}
          />
        </GenericContainer>
        :
        <GenericPaper sx={{ height: '80vh' }}>
          <Stack spacing={2} sx={{ justifyContent: 'center', alignItems: 'center', height: "100%" }}>
            <Typography variant="h3" component="h1" color="error">
              Campaña no identificada
            </Typography>
            <Typography color="text.secondary" sx={{ textAlign: "center" }}>
              No se puede cargar el configurador porque falta el identificador de la campaña.<br />
              Por favor, selecciona una campaña desde la lista antes de continuar.
            </Typography>
            <CommonButton actionType='RETURN' component={Link} to='/web_forms'>
              Volver a la lista
            </CommonButton>
          </Stack>
        </GenericPaper>
      }
    </LoadingScreenWrapper>);
};
