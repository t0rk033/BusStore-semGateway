import React from 'react';
import { HashRouter, Route, Routes, Navigate, BrowserRouter } from 'react-router-dom';
import { CartProvider } from 'react-use-cart'; // Importando o CartProvider
import Store from './pages/store/Store';
import Home from './pages/home/Home';
import StockManagement from './pages/admin/StockManagement';
import Reservations from './pages/reservations/Reservations';
import Login from './pages/login/Login';
import Signup from './pages/login/Signup';
import AdminHome from './pages/admin/adminHome';
import { AuthProvider } from './AuthContext';
import Profile from './pages/users/Profile';
import Unauthorized from './Unauthorized'; // Importe a página de acesso negado
import AdminRoute from './privateRoute'; // Importe o AdminRoute

function RoutesApp() {
  return (
    <AuthProvider>
      <CartProvider> {/* Envolvendo toda a aplicação */}
        <BrowserRouter>
          <Routes>
            <Route path='/' element={<Store />} />
            <Route path='loja' element={<Store />} />
            <Route
              path='/admin'
              element={
                <AdminRoute>
                  <StockManagement />
                </AdminRoute>
              }
            />
            {/* <Route path='/reservas' element={<Reservations />} /> */}
            <Route path='/login' element={<Login />} />
            <Route path="/registro" element={<Signup />} />
            <Route path='/admin-home' element={<AdminHome />} /> {/* Rota separada para AdminHome */}
            <Route path='/perfil' element={<Profile />} />
            <Route path='/unauthorized' element={<Unauthorized />} /> {/* Rota para acesso negado */}
            <Route path='*' element={<Navigate to="/" />} /> {/* Rota curinga para redirecionar */}
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default RoutesApp;