import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import styles from './profile.module.css';
import {
  FaUser, FaEnvelope, FaIdCard, FaPhone, FaBirthdayCake,
  FaMapMarkerAlt, FaEdit, FaSignOutAlt, FaShoppingBag,
  FaMoneyBillWave, FaCalendarAlt, FaBox, FaSave, FaTimes
} from 'react-icons/fa';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import OrderDetailModal from './OrderDetailModal';

function Profile() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'address', 'orders'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = doc(db, 'users', user.uid);
          const userSnapshot = await getDoc(userDoc);

          if (userSnapshot.exists()) {
            setUserData(userSnapshot.data());
          }
        } catch (error) {
          console.error('Erro ao carregar dados do usuário:', error);
          setMessage('Erro ao carregar dados do usuário');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    const fetchSalesHistory = async () => {
      if (user) {
        try {
          const salesQuery = query(
            collection(db, "sales"),
            where("userId", "==", user.uid),
            // orderBy("createdAt", "desc") // Descomente se tiver o índice
          );
          const salesSnapshot = await getDocs(salesQuery);

          const orders = salesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().createdAt?.toDate().toLocaleDateString("pt-BR"),
            total: doc.data().total,
            status: doc.data().status || "Pendente",
            items: doc.data().items || [],
            trackingNumber: doc.data().trackingNumber || null,
          }));

          // Ordenar por data de criação, que é mais confiável
          orders.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

          setSalesHistory(orders);
        } catch (error) {
          console.error("Erro ao carregar histórico de pedidos:", error);
          setMessage('Erro ao carregar histórico de pedidos');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchSalesHistory();
  }, [user]);

  const handleSave = async () => {
    try {
      const userDoc = doc(db, 'users', user.uid);
      await updateDoc(userDoc, userData);
      setMessage('Dados atualizados com sucesso!');
      setIsEditing(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Erro ao salvar alterações');
      console.error(error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value
      }
    }));
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const confirmDelivery = async (saleId) => {
    try {
      await updateDoc(doc(db, "sales", saleId), { status: "Entregue" });
      setSalesHistory((prev) =>
        prev.map((sale) =>
          sale.id === saleId ? { ...sale, status: "Entregue" } : sale
        )
      );
    } catch (error) {
      console.error("Erro ao confirmar entrega:", error);
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const getOrderStatus = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'pendente':
        return { text: 'Pedido em preparação', style: styles.processing };
      case 'enviado':
      case 'shipped':
        return { text: 'Enviado', style: styles.shipped };
      case 'entregue':
      case 'delivered':
        return { text: 'Entregue', style: styles.delivered };
      default:
        return { text: status || 'Pendente', style: styles.processing };
    }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (!userData) return <div className={styles.error}>{message}</div>;

  return (
    <>
      {isModalOpen && selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={handleCloseModal} />
      )}
    <div className={styles.pageContainer}>
      <NavBar />
      <div className={styles.profileContainer}>
        <header className={styles.profileHeader}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <FaUser size={40} />
                </div>
              )}
            </div>
            <div className={styles.userInfo}>
              <h1>{userData.fullName || 'Usuário'}</h1>
              <p>{user.email}</p>
            </div>
          </div>
          <button className={styles.signOutButton} onClick={handleSignOut}>
            <FaSignOutAlt /> Sair
          </button>
        </header>

        {message && <div className={styles.message}>{message}</div>}

        <nav className={styles.tabNavigation}>
          <button 
            className={`${styles.tab} ${activeTab === 'personal' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <FaUser /> Informações Pessoais
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'address' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('address')}
          >
            <FaMapMarkerAlt /> Endereço
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'orders' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <FaShoppingBag /> Pedidos ({salesHistory.length})
          </button>
        </nav>

        <div className={styles.tabContent}>
          {activeTab === 'personal' && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>Informações Pessoais</h2>
                {!isEditing ? (
                  <button
                    className={styles.editButton}
                    onClick={() => setIsEditing(true)}
                  >
                    <FaEdit /> Editar
                  </button>
                ) : (
                  <div className={styles.editActions}>
                    <button className={styles.saveButton} onClick={handleSave}>
                      <FaSave /> Salvar
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={() => setIsEditing(false)}
                    >
                      <FaTimes /> Cancelar
                    </button>
                  </div>
                )}
              </div>
              
              <div className={styles.formGrid}>
                <InfoField
                  icon={<FaIdCard />}
                  label="Nome Completo"
                  name="fullName"
                  value={userData.fullName}
                  editing={isEditing}
                  onChange={handleChange}
                />
                <InfoField
                  icon={<FaEnvelope />}
                  label="E-mail"
                  name="email"
                  value={user.email}
                  editing={false}
                  onChange={handleChange}
                  type="email"
                />
                <InfoField
                  icon={<FaIdCard />}
                  label="CPF"
                  name="cpf"
                  value={userData.cpf}
                  editing={isEditing}
                  onChange={handleChange}
                />
                <InfoField
                  icon={<FaPhone />}
                  label="Telefone"
                  name="phone"
                  value={userData.phone}
                  editing={isEditing}
                  onChange={handleChange}
                  type="tel"
                />
                <InfoField
                  icon={<FaBirthdayCake />}
                  label="Data de Nascimento"
                  name="birthDate"
                  value={userData.birthDate}
                  editing={isEditing}
                  onChange={handleChange}
                  type="date"
                />
              </div>
            </section>
          )}

          {activeTab === 'address' && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>Endereço</h2>
                {!isEditing ? (
                  <button
                    className={styles.editButton}
                    onClick={() => setIsEditing(true)}
                  >
                    <FaEdit /> Editar
                  </button>
                ) : (
                  <div className={styles.editActions}>
                    <button className={styles.saveButton} onClick={handleSave}>
                      <FaSave /> Salvar
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={() => setIsEditing(false)}
                    >
                      <FaTimes /> Cancelar
                    </button>
                  </div>
                )}
              </div>
              
              <div className={styles.formGrid}>
                <InfoField
                  label="CEP"
                  name="zipCode"
                  value={userData.address?.zipCode}
                  editing={isEditing}
                  onChange={handleAddressChange}
                  type="tel"
                />
                <InfoField
                  label="Rua"
                  name="street"
                  value={userData.address?.street}
                  editing={isEditing}
                  onChange={handleAddressChange}
                />
                <InfoField
                  label="Número"
                  name="number"
                  value={userData.address?.number}
                  editing={isEditing}
                  onChange={handleAddressChange}
                />
                <InfoField
                  label="Complemento"
                  name="complement"
                  value={userData.address?.complement}
                  editing={isEditing}
                  onChange={handleAddressChange}
                />
                <InfoField
                  label="Bairro"
                  name="neighborhood"
                  value={userData.address?.neighborhood}
                  editing={isEditing}
                  onChange={handleAddressChange}
                />
                <InfoField
                  label="Cidade"
                  name="city"
                  value={userData.address?.city}
                  editing={isEditing}
                  onChange={handleAddressChange}
                />
                <InfoField
                  label="Estado"
                  name="state"
                  value={userData.address?.state}
                  editing={isEditing}
                  onChange={handleAddressChange}
                />
              </div>
            </section>
          )}

          {activeTab === 'orders' && (
            <section className={styles.section}>
              <h2>Histórico de Pedidos</h2>
              {salesHistory.length === 0 ? (
                <div className={styles.emptyHistory}>
                  <FaShoppingBag size={48} />
                  <p>Nenhum pedido encontrado</p>
                </div>
              ) : (
                <div className={styles.ordersContainer}>
                  {salesHistory.map((order) => {
                    const { text: statusText, style: statusStyle } = getOrderStatus(order.status);
                    return (
                      <div key={order.id} className={styles.orderCard}>
                        <div className={styles.orderHeader}>
                          <div className={styles.orderMeta}>
                            <span className={styles.orderId}>Pedido #{order.id.slice(0, 8)}</span>
                            <span className={styles.orderDate}>
                              <FaCalendarAlt /> {order.date}
                            </span>
                          </div>
                          <div className={`${styles.status} ${statusStyle}`}>
                            {statusText}
                          </div>
                        </div>
                        <div className={styles.orderBody}>
                          <div className={styles.orderItems}>
                            {order.items.slice(0, 3).map((item, index) => (
                              <div key={index} className={styles.orderItem}>
                                <img src={item.imageUrls?.[0]} alt={item.name} className={styles.orderItemImage} />
                                <div className={styles.orderItemInfo}>
                                  <span className={styles.orderItemName}>{item.name}</span>
                                  <span className={styles.orderItemQuantity}>{item.quantity}x R$ {item.price.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <span className={styles.moreItems}>+ {order.items.length - 3} itens</span>
                            )}
                          </div>
                          <div className={styles.orderRightSection}>
                            <div className={styles.orderTotal}>
                              Total: <span>R$ {order.total.toFixed(2)}</span>
                            </div>
                            {order.trackingNumber && (
                                <div className={styles.trackingInfo}>
                                  <span className={styles.trackingLabel}>Rastreamento:</span>
                                  <a className={styles.trackingBadge} href={`https://www.linkcorreios.com.br/${order.trackingNumber}`} target="_blank" rel="noopener noreferrer">
                                    <span className={styles.trackingBadgeIcon} />
                                    {order.trackingNumber}
                                  </a>
                                </div>
                            )}
                            <div className={styles.orderActionButtons}>
                              {order.status?.toLowerCase() === 'enviado' && (
                                <button
                                  className={styles.confirmButton}
                                  onClick={() => confirmDelivery(order.id)}
                                >
                                  Confirmar Entrega
                                </button>
                              )}
                            <button className={styles.detailsButton} onClick={() => handleViewDetails(order)}>Ver Detalhes</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      <Footer />
    </div>
    </>
  );
}

const InfoField = ({ icon, label, name, value, editing, onChange, type = 'text' }) => (
  <div className={styles.field}>
    <label>
      {icon} {label}
    </label>
    {editing ? (
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        className={styles.input}
        placeholder={label}
      />
    ) : (
      <p className={styles.value}>{value || 'Não informado'}</p>
    )}
  </div>
);

export default Profile;