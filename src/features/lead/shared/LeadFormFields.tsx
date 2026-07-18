import type { ReactNode } from "react";
import { ControlledNumber, ControlledSlider, ControlledSwitch, PasswordField, RegisteredTextInput } from "shared/ui/forms/CustomInputs";
import { FormErrorMessage } from "shared/ui/forms/FormFeedback";
import { formatDate } from "src/utils/formatters";
import { type Control, type FieldValues, type Path, type UseFormRegister } from "react-hook-form";
import { Stack, TextField, useColorScheme } from "@mui/material"
import { LeadFieldInputIcon } from "src/features/leadFields/LeadFieldTypeIcon";
import { FileInput } from "src/components/ui/forms/FileInput";

interface BasicFormInput<T extends FieldValues> {
    name: Path<T>,
    label?: string,
    size?: "small" | "medium"
    required?: boolean,
    errorMessage?: string,
    showAdornment?: boolean
}
interface RegisterFormInput<T extends FieldValues> extends BasicFormInput<T> {
    register: UseFormRegister<T>
}
interface LeadFormFileInput<T extends FieldValues> extends ControlFormInput<T> {
    subtype?: string
}
interface ControlFormInput<T extends FieldValues> extends BasicFormInput<T> {
    control: Control<T>,
}

interface LeadFormTextInput<T extends FieldValues> extends RegisterFormInput<T> {
    subtype?: string,
}

const TEXT_INPUT_TYPE = {
    STRING: "text",
    SIMPLE_ADDRESS: "text",
    COORDINATES: "text",
    EMAIL: "email",
    WHATSAPP: "tel",
    MOBILE: "tel",
    PHONE: "tel",
    LANDLINE: "tel",
    URL: "url",
    WEBSITE: "url",
    SOCIAL_MEDIA: "url",
    MAPS_URL: "url",
}

export const LeadFormText = <T extends FieldValues>
    ({ register, name, label, subtype, required = false, size = "medium", errorMessage, showAdornment = false }: LeadFormTextInput<T>) => {

    const commonTextSubtype = (subtype ?? "STRING") as keyof typeof TEXT_INPUT_TYPE

    switch (subtype) {
        case "PASSWORD":
            return <LeadFormPassword register={register} name={name} label={label}
                size={size} required={required} errorMessage={errorMessage} showAdornment={showAdornment} />
        case "HTML": case "MARKDOWN":
            return <RegisteredTextInput register={register} name={name} label={label} id={name} type={undefined}
                size={size} required={required} errorMessage={errorMessage} autoComplete="one-time-code" multiline
                startAdornment={showAdornment && <LeadFieldInputIcon typeCode="STRING" subtypeCode="HTML" position="start" />} />
        default:
            return <RegisteredTextInput register={register} name={name} label={label} id={name} type={TEXT_INPUT_TYPE[commonTextSubtype]}
                size={size} required={required} errorMessage={errorMessage} autoComplete="one-time-code"
                startAdornment={showAdornment && <LeadFieldInputIcon typeCode="STRING" subtypeCode={subtype} position="start" />} />
    }
}


export const LeadFormPassword = <T extends FieldValues>
    ({ register, name, label, required = true, size = "medium", errorMessage, showAdornment = false }: RegisterFormInput<T>) => {
    return (
        <PasswordField register={register} name={name} label={label} size={size}
            required={required} errorMessage={errorMessage} autoComplete="one-time-code"
            startAdornment={showAdornment && <LeadFieldInputIcon typeCode="STRING" subtypeCode="PASSWORD" position="start" />} />)
}

const FILE_SUBTYPE_ACCEPT: Record<string, string> = {
    FILE_IMAGE: "image/png,image/jpeg,image/gif,image/webp,image/svg+xml",
    FILE_DOCUMENT: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt",
}

export const LeadFormFile = <T extends FieldValues>
    ({ control, name, label, required = false, size = "medium", errorMessage, subtype }: LeadFormFileInput<T>) => {
    const accept = subtype ? FILE_SUBTYPE_ACCEPT[subtype] : "*"
    return (
        <FileInput control={control} name={name} label={label} size={size}
            required={required} errorMessage={errorMessage}
            accept={accept} multiple={false}
            showPreview={subtype === "FILE_IMAGE"} />
    )
}

export const LeadFormBool = <T extends FieldValues>
    ({ label, control, name, required = false, size = "medium", errorMessage }: ControlFormInput<T>) => {
    return <Stack direction="row" sx={{ p: size === "medium" ? ".5rem 1rem" : "0 .5rem", cursor: "default" }}>
        <ControlledSwitch control={control} name={name} label={label} errorMessage={errorMessage} required={required} />
    </Stack>
}

interface LeadFormNumberInput<T extends FieldValues> extends BasicFormInput<T> {
    control: Control<T>,
    subtype?: string
}

