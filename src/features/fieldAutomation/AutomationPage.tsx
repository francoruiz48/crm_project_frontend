import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Can } from 'src/components/auth/Can';
import { useUserContext } from 'src/stores/UserContext';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Box, Typography, alpha, useTheme, Stack } from '@mui/material';
import { AutomationForm } from './AutomationForm';
import { getLeadFields } from '../leadFields/leadFieldServices';
import { getFieldAutomation, createFieldAutomation, updateFieldAutomation } from './AutomationFieldServices';
import type { FieldAutomationPost, FieldAutomationDetailed } from '../../types/automation';
import type { LeadField } from '../../types/leadFields';
import { NATIVE_LEAD_FIELDS, type NativeFieldOptions } from '../lead/nativeLeadFields';
import { getLeadContactStates } from '../orgProperties/contactState/contactStatesServices';
import { getLeadFlowStates } from '../leadFlows/leadFlowServices/FlowService';
import { getTeams } from '../lead/teamService';
import { getUsersInOrg } from 'src/features/auth/userServices';
import { getCampaign } from 'src/features/campaigns/campaignServices';
import { useDictionaryContext } from 'src/stores/DictionaryContext';
import { showCommonErrorToast } from 'src/utils/feedback';
import { useLoading } from 'src/hooks/useLoading';
import GenericPaper from 'src/components/layout/container/GenericPaper';
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen';
import CustomChip from 'src/components/ui/details/CustomChip';
import { GenericContainer } from 'src/components/layout/container/GenericContainer';
import CommonButton from 'src/components/ui/buttons/CommonButton';
import { CommonIconButton } from 'src/components/ui/buttons/CommonIconButton';
import { usePageTitle } from 'src/hooks/usePageTitle';

