import { useState, type ReactNode } from "react";
import NumberField, { NumberSpinner } from "./NumberField";
import { FormErrorMessage } from "./FormFeedback";
import { Controller, type Control, type FieldValues, type Path, type PathValue, type UseFormRegister, } from "react-hook-form";
import { Box, Checkbox, FormControl, FormControlLabel, FormLabel, Grid, IconButton, InputAdornment, InputLabel, OutlinedInput, Rating, Slider, Stack, Switch, TextField, Typography, useColorScheme, type InputProps, type TextFieldProps, } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

interface BasicFormInput<T extends FieldValues> {
  label?: string;
  name: Path<T>;
  required?: boolean;
  errorMessage?: string;
  autoComplete?: string;
  size?: "small" | "medium",
  disabled?: boolean
}
interface RegisterFormInput<T extends FieldValues> extends BasicFormInput<T> {
  register: UseFormRegister<T>;
  startAdornment?: InputProps["startAdornment"]
}
interface ControlFormInput<T extends FieldValues> extends BasicFormInput<T> {
  control: Control<T>;
  startAdornment?: InputProps["startAdornment"]
}

type ControlledTextProps<T extends FieldValues> =
  ControlFormInput<T> &
  Omit<TextFieldProps, "name" | "required" | "onChange" | "id"> & {
    id?: string | null;
  };

export const ControlledTextInput = <T extends FieldValues>
  ({ control, label, name, required = false, errorMessage, autoComplete = "one-time-code", id, size = "medium", ...props }: ControlledTextProps<T>) => {
  const { mode } = useColorScheme();
  return (
    <Controller control={control} name={name} render={({ field }) => (
      <>
        <TextField {...field} size={size}
          value={field.value ?? ""}
          label={label} id={id ?? name}
          required={required} error={!!errorMessage} autoComplete={autoComplete} fullWidth
          {...props}
          slotProps={{
            ...props.slotProps,
            input: {
              ...props.slotProps?.input,
              startAdornment: props.startAdornment
            },
            htmlInput: {
              ...props.slotProps?.htmlInput,
              sx: {
                '&::-webkit-calendar-picker-indicator': {
                  filter: mode === "dark" ? 'invert(1)' : "none",
                },
              },
            },
          }}
        />
        {errorMessage && (
          <FormErrorMessage>{errorMessage}</FormErrorMessage>
        )}
      </>
    )} />
  );
};

interface ControlledSliderProps<T extends FieldValues> extends ControlFormInput<T> {
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  type?: "slider" | "rating";
}
export const ControlledSlider = <T extends FieldValues>
  ({ control, label, name, required = false, errorMessage, min = 0, max, defaultValue = 0, step = 1, type = "slider", size = "medium", ...props }: ControlledSliderProps<T>) => {
  return (
    <Controller name={name} control={control} render={({ field }) => (
      <FormControl error={!!errorMessage} fullWidth size={size} onClick={(e) => e.stopPropagation()}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 1 }}>
          {props.startAdornment}
          <Stack sx={{ flexGrow: 1 }}>
            {label && (
              <Typography variant={size === "medium" ? "body1" : "subtitle2"} sx={{ pl: 1 }}>
                {label} {required && "*"}
              </Typography>
            )}
            <Grid container size="grow" columnSpacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Grid size="grow" sx={{ alignItems: "center", minWidth: "7rem", maxWidth: "20rem" }}>
                {type === "slider" && (
                  <Box>
                    {/* Bug real encontrado 2026-08-11: {...field} le pasaba a Slider el onChange
                        de react-hook-form directo. MUI llama onChange(event, value) y RHF ignora
                        el segundo argumento, leyendo en cambio event.target.value del input nativo
                        -- que no siempre coincide con el valor real que Slider calculó/mostró. Se
                        cablea explícito como ya hace NumberSpinner acá abajo. */}
                    <Slider {...field} onChange={(_, value) => field.onChange(value)}
                      value={Number(field.value) || Number(defaultValue)} size="medium"
                      color="secondary" min={min} max={max} step={step}
                    />
                  </Box>
                )}
                {type === "rating" && (
                  // Bug real encontrado 2026-08-11 (reportado por Franco: clic en una estrella no
                  // guardaba el valor nuevo). El fix anterior (pasar el 2do argumento de onChange,
                  // igual que Slider) NO alcanza para Rating: en su handleChange interno, MUI le da
                  // prioridad al mouse sobre el radio clickeado ("Give mouse priority over
                  // keyboard", ver Rating.js) y sobreescribe el valor real por uno calculado a
                  // partir de la posición X del cursor contra getBoundingClientRect() del
                  // contenedor. Confirmado con un test aislado (React Testing Library + MUI Rating
                  // real): clickeando el radio de valor "3" con precision={.5}, ese 2do argumento
                  // llegó a ser 0.5 (equivocado) mientras que event.target.value (el radio
                  // realmente clickeado) fue "3" (correcto) -- por eso el fix correcto es ignorar
                  // el 2do argumento de onChange y leer directo del evento nativo, como abajo.
                  <Rating {...field}
                    onChange={(event) => field.onChange(
                      event.target.value === "" ? null : Number(event.target.value)
                    )}
                    value={Number(field.value) || Number(defaultValue)}
                    max={max} precision={step} size="medium" sx={{ pl: 1 }}
                  />
                )}
              </Grid>
              <Grid size="auto" sx={{ alignItems: "center", maxWidth: "13rem", ml: "auto" }}>
                <NumberSpinner {...field}
                  value={Number(field.value) || Number(defaultValue)}
                  onValueChange={(value) => field.onChange(value)}
                  min={type === "rating" ? 0 : min} max={max} step={step} size="small"
                />
              </Grid>
            </Grid>
          </Stack>
        </Stack>
        {errorMessage && (
          <FormErrorMessage>{errorMessage}</FormErrorMessage>
        )}
      </FormControl>
    )}
    />
  );
};

