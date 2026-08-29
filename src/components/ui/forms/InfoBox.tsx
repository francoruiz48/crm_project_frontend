import { Box, Stack, useTheme, type BoxProps } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ChipTooltip } from '../details/ChipTooltip';

interface InfoTextBox extends BoxProps {
    infoText: string,
    color?: string,
    size?: "small" | "medium" | "large" | "xlarge"
}

export const InfoTextBox = ({ infoText, color, size, children, ...props }: InfoTextBox) => {
    const { palette } = useTheme()

    const gray = palette.text.secondary
    return (
        <ChipTooltip title={infoText} color={color} size={size}>
            <Box {...props}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Box sx={{ textDecoration: `underline dotted ${gray}` }}>{children}</Box>
                    <InfoOutlinedIcon fontSize="small" sx={{ color: gray }} />
                </Stack>
            </Box>
        </ChipTooltip>
    )
}
