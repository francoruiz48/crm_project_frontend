import { memo, useCallback, useMemo } from "react";
import type { LeadFieldValue } from "src/types/leadFields"
import { BoolValue, DateValue, ListValues, ModalValue, NumberValue, StringValue } from "../shared/LeadValueComponents"
import { getTypeOrSpecialTemplates } from "src/features/leadFields/leadFieldUtils";

interface CellValueProps {
    leadId: string,
    fieldValue?: LeadFieldValue,
    type?: string | null,
    subtype?: string | null,
    modalProps?: {
        openModalId: string;
        handleOpen: (idModal: string) => void;
        handleClose: () => void;
    }
}
export const LeadListCellValue = memo(({ fieldValue, type, subtype, modalProps }: CellValueProps) => {

    const getValue = useCallback((field_value: LeadFieldValue | undefined) => {
        if (!field_value) return null
        if (field_value.value && field_value.value !== "") return `${field_value.value}`
        else if (field_value?.nomenclator_items?.length > 0) {
            return field_value.nomenclator_items
        }
        else if (field_value?.related_leads?.length > 0) {
            return field_value.related_leads
        }
        else return null
    }, [])

    const value = useMemo(() => getValue(fieldValue), [getValue, fieldValue])

    if (!fieldValue || !value || !type) {
        return "---"
    }

    const typeWithTemplates = getTypeOrSpecialTemplates(type, fieldValue.field.field_template_code)

    switch (typeWithTemplates) {
        //Templates especiales
        case "INSTAGRAM_USER":
        case "POSTAL_CODE":
        case "CREDIT_CARD_SIMPLE": return <StringValue value={`${value}`} subtype={typeWithTemplates} size="small" />

        //Tipos de Field
        case "STRING": return <StringValue value={`${value}`} idModal={`${fieldValue.field_id}-${fieldValue.id}`}
            modalProps={modalProps} subtype={subtype ?? undefined} size="small" />
        case "NUMBER": return <NumberValue value={typeof value === "string" ? parseInt(value) : undefined}
            subtype={subtype!} size="small" ratingTooltip />

        case "BOOL": return <BoolValue value={`${value}`} size="small" />

        case "DATE":
        case "DATE_TIME": return <DateValue date={`${value}`} subtype={subtype ?? undefined} short />

        case "SELECTOR": case "CHECKBOX":
            return <ListValues value={Array.isArray(value) ? value : []} idFieldValue={fieldValue.id}
                type="Selector" maxItems={2} />
        case "LEAD":
            return <ListValues value={Array.isArray(value) ? value : []} idFieldValue={fieldValue.id}
                type="Lead" maxItems={2} isNav shortTitle />

        case "FILE": return <ModalValue value={`${value}`} size="small" idModal={`file-${fieldValue?.id}`}
            modalProps={modalProps} type={type} subtype={subtype!} />

        default: return `${value}`
    }
})