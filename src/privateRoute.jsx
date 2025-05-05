import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "./firebase"; // Importe o auth do Firebase
import { onAuthStateChanged } from "firebase/auth";

const AdminRoute = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === "admin@busstore.com") {
        setIsAuthorized(true); // Permite acesso
      } else {
        setIsAuthorized(false); // Bloqueia acesso
      }
      setLoading(false); // Finaliza o carregamento
    });

    return () => unsubscribe(); // Limpa o listener ao desmontar
  }, []);

  if (loading) {
    return <div>Carregando...</div>; // Exibe um spinner ou mensagem de carregamento
  }

  // Se o usuário não estiver autorizado, redirecione para a página de acesso negado
  return isAuthorized ? children : <Navigate to="/unauthorized" />;
};

export default AdminRoute; // Exportação padrão