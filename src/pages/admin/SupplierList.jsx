import React from 'react';
import { Grid, Card, CardContent, Typography, Button, Box, Avatar, Chip, IconButton } from "@mui/material";
import { Edit, Delete, LinkIcon, ContactsIcon, BusinessIcon } from "@mui/icons-material";

const SupplierList = ({ suppliers, startEditingSupplier, deleteSupplier, products }) => {
  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
          Lista de Fornecedores
          <Chip 
            label={`${suppliers.length} cadastrados`} 
            size="small" 
            sx={{ ml: 2, bgcolor: 'action.selected' }} 
          />
        </Typography>
        
        <Grid container spacing={3}>
          {suppliers.map(supplier => {
            const suppliedProducts = products.filter(p => p.supplierId === supplier.id);
            
            return (
              <Grid item xs={12} md={6} key={supplier.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="600">
                          {supplier.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {supplier.contact}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton onClick={() => startEditingSupplier(supplier)}>
                          <Edit fontSize="small" color="info"/>
                        </IconButton>
                        <IconButton onClick={() => deleteSupplier(supplier.id)}>
                          <Delete fontSize="small" color="error"/>
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Chip
                        icon={<LinkIcon/>}
                        label={`Fornece ${suppliedProducts.length} produtos`}
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2">
                        <ContactsIcon fontSize="small" sx={{ mr: 1 }}/>
                        {supplier.email} | {supplier.phone}
                      </Typography>
                      <Typography variant="body2">
                        <BusinessIcon fontSize="small" sx={{ mr: 1 }}/>
                        {supplier.address}
                      </Typography>
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

export default SupplierList;