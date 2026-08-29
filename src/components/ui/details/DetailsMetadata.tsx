import { Stack } from "@mui/material";
import type { Metadata } from "src/types/shared";
import { formatDate } from "src/utils/formatters";
import { ChipTooltip } from "./ChipTooltip";
import { UserAvatar } from "./UserAvatar";
import { CommonCRMText } from "./CommonText";

interface DetailsMetadataProps<T extends Metadata> {
    entity: T,
    size?: "small" | "medium"
}

export default function DetailsMetadata<T extends Metadata>({ entity, size = "medium" }: DetailsMetadataProps<T>) {
    const hasModifier = entity?.updater && entity.updated_at !== entity.created_at
    const creatorName = entity.creator ? [entity.creator.name, entity.creator.last_name].filter(Boolean).join(" ") : "Sistema"
    const updaterName = entity.updater ? [entity.updater.name, entity.updater.last_name].filter(Boolean).join(" ") : ""
    return (
        <Stack direction="row" spacing={3} useFlexGap
            sx={{ minWidth: "20rem", justifyContent: "space-between", flexWrap: "wrap" }}>
            <MetadataItem title="Creado por" name={creatorName} email={entity.creator?.email} date={entity?.created_at} size={size} />
            {hasModifier &&
                <MetadataItem title="Modificado por" name={updaterName} email={entity.updater?.email} date={entity?.updated_at} size={size} />
            }
        </Stack>
    );
}

interface MetadataItemProps {
    title?: string,
    name?: string | null,
    email?: string | null,
    date?: string | null,
    short?: boolean,
    noIcon?: boolean,
    size?: "small" | "medium",
    noHour?: boolean
}

export const MetadataItem = ({ title, name, email, date, short = false, noIcon = false, size = "medium", noHour = false }: MetadataItemProps) => {

    const dateFormat = noHour ?
        (short ? "date" : "dateLong")
        : (short ? "dateTime" : "dateTimeLong")

    return (
        <Stack spacing={.5} sx={{ flexGrow: 1 }}>
            {title && !short &&
                <CommonCRMText size={size === "small" ? "xs" : "sm"} color="textSecondary" sx={{ textTransform: "uppercase", fontWeight: 600 }}>
                    {title}
                </CommonCRMText>}
            <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                {name && !noIcon && <UserAvatar name={name} size={size === "small" ? 28 : 36} />}
                <Stack>
                    <ChipTooltip title={email} color="secondary" size="small">
                        <CommonCRMText size={size === "small" ? "sm" : "md"} sx={{ fontWeight: 500 }}>
                            {name}
                        </CommonCRMText>
                    </ChipTooltip>
                    {date &&
                        <CommonCRMText size={size === "small" ? "xs" : "sm"} color="textSecondary" sx={{ textTransform: "capitalize" }}>
                            {formatDate(`${date}`, dateFormat)}
                        </CommonCRMText>
                    }
                </Stack>
            </Stack>
        </Stack>
    )
}
