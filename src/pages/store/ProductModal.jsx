import React, { useMemo, useState } from "react";
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
import FavoriteIcon from "@mui/icons-material/Favorite";
import BlockIcon from "@mui/icons-material/Block";
import styles from "./ProductModal.module.css";

/** Container do modal */
const modalSx = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",

  /* Largura e altura em rem, com responsividade elegante */
  width: "clamp(56rem, 90vw, 72rem)",       // até 1152px
  maxHeight: "clamp(36rem, 90vh, 43.875rem)",// até 702px

  bgcolor: "background.paper",
  borderRadius: "1.25rem",   // 20px
  boxShadow: 24,
  padding: "1.5rem",         // ~24px
  outline: "none",
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
};

function getHexFromColorName(name = "") {
  const key = name.toLowerCase().trim();
  return COLOR_MAP[key] || key; // se já vier um hex, usamos direto
}

function formatPriceParts(value) {
  const [int, cents] = Number(value || 0).toFixed(2).split(".");
  return { int, cents };
}

export default function ProductModal({ open, onClose, product, addToCart }) {
  if (!open || !product) return null;

  const [favorite, setFavorite] = useState(false);
  const [selectedColor, setSelectedColor] = useState(
    product.variations?.[0]?.color || null
  );
  const [selectedSize, setSelectedSize] = useState(null);

  // Agrupa tamanhos por cor e identifica indisponíveis
  const sizesByColor = useMemo(() => {
    const map = {};
    (product.variations || []).forEach((v) => {
      const c = v.color;
      if (!map[c]) map[c] = [];
      if (v.inStock !== false) map[c].push(v.size); // inStock false = indisponível
    });
    return map;
  }, [product.variations]);

  const availableColors = useMemo(
    () => [...new Set((product.variations || []).map((v) => v.color))],
    [product.variations]
  );

  const availableSizes = useMemo(() => {
    if (!selectedColor) return [];
    return sizesByColor[selectedColor] || [];
  }, [selectedColor, sizesByColor]);

  const { int, cents } = formatPriceParts(product.salePrice);

  function handleAddToCart() {
    if (!selectedColor || !selectedSize) return;
    const selectedVariation = (product.variations || []).find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );
    if (!selectedVariation) return;
    const item = {
      ...product,
      price: product.salePrice,
      variation: selectedVariation,
      quantity: 1,
    };
    addToCart?.(item);
    onClose?.();
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

        <Grid container columnSpacing={4} rowSpacing={3}>
          {/* Imagem à esquerda */}
          <Grid item xs={12} md={5}>
            <div className={styles.imageWrap}>
              <img
                src={product.imageUrls?.[0]}
                alt={product.name}
                className={styles.image}
              />
            </div>
          </Grid>

          {/* Detalhes à direita */}
          <Grid item xs={12} md={7}>
            {/* Título */}
            <Typography className={styles.title}>{product.name}</Typography>

            {/* Descrição com scroll próprio */}
            <div className={styles.descBox} role="region" aria-label="Descrição">
              <Typography variant="body2" color="text.secondary">
                {product.description?.trim()
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
              {availableColors.map((c) => {
                const hasAnySize = (sizesByColor[c] || []).length > 0;
                const hex = getHexFromColorName(c);
                return (
                  <Tooltip key={c} title={c}>
                    <button
                      type="button"
                      className={[
                        styles.swatch,
                        selectedColor === c ? styles.swatchSelected : "",
                        !hasAnySize ? styles.disabled : "",
                        hex === "#FFFFFF" || hex === "white"
                          ? styles.swatchWithBorder
                          : "",
                      ].join(" ")}
                      style={{ backgroundColor: hex }}
                      onClick={() => hasAnySize && setSelectedColor(c)}
                      aria-pressed={selectedColor === c}
                      aria-label={`Cor ${c}`}
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
              {/* Supondo P, M, G, GG como base. Ajuste conforme seu catálogo */}
              {["PP", "P", "M", "G", "GG"].map((sz) => {
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
      </Box>
    </Modal>
  );
}
