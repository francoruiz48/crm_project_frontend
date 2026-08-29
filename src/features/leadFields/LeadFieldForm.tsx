import { SidebarContentWrapper, SidebarContentActionsWrapper } from "shared/layout/container/GenericSidebar";
import { useEffect, useMemo, useRef, useState } from "react";
import { ControlledAutocomplete, ControlledRadio } from "shared/ui/forms/CustomMultipleInputs";
import { ControlledCheckbox, ControlledTextInput } from "shared/ui/forms/CustomInputs";
import { FormErrorMessage } from "shared/ui/forms/FormFeedback";
import CommonButton from "shared/ui/buttons/CommonButton";
import ACTION_ICONS from "shared/ui/icons/ActionIcons";
import { useLoading } from "src/hooks/useLoading";
import type { InputMaskTemplate, LeadFieldDetailed, LeadFieldPost, LeadFieldTemplate, LeadFieldTypeDetailed } from "src/types/leadFields";
import type { Campaign, CampaignDetailed } from "src/types/campaigns";
import type { NomenclatorDetailed } from "src/types/nomenclators";
import type { OptionWithAction } from "src/types/shared";
import { createLeadField, getFieldTemplates, getFieldTypes, getInputMaskTemplates, updateLeadField } from "./leadFieldServices";
import { getNomenclators } from "../nomenclators/nomenclatorService";
import { getCampaigns } from "../campaigns/campaignServices";
import { getFieldDataByType } from "./leadFieldUtils";
import { setFormErrors } from "src/utils/forms";
import { showCommonErrorToast, showToast } from "src/utils/feedback";
import { Box, Grid, FormGroup, Stack, Divider, ButtonGroup, TextField } from "@mui/material";
import { Controller, useForm, useWatch, type Control, type FieldErrors, type UseFormGetValues, type UseFormSetValue } from "react-hook-form";
import { InputAdornment, IconButton } from "@mui/material";
import { getExcelFormulaTemplates } from "./leadFieldServices";
import type { ExcelFormulaTemplate } from "src/types/leadFields";
import { FormulaHelperPanel } from "src/components/ui/modals/FormulaHelperModal";
import FunctionsIcon from '@mui/icons-material/Functions';
import { FormControl, InputLabel, OutlinedInput, FormHelperText, } from "@mui/material";
import { createFieldSection, getFieldSections } from "../orgProperties/fieldSections/fieldSectionsServices";
import { InlineColorPickerButton } from "src/components/ui/forms/ColorPicker";
import type { LeadFieldSection } from "src/types/orgProperties";
import { InfoTextBox } from "src/components/ui/forms/InfoBox";

//Mismo color neutro por defecto que usa el picker de color libre de etiquetas nuevas (LeadTagsMenu.tsx),
//para que el selector de color de una sección nueva arranque igual en toda la app.
const DEFAULT_SECTION_COLOR = "#64748B"


interface LeadFieldSidebarProps {
  existingLF?: LeadFieldDetailed,
  campaign: CampaignDetailed,
  leadFields?: LeadFieldDetailed[] | null,
  updateEntityOnList: (entity: LeadFieldDetailed) => void,
  handleSidebar: (
    mode: string,
    entity: LeadFieldDetailed,
  ) => void,
  closeSidebar: () => void,
}
//Wrapper de CampaignForm para crear desde un Sidebar
export const LeadFieldFormSidebar = ({ existingLF, campaign, leadFields, updateEntityOnList, closeSidebar, handleSidebar }: LeadFieldSidebarProps) => {

  const submit = (data: LeadFieldPost, reset: boolean = false) => {
    const updateInfo = (data: LeadFieldDetailed) => {
      updateEntityOnList(data)
      handleSidebar("DETAILS_FIELD", data)
    }
    if (!existingLF) {
      return createLeadField(data).then(res => {
        showToast(`El campo "${res.name}" se ha creado con éxito`)
        if (reset) updateEntityOnList(res)
        else updateInfo(res)
      })
    } else {
      return updateLeadField(data, `${existingLF.id}`).then(res => {
        showToast(`El campo "${res.name}" se ha actualizado con éxito`)
        updateInfo(res)
      })
    }
  }
  return <SidebarContentWrapper subtitle={campaign.name}
    title={existingLF ? `Modificar "${existingLF.name}"` : "Crear Campo"}
    icon={ACTION_ICONS.CREATE}>
    <LeadFieldForm existingLF={existingLF} campaign={campaign} leadFields={leadFields} submit={submit} onCancel={closeSidebar} />
  </SidebarContentWrapper>
}