interface ControlledNumberProps<T extends FieldValues> extends Omit<ControlledSliderProps<T>, "type"> {
  type?: "field" | "spinner";
  startAdornment?: ReactNode,
  endAdornment?: ReactNode
}
export const ControlledNumber = <T extends FieldValues>
  ({ control, label, name, required = false, errorMessage, min, max, step,
    size = "medium", type = "field", startAdornment, endAdornment }: ControlledNumberProps<T>) => {
  return (
    <Controller name={name} control={control}
      defaultValue={(min ?? 0) as PathValue<T, Path<T>>}
      render={({ field }) => (
        <>
          {type === "field" && (
            <NumberField {...field} label={label}
              value={Number(field.value ?? "")}
              onValueChange={(value) => field.onChange(value)} size={size}
              min={min} max={max} step={step} required={required} error={!!errorMessage}
              startAdornment={startAdornment} endAdornment={endAdornment}
            />
          )}
          {type === "spinner" && (
            <NumberSpinner {...field} label={label}
              value={Number(field.value ?? "")}
              onValueChange={(value) => field.onChange(value)} size={size}
              min={min} max={max} step={step} required={required} error={!!errorMessage}
            />
          )}
          {errorMessage && (
            <FormErrorMessage>{errorMessage}</FormErrorMessage>
          )}
        </>
      )}
    />
  );
};

interface ControlledCheckboxProps<T extends FieldValues> extends ControlFormInput<T> {
  title?: string;
  tooltip?: string
}

export const ControlledCheckbox = <T extends FieldValues>
  ({ control, label, name, required = false, errorMessage, title }: ControlledCheckboxProps<T>) => {
  return (
    <FormControl error={!!errorMessage} variant="standard" >
      <FormLabel error={!!errorMessage}>{title}</FormLabel>
      <FormControlLabel required={required} sx={{ mr: 0, textDecoration: "inherit" }}
        label={label}
        control={
          <Controller name={name} control={control}
            render={({ field }) => (
              <Checkbox {...field}
                checked={field.value ?? false}
                onChange={(_, checked) => field.onChange(checked ?? false)}
              />
            )}
          />
        }
      />
      {errorMessage && (
        <FormErrorMessage>{errorMessage}</FormErrorMessage>
      )}
    </FormControl>
  );
};

export const ControlledSwitch = <T extends FieldValues>
  ({ control, label, name, required = false, errorMessage, title, size = "medium" }: ControlledCheckboxProps<T>) => {
  return (
    <FormControl error={!!errorMessage} variant="standard" sx={{ pl: 1 }}>
      <FormLabel error={!!errorMessage}>
        <Typography variant={size === "medium" ? "body1" : "body2"}>{title}</Typography>
      </FormLabel>
      <FormControlLabel label={label} required={required}
        control={
          <Controller name={name} control={control} defaultValue={false as PathValue<T, Path<T>>}
            render={({ field }) => (
              <Switch {...field}
                checked={field.value ?? false} size={size}
                onChange={(_, checked) => field.onChange(checked ?? false)}
              />
            )}
          />
        }
      />
      {errorMessage && (
        <FormErrorMessage>{errorMessage}</FormErrorMessage>
      )}
    </FormControl>
  );
};

