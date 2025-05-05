import React, { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  IconButton,
  Divider,
  Chip,
  Stack,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import styles from './ProductModal.module.css'; // Import your CSS module

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: '800px',
  maxHeight: '90vh', // Limita a altura máxima do modal
  bgcolor: 'background.paper',
  boxShadow: 24,
  borderRadius: '12px',
  p: 4,
  outline: 'none',
  overflowY: 'auto', // Adiciona rolagem vertical
};

function ProductModal({ open, onClose, product, addToCart }) {
  if (!open || !product) return null; 

  const [selectedColor, setSelectedColor] = useState(product.variations?.[0]?.color || null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    const selectedVariation = product.variations.find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );

    if (selectedVariation) {
      const productWithDetails = {
        ...product,
        price: product.salePrice,
        variation: selectedVariation,
        quantity: quantity,
      };
      addToCart(productWithDetails);
      onClose();
    }
  };

  const availableSizes = product.variations
    .filter((v) => v.color === selectedColor)
    .map((v) => v.size);

  const availableColors = [...new Set(product.variations.map((v) => v.color))];

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight="bold">
            {product.name}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={4}>
          {/* Carrossel de Imagens */}
          <Grid item xs={12} md={6}>
            <Swiper
              modules={[Navigation, Pagination]}
              spaceBetween={10}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              style={{
                width: '100%',
                borderRadius: '8px',
              }}
            >
              {product.imageUrls.map((imageUrl, index) => (
                <SwiperSlide key={index}>
                  <img
                    src={imageUrl}
                    alt={`${product.name} - Imagem ${index + 1}`}
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '8px',
                    }}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </Grid>

          {/* Detalhes do Produto */}
          <Grid item xs={12} md={6} className={styles.productDetails}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {product.description}
            </Typography>

            <Typography variant="h4" fontWeight="bold" gutterBottom>
              R$ {product.salePrice.toFixed(2)}
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Cor:
              </Typography>
              <Stack direction="row" spacing={1}>
                {availableColors.map((color, index) => (
                  <Chip
                    key={index}
                    label={color}
                    onClick={() => setSelectedColor(color)}
                    variant={selectedColor === color ? 'filled' : 'outlined'}
                    color="primary"
                    sx={{
                      cursor: 'pointer',
                      fontWeight: selectedColor === color ? 'bold' : 'normal',
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {selectedColor && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Tamanho:
                </Typography>
                <Stack direction="row" spacing={1}>
                  {availableSizes.map((size, index) => (
                    <Chip
                      key={index}
                      label={size}
                      onClick={() => setSelectedSize(size)}
                      variant={selectedSize === size ? 'filled' : 'outlined'}
                      color="primary"
                      sx={{
                        cursor: 'pointer',
                        fontWeight: selectedSize === size ? 'bold' : 'normal',
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Quantidade:
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  sx={{ width: '100px' }}
                >
                  {[...Array(10).keys()].map((num) => (
                    <MenuItem key={num + 1} value={num + 1}>
                      {num + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Button
              variant="contained"
              color="primary"
              onClick={handleAddToCart}
              fullWidth
              disabled={!selectedColor || !selectedSize}
              sx={{ py: 1.5, fontWeight: 'bold', fontSize: '1rem' }}
            >
              Adicionar ao Carrinho
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
}

export default ProductModal;