export interface LeadFieldPostCreation extends LeadFieldPost {
  creation_method?: string;
  input_mask_method?: string;
}

interface LeadFieldFormProps {
  existingLF?: LeadFieldDetailed,
  campaign: Campaign,
  leadFields?: LeadFieldDetailed[] | null,
  submit: (data: LeadFieldPost, reset?: boolean) => Promise<void>,
  onCancel: () => void,
}
export const LeadFieldForm = ({ existingLF, campaign, leadFields, submit, onCancel }: LeadFieldFormProps) => {

  const [fieldTemplates, setFieldTemplates] = useState<LeadFieldTemplate[]>([]);
  const [maskTemplates, setMaskTemplates] = useState<InputMaskTemplate[]>([]);
  const [fieldSections, setFieldSections] = useState<LeadFieldSection[]>([]);
  const [fieldTypes, setFieldTypes] = useState<LeadFieldTypeDetailed[]>([]);
  const [nomenclators, setNomenclators] = useState<NomenclatorDetailed[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [excelFormulas, setExcelFormulas] = useState<ExcelFormulaTemplate[]>([]);

  useEffect(() => {
    getFieldTemplates().then(setFieldTemplates);
    getInputMaskTemplates().then(setMaskTemplates);
    getFieldSections({ only_active: true, page_size: 0 }).then(res => setFieldSections(res.items));
    getFieldTypes({ detailed: true, page_size: 0 }).then(res => setFieldTypes(res.items));
    getCampaigns({ only_active: true, page_size: 0 }).then(res => setCampaigns(res.items));
    getExcelFormulaTemplates().then(setExcelFormulas).catch(console.error);
  }, []);



  useEffect(() => {
    if (!campaign.id) return;
    //Se pide detallado para conocer los nomencladores padre válidos de cada catálogo (feature de campos dependientes)
    getNomenclators({ global_nomenclator: true, campaign_id: campaign.id, page_size: 0, detailed: true }).then(
      res => setNomenclators(res.items),
    );
  }, [campaign.id]);

  const defaultValues: LeadFieldPostCreation = useMemo(() => (
    {
      campaign_id: campaign.id,
      name: existingLF?.name ?? null,
      // existingLF.lead_field_section es un objeto anidado con su uuid real -- a diferencia de
      // depends_on_field_id, sí sirve tal cual acá. El fallback numérico "1" que había antes ya
      // no es válido (el backend espera un uuid, no un id interno viejo).
      lead_field_section_id: existingLF?.lead_field_section?.id ?? null,
      field_type_code: existingLF?.field_type_code ?? "STRING",
      field_subtype_code: existingLF?.field_subtype_code ?? "NULL",
      calculation_expression: existingLF?.calculation_expression ?? null,
      default_value: existingLF?.default_value ?? null,
      input_mask: existingLF?.input_mask ?? null,
      nomenclator_id: existingLF?.nomenclator?.id ?? null,
      related_campaign_id: existingLF?.related_campaign?.id ?? null,
      // existingLF.depends_on_field es el objeto anidado con el uuid real del campo del que
      // depende -- antes no existía y se forzaba a null para obligar a reelegir; ahora se puede
      // precargar igual que lead_field_section.
      depends_on_field_id: existingLF?.depends_on_field?.id ?? null,
      required: existingLF?.required ?? false,
      is_primary: existingLF?.is_primary ?? false,
      is_visible: existingLF?.is_visible ?? true,
      field_template_code: "FIRST_NAME",
      creation_method: existingLF?.field_template_code ? "template" : "manual",
      input_mask_method: existingLF?.mask_template_code ? "template" : "manual",
      mask_template_code: existingLF?.mask_template_code ?? "NULL"
    })
    , [existingLF, campaign])


  const { register, control, handleSubmit, reset, formState: { errors }, setError, setValue, getValues } = useForm<LeadFieldPostCreation>({ defaultValues });

  //Activa cuando cambian el LeadField seleccionado o la campaña.
  useEffect(() => { reset(defaultValues) }, [reset, defaultValues])

  const creationMethod = useWatch({ name: "creation_method", control });
  const inputMaskMethod = useWatch({ name: "input_mask_method", control });

  const onSaveLeadField = async (data: LeadFieldPostCreation, reset: boolean = false) => {
    const newData = getFieldDataByType(data, creationMethod === "template", inputMaskMethod === "template");
    return submit(newData, reset)
      .catch(e => {
        setFormErrors(e, setError)
        throw (e)
      });
  }

  const { loading, fnWithLoading: saveFieldLoad } = useLoading(onSaveLeadField)

  const onSubmitAndReset = async (data: LeadFieldPostCreation) => {
    return saveFieldLoad(data, true)
      .then(() => {
        reset(defaultValues);
      })
  };

  return (
    <form id="lead-field-form"
      onSubmit={handleSubmit(data => saveFieldLoad(data, false))} style={{ height: "100%" }}>
      <input
        type="hidden"
        {...register("campaign_id", { value: campaign.id })}
      />
      <SidebarContentActionsWrapper
        actions={
          <ButtonGroup>
            <CommonButton actionType="CLOSE" variant="outlined"
              onClick={onCancel} disabled={loading} color="error">
              Cancelar
            </CommonButton>
            {!existingLF && (
              <CommonButton actionType="CREATE" variant="outlined" onClick={handleSubmit(onSubmitAndReset)} loading={loading} >
                Guardar y crear otro
              </CommonButton>
            )}
            <CommonButton actionType={existingLF ? "MODIFY" : "CREATE"}
              variant="contained" type="submit" loading={loading}>
              Guardar
            </CommonButton>
          </ButtonGroup>
        }>
        <LeadFieldFormFields templates={fieldTemplates} sections={fieldSections}
          addSection={section => setFieldSections(prev => [...prev, section])}
          nomenclators={nomenclators} campaigns={campaigns} types={fieldTypes} leadFields={leadFields ?? []}
          errors={errors} control={control} maskTemplates={maskTemplates}
          existingLFId={`${existingLF?.id}`} formulas={excelFormulas} setValue={setValue} getValues={getValues}
        />
      </SidebarContentActionsWrapper>
    </form >
  );
};

interface LeadFieldFormFieldsProps {
  templates: LeadFieldTemplate[];
  maskTemplates: InputMaskTemplate[];
  sections: LeadFieldSection[];
  addSection: (section: LeadFieldSection) => void;
  types: LeadFieldTypeDetailed[];
  nomenclators: NomenclatorDetailed[];
  campaigns: Campaign[];
  leadFields: LeadFieldDetailed[];
  control: Control<LeadFieldPostCreation>;
  errors: FieldErrors<LeadFieldPostCreation>;
  existingLFId?: string;
  formulas: ExcelFormulaTemplate[];
  setValue: UseFormSetValue<LeadFieldPostCreation>;
  getValues: UseFormGetValues<LeadFieldPostCreation>;
}

const LeadFieldFormFields = ({ templates, maskTemplates, sections, addSection, types, nomenclators, campaigns, leadFields,
  control, existingLFId, errors, formulas, setValue, getValues }: LeadFieldFormFieldsProps) => {

  const [openFormulaModal, setOpenFormulaModal] = useState(false);

  //-------------------------------- "+ Agregar nueva sección" en el selector de Sección --------------------------------
  //Se le agrega al listado de opciones una entrada especial de acción (mismo patrón que "+ Agregar
  //nuevo flujo..." en CampaignForms.tsx). Al elegirla, en vez de seleccionarse como si fuera una
  //sección real, el propio selector se reemplaza por un campo de texto + un botón de color libre al
  //costado (mismo patrón que "Agregar" en LeadTagsMenu.tsx), para crear la sección sin salir del
  //formulario ni abrir un modal aparte.
  const sectionsWithOption = useMemo<OptionWithAction<LeadFieldSection>[]>(() => [
    ...sections,
    { id: "CREATE_SECTION", name: "+ Agregar nueva sección", isAction: true },
  ], [sections]);

  const [creatingSection, setCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionColor, setNewSectionColor] = useState(DEFAULT_SECTION_COLOR);
  //Mientras el popover del color está abierto hay que ignorar el blur del campo de texto (si no, se
  //cerraría el campo justo al intentar abrir el selector de color).
  const [sectionColorPickerOpen, setSectionColorPickerOpen] = useState(false);
  const newSectionInputRef = useRef<HTMLInputElement>(null);

  const cancelNewSection = () => {
    setCreatingSection(false);
    setNewSectionName("");
    setNewSectionColor(DEFAULT_SECTION_COLOR);
    setSectionColorPickerOpen(false);
  };

  const submitNewSection = () => {
    const trimmed = newSectionName.trim();
    if (!trimmed) return cancelNewSection();
    return createFieldSection({ name: trimmed, color: newSectionColor })
      .then(newSection => {
        addSection(newSection);
        setValue("lead_field_section_id", newSection.id, { shouldValidate: true, shouldDirty: true });
        showToast(`Sección "${newSection.name}" creada con éxito`);
        cancelNewSection();
      })
      .catch(e => showCommonErrorToast(e, "No se ha podido crear la sección"));
  };
  const creationMethod = useWatch({ name: "creation_method", control });
  const inputMaskMethod = useWatch({ name: "input_mask_method", control });
  const creationMethodRadioOptions = [
    { label: "Por Plantilla", value: "template" },
    { label: "Manual", value: "manual" },
  ];

  const required = useWatch({ name: "required", control });
  const primary = useWatch({ name: "is_primary", control });
  const visible = useWatch({ name: "is_visible", control });


  const fieldTypeCode = useWatch({ name: "field_type_code", control });
  //Busca el objeto del Tipo seleccionado a partir de su código
  const fieldTypeObject = useMemo(
    () => (types ? types?.find(i => i.code === fieldTypeCode) : null),
    [types, fieldTypeCode],
  );

  const nomenclatorId = useWatch({ name: "nomenclator_id", control });
  //Campos válidos como "padre" de este: mismo tipo nomenclador, misma campaña, y su catálogo debe ser
  //un padre válido (M2M) del catálogo elegido en este campo (ver nomencladores.md §8 y campos_personalizados.md §11)
  const dependsOnFieldOptions = useMemo(() => {
    const selectedNomenclator = nomenclators.find(nom => nom.id === nomenclatorId)
    const validParentNomenclatorIds = new Set(selectedNomenclator?.parent_nomenclators?.map(parent => parent.id) ?? [])
    if (validParentNomenclatorIds.size === 0) return []
    //leadFields viene del endpoint detallado (GET /lead_fields?detailed=true), que no trae "nomenclator_id"
    //suelto, solo el objeto anidado "nomenclator" (a diferencia del endpoint simple) — hay que usar field.nomenclator?.id
    return leadFields.filter(field =>
      field.id !== existingLFId &&
      field.field_type_code === "SELECTOR" &&
      field.nomenclator?.id != null &&
      validParentNomenclatorIds.has(field.nomenclator.id)
    )
  }, [leadFields, nomenclators, nomenclatorId, existingLFId])

  return (
    <Stack spacing={2} sx={{ justifyContent: "center" }}>
      <Grid spacing={1} container sx={{ minWidth: "20rem" }}>
        <Grid size="grow" sx={{ minWidth: "20rem" }}>
          <ControlledTextInput
            control={control}
            label="Nombre del Campo"
            name="name"
            required={creationMethod === "manual"}
            errorMessage={errors?.name?.message}
          />
        </Grid>
        <Grid size="grow" sx={{ minWidth: "20rem", justifyContent: "center" }} >
          {creatingSection ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField
                inputRef={newSectionInputRef}
                autoFocus
                fullWidth
                label="Nueva Sección"
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value)}
                onBlur={() => { if (!sectionColorPickerOpen) submitNewSection() }}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); submitNewSection(); }
                  if (e.key === "Escape") { e.preventDefault(); cancelNewSection(); }
                }}
              />
              <InlineColorPickerButton color={newSectionColor} onChange={setNewSectionColor}
                ariaLabel="Elegir color de la nueva sección"
                onOpenChange={open => {
                  setSectionColorPickerOpen(open);
                  //Al cerrar el picker, el foco vuelve al campo de texto para seguir escribiendo el
                  //nombre de la sección (mismo patrón que el selector de color de etiquetas nuevas).
                  if (!open) requestAnimationFrame(() => newSectionInputRef.current?.focus());
                }} />
            </Stack>
          ) : (
            <ControlledAutocomplete
              name="lead_field_section_id"
              label="Sección"
              control={control}
              options={sectionsWithOption}
              returnField="id"
              getOptionLabel={option => option.name!}
              getOptionKey={option => `${option.id}`}
              required
              errorMessage={errors?.lead_field_section_id?.message}
              renderOption={(props, option) => {
                const isAction = (option as OptionWithAction<LeadFieldSection>).isAction;
                return (
                  <Box component="li" {...props}
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={e => {
                      e.stopPropagation(); e.preventDefault();
                      if (isAction) setCreatingSection(true);
                      else props.onClick?.(e);
                    }}
                    sx={{
                      display: "flex", alignItems: "center", width: "100%",
                      ...(isAction && {
                        color: "primary.main", fontWeight: "bold", borderTop: "1px solid",
                        borderColor: "divider", mt: 0.5, bgcolor: "action.hover",
                      }),
                    }}>
                    {option.name}
                  </Box>
                );
              }}
            />
          )}
        </Grid>
        <Grid size="grow" sx={{ minWidth: "20rem", justifyContent: "center" }} >
          <FormGroup row sx={{ my: .5, mx: 1, justifyContent: "space-evenly" }}>
            <InfoTextBox infoText={`El campo ${required ? "no" : ""} podrá estar vacio.`}>
              <ControlledCheckbox
                control={control}
                name="required"
                label="Obligatorio"
                errorMessage={errors?.required?.message}
              />
            </InfoTextBox>
            <InfoTextBox infoText={`El valor ${primary ? "no" : ""}  podrá repetirse entre leads.`}>
              <ControlledCheckbox
                control={control}
                name="is_primary"
                label="Único"
                errorMessage={errors?.is_primary?.message}
              />
            </InfoTextBox>
            <InfoTextBox infoText={`El campo ${!visible ? "no" : ""}  se verá en formularios.`}>
              <ControlledCheckbox
                control={control}
                name="is_visible"
                label="Visible"
                errorMessage={errors?.is_visible?.message}
              />
            </InfoTextBox>
          </FormGroup>
        </Grid>
      </Grid>
      {!existingLFId &&
        <>
          <Divider />
          <Grid spacing={1} container sx={{ minWidth: "20rem" }}>
            <Grid size="auto" sx={{ justifyContent: "center" }} >
              <ControlledRadio control={control} name="creation_method" label="Método de Creación" options={creationMethodRadioOptions}
                getRadioLabel={option => option.label} keyField="value" returnField="value" row />
            </Grid>
            {creationMethod === "template" ? (
              <Grid size="grow" sx={{ minWidth: "17rem", justifyContent: "center" }} >
                <ControlledAutocomplete
                  name="field_template_code"
                  label="Plantillas"
                  control={control}
                  options={templates}
                  returnField="code"
                  errorMessage={errors?.field_template_code?.message}
                  getOptionKey={(option) => option.code}
                  getOptionLabel={(option) => option.name}
                  required
                />
              </Grid>
            ) : (
              <>
                <Grid size="grow" sx={{ minWidth: "17rem", justifyContent: "center" }} >
                  <ControlledAutocomplete
                    name="field_type_code"
                    label="Tipo de Dato"
                    required
                    control={control}
                    options={types}
                    returnField="code"
                    errorMessage={errors?.field_type_code?.message}
                    getOptionKey={(option) => option.code}
                    getOptionLabel={(option) => option.description}
                  />
                </Grid>
                {fieldTypeObject?.subtypes &&
                  fieldTypeObject?.subtypes?.length > 0 && (
                    <Grid size="grow" sx={{ minWidth: "20rem", justifyContent: "center" }} >
                      <ControlledAutocomplete
                        name="field_subtype_code"
                        label="Subtipo de Campo"
                        errorMessage={errors?.field_subtype_code?.message}
                        control={control}
                        options={[{ description: "Sin subtipo", code: "NULL" }, ...fieldTypeObject.subtypes]}
                        returnField="code"
                        getOptionLabel={option => option.description}
                        getOptionKey={option => option.code}
                      />
                    </Grid>
                  )}
                {(fieldTypeCode === "SELECTOR" || fieldTypeCode === "CHECKBOX") && (
                  <Grid size="grow" sx={{ minWidth: "20rem", justifyContent: "center" }} >
                    <ControlledAutocomplete
                      name="nomenclator_id"
                      label="Lista de Opciones"
                      errorMessage={errors?.nomenclator_id?.message}
                      required
                      control={control}
                      options={nomenclators}
                      returnField="id"
                      getOptionLabel={option => option.name!}
                      getOptionKey={option => `${option.id}`}
                    />
                  </Grid>
                )}
                {fieldTypeCode === "LEAD" && (
                  <Grid size="grow" sx={{ minWidth: "20rem", justifyContent: "center" }} >
                    <ControlledAutocomplete
                      name="related_campaign_id"
                      label="Campaña del Lead Relacionado"
                      errorMessage={errors?.related_campaign_id?.message}
                      required
                      control={control}
                      options={campaigns}
                      returnField="id"
                      getOptionLabel={option => option.name!}
                      getOptionKey={option => `${option.id}`}
                    />
                  </Grid>
                )}
                {fieldTypeCode === "CALCULATED" && (
                  <Grid size="grow" sx={{ minWidth: "20rem", display: "flex", flexDirection: "column" }}>
                    <Controller
                      name="calculation_expression"
                      control={control}
                      rules={{ required: "La fórmula es obligatoria" }}
                      render={({ field: { ref, value, ...fieldParams }, fieldState }) => (
                        <FormControl fullWidth error={!!fieldState.error} required variant="outlined">
                          <InputLabel
                            htmlFor="formula-input"
                            shrink={value ? true : undefined}
                          >
                            Fórmula
                          </InputLabel>
                          <OutlinedInput
                            {...fieldParams}
                            value={value || ""}
                            inputRef={ref}
                            id="formula-input"
                            label="Fórmula"
                            notched={value ? true : undefined}
                            endAdornment={
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setOpenFormulaModal(!openFormulaModal)} // <-- Ahora hace Toggle (Abre/Cierra)
                                  edge="end"
                                  color={openFormulaModal ? "secondary" : "primary"} // <-- Cambia de color si está abierto
                                  title="Asistente de Fórmulas"
                                >
                                  <FunctionsIcon />
                                </IconButton>
                              </InputAdornment>
                            }
                          />
                          {fieldState.error && (
                            <FormHelperText>{fieldState.error.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />

                    {/* El Panel Colapsable del Asistente */}
                    <FormulaHelperPanel
                      open={openFormulaModal}
                      formulas={formulas}
                      onInsert={(formulaName) => {
                        const currentVal = getValues("calculation_expression") || "";
                        setValue("calculation_expression", `${currentVal}${formulaName}()`, {
                          shouldValidate: true,
                          shouldDirty: true
                        });
                      }} />
                  </Grid>
                )
                }
                {
                  (creationMethod === "template" ||
                    (fieldTypeCode &&
                      ["NUMBER", "INT", "STRING", "BOOL", "RATING"].includes(fieldTypeCode))) && (
                    <Grid size="grow" sx={{ minWidth: "20rem" }}>
                      <ControlledTextInput
                        control={control}
                        label="Valor por Defecto"
                        name="default_value"
                        errorMessage={errors?.default_value?.message}
                      />
                    </Grid>
                  )
                }
              </>)
            }
          </Grid >
        </>}
      {
        fieldTypeCode === "STRING" && !existingLFId && (
          <>
            <Divider />
            <Grid spacing={1} container sx={{ minWidth: "20rem" }}>
              <Grid size="auto" sx={{ justifyContent: "center" }} >
                <ControlledRadio control={control} name="input_mask_method" label="Método de Carga de Máscara" options={creationMethodRadioOptions}
                  getRadioLabel={option => option.label} keyField="value" returnField="value" row />
              </Grid>
              {inputMaskMethod === "template" ?
                <Grid size="grow" sx={{ minWidth: "17rem", justifyContent: "center" }} >
                  <ControlledAutocomplete
                    name="mask_template_code"
                    label="Máscara de Campo"
                    control={control}
                    options={[{ code: "NULL", name: "Sin máscara" }, ...maskTemplates]}
                    returnField="code"
                    errorMessage={errors?.mask_template_code?.message}
                    getOptionKey={(option) => option.code}
                    getOptionLabel={(option) => option.name}
                  />
                </Grid> :
                <Grid size="grow" sx={{ minWidth: "17rem", justifyContent: "center" }} >
                  <ControlledTextInput
                    name="input_mask"
                    label="Máscara de Campo"
                    control={control}
                    errorMessage={errors?.input_mask?.message} />
                </Grid>
              }
            </Grid>
          </>)
      }
      {
        //Se muestra en creación y edición (a diferencia del resto de los campos de tipo/subtipo/nomenclador, esta
        //dependencia sí se puede modificar después de creado el campo, ver campos_personalizados.md §11).
        //Solo tiene sentido mostrar el selector si hay candidatos válidos como padre.
        fieldTypeCode === "SELECTOR" && dependsOnFieldOptions.length > 0 && (
          <>
            <Divider />
            <Grid spacing={1} container sx={{ minWidth: "20rem" }}>
              <Grid size="grow" sx={{ minWidth: "20rem", justifyContent: "center" }} >
                <ControlledAutocomplete
                  name="depends_on_field_id"
                  label="Depende del Campo"
                  control={control}
                  options={dependsOnFieldOptions}
                  returnField="id"
                  errorMessage={errors?.depends_on_field_id?.message}
                  getOptionKey={(option) => `${option.id}`}
                  getOptionLabel={(option) => option.name}
                />
              </Grid>
            </Grid>
          </>)
      }

      {
        errors.root && (
          <FormErrorMessage>{errors?.root?.message}</FormErrorMessage>
        )
      }
    </Stack >
  );
};
