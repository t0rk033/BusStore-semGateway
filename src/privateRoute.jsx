import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "./firebase"; // Importe o auth e o db do Firebase
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AdminRoute = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Busca o documento do usuário no Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().role === "admin") {
            setIsAuthorized(true); // Permite acesso se o papel for "admin"
          } else {
            setIsAuthorized(false); // Bloqueia acesso se o papel não for "admin"
          }
        } catch (error) {
          console.error("Erro ao verificar o papel do usuário:", error);
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false); // Bloqueia acesso se não houver usuário autenticado
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

export default AdminRoute;