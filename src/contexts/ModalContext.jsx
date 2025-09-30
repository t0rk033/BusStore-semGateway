import React, { createContext, useContext, useState } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  const openLogin = () => setLoginOpen(true);
  const closeLogin = () => setLoginOpen(false);

  const openSignup = () => {
    setSignupOpen(true);
    // se necessário, fechar o login ao abrir o signup
    setLoginOpen(false);
  };
  const closeSignup = () => setSignupOpen(false);

  return (
    <ModalContext.Provider value={{
      loginOpen, openLogin, closeLogin,
      signupOpen, openSignup, closeSignup
    }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used inside ModalProvider');
  return ctx;
}