export const AutomationPage = () => {
  const { id } = useParams<{ id: string }>();

  const theme = useTheme();

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const campaignQueryParam = searchParams.get('campaign');
  const campaignId = campaignQueryParam ?? undefined;
  const duplicateFromId = searchParams.get('duplicate_from');

  // La ruta es "/automations/:id", con "create" como valor literal para "nueva automatización"
  // (ver routes.tsx). Antes se usaba isNaN(Number(id)) para distinguir un id real de "create",
  // pero ahora los ids reales son UUID strings, que también fallan Number() -- ya no sirve
  // para distinguir. Se compara directo contra el literal "create".
  const isEditing = Boolean(id && id !== 'create');
  const isDuplicating = Boolean(duplicateFromId);

  // Sin el permiso correspondiente (según se esté creando o editando), el formulario
  // se fuerza a solo-lectura sin importar el toggle local ni el parámetro "edit" de la URL.
  const { hasPermission } = useUserContext()
  const canEdit = isEditing ? hasPermission("field_automation:update") : hasPermission("field_automation:create")

  const [readOnly, setReadOnly] = useState(isEditing && searchParams.get('edit') !== 'true');
  const effectiveReadOnly = readOnly || !canEdit

  const { dictionaries } = useDictionaryContext()
  const [initialData, setInitialData] = useState<FieldAutomationDetailed | null>(null);

  const [fields, setFields] = useState<LeadField[]>([]);
  const [nativeOptions, setNativeOptions] = useState<NativeFieldOptions>({ contactStates: [], leadStates: [], teams: [], users: [] });
  // Qué operadores/tipos de acción tiene sentido ofrecer según el tipo del campo elegido en
  // cada condición/acción (ver ConditionRow/ActionRow) -- viene del backend
  // (AUTOMATION_COMPATIBILITY_MATRIX) para no duplicar esa regla acá y que quede desactualizada
  // como pasó hasta ahora (ver comentarios en types/automation.ts, 2026-08-15).
  const compatibilityMatrix = useMemo(() => dictionaries.automation_compatibility_matrix ?? {}, [dictionaries.automation_compatibility_matrix]);

  const formSubmitRef = useRef<() => void>(null);

  const initialLoad = useCallback(async () => {
    if (isEditing) {
      await getFieldAutomation(id!)
        .then(setInitialData)
        .catch(e => showCommonErrorToast(e))
    } else if (isDuplicating) {
      await getFieldAutomation(duplicateFromId!)
        .then(data => {
          setInitialData({ ...data, name: `Copia de ${data.name}` });
        })
        .catch(e => showCommonErrorToast(e))
    }
    // Se agregan los campos nativos del lead a los mismos que ya se ofrecen en filtros/columnas de la lista
    // de leads, para poder usarlos en condiciones/acciones de la automatización.
    await getLeadFields({ detailed: false, only_active: true, campaign_id: campaignId, page_size: 0 })
      .then(data => setFields([...NATIVE_LEAD_FIELDS, ...data.items]))
      .catch(e => showCommonErrorToast(e))

    // Opciones reales para los selectores de valor de los campos nativos tipo NATIVE_ID
    // (mismo patrón que LeadFilters.tsx en la lista de leads).
    getLeadContactStates({ page_size: 0 })
      .then(r => setNativeOptions(prev => ({ ...prev, contactStates: r.items })))
      .catch(e => showCommonErrorToast(e))
    getTeams({ page_size: 0 })
      .then(r => setNativeOptions(prev => ({ ...prev, teams: r.items })))
      .catch(e => showCommonErrorToast(e))
    getUsersInOrg()
      .then(users => setNativeOptions(prev => ({ ...prev, users })))
      .catch(e => showCommonErrorToast(e))
    if (campaignId) {
      getCampaign(campaignId)
        .then(campaign => {
          if (!campaign.lead_flow_id) return
          return getLeadFlowStates({ lead_flow_id: campaign.lead_flow_id, page_size: 0 })
            .then(r => setNativeOptions(prev => ({ ...prev, leadStates: r.items })))
        })
        .catch(e => showCommonErrorToast(e))
    }
  }, [campaignId, id, isDuplicating, duplicateFromId, isEditing])

  usePageTitle(
    !isEditing ? "Nueva Automatización"
      : isDuplicating ? initialData?.name && `${initialData?.name} | Duplicar Automatización`
        : initialData?.name && `${initialData?.name} | Editar Automatización`
  )

  const { fnWithLoading: initialFetchLoad, loading: initialFetchLoading } = useLoading(initialLoad)

  useEffect(() => {
    initialFetchLoad()
  }, [initialFetchLoad]);

  const handleSaveToApi = async (payload: FieldAutomationPost) => {
    if (!canEdit) return
    try {
      if (isEditing) await updateFieldAutomation(payload, id!);
      else await createFieldAutomation(payload);
      navigate(`/automations${campaignId ? `?campaign=${campaignId}` : ""}`);
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
              top: { xs: 70, sm: 75 }, // Offset para no quedar debajo del navbar
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
                  component={Link} to={`/automations${campaignId ? `?campaign=${campaignId}` : ""}`} />
                <Typography variant="h2" component="h1" >
                  {isEditing ? initialData?.name : 'Nueva Automatización'}
                </Typography>
                {/* Badge de Estado: Se integra aquí el texto de "Modo visualización" */}
                <CustomChip
                  label={effectiveReadOnly ? "Solo Lectura" : isDuplicating ? "Duplicando" : "Editando"}
                  size="small"
                  color={effectiveReadOnly ? "default" : "primary"}
                />
              </Stack>

              {/* Derecha: Botones de Acción */}
              <Box sx={{ ml: "auto" }}>
                {effectiveReadOnly ? (
                  // El toggle "Editar" solo tiene sentido al editar una automatización existente
                  // (al crear una nueva, el formulario ya arranca editable si hay permiso de creación).
                  isEditing && (
                    <Can permission="field_automation:update">
                      <CommonButton actionType='MODIFY' onClick={() => setReadOnly(false)} >
                        Editar
                      </CommonButton>
                    </Can>
                  )
                ) : (
                  <Can permission={isEditing ? "field_automation:update" : "field_automation:create"}>
                    <CommonButton actionType='SAVE' onClick={() => formSubmitRef.current?.()} loading={saving}>
                      Guardar
                    </CommonButton>
                  </Can>
                )}
              </Box>
            </Stack>
          </GenericPaper>

          {/* Contenido del Formulario */}
          <AutomationForm
            initialData={initialData}
            campaignId={campaignId}
            onSave={handleSaveLoad}
            fields={fields}
            nativeOptions={nativeOptions}
            compatibilityMatrix={compatibilityMatrix}
            readOnly={effectiveReadOnly}
            isDuplicating={isDuplicating}
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
            <CommonButton actionType='RETURN' component={Link} to='/automations'>
              Volver a la lista
            </CommonButton>
          </Stack>
        </GenericPaper>
      }
    </LoadingScreenWrapper>);
};