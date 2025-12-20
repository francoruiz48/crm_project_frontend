import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/common/mainLayout';
import { example } from './components/common/example';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" Component={example} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;