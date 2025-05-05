// components/Header.js
import React from "react";
import { Box, Typography } from "@mui/material";
import { Inventory } from "@mui/icons-material";
import styles from './StockManagement.module.css';

const Header = () => {
  return (
    <Box className={styles.header}>
      <Inventory className={styles.headerIcon} />
      <Typography variant="h4" className={styles.title}>
        Gerenciamento de Estoque
      </Typography>
    </Box>
  );
};

export default Header;