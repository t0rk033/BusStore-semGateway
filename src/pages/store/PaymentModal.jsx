import React, { useState, useEffect } from 'react';
import styles from './PaymentModal.module.css';
import { db } from "../../firebase";
import { collection, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";

function PaymentModal({ open, onClose, total, user, userData, orderId, userId, items = [] }) {
  const [mp, setMp] = useState(null);
  const [formInitialized, setFormInitialized] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Função para testar conexão com o backend
  const testBackendConnection = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/health`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend conectado:', data);
        return true;
      } else {
        console.error('❌ Erro ao conectar com o backend');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro de conexão com backend:', error);
      return false;
    }
  };

  // Função para atualizar o estoque após a compra
  const updateStockAfterPurchase = async (purchasedItems) => {
    try {
      for (const item of purchasedItems) {
        try {
          const productRef = doc(db, "products", item.id);
          const productDoc = await getDoc(productRef);
          
          if (productDoc.exists()) {
            const productData = productDoc.data();
            
            // Verificar se existem variações
            if (productData.variations && Array.isArray(productData.variations)) {
              const updatedVariations = productData.variations.map(variation => {
                // Lógica para encontrar a variação correta
                const matchesSize = !item.variation?.size || variation.size === item.variation.size;
                const matchesColor = !item.variation?.color || variation.color === item.variation.color;
                const matchesModel = !item.variation?.model || variation.model === item.variation.model;
                
                if (matchesSize && matchesColor && matchesModel) {
                  return {
                    ...variation,
                    stock: Math.max(0, (variation.stock || 0) - (item.quantity || 1))
                  };
                }
                return variation;
              });
              
              await updateDoc(productRef, {
                variations: updatedVariations,
                updatedAt: new Date()
              });
              
              console.log(`✅ Estoque atualizado para produto ${item.id}`);
            } else {
              // Produto sem variações - atualizar estoque geral
              const currentStock = productData.stock || productData.quantity || 0;
              await updateDoc(productRef, {
                stock: Math.max(0, currentStock - (item.quantity || 1)),
                updatedAt: new Date()
              });
              
              console.log(`✅ Estoque geral atualizado para produto ${item.id}`);
            }
          } else {
            console.warn(`⚠️ Produto ${item.id} não encontrado para atualização de estoque`);
          }
        } catch (productError) {
          console.error(`❌ Erro ao atualizar estoque do produto ${item.id}:`, productError);
        }
      }
    } catch (error) {
      console.error("Erro geral ao atualizar estoque:", error);
    }
  };

  // Função para processar o pagamento
  const processPayment = async (cardFormData) => {
    setProcessing(true);
    setErrorMessage('');
    setPaymentResult(null);

    try {
      const { token, issuer_id, payment_method_id } = cardFormData;

      console.log('🔍 Iniciando processamento de pagamento');
      console.log('User data:', userData);
      console.log('Items:', items);
      console.log('User:', user);

      console.log('Enviando para backend:', {
        hasToken: !!token,
        amount: total,
        email: user?.email || 'Não informado',
        orderId: orderId || 'Não informado',
        userId: userId || 'Não informado',
        itemsCount: items.length
      });

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Dados para enviar ao backend - CORRIGIDO para match com o backend
      const requestData = {
        token,
        amount: total,
        description: `Compra na BusStore - ${items.length} item(s) - Valor: R$ ${total.toFixed(2)}`,
        installments: 1,
        payment_method_id,
        issuer_id,
        email: user?.email || '',
        identification_type: 'CPF',
        identification_number: userData?.cpf || '12345678900', // OBRIGATÓRIO - valor padrão para teste
        orderId: orderId || `order_${Date.now()}`,
        userId: userId || 'guest',
        items: items.map(item => ({
          id: item.id,
          name: item.name || "Produto sem nome",
          variation: item.variation || {},
          quantity: item.quantity || 1,
          price: item.price || 0,
          imageUrl: item.imageUrls?.[0] || "",
        }))
      };

      console.log('Dados enviados para o backend:', requestData);

      const response = await fetch(`${API_URL}/api/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData),
        mode: 'cors',
      });

      // Verificar se a resposta é JSON válido
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Resposta não é JSON válido:', responseText);
        throw new Error('Resposta do servidor inválida');
      }

      if (!response.ok) {
        console.error('Erro do backend:', data);
        throw new Error(data.message || `Erro ${response.status}: ${response.statusText}`);
      }

      console.log('📨 Resposta completa do backend:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });

      console.log('Resposta do backend:', data);
      setPaymentResult(data);
      
      // SALVAR A COMPRA NO BANCO DE DADOS SE O PAGAMENTO FOI APROVADO
      if (data.status === 'approved') {
        try {
          const saleData = {
            items: items.map(item => ({
              id: item.id,
              name: item.name || "Produto sem nome",
              variation: item.variation || {},
              quantity: item.quantity || 1,
              price: item.price || 0,
              imageUrl: item.imageUrls?.[0] || "",
            })),
            total: total,
            status: 'approved',
            paymentId: data.payment_id || data.id,
            paymentMethod: data.payment_method || 'credit_card',
            userId: userId || 'guest',
            userEmail: user?.email || '',
            userData: userData || {},
            createdAt: new Date(),
            shipped: false,
            deliveryStatus: 'pending'
          };

          console.log('Salvando venda no Firestore:', saleData);

          // Salvar no Firestore
          const saleRef = await addDoc(collection(db, "sales"), saleData);
          console.log("Compra salva com ID: ", saleRef.id);
          
          // Atualizar estoque dos produtos
          await updateStockAfterPurchase(items);
          
        } catch (error) {
          console.error("Erro ao salvar compra:", error);
          // Não lançar erro aqui para não interferir com o fluxo de pagamento
        }
      }

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
    approved: {
      icon: '✅',
      title: 'Pagamento Aprovado!',
      color: 'var(--success-color)',
      description: (result) => result.description || 'Seu pagamento foi aprovado com sucesso!',
      showDetails: true
    },
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
    'pending_contingency': 'Pagamento em análise. Aguarde confirmação.',
    'pending_review_manual': 'Pagamento em revisão manual. Aguarde.',
    'pending_waiting_payment': 'Aguardando confirmação de pagamento.',
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
        const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY || 'TEST-d4b57614-bf60-4dac-b391-944a48b68160';
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
              number: userData?.cpf || '12345678900',
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

  // Testa a conexão com o backend quando o modal abre
  useEffect(() => {
    if (open) {
      testBackendConnection();
    }
  }, [open]);

  // Fecha o modal e reseta os estados
  const handleClose = () => {
    onClose();
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

        {!paymentResult ? (
          <>
            <h2 className={styles.modalTitle}>Finalizar Pagamento</h2>
            <p className={styles.totalAmount}>Total: R$ {total.toFixed(2)}</p>
            
            <div id="payment-form-container" className={styles.paymentFormContainer}></div>
            
            {errorMessage && (
              <div className={styles.errorMessage}>
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Botão de teste de conexão */}
            <button 
              onClick={async () => {
                const connected = await testBackendConnection();
                alert(connected ? '✅ Backend conectado!' : '❌ Falha na conexão com o backend');
              }}
              style={{
                margin: '10px', 
                padding: '8px 16px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Testar Conexão com Backend
            </button>
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