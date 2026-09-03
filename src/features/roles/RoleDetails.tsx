import { SidebarContentWrapper } from "shared/layout/container/GenericSidebar"
import HandleActiveButton from "shared/ui/buttons/HandleActiveButton"
import DetailsMetadata from "shared/ui/details/DetailsMetadata"
import CommonButton from "shared/ui/buttons/CommonButton"
import type { RoleDetailed } from "src/types/roles"
import { Can } from "src/components/auth/Can"
import { Accordion, AccordionDetails, AccordionSummary, ButtonGroup, Divider, Grid, Stack, Typography } from "@mui/material"
import { useEffect, useMemo, useState } from "react"
import CustomChip from "src/components/ui/details/CustomChip"
import { getDictionaries } from "src/services/generalService"
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { NoItemsMessage } from "src/components/ui/lists/NoItemsMessage"
import ROUTE_ICONS from "src/components/ui/icons/RouteIcons"
import { CommonCRMText } from "src/components/ui/details/CommonText"
import { categorizePermissions } from "./roleUtils"

interface RoleDetailsProps {
    role: RoleDetailed | null,
    closeSidebar: () => void,
    handleSidebar: (mode: string, role: RoleDetailed | null) => void,
    handleActive: (role: RoleDetailed) => void
}

export const RoleDetails = ({ role, closeSidebar, handleSidebar, handleActive }: RoleDetailsProps) => {

    if (role) return (
        <SidebarContentWrapper title={role.name} icon={ROUTE_ICONS.ROLES} active={role.active}
            subtitle="Roles y Permisos"
            actions={
                <ButtonGroup>
                    <CommonButton onClick={closeSidebar} actionType="CLOSE" variant="outlined" >Cerrar</CommonButton>
                    <Can permission={role.active ? "role:delete" : "role:update"}>
                        <HandleActiveButton active={role.active} handleActive={() => handleActive(role)} />
                    </Can>
                    <Can permission="role:update">
                        <CommonButton onClick={() => handleSidebar("UPDATE_ROLE", role)} actionType="MODIFY" >Modificar</CommonButton>
                    </Can>
                </ButtonGroup>
            }>
            <Stack spacing={2}>
                <DetailsMetadata entity={role} />
                <Divider />
                <RolePermissionList role={role} />
            </Stack>
        </SidebarContentWrapper>
    )
}

export const RolePermissionList = ({ role }: { role: RoleDetailed }) => {

    const [entities, setEntities] = useState<Record<string, string> | undefined>(undefined)

    useEffect(() => {
        getDictionaries(["entities"])
            .then((dict) => setEntities(dict.entities))
    }, [])

    const permissions = useMemo(() => {
        if (!role) return []
        return categorizePermissions(role.permissions, entities)
    }, [role, entities])

    return (
        <Stack spacing={2}>
            <Typography variant="h3">Lista de Permisos</Typography>
            {role.permissions && role.permissions.length > 0 ? (
                <Grid container spacing={.5}>
                    {permissions.map((cat, idx) => (
                        <Grid key={cat[0]} size="grow" sx={{ minWidth: "15rem" }}>
                            <Accordion defaultExpanded={idx === 0} disableGutters>
                                <AccordionSummary id={cat[0]} expandIcon={<ExpandMoreIcon />}>
                                    <Stack>
                                        <CommonCRMText size="sm" sx={{ fontWeight: 500 }}>{cat[0]}</CommonCRMText>
                                        <CommonCRMText size="xs" color="textSecondary" sx={{ fontStyle: "italic" }}>{cat[1].length} permisos</CommonCRMText>
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                                        {cat[1].map(perm => {
                                            return <CustomChip key={perm.codename} label={perm.codename === "view_all" ? "Ver lista de registros" : perm.name}
                                                size="small" variant="outlined" chipColor="secondary" />
                                        })
                                        }
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <NoItemsMessage emptyFetchMessage="No tiene permisos asignados..."  ></NoItemsMessage>
            )}
        </Stack>
    )
}
