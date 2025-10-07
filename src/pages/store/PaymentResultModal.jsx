import React from 'react';
import styles from './PaymentResultModal.module.css';

const PaymentResultModal = ({ result, onClose, onRetry }) => {
  if (!result) return null;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'approved':
        return {
          title: 'Pagamento Aprovado!',
          icon: '✅',
          className: styles.success,
          buttonText: 'Continuar',
          action: onClose,
        };
      case 'pending':
      case 'in_process':
      case 'authorized':
        return {
          title: 'Pagamento Pendente',
          icon: '⏳',
          className: styles.pending,
          message: result.message || 'Seu pagamento está sendo processado. Você receberá uma confirmação em breve.',
          buttonText: 'OK',
          action: onClose,
        };
      case 'rejected':
      case 'cancelled':
      case 'error':
      default:
        return {
          title: 'Pagamento Recusado',
          icon: '❌',
          className: styles.error,
          message: result.message || 'Não foi possível processar seu pagamento. Verifique os dados e tente novamente.',
buttonText: 'Tentar Novamente',
          action: onRetry,
        };
    }
  };

  const { title, icon, className, message, buttonText, action } = getStatusInfo(result.status);

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${className}`}>
        <div className={styles.icon}>{icon}</div>
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={action} className={styles.button}>
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default PaymentResultModal;