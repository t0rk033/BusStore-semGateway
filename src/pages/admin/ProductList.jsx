import React from 'react';
import { Grid, Card, CardContent, Typography, Button, Box, Avatar, LinearProgress, Chip } from "@mui/material";
import { Edit, Delete, PhotoCamera } from "@mui/icons-material";

const ProductList = ({ products, startEditing, deleteProduct }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
          Lista de Produtos
          <Chip 
            label={`${products.length} itens`} 
            size="small" 
            sx={{ ml: 2, bgcolor: 'action.selected' }} 
          />
        </Typography>
        
        <Grid container spacing={3}>
          {products.map(product => {
            const totalStock = product.variations?.reduce((acc, curr) => acc + (curr.stock || 0), 0);
            const isLowStock = totalStock < product.minStock;

            return (
              <Grid item xs={12} sm={6} md={4} key={product.id}>
                <Card variant="outlined" sx={{ 
                  position: 'relative',
                  '&:hover': { boxShadow: 4 }
                }}>
                  {/* Chip de Baixo Estoque */}
                  {isLowStock && (
                    <Chip
                      label="Baixo Estoque"
                      color="error"
                      size="small"
                      sx={{ 
                        position: 'absolute', 
                        right: 16, 
                        top: 16,
                        fontWeight: 600
                      }}
                    />
                  )}
                  
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Avatar 
                        src={product.imageUrl} 
                        variant="rounded" 
                        sx={{ 
                          width: 80, 
                          height: 80,
                          bgcolor: 'background.paper'
                        }}
                      >
                        <PhotoCamera sx={{ color: 'text.disabled' }}/>
                      </Avatar>
                      
                      <Box>
                        <Typography variant="subtitle1" fontWeight="600">
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          SKU: {product.sku}
                        </Typography>
                        <Chip 
                          label={product.category} 
                          size="small" 
                          sx={{ 
                            mt: 1,
                            bgcolor: 'primary.light',
                            color: 'primary.dark'
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Barra de Progresso */}
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(totalStock / (product.minStock || 1)) * 100}
                        color={isLowStock ? 'error' : 'primary'}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        mt: 1
                      }}>
                        <Typography variant="caption">
                          Estoque: <strong>{totalStock}</strong>
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Mín: {product.minStock}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Botões de Ação */}
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 1,
                      '& .MuiButton-root': {
                        flex: 1,
                        py: 1
                      }
                    }}>
                      <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => startEditing(product)}
                        color="info"
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => deleteProduct(product.id)}
                      >
                        Excluir
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ProductList;