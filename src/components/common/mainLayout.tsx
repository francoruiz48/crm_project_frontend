import { Outlet } from 'react-router-dom';
import Sidebar from './layout/Sidebar';

export default function MainLayout() {
  return (
    <Sidebar>
        <Outlet />
    </Sidebar>
  );
}