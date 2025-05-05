import React from "react";
import {
  Typography,
  Box,
  Grid,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { LocalShipping, ExpandMore } from "@mui/icons-material";

const OrderPrintContent = ({ sale }) => {
  return (
    <Box className="printable-content">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="subtitle2" color="textSecondary">
            #{sale.id.slice(0, 8).toUpperCase()} •{" "}
            {sale.date?.toLocaleDateString("pt-BR")} (
            {Math.round((new Date() - sale.date) / (1000 * 60 * 60 * 24))} dias
            atrás)
          </Typography>
          <Typography variant="body1" fontWeight="500">
            {sale.user?.details.fullName || "Cliente não identificado"}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {sale.items.length} itens • R$ {sale.total.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2">Detalhes do Pedido</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Informações do Cliente
              </Typography>
              <Typography variant="body1">
                <strong>Nome:</strong> {sale.user?.details.fullName || "N/A"}
              </Typography>
              <Typography variant="body1">
                <strong>CPF:</strong> {sale.user?.details.cpf || "N/A"}
              </Typography>
              <Typography variant="body1">
                <strong>Telefone:</strong> {sale.user?.details.phone || "N/A"}
              </Typography>
              <Typography variant="body1">
                <strong>Endereço:</strong>{" "}
                {sale.user?.details.address.street || "N/A"}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Itens do Pedido
              </Typography>
              {sale.items.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Avatar src={item.imageUrl} variant="rounded" />
                  <Box>
                    <Typography variant="body1">{item.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Quantidade: {item.quantity} • Preço: R${" "}
                      {item.price.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default OrderPrintContent;