import React, { useState, useEffect } from 'react';
import styles from './PaymentModal.module.css';

function PaymentModal({ open, onClose, total, user, userData }) {
  const [mp, setMp] = useState(null);
  const [formInitialized, setFormInitialized] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Adicione esta função no seu PaymentModal
const processPayment = async (cardFormData) => {
  setProcessing(true);
  setErrorMessage('');
  setPaymentResult(null);

  try {
    const { token, issuer_id, payment_method_id } = cardFormData;

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/process-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        amount: total,
        description: `Compra na loja - Valor: R$ ${total.toFixed(2)}`,
        installments: 1, // Você pode adicionar seleção de parcelas se quiser
        payment_method_id,
        issuer_id,
        email: user?.email || '',
        identification_type: 'CPF',
        identification_number: userData?.cpf || '',
        items: [] // Você pode passar os itens se necessário no backend
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao processar pagamento');
    }

    setPaymentResult(data);
    
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    setPaymentResult({
      status: 'error',
      message: error.message || 'Erro ao processar pagamento',
      details: 'Tente novamente ou entre em contato com nosso suporte.'
    });
  } finally {
    setProcessing(false);
  }
};
  // Mapeamento completo de mensagens
  const paymentStatusConfig = {
    // Status aprovados
    approved: {
      icon: '✅',
      title: 'Pagamento Aprovado!',
      color: 'var(--success-color)',
      description: (result) => result.description || 'Seu pagamento foi aprovado com sucesso!',
      showDetails: true
    },
    
    // Status pendentes
    pending: {
      icon: '🔄',
      title: 'Pagamento Pendente',
      color: 'var(--warning-color)',
      description: (result) => result.description || 'Seu pagamento está sendo processado.',
      showDetails: true
    },
    authorized: {
      icon: '🔄',
      title: 'Pagamento Autorizado',
      color: 'var(--warning-color)',
      description: (result) => result.description || 'Seu pagamento foi autorizado e está aguardando confirmação.',
      showDetails: true
    },
    in_process: {
      icon: '🔄',
      title: 'Pagamento em Análise',
      color: 'var(--warning-color)',
      description: (result) => result.description || 'Seu pagamento está em análise. Isso pode levar até 2 dias úteis.',
      showDetails: true
    },
    
    // Status de erro/rejeição
    rejected: {
      icon: '❌',
      title: 'Pagamento Recusado',
      color: 'var(--error-color)',
      description: (result) => {
        if (result.status_detail && statusDetailMessages[result.status_detail]) {
          return statusDetailMessages[result.status_detail];
        }
        return result.description || 'Pagamento não aprovado. Por favor, tente novamente.';
      },
      showDetails: true
    },
    cancelled: {
      icon: '❌',
      title: 'Pagamento Cancelado',
      color: 'var(--error-color)',
      description: (result) => result.description || 'O pagamento foi cancelado.',
      showDetails: false
    },
    
    // Status diversos
    refunded: {
      icon: '🔄',
      title: 'Reembolso Efetuado',
      color: 'var(--info-color)',
      description: (result) => result.description || 'O valor foi reembolsado para seu método de pagamento.',
      showDetails: true
    },
    charged_back: {
      icon: '🔄',
      title: 'Estorno Realizado',
      color: 'var(--info-color)',
      description: (result) => result.description || 'Foi realizado um estorno no valor do pagamento.',
      showDetails: true
    },
    
    // Status padrão
    default: {
      icon: '❓',
      title: 'Status Desconhecido',
      color: 'var(--text-color)',
      description: (result) => result.message || 'O status do pagamento não pôde ser determinado.',
      showDetails: false
    }
  };

  // Mensagens detalhadas para status_detail
  const statusDetailMessages = {
    // Erros de cartão
    'cc_rejected_insufficient_amount': 'Saldo insuficiente no cartão. Tente outro método de pagamento.',
    'cc_rejected_bad_filled_card_number': 'Número do cartão inválido. Verifique os dados.',
    'cc_rejected_bad_filled_date': 'Data de validade incorreta. Verifique os dados.',
    'cc_rejected_bad_filled_security_code': 'Código de segurança (CVV) inválido.',
    'cc_rejected_blacklist': 'Cartão não autorizado. Contate seu banco.',
    'cc_rejected_call_for_authorize': 'Pagamento não autorizado. Contate seu banco.',
    'cc_rejected_card_disabled': 'Cartão desabilitado. Contate seu banco.',
    'cc_rejected_card_error': 'Erro no cartão. Tente novamente.',
    'cc_rejected_duplicated_payment': 'Pagamento duplicado. Verifique suas transações.',
    'cc_rejected_high_risk': 'Pagamento recusado por segurança. Tente outro método.',
    'cc_rejected_other_reason': 'Pagamento não aprovado. Tente novamente.',
    
    // Status pendentes
    'pending_contingency': 'Pagamento em análise. Aguarde confirmação.',
    'pending_review_manual': 'Pagamento em revisão manual. Aguarde.',
    'pending_waiting_payment': 'Aguardando confirmação de pagamento.',
    
    // Erros de processamento
    'missing_required_fields': 'Dados incompletos. Preencha todas as informações.',
    'invalid_items': 'Itens do carrinho inválidos. Recarregue a página.',
    'processing_error': 'Erro ao processar pagamento. Tente novamente.',
    'invalid_request': 'Requisição inválida. Verifique os dados.',
    'server_error': 'Erro no servidor. Tente mais tarde.',
  };

  // Inicializa o Mercado Pago
  useEffect(() => {
    if (open && !mp) {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';

      script.onload = () => {
        const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
        setMp(new window.MercadoPago(publicKey, { locale: 'pt-BR' }));
      };

      script.onerror = () => {
        setErrorMessage('Erro ao carregar o sistema de pagamentos. Recarregue a página.');
      };

      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [open, mp]);

  // Configura o formulário de pagamento
  useEffect(() => {
    if (mp && open && !formInitialized) {
      const bricksBuilder = mp.bricks();

      bricksBuilder.create('cardPayment', 'payment-form-container', {
        initialization: {
          amount: total,
          payer: {
            email: user?.email || '',
            identification: {
              type: 'CPF',
              number: userData?.cpf || '',
            },
          },
        },
        callbacks: {
          onReady: () => console.log('Formulário de pagamento pronto'),
onSubmit: async (cardFormData) => {
  try {
    await processPayment(cardFormData);
  } catch (error) {
    console.error('Erro no pagamento:', error);
    setPaymentResult({
      status: 'error',
      message: 'Erro ao processar pagamento',
      details: error.message
    });
  }
},
          onError: (error) => {
            console.error('Erro no formulário:', error);
            setErrorMessage('Erro no formulário de pagamento. Verifique os dados.');
          },
        },
      });

      setFormInitialized(true);
    }
  }, [mp, open, total, user, userData]);

  // Processa o pagamento
  const handlePayment = async (cardFormData) => {
    setProcessing(true);
    setErrorMessage('');
    setPaymentResult(null);
  
    try {
      const { token, payer: { email } } = cardFormData;
  
      const response = await fetch(`${process.env.REACT_APP_API_URL}/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          amount: total,
          email,
          identification_type: 'CPF',
          identification_number: userData?.cpf || ''
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao processar pagamento');
      }
  
      // Atualiza o estado com todos os dados do pagamento
      setPaymentResult(data);
      
    } catch (error) {
      console.error('Erro completo:', error);
      setPaymentResult({
        status: 'error',
        message: error.message || 'Erro ao processar pagamento',
        details: 'Tente novamente ou entre em contato com nosso suporte.'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Fecha o modal e reseta os estados
  const handleClose = () => {
    onClose();
    // Reseta os estados após um pequeno delay para evitar flickering
    setTimeout(() => {
      setPaymentResult(null);
      setErrorMessage('');
      setProcessing(false);
    }, 300);
  };

  // Obtém a configuração do status atual
  const getStatusConfig = () => {
    if (!paymentResult) return paymentStatusConfig.default;
    return paymentStatusConfig[paymentResult.status] || paymentStatusConfig.default;
  };

  const statusConfig = getStatusConfig();

  if (!open) return null;

  return (
    <div className={`${styles.modalOverlay} ${open ? styles.open : ''}`}>
      <div className={styles.modalContent}>
        <button
          className={styles.closeButton}
          onClick={handleClose}
          disabled={processing}
          aria-label="Fechar modal de pagamento"
        >
          &times;
        </button>

        {/* Exibe o formulário ou o resultado do pagamento */}
        {!paymentResult ? (
          <>
            <h2 className={styles.modalTitle}>Finalizar Pagamento</h2>
            <p className={styles.totalAmount}>Total: R$ {total.toFixed(2)}</p>
            
            {/* Formulário de pagamento */}
            <div id="payment-form-container" className={styles.paymentFormContainer}></div>
            
            {errorMessage && (
              <div className={styles.errorMessage}>
                <p>{errorMessage}</p>
              </div>
            )}
          </>
        ) : (
          <div className={styles.paymentResult}>
            <div 
              className={styles.statusHeader}
              style={{ color: statusConfig.color }}
            >
              <span className={styles.statusIcon}>{statusConfig.icon}</span>
              <h2>{statusConfig.title}</h2>
            </div>
            
            <p className={styles.statusDescription}>
              {statusConfig.description(paymentResult)}
            </p>
            
            {/* Detalhes do pagamento */}
            {statusConfig.showDetails && paymentResult && (
              <div className={styles.paymentDetails}>
                <h3>Detalhes do Pagamento</h3>
                <ul>
                  <li><strong>ID:</strong> {paymentResult.payment_id}</li>
                  <li><strong>Valor:</strong> R$ {paymentResult.transaction_amount?.toFixed(2) || total.toFixed(2)}</li>
                  <li><strong>Data:</strong> {new Date(paymentResult.date_created || new Date()).toLocaleString()}</li>
                  {paymentResult.status_detail && (
                    <li><strong>Status detalhado:</strong> {paymentResult.status_detail}</li>
                  )}
                  {paymentResult.payment_method && (
                    <li><strong>Método:</strong> {paymentResult.payment_method}</li>
                  )}
                </ul>
              </div>
            )}
            
            {/* Ações pós-pagamento */}
            <div className={styles.paymentActions}>
              {paymentResult.status === 'approved' && (
                <button 
                  className={styles.continueButton}
                  onClick={handleClose}
                >
                  Continuar Comprando
                </button>
              )}
              
              {(paymentResult.status === 'rejected' || paymentResult.status === 'error') && (
                <button 
                  className={styles.tryAgainButton}
                  onClick={() => setPaymentResult(null)}
                >
                  Tentar Novamente
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading durante processamento */}
        {processing && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Processando seu pagamento...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentModal;