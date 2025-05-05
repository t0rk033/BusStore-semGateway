import React, { createContext, useState, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import styles from './Toast.module.css';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        type,
        autoClose: options.autoClose !== false,
        closeButton: options.closeButton !== false,
        ...options
      }
    ]);

    // Fechamento automático se configurado
    if (options.autoClose !== false) {
      const duration = typeof options.autoClose === 'number' 
        ? options.autoClose 
        : 5000;
        
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`${styles.toast} ${styles[toast.type]}`}
          >
            <div className={styles.toastMessage}>{toast.message}</div>
            {toast.closeButton && (
              <button 
                className={styles.closeButton}
                onClick={() => dismissToast(toast.id)}
                aria-label="Fechar notificação"
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useToast = () => {
  return useContext(ToastContext);
};