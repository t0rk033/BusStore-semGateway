// components/SalesSummary.js
import React from "react";
import { Paper, Typography } from "@mui/material";
import styles from './StockManagement.module.css';

const SalesSummary = ({ totalSales }) => {
  return (
    <Paper className={styles.salesCard}>
      <Typography variant="h6" className={styles.salesTitle}>
        Total Vendido: R$ {totalSales.toFixed(2)}
      </Typography>
    </Paper>
  );
};

export default SalesSummary;