import React from 'react';
import styles from './FloatingCard.module.css';

const FloatingCard = ({ message, onClose }) => {
  return (
    <div className={styles.floatingCard}>
      <div className={styles.cardContent}>
        <p>{message}</p>
        <button onClick={onClose} className={styles.closeButton}>
          &times;
        </button>
      </div>
    </div>
  );
};

export default FloatingCard;