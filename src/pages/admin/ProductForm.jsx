import React from 'react';
import { Grid, TextField, Button, Box, Typography, Divider, Chip, Paper } from "@mui/material";
import { Add, CheckCircle, Cancel } from "@mui/icons-material";
import { serverTimestamp } from "firebase/firestore";

const ProductForm = ({ newProduct, editingProduct, handleInputChange, addVariation, handleVariationChange, saveProduct, resetForm }) => {
  const handleSaveProduct = async () => {
    try {
      const newProductData = {
        ...newProduct,
        createdAt: serverTimestamp(), // Adiciona o timestamp no momento da criação
      };
      await addDoc(collection(db, "products"), newProductData);
      showToast("Produto adicionado com sucesso!", "success");
      resetForm();
    } catch (error) {
      showToast("Erro ao salvar produto", "error");
    }
  };

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Accordion defaultExpanded elevation={0}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" fontWeight="600">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </Typography>
          </AccordionSummary>
          
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Seções do formulário melhoradas com ícones e divisores */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Label fontSize="small" color="primary"/>
                  <Typography variant="subtitle1" color="primary">Informações Básicas</Typography>
                </Box>
                <Grid container spacing={2}>
                  {/* Campos existentes */}
                  {["sku", "barcode", "name", "category"].map((field) => (
                    <Grid item xs={12} md={6} key={field}>
                      <TextField
                        label={field === 'sku' ? 'SKU' : field.charAt(0).toUpperCase() + field.slice(1)}
                        name={field}
                        value={newProduct[field]}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        variant="filled"
                      />
                    </Grid>
                  ))}
                  {/* Campo de descrição do produto */}
                  <Grid item xs={12}>
                    <TextField
                      label="Descrição do Produto"
                      name="description"
                      value={newProduct.description}
                      onChange={handleInputChange}
                      fullWidth
                      multiline
                      minRows={3}
                      size="small"
                      variant="filled"
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 3 }}/>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Paid fontSize="small" color="primary"/>
                  <Typography variant="subtitle1" color="primary">Preços e Dimensões</Typography>
                </Box>
                <Grid container spacing={2}>
                  {["costPrice", "salePrice", "discount", "weight"].map((field) => (
                    <Grid item xs={4} key={field}>
                      <TextField
                        label={
                          field === "costPrice"
                            ? "Preço de Custo"
                            : field === "salePrice"
                              ? "Preço de Venda"
                              : field === "discount"
                                ? "Desconto (%)"
                                : "Peso"
                        }
                        name={field}
                        value={newProduct[field]}
                        onChange={handleInputChange}
                        fullWidth
                        type={field === "discount" || field === "costPrice" || field === "salePrice" ? "number" : "text"}
                        InputProps={{
                          startAdornment: field.includes("Price") && "R$",
                        }}
                        size="small"
                        inputProps={{ min: 0, max: field === "discount" ? 100 : undefined }}
                      />
                    </Grid>
                  ))}
                  {["length", "width", "height"].map((dim) => (
                    <Grid item xs={4} key={dim}>
                      <TextField
                        label={`Dimensão (${dim})`}
                        name={dim}
                        value={newProduct.dimensions[dim]}
                        onChange={e => setNewProduct(prev => ({
                          ...prev,
                          dimensions: { ...prev.dimensions, [dim]: e.target.value }
                        }))}
                        fullWidth
                        type="number"
                        size="small"
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Seção de Ações do Formulário */}
              <Grid item xs={12}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  justifyContent: 'flex-end',
                  borderTop: 1,
                  borderColor: 'divider',
                  pt: 3
                }}>
                  {editingProduct && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={resetForm}
                    >
                      Cancelar Edição
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    startIcon={editingProduct ? <CheckCircle /> : <Add />}
                    onClick={handleSaveProduct}
                    sx={{ minWidth: 200 }}
                  >
                    {editingProduct ? 'Confirmar Alterações' : 'Adicionar Produto'}
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

export default ProductForm;