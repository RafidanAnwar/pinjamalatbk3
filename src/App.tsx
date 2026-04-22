import { HashRouter, Routes, Route } from 'react-router-dom';
import FormPeminjaman from './pages/FormPeminjaman';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <>
      <HashRouter>
        <Routes>
          <Route path="/" element={<FormPeminjaman />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </HashRouter>
      <Toaster />
    </>
  );
}

export default App;
