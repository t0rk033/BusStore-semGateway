import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Box,
  Button,
  IconButton
} from "@mui/material";
import {
  Add,
  Delete
} from "@mui/icons-material";

// Componente separado para o formulário de categoria
const CategoryForm = ({ 
  editingCategory, 
  initialData,
  validationErrors, 
  onSave, 
  onReset 
}) => {
  // Estado LOCAL - completamente isolado
  const [localCategory, setLocalCategory] = useState(initialData);
  
  // Sincroniza quando initialData muda (edição)
  useEffect(() => {
    setLocalCategory(initialData);
  }, [initialData]);

  const handleSubcategoryChange = (index, value) => {
    const updatedSubcategories = [...localCategory.subcategories];
    updatedSubcategories[index] = value;
    setLocalCategory(prev => ({ ...prev, subcategories: updatedSubcategories }));
  };

  const handleAddSubcategory = () => {
    setLocalCategory(prev => ({
      ...prev,
      subcategories: [...prev.subcategories, ""]
    }));
  };

  const handleRemoveSubcategory = (index) => {
    const updatedSubcategories = localCategory.subcategories.filter((_, i) => i !== index);
    setLocalCategory(prev => ({ ...prev, subcategories: updatedSubcategories }));
  };

  const handleSave = () => {
    // Passa os dados locais para a função de save
    onSave(localCategory);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {editingCategory ? "Editar Categoria" : "Nova Categoria"}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Nome da Categoria"
              name="name"
              value={localCategory.name}
              onChange={(e) => setLocalCategory(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              error={!!validationErrors.categoryName}
              helperText={validationErrors.categoryName}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Subcategorias</Typography>
            {localCategory.subcategories.map((subcat, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <TextField
                  label={`Subcategoria ${index + 1}`}
                  value={subcat}
                  onChange={(e) => handleSubcategoryChange(index, e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ flex: 1 }}
                />
                <IconButton
                  onClick={() => handleRemoveSubcategory(index)}
                  size="small"
                  sx={{ flexShrink: 0 }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button 
              startIcon={<Add />} 
              onClick={handleAddSubcategory} 
              size="small"
              variant="outlined"
              sx={{ mt: 1 }}
            >
              Adicionar Subcategoria
            </Button>
          </Grid>
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            {editingCategory && (
              <Button variant="outlined" onClick={onReset}>
                Cancelar
              </Button>
            )}
            <Button variant="contained" onClick={handleSave}>
              {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default CategoryForm;