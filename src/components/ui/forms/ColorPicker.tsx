import { Box, Button, IconButton, Popover, Stack, useTheme, type BoxProps, type Theme } from "@mui/material"
import { Controller, type Control, type ControllerRenderProps, type FieldValues, type Path } from "react-hook-form"
import { colorTypesArray } from "src/types/mui-theme.d"
import { FormErrorMessage } from "./FormFeedback"
import { getColorShades } from "src/utils/formatters"
import CircleIcon from '@mui/icons-material/Circle';
import CheckIcon from '@mui/icons-material/Check';
import { HexColorInput, HexColorPicker } from "react-colorful";
import { useMemo, useState } from "react"

interface ColorSelectorProps<T extends FieldValues> extends BoxProps {
    control: Control<T>,
    name: Path<T>,
    size?: "medium" | "small",
    row?: boolean,
    onBeforeChange?: (color: string) => void
}

export const ControlledColorPicker = <T extends FieldValues>({ control, size = "medium", row = false, name, onBeforeChange, ...props }: ColorSelectorProps<T>) => {
    const theme = useTheme()

    return (
        <Controller control={control} name={name}
            render={({ field, fieldState }) => {
                return (
                    <Box {...props}>
                        <Stack spacing={1}>
                            <Stack spacing={.5} useFlexGap direction={row ? "row" : "column"}
                                sx={{ justifyContent: "space-evenly", alignItems: "center", flexWrap: "wrap" }}>
                                <Stack direction="row" useFlexGap sx={{ alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                                    {colorTypesArray.map(colorName => (
                                        <ColorPickerButton field={field} size={size} key={colorName}
                                            colorName={colorName} theme={theme} onBeforeChange={onBeforeChange} />
                                    ))
                                    }
                                </Stack>
                                <ColorPickerMenu field={field} theme={theme} size={size} row={row} onBeforeChange={onBeforeChange} />
                            </Stack>
                            {fieldState.error?.message && typeof fieldState.error?.message === "string" && (
                                <FormErrorMessage>{fieldState.error?.message}</FormErrorMessage>
                            )}
                        </Stack>
                    </Box>
                )
            }} />

    )
}

interface ColorPickerMenuProps<T extends FieldValues> {
    field: ControllerRenderProps<T, Path<T>>,
    theme: Theme,
    size?: "medium" | "small",
    row?: boolean
    onBeforeChange?: (color: string) => void
}

export const ColorPickerMenu = <T extends FieldValues>({ field, theme, size, row = false, onBeforeChange }: ColorPickerMenuProps<T>) => {

    const paletteColor = useMemo(() => getColorShades(field.value, theme), [field.value, theme])
    const [pickerAnchor, setPickerAnchor] = useState<HTMLButtonElement | null>(null)

    return (
        <>
            <Button fullWidth={!row} sx={{
                flexGrow: "1",
                minWidth: size === "small" ? "4rem" : "6rem",
                maxWidth: size === "small" ? "9rem" : "15rem",
                height: size === "small" ? "1.5rem" : "2rem", p: "2px",
                border: `2px solid ${paletteColor.LIGHT}`,
                borderRadius: ".5rem",
            }}
                onClick={e => setPickerAnchor(e.currentTarget)}
            >
                <Box sx={{
                    width: "100%", height: "100%",
                    backgroundColor: paletteColor.MAIN,
                    borderRadius: ".25rem",
                }} />
            </Button>
            <Popover
                id="color-picker"
                open={Boolean(pickerAnchor)}
                anchorEl={pickerAnchor}
                onClose={() => setPickerAnchor(null)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
            >
                <HexColorPicker color={paletteColor.MAIN}
                    onChangeEnd={color => {
                        if (onBeforeChange) onBeforeChange(color)
                        field.onChange(color)
                    }} />
                <HexColorInput color={paletteColor.MAIN}
                    onChange={color => {
                        if (onBeforeChange) onBeforeChange(color)
                        field.onChange(color)
                    }}
                    style={{ width: "100%" }} prefixed />
            </Popover>
        </>
    )
}

interface ColorPickerButtonProps<T extends FieldValues> {
    field: ControllerRenderProps<T, Path<T>>
    theme: Theme,
    size?: "medium" | "small",
    colorName: string,
    onBeforeChange?: (color: string) => void
}
export const ColorPickerButton = <T extends FieldValues>({ field, size, colorName, theme, onBeforeChange }: ColorPickerButtonProps<T>) => {
    const paletteColor = useMemo(() => getColorShades(colorName, theme), [colorName, theme])

    return (
        <IconButton key={colorName}
            size="small" sx={{ p: size === "small" ? "2px" : undefined }}
            onClick={() => {
                if (onBeforeChange) onBeforeChange(colorName)
                field.onChange(colorName)
            }}>
            <CircleIcon sx={{
                color: paletteColor.MAIN,
                width: size === "small" ? "1.1rem" : " 1.5rem",
                height: size === "small" ? "1.1rem" : " 1.5rem",
                borderRadius: "50%",
                border: field.value === colorName ? `2px solid ${paletteColor.LIGHTER}` : ""
            }} />
        </IconButton>
    )
}

interface InlineColorPickerButtonProps {
    color: string,
    onChange: (color: string) => void,
    //Se notifica cuando el popover se abre/cierra, para que quien lo use pueda, por ejemplo, ignorar
    //el blur de un campo de texto vecino mientras el picker está abierto (si no, el campo se cerraría
    //solo con intentar abrir el selector de color).
    onOpenChange?: (open: boolean) => void,
    ariaLabel?: string,
}

/**
 * Botón circular de color libre (hex/RGB) + popover con `HexColorPicker`/`HexColorInput` y un botón
 * de check para cerrarlo. Extraído de `LeadTagsMenu.tsx` (donde nació para el selector de color de
 * una etiqueta nueva) para poder reutilizarlo en cualquier otro lado que necesite el mismo patrón de
 * "campo de texto + color libre al costado" (ej. crear una sección de campos nueva desde el selector).
 */
export const InlineColorPickerButton = ({ color, onChange, onOpenChange, ariaLabel = "Elegir color" }: InlineColorPickerButtonProps) => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
        setAnchor(e.currentTarget)
        onOpenChange?.(true)
    }
    const handleClose = () => {
        setAnchor(null)
        onOpenChange?.(false)
    }

    return (
        <>
            {/* onMouseDown con preventDefault evita que el campo de texto vecino pierda foco (blur) al
                clickear este botón, lo que lo cerraría antes de llegar a abrir el picker. */}
            <IconButton size="small" sx={{ p: "2px" }} aria-label={ariaLabel}
                onMouseDown={e => e.preventDefault()} onClick={handleOpen}>
                <CircleIcon sx={{
                    color, fontSize: "1.1rem", borderRadius: "50%",
                    border: "1px solid", borderColor: "divider"
                }} />
            </IconButton>
            <Popover disableScrollLock open={Boolean(anchor)} anchorEl={anchor} onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                transformOrigin={{ vertical: "top", horizontal: "center" }}>
                <Stack spacing={1} sx={{ p: 1.5 }}>
                    <HexColorPicker color={color} onChange={onChange} />
                    <Stack direction="row" spacing={.5} sx={{ alignItems: "center" }}>
                        <HexColorInput color={color} onChange={onChange} prefixed
                            style={{ flexGrow: 1, width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }} />
                        {/* Cierra el selector sin más efecto: el color elegido ya quedó guardado en el
                            estado de quien usa este botón. */}
                        <IconButton size="small" color="primary" onMouseDown={e => e.preventDefault()}
                            onClick={handleClose} aria-label="Confirmar color">
                            <CheckIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </Stack>
            </Popover>
        </>
    )
}
