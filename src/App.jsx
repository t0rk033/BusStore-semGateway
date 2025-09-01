import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Routes from './routes'; // ajuste se necessário
import { ModalProvider, useModal } from './contexts/ModalContext';
import { LoginModal } from './pages/login/Login';

function AppContent() {
  const { loginOpen, closeLogin } = useModal();

  return (
    <BrowserRouter>
      <Routes />
      <LoginModal open={loginOpen} onClose={closeLogin} />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ModalProvider>
      <AppContent />
    </ModalProvider>
  );
}