import { Grid, Stack, Tooltip, Typography } from "@mui/material";
import type { Metadata } from "src/types/shared";
import { formatDate, formatUserFullName } from "src/utils/formatters";
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import PersonIcon from '@mui/icons-material/Person';

interface DetailsMetadataProps<T extends Metadata> {
    entity: T
}

export default function DetailsMetadata<T extends Metadata>({ entity }: DetailsMetadataProps<T>) {
    return (
        <Grid container spacing={1} sx={{ minWidth: "20rem" }}>
            <Grid size="grow" sx={{ minWidth: "12rem" }}>
                <Typography variant="subtitle2" color="textSecondary">
                    Fecha de creación:
                </Typography>
                <Typography variant="body1" sx={{ textTransform: "capitalize" }}>
                    {formatDate(entity?.created_at, "dateTimeLong")}
                </Typography>
            </Grid>
            {entity?.updated_at &&
                <Grid size="grow" sx={{ minWidth: "12rem" }}>
                    <Typography variant="subtitle2" color="textSecondary">
                        Fecha de última modificación:
                    </Typography>
                    <Typography variant="body1" sx={{ textTransform: "capitalize" }}>
                        {formatDate(entity.updated_at, "dateTimeLong")}
                    </Typography>
                </Grid>
            }
        </Grid>
    );
}


interface MetadataShortProps {
    metadata: Metadata,
    onlyUser?: boolean,
    onlyDate?: boolean,
    noIcon?: boolean,
    containerProps?: object
}
/**
 * Versión de una sola linea.
 * Muestra los datos de la última modificación, o creación si no se ha modificado.
 * */
export const MetadataShort = ({ metadata, onlyUser = false, onlyDate = false, noIcon = false, containerProps }: MetadataShortProps) => {
    const user = metadata?.updater ?? metadata?.creator ?? null
    const userDisplay = formatUserFullName(user) ?? "Sistema"

    return (
        <Grid spacing={.5} container sx={{ alignItems: "center" }} {...containerProps}>
            {!onlyDate &&
                <Stack direction="row" spacing={.5}>
                    {!noIcon && <PersonIcon fontSize="small" />}
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>Por</Typography>
                    <Tooltip title={user?.email ?? ""} disableHoverListener={!user?.email}>
                        <Typography variant="body2">{userDisplay}</Typography>
                    </Tooltip>
                </Stack>
            }
            {(!onlyDate && !onlyUser) && "-"}
            {!onlyUser &&
                <Stack direction="row" spacing={.5}>
                    {!noIcon && <WatchLaterIcon fontSize="small" />}
                    <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                        {formatDate(metadata?.updated_at ?? metadata?.created_at, "dateTimeLong")}
                    </Typography>
                </Stack>
            }
        </Grid>
    )
}