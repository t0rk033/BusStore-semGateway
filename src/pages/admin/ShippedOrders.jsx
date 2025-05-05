import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Paper, 
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import { 
  LocalShipping, 
  CheckCircle, 
  ExpandMore,
  Person,
  Phone,
  Email,
  Place,
  ShoppingCart
} from '@mui/icons-material';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import styles from './StockManagement.module.css';

function ShippedOrders() {
  const [shippedSales, setShippedSales] = useState([]);

  useEffect(() => {
    const fetchShippedSales = async () => {
      const salesQuery = await getDocs(collection(db, "sales"));
      const salesData = await Promise.all(salesQuery.docs.map(async (doc) => {
        const saleData = doc.data();
        if (saleData.shipped) {
          const clientQuery = await getDocs(collection(db, "sales", doc.id, "client"));
          const clientData = clientQuery.docs.map(clientDoc => clientDoc.data())[0];

          let addressData = {};
          if (clientQuery.docs.length > 0) {
            const addressQuery = await getDocs(collection(db, "sales", doc.id, "client", clientQuery.docs[0].id, "address"));
            addressData = addressQuery.docs.map(addressDoc => addressDoc.data())[0];
          }

          return {
            id: doc.id,
            ...saleData,
            date: saleData.date?.toDate(),
            client: clientData,
            address: addressData
          };
        }
        return null;
      }));

      setShippedSales(salesData.filter(sale => sale !== null));
    };

    fetchShippedSales();
  }, []);

  return (
    <div className={styles.container}>
      <Box sx={{ 
        p: 4, 
        maxWidth: 1440, 
        margin: 'auto', 
        bgcolor: 'background.default',
        '& .MuiCard-root': { borderRadius: 4 },
        '& .MuiPaper-root': { borderRadius: 4 }
      }}>
        {/* Header Section */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalShipping sx={{ 
              fontSize: 40, 
              color: 'var(--primary-color)',
              bgcolor: 'var(--primary-light)',
              p: 1.5,
              borderRadius: 4
            }}/>
            <Typography variant="h4" fontWeight="700">Pedidos Enviados</Typography>
          </Box>
          
          <Chip 
            label={`${shippedSales.length} envios realizados`}
            color="success"
            variant="outlined"
            icon={<CheckCircle fontSize="small"/>}
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {/* Orders List */}
        <Card variant="outlined">
          <CardContent>
            {shippedSales.length === 0 ? (
              <Typography 
                variant="body1" 
                sx={{ 
                  textAlign: 'center', 
                  color: 'var(--text-secondary)',
                  p: 4
                }}
              >
                Nenhum pedido enviado encontrado
              </Typography>
            ) : (
              <Box sx={{ 
                maxHeight: 600, 
                overflow: 'auto',
                '& > *:not(:last-child)': { mb: 2 }
              }}>
                {shippedSales.map(sale => (
                  <Paper 
                    key={sale.id} 
                    variant="outlined"
                    sx={{
                      p: 3,
                      borderColor: 'var(--accent-color)',
                      '&:hover': { boxShadow: 4 }
                    }}
                  >
                    {/* Order Header */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 2
                    }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'var(--text-secondary)',
                          fontWeight: 500
                        }}
                      >
                        #{sale.id.slice(0,8).toUpperCase()} • {sale.date?.toLocaleDateString('pt-BR')}
                      </Typography>
                      <Chip
                        label="Enviado"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>

                    {/* Client Info */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Person sx={{ color: 'var(--primary-color)' }}/>
                        <Typography variant="body1" fontWeight="600">
                          {sale.client?.name}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Email fontSize="small" sx={{ color: 'var(--text-secondary)' }}/>
                          <Typography variant="body2">{sale.client?.email}</Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone fontSize="small" sx={{ color: 'var(--text-secondary)' }}/>
                          <Typography variant="body2">{sale.client?.phone}</Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }}/>

                    {/* Address Section */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Place sx={{ color: 'var(--primary-color)' }}/>
                        <Typography variant="body2" fontWeight="600">
                          Endereço de Entrega
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        {sale.address?.street}, {sale.address?.number} - {sale.address?.neighborhood}<br/>
                        {sale.address?.city} - {sale.address?.state}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }}/>

                    {/* Order Details */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <ShoppingCart sx={{ color: 'var(--primary-color)' }}/>
                        <Typography variant="body2" fontWeight="600">
                          Itens do Pedido
                        </Typography>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr auto', 
                        gap: 2,
                        '& > *': { py: 0.5 }
                      }}>
                        {sale.items.map((item, index) => (
                          <React.Fragment key={index}>
                            <Typography variant="body2">
                              {item.name} ({item.quantity}x)
                            </Typography>
                            <Typography variant="body2" textAlign="right">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </Typography>
                          </React.Fragment>
                        ))}
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }}/>

                    {/* Order Total */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center'
                    }}>
                      <Typography variant="body2" fontWeight="600">
                        Total do Pedido
                      </Typography>
                      <Typography variant="h6" fontWeight="700">
                        R$ {sale.total.toFixed(2)}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </div>
  );
}

export default ShippedOrders;