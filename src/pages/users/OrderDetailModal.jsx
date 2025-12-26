import React from 'react';
import styles from './OrderDetailModal.module.css';
import { FaTimes, FaBox, FaTruck, FaCreditCard, FaMapMarkerAlt } from 'react-icons/fa';

const OrderDetailModal = ({ order, onClose }) => {
  if (!order) return null;

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

  const { text: statusText, style: statusStyle } = getOrderStatus(order.status);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Detalhes do Pedido</h2>
          <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.orderDetails}>
            <div><strong>Pedido:</strong> #{order.id.slice(0, 8)}</div>
            <div><strong>Data:</strong> {order.date}</div>
            <div className={`${styles.status} ${statusStyle}`}>{statusText}</div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}><FaBox /> Itens do Pedido</h3>
            {order.items.map((item, index) => (
              <div key={index} className={styles.orderItem}>
                <img src={item.imageUrls?.[0]} alt={item.name} className={styles.itemImage} />
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemQuantity}>{item.quantity} x R$ {item.price.toFixed(2)}</span>
                </div>
                <span className={styles.itemTotal}>R$ {(item.quantity * item.price).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className={styles.sectionGrid}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}><FaTruck /> Entrega</h3>
              {order.trackingNumber && (
                <p>
                  <strong>Rastreamento:</strong>{' '}
                  <a className={styles.trackingBadge} href={`https://www.linkcorreios.com.br/${order.trackingNumber}`} target="_blank" rel="noopener noreferrer">
                    <span className={styles.trackingBadgeIcon} />
                    {order.trackingNumber}
                  </a>
                </p>
              )}
              <p><strong>Endereço:</strong> {order.userData?.street}, {order.userData?.number} - {order.userData?.city}/{order.userData?.state}</p>
            </div>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}><FaCreditCard /> Pagamento</h3>
              <p><strong>Método:</strong> {order.paymentMethod}</p>
              <p><strong>Total:</strong> <span className={styles.grandTotal}>R$ {order.total.toFixed(2)}</span></p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;