import DetailsMetadata from "shared/ui/details/DetailsMetadata"
import CommonButton from "shared/ui/buttons/CommonButton"
import type { OrganizationDetailed } from "src/types/campaigns"
import { useUserContext } from "src/stores/UserContext"
import { Link } from "react-router-dom"
import { ButtonGroup, Divider, Stack, Typography } from "@mui/material"
import { SidebarContentWrapper } from "src/components/layout/container/GenericSidebar"
import { Can } from "src/components/auth/Can"
import ROUTE_ICONS from "src/components/ui/icons/RouteIcons"

interface DetailsProps {
    entity: OrganizationDetailed | null,
    closeSidebar: () => void,
    handleSidebar: (mode: string, entity: OrganizationDetailed | null) => void,
}
const OrganizationDetails = ({ entity, closeSidebar, handleSidebar }: DetailsProps) => {
    const { activeOrg, setActiveOrg } = useUserContext()

    const isOrgActive = activeOrg?.id === entity?.id

    if (!entity) return

    return (
        <SidebarContentWrapper title={entity.name} subtitle="Organización"
            active={entity.active} icon={ROUTE_ICONS.ORGANIZATIONS}
            ringColor={isOrgActive ? "info" : undefined} iconColor={isOrgActive ? "info" : undefined}
            avatarTooltip={isOrgActive ? "Activo" : undefined}
            actions={
                <ButtonGroup>
                    <CommonButton onClick={closeSidebar} actionType="CLOSE" variant="outlined" >Cerrar</CommonButton>
                    <Can permission="organization:update">
                        <CommonButton onClick={() => handleSidebar("UPDATE_ORG", entity)} actionType="MODIFY" >Modificar</CommonButton>
                    </Can>
                </ButtonGroup>
            }>

            <Stack spacing={2} >
                {entity.description &&
                    <Typography variant="body1">{entity.description}</Typography>
                }
                <DetailsMetadata entity={entity} />
                <Divider />
                {activeOrg?.id !== entity.id ?
                    <CommonButton actionType="CHECK" color="info" variant='outlined' onClick={() => setActiveOrg(entity)} >Seleccionar como Activo</CommonButton>
                    :
                    <ButtonGroup fullWidth>
                        <CommonButton actionType="PARAMETERS" variant="outlined" component={Link} to={`/campaigns`} >Propiedades</CommonButton>
                        <CommonButton actionType="LIST" variant="outlined" component={Link} to={`/campaigns`} >Espacios de Trabajo</CommonButton>
                    </ButtonGroup>
                }
            </Stack>
        </SidebarContentWrapper>
    )
}

export default OrganizationDetails