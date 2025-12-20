import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import SsidChartIcon from '@mui/icons-material/SsidChart';
import SettingsIcon from '@mui/icons-material/Settings';

export const Navbar = ({ open }) => {
  const options = [
    { name: "Leads", icon: <PersonIcon/> },
    { name: "Campañas", icon: <WorkIcon/> },
    { name: "Reportes", icon: <SsidChartIcon/> },
    { name: "Personalizaciones", icon: <SettingsIcon/> },

  ]
  return (
    <>
      {options?.map((item, index) => (
        <ListItem key={item.name} disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            sx={[
              {
                minHeight: 48,
                px: 2.5,
              },
              open
                ? {
                  justifyContent: 'initial',
                }
                : {
                  justifyContent: 'center',
                },
            ]}
          >
            <ListItemIcon
              sx={[
                {
                  minWidth: 0,
                  justifyContent: 'center',
                },
                open
                  ? {
                    mr: 3,
                  }
                  : {
                    mr: 'auto',
                  },
              ]}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.name}
              sx={[
                open
                  ? {
                    opacity: 1,
                  }
                  : {
                    opacity: 0,
                  },
              ]}
            />
          </ListItemButton>
        </ListItem>

      ))}
    </>
  )
}
