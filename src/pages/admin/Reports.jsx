import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  ButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TablePagination,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  startOfToday,
  endOfToday,
  subDays,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  format,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#842ca9', '#ca2c6b'];

const Reports = ({ sales, products }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const dateRanges = {
    '1d': { start: startOfToday(), end: endOfToday() },
    '7d': { start: subDays(startOfToday(), 6), end: endOfToday() },
    '30d': { start: subDays(startOfToday(), 29), end: endOfToday() },
    '1m': { start: startOfMonth(new Date()), end: endOfMonth(new Date()) },
  };

  const filteredSales = useMemo(() => {
    const { start, end } = dateRanges[timeRange];
    return sales.filter(sale => {
      const saleDate = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
      return isWithinInterval(saleDate, { start, end });
    });
  }, [sales, timeRange]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.total, 0);
    const totalOrders = filteredSales.length;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return { totalRevenue, totalOrders, averageTicket };
  }, [filteredSales]);

  const revenueTrend = useMemo(() => {
    const trend = {};
    filteredSales.forEach(sale => {
      const date = format(sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt), 'dd/MM');
      if (!trend[date]) {
        trend[date] = 0;
      }
      trend[date] += sale.total;
    });
    return Object.keys(trend).map(date => ({ date, revenue: trend[date] })).sort((a, b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')));
  }, [filteredSales]);

  const topProducts = useMemo(() => {
    const productCount = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        productCount[item.name] = (productCount[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(productCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));
  }, [filteredSales]);

  const salesByCategory = useMemo(() => {
    const categoryRevenue = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.id.split('-')[0]);
        const category = product?.category || 'Outros';
        categoryRevenue[category] = (categoryRevenue[category] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(categoryRevenue).map(([name, value]) => ({ name, value }));
  }, [filteredSales, products]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedSales = filteredSales.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="700">Relatórios</Typography>
        <ButtonGroup variant="outlined" aria-label="período do relatório">
          <Button onClick={() => setTimeRange('1d')} variant={timeRange === '1d' ? 'contained' : 'outlined'}>Hoje</Button>
          <Button onClick={() => setTimeRange('7d')} variant={timeRange === '7d' ? 'contained' : 'outlined'}>7 Dias</Button>
          <Button onClick={() => setTimeRange('30d')} variant={timeRange === '30d' ? 'contained' : 'outlined'}>30 Dias</Button>
          <Button onClick={() => setTimeRange('1m')} variant={timeRange === '1m' ? 'contained' : 'outlined'}>Este Mês</Button>
        </ButtonGroup>
      </Box>

      <Grid container spacing={3}>
        {/* KPIs */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Receita Total</Typography>
              <Typography variant="h4" component="div">R$ {stats.totalRevenue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Pedidos Realizados</Typography>
              <Typography variant="h4" component="div">{stats.totalOrders}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Ticket Médio</Typography>
              <Typography variant="h4" component="div">R$ {stats.averageTicket.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráficos */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Tendência de Receita</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `R$ ${value}`} />
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Receita" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Receita por Categoria</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={salesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {salesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Produtos Mais Vendidos</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" name="Quantidade Vendida" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Tabela de Vendas */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Vendas no Período</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>ID do Pedido</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {format(sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{sale.id.slice(0, 8)}</TableCell>
                        <TableCell>{sale.recipientName || sale.userEmail}</TableCell>
                        <TableCell align="right">R$ {sale.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={sale.status}
                            size="small"
                            color={
                              sale.status === 'approved' || sale.status === 'delivered' || sale.status === 'Entregue'
                                ? 'success'
                                : sale.status === 'pending'
                                ? 'warning'
                                : 'default'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={filteredSales.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Itens por página:"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;