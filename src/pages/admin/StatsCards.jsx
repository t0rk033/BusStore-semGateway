import React from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography,
  useTheme,
  Box 
} from "@mui/material";
import { 
  TrendingUp, 
  Storage, 
  Warning 
} from "@mui/icons-material";

const StatsCards = ({ totalSales, products }) => {
  const theme = useTheme();

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {/* ...restante do código usando theme.palette */}
    </Grid>
  );
};

export default StatsCards;