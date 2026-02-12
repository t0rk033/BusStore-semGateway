import React, { useMemo, useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  IconButton,
  Grid,
  Divider,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FavoriteIcon from "@mui/icons-material/Favorite";
import BlockIcon from "@mui/icons-material/Block";
import styles from "./ProductModal.module.css";
import colorNameToHex from '@uiw/react-color-name';

/** Container do modal */
/** Container do modal */
const modalSx = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  bgcolor: "background.paper",
  borderRadius: "1.25rem", // 20px
  boxShadow: 24,
  outline: "none",
  // Adiciona responsividade aqui
  '@media (max-width: 900px)': { // Para mobile/tablet, seguindo o seu breakpoint CSS
    width: '100vw',
    height: '100vh',
    maxHeight: '100vh',
    transform: 'none', // Remove a centralização
    top: 0,
    left: 0,
    borderRadius: 0,
    overflowY: 'scroll', // Permite rolagem total no mobile
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
};


const DEFAULT_DESC =
  "Produto de alta qualidade, feito com materiais selecionados para garantir conforto e durabilidade. Ideal para o dia a dia ou momentos de lazer.";

const COLOR_MAP = {
  preto: "#111111",
  black: "#111111",
  azul: "#0B3A75",
  blue: "#0B3A75",
  vermelho: "#C62828",
  red: "#C62828",
  verde: "#1E7E34",
  green: "#1E7E34",
  cinza: "#9E9E9E",
  gray: "#9E9E9E",
  branco: "#FFFFFF",
  white: "#FFFFFF",
  rosa: "#E91E63", // Pink
  pink: "#E91E63",
  laranja: "#FF9800", // Orange
  orange: "#FF9800",
  amarelo: "#FFEB3B", // Yellow
  yellow: "#FFEB3B",
  roxo: "#9C27B0", // Purple
  purple: "#9C27B0",
  marrom: "#795548", // Brown
  brown: "#795548",
  bege: "#F5F5DC", // Beige
  beige: "#F5F5DC",
  vinho: "#800000", // Maroon/Burgundy
  maroon: "#800000",
  dourado: "#FFD700", // Gold
  gold: "#FFD700",
  prata: "#C0C0C0", // Silver
  silver: "#C0C0C0",
  turquesa: "#40E0D0", // Turquoise
  turquoise: "#40E0D0",
};

function formatPriceParts(value) {
  const [int, cents] = Number(value || 0).toFixed(2).split(".");
  return { int, cents };
}

export default function ProductModal({ open, onClose, product, addToCart, onBuyNow }) {
  // Garantir que `product` nunca seja null (pode ser explicitamente passado como null pelo pai)
  product = product || {};
  const [favorite, setFavorite] = useState(false);
  const [selectedColor, setSelectedColor] = useState(
    product?.variations?.[0]?.color || null
  );
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Agrupa variações por combinação de cores
  const sizesByColor = useMemo(() => {
    const map = {};
    (product.variations || []).forEach((v) => {
      // A chave do mapa é uma string única para a combinação de cores
      const colorKey = (v.color || []).map(c => c.name).join(' / ');
      if (!colorKey) return;

      if (!map[colorKey]) {
        map[colorKey] = {
          colorArray: v.color, // Armazena o array de cores
          sizes: []
        };
      }
      if (v.stock > 0) map[colorKey].sizes.push(v.size);
    });
    return map;
  }, [product?.variations]);

  const availableColors = useMemo(
    // Retorna um array de arrays de objetos de cor únicos
    () => Object.values(sizesByColor).map(data => data.colorArray),
    [sizesByColor]
  );

  const availableSizes = useMemo(() => {
    if (!selectedColor) return [];
    const colorKey = selectedColor.map(c => c.name).join(' / ');
    return sizesByColor[colorKey]?.sizes || [];
  }, [selectedColor, sizesByColor]);

  // Obtém todos os tamanhos únicos possíveis para o produto, para renderizar os botões
  const allPossibleSizes = useMemo(() => {
    const sizes = new Set((product?.variations || []).map(v => v.size));
    const sortedSizes = Array.from(sizes);
    // Ordena os tamanhos para uma exibição consistente
    const sizeOrder = ["PP", "P", "M", "G", "GG", "XG", "Tamanho único"];
    sortedSizes.sort((a, b) => {
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return sortedSizes;
  }, [product?.variations]);
  // Reseta a imagem selecionada quando o produto muda
  useEffect(() => {
    setSelectedImageIndex(0);
    setSelectedColor(product?.variations?.[0]?.color || null);
    setSelectedSize(null); // Reseta o tamanho ao mudar de produto
  }, [product]);

  const { int, cents } = formatPriceParts(product?.salePrice);

  const handleNextImage = () => {
    setSelectedImageIndex((prevIndex) =>
      (prevIndex + 1) % (product?.imageUrls?.length || 1)
    );
  };

  const handlePrevImage = () => {
    setSelectedImageIndex((prevIndex) =>
      (prevIndex - 1 + (product?.imageUrls?.length || 1)) % (product?.imageUrls?.length || 1)
    );
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setSelectedSize(null); // Reseta o tamanho ao selecionar uma nova cor
    setSelectedImageIndex(0); // Volta para a primeira imagem da nova cor
  };
  
  const isColorSelected = (colorArray) => {
    if (!selectedColor || !colorArray) return false;
    if (selectedColor.length !== colorArray.length) return false;
    // Garante que ambos os itens são objetos com a propriedade 'name' antes de comparar
    return selectedColor.every((sc, i) => 
      sc && typeof sc === 'object' && colorArray[i] && typeof colorArray[i] === 'object' && sc.name === colorArray[i].name
    );
  };

  function handleAddToCart() {
    if (!selectedColor || !selectedSize) return;
    const selectedVariation = (product?.variations || []).find(
      (v) => v.size === selectedSize && isColorSelected(v.color)
    );
    if (!selectedVariation) return;
    const item = {
      ...product,
      price: product?.salePrice,
      variation: selectedVariation,
      quantity: 1,
    };
    addToCart?.(item);
    onClose?.();
  }

  function handleBuyNow() {
    if(ValidarLogin()){

      if (!selectedColor || !selectedSize) return;
      const selectedVariation = (product?.variations || []).find(
        (v) => v.size === selectedSize && isColorSelected(v.color)
      );
      if (!selectedVariation) return;
    const item = {
      ...product,
      price: product?.salePrice,
      variation: selectedVariation,
      quantity: 1,
    };
    // adiciona ao carrinho
    addToCart?.(item);
    // fecha modal
    onClose?.();
    // notifica o pai para navegar ao checkout
    onBuyNow?.(item);
  }else{
      alert("Faça login para comprar este produto.");
  }
  }

  function ValidarLogin(){
    // Lógica para validar o login do usuário
    const userIsLoggedIn = localStorage.getItem('userLogado') === 'true';
    if(!userIsLoggedIn){
      return false;
    }
    return true; // Retorna true se o usuário estiver logado, false caso contrário

  }

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalSx} className={styles.root}>
        {/* Ações flutuantes */}
        <IconButton
          aria-label="Fechar"
          className={styles.closeBtn}
          onClick={onClose}
          size="large"
        >
          <CloseIcon />
        </IconButton>

        <IconButton
          aria-label="Favoritar"
          className={styles.favBtn}
          onClick={() => setFavorite((v) => !v)}
          size="large"
        >
          {favorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
        </IconButton>

        {/* NOVO CONTAINER DE CONTEÚDO PARA ENVOLVER OS GRIDS */}
        {/* Usamos o estilo `contentContainer` no CSS para o layout mobile */}
        <div className={styles.contentContainer}>
          <Grid container columnSpacing={4} rowSpacing={3}>
          {/* Imagem à esquerda */}
          <Grid item xs={12} md={5}>
            <div className={styles.imageWrap}>
              <img
                src={product?.imageUrls?.[selectedImageIndex]}
                alt={product?.name}
                className={styles.image}
              />
              {product?.imageUrls && product.imageUrls.length > 1 && (
                <>
                  <IconButton className={`${styles.carouselArrow} ${styles.arrowLeft}`} onClick={handlePrevImage}>
                    <ArrowBackIosNewIcon />
                  </IconButton>
                  <IconButton className={`${styles.carouselArrow} ${styles.arrowRight}`} onClick={handleNextImage}>
                    <ArrowForwardIosIcon />
                  </IconButton>
                </>
              )}
            </div>
          </Grid>

          {/* Detalhes à direita */}
          <Grid item xs={12} md={7}>
            {/* Título */}
            <Typography className={styles.title}>{product?.name}</Typography>

            {/* Descrição com scroll próprio */}
            <div className={styles.descBox} role="region" aria-label="Descrição">
              <Typography variant="body2" color="text.secondary">
                {product?.description?.trim()
                  ? product.description
                  : DEFAULT_DESC}
              </Typography>
            </div>

            {/* Preço */}
            <div className={styles.priceRow}>
              <span className={styles.currency}>R$</span>
              <span className={styles.priceInt}>{int}</span>
              <sup className={styles.priceCents}>{cents}</sup>
            </div>

            <Divider className={styles.divider} />

            {/* Seleção de cor */}
            <Typography className={styles.sectionLabel}>
              Selecione a cor
            </Typography>
            <div className={styles.swatchRow}>
              {availableColors.map((colorArray) => {
                const colorKey = colorArray.map(c => c.name).join(' / ');
                const hasAnySize = (sizesByColor[colorKey]?.sizes || []).length > 0;
                const isSelected = isColorSelected(colorArray);
                const tooltipTitle = colorArray.map(c => c.name).join(' e ');

                const background = colorArray.length > 1
                  ? `linear-gradient(to right, ${colorArray[0].hex} 50%, ${colorArray[1].hex} 50%)`
                  : colorArray[0]?.hex || '#ffffff';
                
                const hasWhite = colorArray.some(c => c.hex === '#FFFFFF' || c.name?.toLowerCase() === 'white');

                return (
                  <Tooltip key={colorKey} title={tooltipTitle}>
                    <button
                      type="button"
                      className={[
                        styles.swatch,
                        isSelected ? styles.swatchSelected : "",
                        !hasAnySize ? styles.disabled : "",
                        hasWhite ? styles.swatchWithBorder : "",
                      ].join(" ")}
                      style={{ background }}
                      onClick={() => hasAnySize && handleColorSelect(colorArray)}
                      aria-pressed={isSelected}
                      aria-label={`Cor ${tooltipTitle}`}
                    />
                  </Tooltip>
                );
              })}
            </div>

            {/* Seleção de tamanho */}
            <Typography className={styles.sectionLabel} style={{ marginTop: 8 }}>
              Selecione o tamanho
            </Typography>
            <div className={styles.sizeRow}>
              {allPossibleSizes.map((sz) => {
                const enabled = availableSizes.includes(sz);
                const selected = selectedSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    className={[
                      styles.sizeBtn,
                      selected ? styles.sizeSelected : "",
                      !enabled ? styles.sizeDisabled : "",
                    ].join(" ")}
                    onClick={() => enabled && setSelectedSize(sz)}
                    aria-pressed={selected}
                    aria-label={`Tamanho ${sz}${enabled ? "" : " indisponível"}`}
                  >
                    {enabled ? sz : <BlockIcon fontSize="small" />}
                  </button>
                );
              })}
            </div>

            {/* Ações */}
            <div className={styles.actions}>
              <Button
                variant="contained"
                fullWidth
                className={styles.buyNow}
                disableElevation
                onClick={handleBuyNow}
                disabled={!selectedColor || !selectedSize}
              >
                Comprar agora
              </Button>
              <Button
                variant="outlined"
                fullWidth
                className={styles.addToCart}
                onClick={handleAddToCart}
                disabled={!selectedColor || !selectedSize}
              >
                Adicionar ao carrinho
              </Button>
            </div>
          </Grid>
          </Grid>
        </div>
      </Box>
    </Modal>
  );
}
