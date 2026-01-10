import { Outlet } from 'react-router-dom';
import Sidebar from './layout/Sidebar';
import { Box } from '@mui/material';

export default function MainLayout() {
  return (
    <Box sx={{ display: 'flex', flexGrow: 1 }}>
      <Sidebar>
        <Outlet />
      </Sidebar>
    </Box>
  );
}