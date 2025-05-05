import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registre os componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SalesStockReports = ({ sales, products }) => {
  // Verifica se há dados de vendas e produtos
  const hasSalesData = sales && sales.length > 0;
  const hasProductsData = products && products.length > 0;

  // Dados para o gráfico de vendas
  const salesData = {
    labels: hasSalesData
      ? sales.map((sale) => sale.date?.toLocaleDateString('pt-BR') || 'Data não disponível')
      : ['Nenhuma venda registrada'],
    datasets: [
      {
        label: 'Vendas Diárias',
        data: hasSalesData ? sales.map((sale) => sale.total) : [0],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };

  // Dados para o gráfico de estoque
  const stockData = {
    labels: hasProductsData
      ? products.map((product) => product.name || 'Produto sem nome')
      : ['Nenhum produto cadastrado'],
    datasets: [
      {
        label: 'Estoque Atual',
        data: hasProductsData
          ? products.map((product) =>
              product.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0)
            )
          : [0],
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div>
      <h2>Relatórios de Vendas e Estoque</h2>

      {/* Gráfico de Vendas */}
      <div>
        <h3>Vendas Diárias</h3>
        {hasSalesData ? (
          <Line data={salesData} />
        ) : (
          <p>Nenhuma venda registrada para exibir no gráfico.</p>
        )}
      </div>

      {/* Gráfico de Estoque */}
      <div>
        <h3>Estoque Atual</h3>
        {hasProductsData ? (
          <Bar data={stockData} />
        ) : (
          <p>Nenhum produto cadastrado para exibir no gráfico.</p>
        )}
      </div>
    </div>
  );
};

export default SalesStockReports;