import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Produtos from '@/pages/Produtos';
import Vendas from '@/pages/Vendas';
import Caixa from '@/pages/Caixa';
import Estoque from '@/pages/Estoque';
import Relatorios from '@/pages/Relatorios';
import Usuarios from '@/pages/Usuarios';
import Logs from '@/pages/Logs';
import FormasPagamento from '@/pages/FormasPagamento';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* PDV — fullscreen, no AppLayout */}
          <Route path="/vendas" element={
            <ProtectedRoute recurso="vendas"><Vendas /></ProtectedRoute>
          } />

          {/* Protected routes with AppLayout — AppLayout already renders <Outlet /> */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/produtos" element={<ProtectedRoute recurso="produtos"><Produtos /></ProtectedRoute>} />
            <Route path="/caixa" element={<ProtectedRoute recurso="caixa"><Caixa /></ProtectedRoute>} />
            <Route path="/caixa/:id" element={<ProtectedRoute recurso="caixa"><Caixa /></ProtectedRoute>} />
            <Route path="/estoque" element={<ProtectedRoute recurso="estoque"><Estoque /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute recurso="relatorios"><Relatorios /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute recurso="usuarios"><Usuarios /></ProtectedRoute>} />
            <Route path="/formas-pagamento" element={<ProtectedRoute recurso="formas_pagamento"><FormasPagamento /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute recurso="logs"><Logs /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
