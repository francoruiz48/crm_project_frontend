import { useCallback, useEffect, useState } from 'react';
import { GenericContainer } from 'src/components/layout/container/GenericContainer';
import PaginationComponent from 'src/components/ui/lists/PaginationComponent';
import { ResponsiveListItem } from 'src/components/ui/lists/CustomListItem';
import CommonButton from 'src/components/ui/buttons/CommonButton';
import { EnabledIcon } from 'src/components/ui/lists/Icons';
import { useListPagination } from 'src/hooks/useListPagination';
import type { WebFormDetailed } from 'src/types/webForms';
import type { Campaign } from 'src/types/campaigns';
import type { OrderSearchParams, Paginable } from 'src/types/shared';
import { getWebForms } from './webFormServices';
import { getCampaigns } from '../campaigns/campaignServices';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Autocomplete, List, ListItemText, Stack, TextField, Typography } from '@mui/material';
import { showCommonErrorToast } from 'src/utils/feedback';
import { useLoading } from 'src/hooks/useLoading';
import LoadingScreenWrapper from 'src/components/ui/feedback/LoadingScreen';
import CustomChip from 'src/components/ui/details/CustomChip';
import { ChipTooltip } from 'src/components/ui/details/ChipTooltip';
import { useOrderSeachList } from 'src/hooks/useOrderSearchLists';
import { OrderSearchMenu } from 'src/components/ui/lists/OrderMenu';
import { Can } from 'src/components/auth/Can';
import { EntityConfirmDialog } from 'src/components/ui/feedback/EntityConfirmDialog';
import { useEntityActionManager } from 'src/hooks/useEntityActionManager';

const ORDER_WF_FIELDS = [
  { name: "name", label: "Orden Alfabético" },
  { name: "created_at", label: "Fecha de creación" },
]

const SEARCH_WF_FIELDS = [
  { name: "name", label: "Nombre" },
  { name: "description", label: "Descripción" },
]

const DEFAULT_FIELDS: OrderSearchParams = { order_by: "name", ascending: true }

// id="" es el sentinel de "ninguna campaña seleccionada" (mismo criterio que AutomationList.tsx
// -- Campaign.id es uuid, ya no puede usarse un número).
const NONE_OPTION: Campaign = {
  id: "",
  name: "-- Ninguna --",
  organization_id: null,
  workspace_id: null
}