export const PasswordField = <T extends FieldValues>
  ({ register, label, name, required = false, errorMessage, size = "medium", autoComplete = "one-time-code", ...props }: RegisterFormInput<T>) => {

  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    <FormControl required={required} error={!!errorMessage} size={size} fullWidth>
      <InputLabel htmlFor={name} size={size} shrink>{label}</InputLabel>
      <OutlinedInput id={name} label={label} size={size}
        type={showPassword ? "text" : "password"} placeholder={label}
        error={!!errorMessage} autoComplete={autoComplete} {...register(name)}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              onClick={handleClickShowPassword} edge="end" color="primary"
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        } {...props} />
      {errorMessage && (
        <FormErrorMessage>{errorMessage}</FormErrorMessage>
      )}
    </FormControl>
  );
};

interface FileProps<T extends FieldValues> extends RegisterFormInput<T> {
  id?: string;
}
export const SingleFileField = <T extends FieldValues>
  ({ register, name, label, required = false, errorMessage, autoComplete = "one-time-code", id, ...props }: FileProps<T>) => {
  return (
    <>
      <TextField {...register(name)} label={label ?? ""} id={id ?? name} type="file"
        required={required} error={!!errorMessage} autoComplete={autoComplete} fullWidth  {...props}
        slotProps={{
          input: { startAdornment: props.startAdornment },
          inputLabel: { shrink: true }
        }}
      />
      {errorMessage && (
        <FormErrorMessage>{errorMessage}</FormErrorMessage>
      )}
    </>
  );
};

type RegisteredTextProps<T extends FieldValues> =
  RegisterFormInput<T> &
  Omit<TextFieldProps, "name" | "required" | "onChange" | "id"> & {
    id?: string | null;
    onChange?: () => void;
    setValueAs?: (value: string) => unknown
  };

export const RegisteredTextInput = <T extends FieldValues>
  ({ register, name, label, required = false, errorMessage, autoComplete = "one-time-code", multiline = false,
    id = null, type = "text", size = "medium", onChange = () => { }, setValueAs = (value) => value, slotProps, ...props }: RegisteredTextProps<T>) => {

  const { mode } = useColorScheme();

  return (
    <>
      <TextField {...register(name, { setValueAs })} label={label ?? name} placeholder={label ?? name} id={id ?? name} type={type}
        onChange={e => { register(name).onChange(e); onChange() }}
        required={required} error={!!errorMessage} autoComplete={autoComplete} multiline={multiline}
        fullWidth size={size}
        slotProps={{
          ...slotProps,
          input: {
            ...slotProps?.input,
            startAdornment: props.startAdornment
          },
          htmlInput: {
            ...slotProps?.htmlInput,
            sx: {
              '&::-webkit-calendar-picker-indicator': {
                filter: mode === "dark" ? 'invert(1)' : "none",
              },
            },
          },
          inputLabel: {
            shrink: true,
            ...slotProps?.inputLabel,
          },
        }}
        {...props}
      />
      {errorMessage && typeof errorMessage === "string" && (
        <FormErrorMessage>{errorMessage}</FormErrorMessage>
      )}
    </>
  );
};


const DATE_INPUT_TYPE = {
  DATE_TIME: { inputType: "datetime-local", format: "YYYY-MM-DD HH:mm:ss" },
  TIME: { inputType: "time", format: "HH:mm:ss" },
  DATE: { inputType: "date", format: "YYYY-MM-DD" },
}

type RegisteredDateInputProps<T extends FieldValues> =
  Omit<RegisteredTextProps<T>, "type" | "id"> & { dateType?: keyof typeof DATE_INPUT_TYPE }


export const RegisteredDateInput = <T extends FieldValues>({ dateType = "DATE", register, name, label, required = false, errorMessage, autoComplete = "bday", size = "medium", ...props }: RegisteredDateInputProps<T>) => {
  const { inputType } = DATE_INPUT_TYPE[dateType]
  const { mode } = useColorScheme();

  return (
    <>
      <TextField
        {...register(name)}
        label={label ?? name}
        id={name ?? undefined}
        type={inputType}
        required={required}
        error={!!errorMessage}
        autoComplete={autoComplete}
        fullWidth
        size={size}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: {
            sx: {
              '&::-webkit-calendar-picker-indicator': {
                filter: mode === "dark" ? 'invert(1)' : "none",
              },
            },
          },
        }}
        {...props}
      />
      {errorMessage && typeof errorMessage === "string" && (
        <FormErrorMessage>{errorMessage}</FormErrorMessage>
      )}
    </>
  );
};
