import { memo } from "react";
import { textTheme } from "../../../theme/typographyTheme";
import { Chip, type ChipTypeMap } from "@mui/material";
import type { OverridableComponent } from "@mui/material/OverridableComponent";
import { styled } from "@mui/material/styles";
import { getColorShades } from "src/utils/formatters";

const CHIP_OPACITY = .25
const CHIP_SIZES = {
    "small": { padding: "1px 0px", gap: "2px", fontSize: ".75rem" },
    "medium": { padding: "5px", gap: ".25rem", fontSize: ".875rem" },
    "large": { padding: "6px", gap: ".25rem", fontSize: "1rem", fontWeight: 600 },
    "xlarge": { padding: "8px", gap: ".5rem", fontSize: "1.125rem", fontWeight: 600 }
}

const ICON_SIZE_EM = textTheme.root.lineHeight

const CustomChip = memo(styled(Chip, {
    shouldForwardProp: (prop) => prop !== "chipColor"
})(
    ({ theme, chipColor, defaultColor = "primary", size = "small" }) => {

        const resolvedColor = chipColor ?? defaultColor
        const paletteColors = getColorShades(resolvedColor, theme)
        const sizeObject = CHIP_SIZES[size as keyof typeof CHIP_SIZES]

        return [{
            backdropFilter: "blur(8px)",
            fontWeight: "500",
            height: "auto",
            border: "1px solid",
            borderRadius: ".75rem",
            backgroundColor: theme.alpha(paletteColors.LIGHT, CHIP_OPACITY),
            borderColor: theme.alpha(paletteColors.MAIN, .5),
            color: theme.palette.contrast[900],
            ...sizeObject,
        }, {
            //Como el ícono no utiliza lineHeight, se lo multiplica para que tenga la misma altura del texto.
            "& .MuiSvgIcon-root": { display: "block", fontSize: `${ICON_SIZE_EM}em` },
        },
        //Invierte los tonos en darkmode
        theme.applyStyles('dark', {
            backgroundColor: theme.alpha(paletteColors.DARKER, CHIP_OPACITY),
            color: theme.palette.common.white,
        }),
        ]
        //Se castea a OverridableComponent para permitir el uso de los props component y to para RouterLink
    })) as unknown as OverridableComponent<ChipTypeMap> & { defaultComponent: "div" };

export default CustomChip