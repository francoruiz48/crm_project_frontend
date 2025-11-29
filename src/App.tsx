import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/common/mainLayout';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<div>Home Test</div>} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;