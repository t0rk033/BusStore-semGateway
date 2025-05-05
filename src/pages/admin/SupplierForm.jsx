import React from 'react';
import { Grid, TextField, Button, Box, Typography, Divider, Chip, Paper } from "@mui/material";
import { Add, CheckCircle, Cancel } from "@mui/icons-material";

const SupplierForm = ({ newSupplier, editingSupplier, handleSupplierInputChange, saveSupplier, resetSupplierForm }) => {
  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Accordion elevation={0}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" fontWeight="600">
              {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </Typography>
          </AccordionSummary>
          
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <BusinessIcon fontSize="small" color="primary"/>
                  <Typography variant="subtitle1" color="primary">Informações do Fornecedor</Typography>
                </Box>
                <Grid container spacing={2}>
                  {["name", "contact", "email", "phone", "address"].map((field) => (
                    <Grid item xs={12} md={6} key={field}>
                      <TextField
                        label={field.charAt(0).toUpperCase() + field.slice(1)}
                        name={field}
                        value={newSupplier[field]}
                        onChange={handleSupplierInputChange}
                        fullWidth
                        size="small"
                        variant="filled"
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  justifyContent: 'flex-end',
                  borderTop: 1,
                  borderColor: 'divider',
                  pt: 3
                }}>
                  {editingSupplier && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={resetSupplierForm}
                    >
                      Cancelar Edição
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    startIcon={editingSupplier ? <CheckCircle /> : <Add />}
                    onClick={saveSupplier}
                    sx={{ minWidth: 200 }}
                  >
                    {editingSupplier ? 'Salvar Alterações' : 'Adicionar Fornecedor'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default SupplierForm;