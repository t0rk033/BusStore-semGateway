import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  TextField,
  Paper,
  Chip,
} from '@mui/material';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  format, parseISO, isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, ShoppingCart, AttachMoney, Receipt } from '@mui/icons-material';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="subtitle2">{label}</Typography>
        {payload.map((p, i) => (
          <Typography key={i} variant="body2" sx={{ color: p.color }}>
            {p.name}: {p.formatter ? p.formatter(p.value) : p.value}
          </Typography>
        ))}
      </Paper>
    );
  }
  return null;
};

const SalesStockReports = ({ sales, products }) => {
  const [period, setPeriod] = useState('week');
  const [customDate, setCustomDate] = useState({
    start: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    end: format(endOfWeek(new Date()), 'yyyy-MM-dd'),
  });

  const handlePeriodChange = (event, newValue) => {
    setPeriod(newValue);
    const now = new Date();
    if (newValue === 'day') {
      setCustomDate({ start: format(startOfDay(now), 'yyyy-MM-dd'), end: format(endOfDay(now), 'yyyy-MM-dd') });
    } else if (newValue === 'week') {
      setCustomDate({ start: format(startOfWeek(now), 'yyyy-MM-dd'), end: format(endOfWeek(now), 'yyyy-MM-dd') });
    } else if (newValue === 'month') {
      setCustomDate({ start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') });
    }
  };

  const filteredSales = useMemo(() => {
    const start = parseISO(customDate.start);
    const end = parseISO(customDate.end);
    return sales.filter(sale => {
      const saleDate = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
      return isWithinInterval(saleDate, { start, end });
    });
  }, [sales, customDate]);

  const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.total, 0);
  const totalOrders = filteredSales.length;
  const totalItemsSold = filteredSales.reduce((acc, sale) => acc + sale.items.reduce((iAcc, item) => iAcc + item.quantity, 0), 0);
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const salesByPeriod = useMemo(() => {
    const formatType = period === 'day' ? 'HH:00' : 'dd/MM';
    const salesMap = new Map();
    filteredSales.forEach(sale => {
      const date = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
      const key = format(date, formatType, { locale: ptBR });
      salesMap.set(key, (salesMap.get(key) || 0) + sale.total);
    });
    return Array.from(salesMap, ([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales, period]);

  const topProducts = useMemo(() => {
    const productMap = new Map();
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        productMap.set(item.name, (productMap.get(item.name) || 0) + item.quantity);
      });
    });
    return Array.from(productMap, ([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredSales]);

  const salesByCategory = useMemo(() => {
    const categoryMap = new Map();
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.id.split('-')[0]);
        const category = product?.category || 'Outros';
        categoryMap.set(category, (categoryMap.get(category) || 0) + (item.price * item.quantity));
      });
    });
    return Array.from(categoryMap, ([name, value]) => ({ name, value }));
  }, [filteredSales, products]);

  const lowStockProducts = products.filter(p => {
    const totalStock = p.variations.reduce((acc, v) => acc + v.stock, 0);
    return totalStock > 0 && totalStock <= p.minStock;
  }).slice(0, 5);

  const MetricCard = ({ title, value, icon, color }) => (
    <Card sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
      <Box sx={{ bgcolor: `${color}.light`, p: 2, borderRadius: '50%', mr: 2, color: `${color}.main` }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h6" fontWeight="700">{value}</Typography>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
      </Box>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight="700" sx={{ mb: 4 }}>Relatórios</Typography>

      <Paper sx={{ mb: 4 }}>
        <Tabs value={period} onChange={handlePeriodChange} centered>
          <Tab label="Hoje" value="day" />
          <Tab label="Esta Semana" value="week" />
          <Tab label="Este Mês" value="month" />
          <Tab label="Personalizado" value="custom" />
        </Tabs>
        {period === 'custom' && (
          <Box sx={{ p: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <TextField type="date" label="Início" value={customDate.start} onChange={e => setCustomDate(prev => ({ ...prev, start: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField type="date" label="Fim" value={customDate.end} onChange={e => setCustomDate(prev => ({ ...prev, end: e.target.value }))} InputLabelProps={{ shrink: true }} />
          </Box>
        )}
      </Paper>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}><MetricCard title="Total de Vendas" value={`R$ ${totalRevenue.toFixed(2)}`} icon={<AttachMoney />} color="success" /></Grid>
        <Grid item xs={12} sm={6} md={3}><MetricCard title="Pedidos Realizados" value={totalOrders} icon={<Receipt />} color="info" /></Grid>
        <Grid item xs={12} sm={6} md={3}><MetricCard title="Ticket Médio" value={`R$ ${averageTicket.toFixed(2)}`} icon={<TrendingUp />} color="primary" /></Grid>
        <Grid item xs={12} sm={6} md={3}><MetricCard title="Itens Vendidos" value={totalItemsSold} icon={<ShoppingCart />} color="warning" /></Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Vendas por Período</Typography>
              <ResponsiveContainer>
                <AreaChart data={salesByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={val => `R$ ${val}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Receita" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Vendas por Categoria</Typography>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={salesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {salesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={val => `R$ ${val.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Top 5 Produtos Mais Vendidos</Typography>
              <ResponsiveContainer>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={150} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantity" name="Quantidade" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Produtos com Estoque Baixo</Typography>
              <Box sx={{ overflowY: 'auto', height: 'calc(100% - 30px)' }}>
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.map(p => (
                    <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                      <Typography variant="body2">{p.name}</Typography>
                      <Chip label={`Restam: ${p.variations.reduce((acc, v) => acc + v.stock, 0)}`} color="warning" size="small" />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    Nenhum produto com estoque baixo.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SalesStockReports;