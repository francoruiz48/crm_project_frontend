import { useMemo, type ForwardRefExoticComponent, type ReactNode, type RefAttributes } from 'react';
import { LeadFlowList } from '../leadFlows/LeadFlowList';
import { CustomListItem } from 'shared/ui/lists/CustomListItem';
import ContainerWithSidebar from 'shared/layout/container/GenericContainer';
import { SidebarContentWrapper } from 'shared/layout/container/GenericSidebar';
import { CommonIconButton } from 'shared/ui/buttons/CommonIconButton';
import { useSidebar } from 'src/hooks/useSidebar';
import type { ColorTypes } from 'src/types/mui-theme.d';
import { Link, useSearchParams, type LinkProps } from 'react-router-dom';
import { List, ListItemAvatar, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { ContactStateList } from './contactState/ContactStateList';
import CommonButton from 'src/components/ui/buttons/CommonButton';
import DiscountIcon from '@mui/icons-material/Discount';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import { LeadTagsList } from './tags/LeadTagsList';
import { FieldSectionList } from './fieldSections/FieldSectionList';
import { useUserContext } from 'src/stores/UserContext';
import { CustomAvatar } from 'src/components/ui/details/CustomAvatar';
import ROUTE_ICONS from 'src/components/ui/icons/RouteIcons';
import { type ActionType } from 'src/components/ui/icons/ActionIcons';

export interface OrgPropertiesItem {
    label: string,
    id: "FLOW" | "CONTACT" | "TAGS" | "SECTIONS" | "NOMENCLATORS",
    icon: ReactNode,
    color: ColorTypes,
    content: ReactNode,
    //Permiso :view de la entidad que maneja esta subsección. Se usa acá (para ocultar el ítem si falta) y en
    //routes.tsx (para saber si mostrar la página: alcanza con tener el permiso de CUALQUIERA de estos 4).
    permission: string,
    //Acciones alternativas
    customAction?: () => void,
    customComponent?: ForwardRefExoticComponent<LinkProps & RefAttributes<HTMLAnchorElement>>,
    customTo?: string,
    customActionType?: ActionType,
    customActionTitle?: string,
}
export const LEAD_PROPERTIES: OrgPropertiesItem[] = [{
    label: "Ciclo de Vida",
    id: "FLOW",
    icon: <AccountTreeIcon />,
    color: "primary",
    content: <LeadFlowList />,
    permission: "lead_flow:view",
},
{
    label: "Estados",
    id: "CONTACT",
    icon: <ViewColumnIcon />,
    color: "secondary",
    content: <ContactStateList />,
    permission: "lead_contact_state:view",
},
{
    label: "Etiquetas de Lead",
    id: "TAGS",
    icon: <DiscountIcon />,
    color: "info",
    content: <LeadTagsList />,
    permission: "tag:view",
},
{
    label: "Secciones de Campo",
    id: "SECTIONS",
    icon: <FolderCopyIcon />,
    color: "success",
    content: <FieldSectionList />,
    permission: "lead_field_section:view",
},
{
    label: "Nomencladores",
    id: "NOMENCLATORS",
    icon: ROUTE_ICONS.NOMENCLATORS,
    color: "warning",
    content: <FieldSectionList />,
    permission: "nomenclator:view",
    customComponent: Link,
    customTo: "/nomenclators/",
    customActionType: "NAVIGATE",
    customActionTitle: "Ver Nomencladores"
}]

const OrgProperties = () => {

    const [params, setParams] = useSearchParams()
    const { hasPermission } = useUserContext()

    const { sidebarMode, selectedEntity, handleSidebar, closeSidebar } = useSidebar<OrgPropertiesItem>("id", params, setParams)

    //Cada subsección se oculta si falta su permiso puntual (la ruta completa ya está gateada en routes.tsx
    //con "cualquiera de los 4", así que si se llegó hasta acá, esta lista nunca queda vacía)
    const visibleProperties = useMemo(() => LEAD_PROPERTIES.filter(prop => hasPermission(prop.permission)), [hasPermission])

    const getItemAction = (prop: OrgPropertiesItem) => {
        if (prop.customComponent && prop.customTo) return { component: prop.customComponent, to: prop.customTo }
        else return { onClick: () => prop.customAction?.() ?? handleSidebar(`${prop.id}`, prop) }
    }

    return (
        <ContainerWithSidebar isSidebarOpen={Boolean(sidebarMode)} closeSidebar={closeSidebar}
            sidebarComponent={
                <OrgPropertiesSidebar entity={selectedEntity} handleSidebar={handleSidebar}
                    closeSidebar={closeSidebar} />
            }>
            <Stack spacing={3}>
                <Typography variant="h1">Propiedades de Organización</Typography>
                <Stack spacing={2}>
                    <List>
                        {visibleProperties.map(prop =>
                            <CustomListItem key={`${prop.id}`} isSelected={prop.id === selectedEntity?.id} disablePadding secondaryAction={
                                <CommonIconButton actionType={prop.customActionType ?? "DETAILS"} title={prop.customActionTitle ?? "Detalles"}
                                    tooltipSize="small" size="small"
                                    {...getItemAction(prop)} />
                            }>
                                <ListItemButton {...getItemAction(prop)}>
                                    <ListItemAvatar>
                                        <CustomAvatar size="small" color={prop.color} ring={prop.id === selectedEntity?.id} variant="rounded" >
                                            {prop.icon}
                                        </CustomAvatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={
                                        <Stack spacing={1} direction="row">
                                            <Typography sx={{ fontWeight: "bold" }}>{prop.label}</Typography>
                                        </Stack>
                                    } />
                                </ListItemButton>
                            </CustomListItem>
                        )}
                    </List>
                </Stack>
            </Stack>
        </ContainerWithSidebar >
    )
}

export default OrgProperties

interface SidebarProps {
    entity: OrgPropertiesItem | null,
    closeSidebar: () => void,
    handleSidebar: (mode: string, entity: OrgPropertiesItem | null) => void,
}
const OrgPropertiesSidebar = ({ entity, closeSidebar }: SidebarProps) => {

    return (
        <SidebarContentWrapper title={entity?.label} subtitle="Propiedades de Organización"
            icon={entity?.icon} iconColor={entity?.color}
            actions={<CommonButton actionType="CLOSE" variant="outlined" onClick={closeSidebar}>Cerrar</CommonButton>} >
            {entity?.content}
        </SidebarContentWrapper>
    )
}