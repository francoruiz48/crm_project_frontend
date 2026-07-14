import type { Theme } from '@mui/material'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { colorTypesArray, type ColorTypes } from 'src/types/mui-theme.d'
import type { ColorShades, DateFormat } from 'src/types/shared'
dayjs.locale('es')

/**
 * Formatea el dinero a ARS, o a otro definido por languageCode y currencyCode
 * @param money
 * @param languageCode Según BCP 47
 * @param currencyCode Según ISO 4217 
 */
export const formatMoney = (money: number, languageCode: string = "es-AR", currencyCode: string = "ARS") => {
    return new Intl.NumberFormat(languageCode, { style: "currency", currency: currencyCode }).format(money)
}

/**
 * Arma "Nombre Apellido" a partir de un Creator/Updater (u objeto similar).
 * Antes se mostraba solo el nombre de pila, lo cual generaba ambigüedad entre
 * usuarios con el mismo nombre. Si no hay apellido cargado (dato opcional), devuelve
 * solo el nombre.
 */
export const formatUserFullName = (user?: { name?: string | null, last_name?: string | null } | null): string | null => {
    if (!user?.name) return null
    return [user.name, user.last_name].filter(Boolean).join(" ")
}

export const formatDate = (date: string, formatType: DateFormat, customFormat: string = 'dddd DD/MM/YYYY HH:mm:ss') => {
    let format
    switch (formatType) {
        case "dateTime": format = "DD/MM/YYYY HH:mm:ss"
            break;
        case "dateTimeLong": format = "dddd DD/MM/YYYY HH:mm:ss"
            break;
        case "date": format = "DD/MM/YYYY"
            break;
        case "dateLong": format = "dddd DD/MM/YYYY"
            break;
        case "time": format = "HH:mm:ss"
            break;
        default: format = customFormat
            break;
    }
    const formattedDate = dayjs(date).format(format)
    return formattedDate === "Invalid Date" ? undefined : formattedDate
}


type FieldType = "NUMBER" | "BOOL" | "OBJECT" | "ARRAY"

/**
 * Recupera el valor numérico, boolean, etc, desde un string.
 * @param fieldType Tipo del dato al que se quiere convertir.
 * @param value Valor original de tipo string. Si no es string se devuelve sin cambios
 */
export const getFieldTypeValue = (fieldType: FieldType, value: unknown) => {
    //Si el valor no es un string lo devuelve
    if (typeof value !== "string") return value;

    switch (fieldType) {
        case "NUMBER":
            return parseInt(value);
        case "BOOL":
            return value === "1" || value === "true";
        case "OBJECT": case "ARRAY":
            return JSON.parse(value)
    }
};

export const isValidURL = (url: string) => {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

export const sanitizePhone = (phone: string) => phone.replace(/\D/g, "")

export const isHex = (color: string) => {
    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
    return hexRegex.test(color)
}

export const isColorType = (color: string): color is ColorTypes => {
    return colorTypesArray.includes(color)
}

export function hslStringToHex(hsl: string): string {
    const match = hsl.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/)
    if (!match) return "#000000"

    const h = Number(match[1])
    const s = Number(match[2]) / 100
    const l = Number(match[3]) / 100

    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2

    let r, g, b
    if (h < 60) [r, g, b] = [c, x, 0]
    else if (h < 120) [r, g, b] = [x, c, 0]
    else if (h < 180) [r, g, b] = [0, c, x]
    else if (h < 240) [r, g, b] = [0, x, c]
    else if (h < 300) [r, g, b] = [x, 0, c]
    else[r, g, b] = [c, 0, x]

    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0")
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const getColorShades = (color: string, theme: Theme): ColorShades => {
    const isColorHex = isHex(color)
    if (isColorHex) return {
        LIGHTER: theme.lighten(color, .6),
        LIGHT: theme.lighten(color, .3),
        MAIN: color,
        DARK: theme.darken(color, .3),
        DARKER: theme.darken(color, .6)
    }

    const themeColor = isColorType(color) ? color : "primary"

    return {
        LIGHTER: hslStringToHex(theme.palette[themeColor].lighter),
        LIGHT: hslStringToHex(theme.palette[themeColor].light),
        MAIN: hslStringToHex(theme.palette[themeColor].main),
        DARK: hslStringToHex(theme.palette[themeColor].dark),
        DARKER: hslStringToHex(theme.palette[themeColor].darker)
    }
}

export const decodeUrlFilename = (url: string) => {
    const raw = url.split("/").pop() ?? url
    try {
        return decodeURIComponent(raw)
    } catch {
        return raw
    }
}