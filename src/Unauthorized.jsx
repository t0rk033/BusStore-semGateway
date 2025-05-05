import React from "react";
import { Typography, Box, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

function Unauthorized() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", flexDirection: "column" }}>
      <Typography variant="h4" color="error" sx={{ mb: 2 }}>
        Acesso Negado
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Você não tem permissão para acessar esta página.
      </Typography>
      <Button variant="contained" onClick={() => navigate("/")}>
        Voltar para a página inicial
      </Button>
    </Box>
  );
}

export default Unauthorized;