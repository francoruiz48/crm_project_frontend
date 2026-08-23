// Helpers compartidos entre la vista previa en vivo del editor (WebFormLivePreview.tsx) y la
// página pública real (PublicWebFormPage.tsx) -- ambas necesitan decidir qué widget renderizar
// para cada LeadField según su field_type_code/field_subtype_code, y deben quedar sincronizadas
// para que "lo que ves en la vista previa" sea fiel a "lo que ve el visitante".

export const TEXT_SUBTYPE_INPUT: Record<string, string> = {
  EMAIL: 'email',
  WHATSAPP: 'tel', MOBILE: 'tel', PHONE: 'tel', LANDLINE: 'tel',
  URL: 'url', WEBSITE: 'url', SOCIAL_MEDIA: 'url', MAPS_URL: 'url',
};

export const DATE_SUBTYPE_INPUT: Record<string, string> = {
  DATE_TIME: 'datetime-local', DATE_EVENT: 'datetime-local',
  TIME_ONLY: 'time',
  DATE_ONLY: 'date', BIRTH_DATE: 'date',
};

export const isSelectorType = (typeCode?: string | null) => typeCode === 'SELECTOR' || typeCode === 'CHECKBOX';
export const isBoolType = (typeCode?: string | null) => typeCode === 'BOOL' || typeCode === 'BOOLEAN';
export const isNumberType = (typeCode?: string | null) => typeCode === 'NUMBER';
// El tipo de campo top-level para cualquier fecha/hora es siempre "DATE_TIME" -- el subtipo
// (DATE_ONLY, BIRTH_DATE, TIME_ONLY, DATE_EVENT, DATE_TIME) es lo que decide el input HTML
// exacto (ver DATE_SUBTYPE_INPUT arriba, mismo criterio que DATE_INPUT_TYPE en LeadFormFields.tsx).
export const isDateType = (typeCode?: string | null) => typeCode === 'DATE_TIME';
