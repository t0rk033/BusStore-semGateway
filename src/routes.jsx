import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { CartProvider } from 'react-use-cart';
import Store from './pages/store/Store';
import Home from './pages/home/Home';
import StockManagement from './pages/admin/StockManagement';
import Reservations from './pages/reservations/Reservations';
import Login, { LoginModal } from './pages/login/Login';
import Signup from './pages/login/Signup';
import AdminHome from './pages/admin/adminHome';
import { AuthProvider } from './AuthContext';
import Profile from './pages/users/Profile';
import Unauthorized from './Unauthorized';
import AdminRoute from './privateRoute';
import SearchResult from './components/SearchResults';

import { ModalProvider, useModal } from './contexts/ModalContext';
import Checkout from './pages/store/Checkout';

function ModalLayer() {
  const { loginOpen, closeLogin } = useModal();
  return <LoginModal open={loginOpen} onClose={closeLogin} />;
}

function RoutesApp() {
  return (
    <AuthProvider>
      <CartProvider>
        <ModalProvider>
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
              <Route path='/login' element={<Login />} />
              <Route path="/registro" element={<Signup />} />
              <Route path='/admin-home' element={<AdminHome />} />
              <Route path='/perfil' element={<Profile />} />
              <Route path='/unauthorized' element={<Unauthorized />} />
              <Route path='*' element={<Navigate to="/" />} />
              <Route path="/busca" element={<SearchResult />} />
              <Route path='/checkout' element={<Checkout/>}/>
            </Routes>

            {/* modal global renderizado dentro do Router */}
            <ModalLayer />
          </BrowserRouter>
        </ModalProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default RoutesApp;