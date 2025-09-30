import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Routes from './routes'; // ajuste se necessário
import { ModalProvider, useModal } from './contexts/ModalContext';
import { LoginModal } from './pages/login/Login';
import { SignupModal } from './pages/login/Signup';

function AppContent() {
  const { loginOpen, closeLogin, signupOpen, closeSignup, openSignup, openLogin } = useModal();

  return (
    <BrowserRouter>
      <Routes />
      <LoginModal
        open={loginOpen}
        onClose={closeLogin}
        onSwitchToSignup={openSignup} // permite abrir signup a partir do Login
      />
      <SignupModal
        open={signupOpen}
        onClose={closeSignup}
        onSwitchToLogin={openLogin} // permite abrir login a partir do Signup
      />
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