export const WebFormList = () => {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const urlCampaignId = searchParams.get('campaign');

  const [campaigns, setCampaigns] = useState<Campaign[]>([NONE_OPTION]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(urlCampaignId ?? "");
  const [webForms, setWebForms] = useState<Paginable<WebFormDetailed> | null>(null);

  const isCampaignSelected = selectedCampaignId !== ""

  const { fetchParams, changeHandlers } = useOrderSeachList(DEFAULT_FIELDS)

  const { fetchPage, pageSize, refresh, pageComponentProps } = useListPagination(webForms);

  const fetchCampaigns = useCallback(() => {
    return getCampaigns({ only_active: true, page_size: 0 })
      .then(res => {
        setCampaigns([NONE_OPTION, ...res.items])
      })
      .catch(e => showCommonErrorToast(e))
  }, [])

  const { fnWithLoading: fetchCmpLoad, loading: cmpLoading } = useLoading(fetchCampaigns)

  // 1. Cargar las campañas para el selector
  useEffect(() => { fetchCmpLoad() }, [fetchCmpLoad]);

  const fetchWebForms = useCallback((fetchPage: number, pageSize: number, selectedCampaignId: string) => {
    return getWebForms({
      detailed: true, page_size: pageSize, page: fetchPage,
      campaign_id: selectedCampaignId, ...fetchParams
    })
      .then(setWebForms)
      .catch(e => showCommonErrorToast(e, "Error recuperando la lista de formularios web."));
  }, [fetchParams])

  const { fnWithLoading: fetchWfLoad, loading: wfLoading } = useLoading(fetchWebForms)

  // 2. Cargar los formularios SOLO si hay una campaña seleccionada
  useEffect(() => {
    if (!isCampaignSelected) return
    fetchWfLoad(fetchPage, pageSize, selectedCampaignId)
  }, [fetchPage, refresh, pageSize, selectedCampaignId, fetchWfLoad, isCampaignSelected]);

  const handleCampaignChange = (id: string) => {
    setSelectedCampaignId(id);
    if (id !== "") {
      setSearchParams({ campaign: id });
    } else {
      searchParams.delete('campaign');
      setSearchParams(searchParams);
    }
  };

  const actions = useEntityActionManager<WebFormDetailed>({
    modelName: "WebForm",
    entityTypeName: "el formulario",
    onSuccess: () => {
      // Recargar la página actual tras el toggle (active=true/false), para reflejar el estado.
      if (!isCampaignSelected) return
      fetchWebForms(fetchPage, pageSize, selectedCampaignId)
    },
  })

  return (
    <GenericContainer>
      <Stack spacing={2}>
        <Stack spacing={2} direction="row" useFlexGap sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 3, flexWrap: "wrap" }}>
            <Typography variant="h1">Formularios Web</Typography>

            {/* SELECTOR DE CAMPAÑA */}
            <Autocomplete disablePortal
              value={campaigns.find(i => i.id === selectedCampaignId) ?? campaigns[0]}
              loading={cmpLoading}
              onChange={(_, value) => handleCampaignChange(value.id)}
              disableClearable
              options={cmpLoading ? [] : campaigns}
              sx={{ width: 300 }}
              getOptionLabel={op => op.name}
              getOptionKey={op => op.id}
              renderInput={(params) =>
                <TextField {...params} label="Seleccionar Campaña"
                  size="small" sx={{ minWidth: 200, maxWidth: 250 }} />
              } />
          </Stack>
          <Can permission="web_form:create">
            <CommonButton
              actionType='CREATE'
              onlyTooltip
              disabled={!isCampaignSelected}
              component={Link}
              to={`/web_forms/create?campaign=${selectedCampaignId}`}
              sx={{ ml: "auto" }}
            >
              Nuevo Formulario
            </CommonButton>
          </Can>
        </Stack>

        <Stack spacing={2}>
          {!isCampaignSelected ?
            <Typography variant="h4" color="text.secondary" sx={{ textAlign: "center", py: 5 }}>
              Selecciona una campaña para ver sus formularios web.
            </Typography>
            :
            <>
              <OrderSearchMenu searchOptions={SEARCH_WF_FIELDS} orderOptions={ORDER_WF_FIELDS} {...changeHandlers} defaultValues={DEFAULT_FIELDS} />
              <LoadingScreenWrapper loading={wfLoading}>
                {webForms?.items && webForms.items.length > 0 ? (
                  <>
                    <List>
                      {webForms.items.map(form => (
                        <ResponsiveListItem key={form.id} disablePadding
                          onClick={() => navigate(`/web_forms/${form.id}?campaign=${selectedCampaignId}`)}
                          actions={[
                            { template: "DETAILS", component: Link, to: `/web_forms/${form.id}?campaign=${selectedCampaignId}` },
                            {
                              template: "MODIFY", component: Link, to: `/web_forms/${form.id}?campaign=${selectedCampaignId}&edit=true`,
                              permission: "web_form:update"
                            },
                            ...actions.listActionsFor(form),
                          ]}>
                          <ListItemText
                            primary={
                              <Stack spacing={1} direction="row" sx={{ alignItems: "center" }}>
                                <EnabledIcon active={form.active} />
                                <Typography>{form.name}</Typography>

                                <ChipTooltip title="Cantidad de campos en el formulario">
                                  <CustomChip label={`${form.fields.length} campo${form.fields.length === 1 ? "" : "s"}`} size="small" />
                                </ChipTooltip>

                                {form.require_captcha && (
                                  <ChipTooltip title="Requiere verificación CAPTCHA">
                                    <CustomChip label="Captcha" size="small" color="info" />
                                  </ChipTooltip>
                                )}
                              </Stack>
                            }
                            secondary={form.description || form.title || "Sin descripción"}
                          />
                        </ResponsiveListItem>
                      ))}
                    </List>
                    <PaginationComponent {...pageComponentProps} />
                  </>)
                  : (
                    <Typography variant="h4" color="text.secondary" sx={{ textAlign: "center", py: 5 }}>
                      No hay formularios web en esta campaña.
                    </Typography>
                  )}
              </LoadingScreenWrapper>
            </>
          }
        </Stack>
      </Stack>
      <EntityConfirmDialog idModal='dis-wf-list' controller={actions} />
    </GenericContainer>
  );
};
