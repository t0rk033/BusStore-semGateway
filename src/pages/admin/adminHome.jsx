import React from 'react';
import styles from './AdminHome.module.css'; // Importando o CSS Module para estilos
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { PieChart, Pie, Legend } from 'recharts';
import StatsCards from './StatsCards';



// Componentes principais do Dashboard
const DashboardCard = ({ title, value }) => {
  return (
    <div className={styles.card}>
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
};

const Sidebar = () => {
  return (
    <div className={styles.sidebar}>
      <ul>
        <li>Dashboard</li>
        <li>Usuários</li>
        <li>Vendas</li>
        <li>Pedidos</li>
        <li>Produtos</li>
        <li>Configurações</li>
      </ul>
    </div>
  );
};

const Header = () => {
  return (
    <div className={styles.header}>
      <h1>Painel de Administração</h1>
      <div className={styles.userInfo}>
        <p>Bem-vindo, Admin</p>
      </div>
    </div>
  );
};

const AdminHome = () => {

    
  const data = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 200 },
    { name: 'Apr', value: 278 },
    { name: 'May', value: 189 },
  ];

  return (
    <div className={styles.dashboard}>
      <Sidebar />
      <div className={styles.content}>
        <Header />
        <StatsCards/>

        <div className={styles.charts}>
          <div className={styles.chartContainer}>
            <h3>Vendas Mensais</h3>
            <BarChart width={500} height={300} data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </div>

          <div className={styles.chartContainer}>
            <h3>Distribuição de Categorias</h3>
            <PieChart width={400} height={400}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label
              />
              <Legend />
            </PieChart>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