export const LeadFormNumber = <T extends FieldValues>
    ({ control, name, label, subtype, required = false, size = "medium", errorMessage, showAdornment = false }: LeadFormNumberInput<T>) => {

    switch (subtype) {
        case "NUMBER":
            return <ControlledNumber control={control} name={name} label={label} step={.01}
                required={required} size={size} errorMessage={errorMessage}
                startAdornment={showAdornment && <LeadFieldInputIcon typeCode="NUMBER" subtypeCode="NUMBER" position="start" />} />
        case "MONEY":
            return <LeadFormSpecialNumber control={control} name={name} label={label} required={required} size={size} errorMessage={errorMessage}
                startAdornment={<LeadFieldInputIcon typeCode="NUMBER" subtypeCode="MONEY" position="start" />} showAdornment />
        case "PERCENTAGE":
            return <LeadFormSpecialNumber control={control} name={name} label={label} required={required} size={size} errorMessage={errorMessage}
                startAdornment={<LeadFieldInputIcon typeCode="NUMBER" subtypeCode="PERCENTAGE" position="start" />} showAdornment />
        case "STAR_RATING":
        case "NPS":
        case "SCORE":
            return <LeadFormRating control={control} name={name} subtype={subtype} label={label}
                required={required} errorMessage={errorMessage} showAdornment={showAdornment} />

        default: //INT
            return <ControlledNumber control={control} name={name} label={label} step={1}
                required={required} size={size} errorMessage={errorMessage}
                startAdornment={showAdornment && <LeadFieldInputIcon typeCode="NUMBER" subtypeCode="NUMBER" position="start" />} />
    }

}
interface LeadFormSpecialNumber<T extends FieldValues> extends ControlFormInput<T> {
    startAdornment?: ReactNode,
    endAdornment?: ReactNode
}
export const LeadFormSpecialNumber = <T extends FieldValues>
    ({ control, name, label, required = false, size = "medium", startAdornment, endAdornment, errorMessage, showAdornment = false }: LeadFormSpecialNumber<T>) => {
    return (
        <ControlledNumber control={control} name={name} label={label} step={.01}
            required={required} size={size} errorMessage={errorMessage}
            startAdornment={showAdornment && startAdornment} endAdornment={endAdornment} />
    )
}

interface LeadFormRating<T extends FieldValues> extends ControlFormInput<T> {
    subtype: string
}
export const LeadFormRating = <T extends FieldValues>
    ({ control, name, label, subtype, required = false, errorMessage, size = "medium", showAdornment = false }: LeadFormRating<T>) => {
    switch (subtype) {
        case "STAR_RATING":
            return <ControlledSlider control={control} name={name} label={label} required={required}
                size={size} min={0} max={5} step={.5} type="rating" errorMessage={errorMessage}
                startAdornment={showAdornment && <LeadFieldInputIcon typeCode="NUMBER" subtypeCode={subtype} position="start" />} />
        case "NPS":
            return <ControlledSlider control={control} name={name} label={label} required={required}
                size={size} min={1} max={10} step={.1} defaultValue={1} errorMessage={errorMessage}
                startAdornment={showAdornment && <LeadFieldInputIcon typeCode="NUMBER" subtypeCode={subtype} position="start" />} />
        case "SCORE":
            return <ControlledSlider control={control} name={name} label={label} required={required}
                size={size} min={0} max={100} step={.1} errorMessage={errorMessage}
                startAdornment={showAdornment && <LeadFieldInputIcon typeCode="NUMBER" subtypeCode={subtype} position="start" />} />
    }
}

interface LeadFormDateInput<T extends FieldValues> extends RegisterFormInput<T> {
    type?: string,
    autoComplete?: string,
    multiline?: boolean,
    subtype?: string
}
// Exportado para poder normalizar/comparar fechas contra este mismo formato desde afuera
// (ver InlineFieldEdit en LeadDetailsSections.tsx, que necesita saber si una fecha "cambió de verdad").
export const DATE_INPUT_TYPE = {
    DATE_TIME: { inputType: "datetime-local", format: "YYYY-MM-DD HH:mm:ss", type: "DATE_TIME" },
    DATE_EVENT: { inputType: "datetime-local", format: "YYYY-MM-DD HH:mm:ss", type: "DATE_TIME" },
    TIME_ONLY: { inputType: "time", format: "HH:mm:ss", type: "DATE_TIME" },
    DATE_ONLY: { inputType: "date", format: "YYYY-MM-DD", type: "DATE" },
    BIRTH_DATE: { inputType: "date", format: "YYYY-MM-DD", type: "DATE" },
}
export const LeadFormDate = <T extends FieldValues>
    ({ register, name, label, subtype, required = false, size = "medium", errorMessage, showAdornment = false }: LeadFormDateInput<T>) => {

    const { mode } = useColorScheme();
    const subtypeCode = (subtype ?? "DATE_TIME") as keyof typeof DATE_INPUT_TYPE

    return <>
        <TextField {...register(name, { setValueAs: (value) => formatDate(value, "custom", DATE_INPUT_TYPE[subtypeCode].format) })}
            label={label} id={name} type={DATE_INPUT_TYPE[subtypeCode].inputType} required={required} size={size}
            autoComplete="one-time-code" error={!!errorMessage} fullWidth
            slotProps={{
                input: {
                    startAdornment:
                        showAdornment && <LeadFieldInputIcon typeCode={DATE_INPUT_TYPE[subtypeCode].type} subtypeCode={subtype} position="start" />
                },
                inputLabel: { shrink: true },
                htmlInput: {
                    sx: {
                        '&::-webkit-calendar-picker-indicator': {
                            filter: mode === "dark" ? 'invert(1)' : "none",  // negro → blanco
                        },
                    },
                    step: 1
                },
            }} />
        {errorMessage &&
            <FormErrorMessage>{errorMessage}</FormErrorMessage>}
    </>
}