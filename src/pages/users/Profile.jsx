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

function Profile() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'address', 'orders'
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
            where("user.uid", "==", user.uid)
          );
          const salesSnapshot = await getDocs(salesQuery);

          const orders = salesSnapshot.docs.map((doc) => ({
            id: doc.id,
            date: doc.data().date?.toDate().toLocaleDateString("pt-BR"),
            total: doc.data().total,
            status: doc.data().status || "Pendente",
            items: doc.data().items || [],
          }));

          setSalesHistory(orders.sort((a, b) => new Date(b.date) - new Date(a.date)));
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

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (!userData) return <div className={styles.error}>{message}</div>;

  return (
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
                  {salesHistory.map((order) => (
                    <div key={order.id} className={styles.orderCard}>
                      <div className={styles.orderHeader}>
                        <div className={styles.orderMeta}>
                          <span className={styles.orderId}>Pedido #{order.id.slice(0, 8)}</span>
                          <span className={styles.orderDate}>
                            <FaCalendarAlt /> {order.date}
                          </span>
                        </div>
                        <div
                          className={`${styles.status} ${
                            order.status === "Enviado"
                              ? styles.shipped
                              : order.status === "Entregue"
                              ? styles.delivered
                              : styles.processing
                          }`}
                        >
                          {order.status}
                        </div>
                        {order.status === "Enviado" && (
                          <button
                            className={styles.confirmButton}
                            onClick={() => confirmDelivery(order.id)}
                          >
                            Confirmar Entrega
                          </button>
                        )}
                      </div>
                      <div className={styles.orderItems}>
                        {order.items.map((item, index) => (
                          <div key={index} className={styles.orderItem}>
                            <span>{item.name}</span>
                            <span>{item.quantity}x</span>
                            <span>R$ {item.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className={styles.orderTotal}>
                        <FaMoneyBillWave /> Total: R$ {order.total.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      <Footer />
    </div>
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