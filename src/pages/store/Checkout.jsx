import React, { useState, useEffect } from 'react';
import styles from './Checkout.module.css';
import { useCart } from 'react-use-cart';
import NavBar from '../../components/NavBar';
import { db } from "../../firebase";
import { collection, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const Checkout = () => {
  const [step, setStep] = useState(1);
  const { items: cartItems, cartTotal, emptyCart } = useCart();

  // Estados do usuário
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  // Estados para o pagamento
  const [mp, setMp] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    cpf: '',
    phone: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    paymentMethod: '',
  });
  const [deliveryOption, setDeliveryOption] = useState('');

  // Cálculos ajustados para o design
  const subtotal = cartTotal;
  const discount = 0.00; // Valor ajustado para o design
  const shipping = deliveryOption === 'rapida' ? 15.00 : 10.00; // Valores ajustados para o design
  const total = subtotal - discount + shipping;

  // Efeito para buscar dados do usuário logado
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const dbUserData = userDoc.data();
          setUserData(dbUserData);
          setFormData(prev => ({
            ...prev,
            email: user.email || '',
            firstName: dbUserData.details?.fullName?.split(' ')[0] || '',
            lastName: dbUserData.details?.fullName?.split(' ').slice(1).join(' ') || '',
            cpf: dbUserData.details?.cpf || '',
            phone: dbUserData.details?.phone || '',
            cep: dbUserData.address?.zipCode || '',
            address: dbUserData.address?.street || '',
            number: dbUserData.address?.number || '',
            complement: dbUserData.address?.complement || '',
            neighborhood: dbUserData.address?.neighborhood || '',
            city: dbUserData.address?.city || '',
            state: dbUserData.address?.state || '',
          }));
        }
      } else {
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Funções de pagamento
  const updateStockAfterPurchase = async (purchasedItems) => {
    try {
      for (const item of purchasedItems) {
        const productRef = doc(db, "products", item.id.split('-')[0]);
        const productDoc = await getDoc(productRef);
        
        if (productDoc.exists()) {
          const productData = productDoc.data();
          if (productData.variations && Array.isArray(productData.variations)) {
            const updatedVariations = productData.variations.map(variation => {
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
            await updateDoc(productRef, { variations: updatedVariations });
          }
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar estoque:", error);
    }
  };

  const processPayment = async (cardFormData) => {
    setProcessing(true);
    setPaymentResult(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const requestData = {
        ...cardFormData,
        amount: total,
        email: formData.email,
        identification_type: 'CPF',
        identification_number: formData.cpf.replace(/\D/g, ''),
        description: `Compra na BusStore - ${cartItems.length} item(s)`,
        orderId: `order_${Date.now()}`,
        userId: user?.uid || 'guest',
        items: cartItems.map(item => ({
          id: item.id.split('-')[0],
          name: item.name,
          variation: item.variation,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.imageUrls?.[0] || "",
        }))
      };

      const response = await fetch(`${API_URL}/api/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Erro ${response.status}`);
      }

      setPaymentResult(data);
      
      if (data.status === 'approved') {
        const saleData = {
          items: cartItems,
          total: total,
          status: 'approved',
          paymentId: data.payment_id || data.id,
          paymentMethod: data.payment_method || 'credit_card',
          userId: user?.uid || 'guest',
          userEmail: formData.email,
          userData: formData,
          createdAt: new Date(),
          shipped: false,
        };
        await addDoc(collection(db, "sales"), saleData);
        await updateStockAfterPurchase(cartItems);
        emptyCart();
        setStep(4); // Passo de sucesso
      }
    } catch (error) {
      setPaymentResult({
        status: 'error',
        message: error.message || 'Erro ao processar pagamento',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Carrega o SDK do Mercado Pago
  useEffect(() => {
    if (step === 3 && (formData.paymentMethod === 'creditCard' || formData.paymentMethod === 'debitCard') && !mp) {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = () => {
        const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY || 'TEST-d4b57614-bf60-4dac-b391-944a48b68160';
        setMp(new window.MercadoPago(publicKey, { locale: 'pt-BR' }));
      };
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [step, formData.paymentMethod, mp]);

  // Inicializa o formulário de pagamento
  useEffect(() => {
    if (step === 3 && mp && (formData.paymentMethod === 'creditCard' || formData.paymentMethod === 'debitCard')) {
      const bricksBuilder = mp.bricks();
      const renderCardPaymentBrick = async () => {
        const container = document.getElementById('payment-form-container');
        if (container && container.innerHTML.trim() !== '') {
          container.innerHTML = '';
        }
        
        await bricksBuilder.create('cardPayment', 'payment-form-container', {
          initialization: {
            amount: total,
            payer: {
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName,
              identification: {
                type: 'CPF',
                number: formData.cpf.replace(/\D/g, ''),
              },
            },
          },
          callbacks: {
            onReady: () => {},
            onSubmit: processPayment,
            onError: (error) => console.error(error),
          },
        });
      };
      renderCardPaymentBrick();
    }
  }, [step, mp, formData.paymentMethod, total, formData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div>
      <NavBar/>
      <div className={styles.container}>
        
        <div className={styles.checkoutContent}>
          <div className={styles.formContainer}>
            {/* Passo 1: Dados Pessoais */}
            <div className={styles.stepContainer}>
              <div className={`${styles.stepHeader} ${step === 1 ? styles.active : ''} ${step > 1 ? styles.completed : ''}`} onClick={() => setStep(1)}>
                <div className={styles.stepNumber}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <span className={styles.stepTitle}>Dados pessoais</span>
              </div>
              {step === 1 && (
                <div className={styles.stepContent}>
                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Primeiro nome</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>CPF</label>
                      <input type="text" name="cpf" value={formData.cpf} onChange={handleInputChange} required />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Último nome</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Telefone</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required />
                    </div>
                  </div>
                  <button type="button" className={styles.nextButton} onClick={nextStep}>
                    IR PARA A ENTREGA
                  </button>
                </div>
              )}
              {step > 1 && (
                <div className={styles.stepSummary}>
                  <p>{formData.firstName} {formData.lastName}</p>
                  <p>{formData.email}</p>
                  <p>{formData.cpf}</p>
                  <p>{formData.phone}</p>
                </div>
              )}
            </div>
  
            {/* Passo 2: Entrega */}
            <div className={styles.stepContainer}>
              <div className={`${styles.stepHeader} ${step === 2 ? styles.active : ''} ${step > 2 ? styles.completed : ''}`} onClick={() => setStep(2)}>
                <div className={styles.stepNumber}>
                  {step > 2 ? '✓' : '2'}
                </div>
                <span className={styles.stepTitle}>Entrega</span>
              </div>
              {step === 2 && (
                <div className={styles.stepContent}>
                  <div className={styles.formGroup}>
                    <label>CEP</label>
                    <div className={styles.cepContainer}>
                      <input type="text" name="cep" value={formData.cep} onChange={handleInputChange} required />
                      <button type="button" className={styles.cepButton}>CALCULAR</button>
                    </div>
                  </div>
                  <div className={styles.addressTable}>
                    <div className={styles.tableRow}>
                      <div className={styles.tableCell}>
                        <label>Endereço</label>
                        <input type="text" name="address" value={formData.address} onChange={handleInputChange} required />
                      </div>
                      <div className={styles.tableCell}>
                        <label>Número</label>
                        <input type="text" name="number" value={formData.number} onChange={handleInputChange} required />
                      </div>
                      <div className={styles.tableCell}>
                        <label>Complemento</label>
                        <input type="text" name="complement" value={formData.complement} onChange={handleInputChange} />
                      </div>
                    </div>
                    <div className={styles.tableRow}>
                      <div className={styles.tableCell}>
                        <label>Bairro</label>
                        <input type="text" name="neighborhood" value={formData.neighborhood} onChange={handleInputChange} required />
                      </div>
                      <div className={styles.tableCell}>
                        <label>Cidade</label>
                        <input type="text" name="city" value={formData.city} onChange={handleInputChange} required />
                      </div>
                      <div className={styles.tableCell}>
                        <label>Estado</label>
                        <input type="text" name="state" value={formData.state} onChange={handleInputChange} required />
                      </div>
                    </div>
                  </div>
                  <h3>Forma de entrega</h3>
                  <div className={styles.deliveryOptions}>
                    <label className={styles.deliveryOption}>
                      <input type="radio" name="deliveryOption" value="rapida" checked={deliveryOption === 'rapida'} onChange={() => setDeliveryOption('rapida')} />
                      <span>Entrega Rápida - a partir de 6 dias</span>
                    </label>
                    <label className={styles.deliveryOption}>
                      <input type="radio" name="deliveryOption" value="economica" checked={deliveryOption === 'economica'} onChange={() => setDeliveryOption('economica')} />
                      <span>Entrega Econômica - a partir de 10 dias</span>
                    </label>
                  </div>
                  <div className={styles.buttonGroup}>
                    <button type="button" className={styles.nextButton} onClick={nextStep}>
                      IR PARA O PAGAMENTO
                    </button>
                  </div>
                </div>
              )}
              {step > 2 && (
                <div className={styles.stepSummary}>
                  <p>{formData.address}, {formData.number} - {formData.neighborhood}, {formData.city}/{formData.state}</p>
                </div>
              )}
            </div>
  
            {/* Passo 3: Pagamento */}
            <div className={styles.stepContainer}>
              <div className={`${styles.stepHeader} ${step === 3 ? styles.active : ''} ${step > 3 ? styles.completed : ''}`} onClick={() => setStep(3)}>
                <div className={styles.stepNumber}>
                  {step > 3 ? '✓' : '3'}
                </div>
                <span className={styles.stepTitle}>Pagamento</span>
              </div>
              {step === 3 && (
                <div className={styles.stepContent}>
                  <div className={styles.paymentOptions}>
                    <label className={styles.paymentOption}>
                      <input type="radio" name="paymentMethod" value="creditCard" checked={formData.paymentMethod === 'creditCard'} onChange={handleInputChange} />
                      <span>Cartão de crédito</span>
                    </label>
                    <label className={styles.paymentOption}>
                      <input type="radio" name="paymentMethod" value="debitCard" checked={formData.paymentMethod === 'debitCard'} onChange={handleInputChange} />
                      <span>Cartão de débito</span>
                    </label>
                    <label className={styles.paymentOption}>
                      <input type="radio" name="paymentMethod" value="pix" checked={formData.paymentMethod === 'pix'} onChange={handleInputChange} />
                      <span>Pix</span>
                    </label>
                    <label className={styles.paymentOption}>
                      <input type="radio" name="paymentMethod" value="googlePlay" checked={formData.paymentMethod === 'googlePlay'} onChange={handleInputChange} />
                      <span>Google Play</span>
                    </label>
                  </div>
  
                  {/* Container para o formulário de pagamento do Mercado Pago */}
                  {(formData.paymentMethod === 'creditCard' || formData.paymentMethod === 'debitCard') && (
                    <div id="payment-form-container" className={styles.paymentFormContainer}></div>
                  )}
  
                  <div className={styles.buttonGroup}>
                    {!(formData.paymentMethod === 'creditCard' || formData.paymentMethod === 'debitCard') && (
                      <button type="button" className={styles.submitButton} onClick={() => setStep(4)}>
                        FINALIZAR COMPRA
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Passo 4: Sucesso */}
            {step === 4 && (
              <div className={styles.stepContent}>
                <div className={styles.paymentResult}>
                  <div className={styles.statusHeader}>
                    <span className={styles.statusIcon}>✅</span>
                    <h2>Pagamento Aprovado!</h2>
                  </div>
                  <p className={styles.statusDescription}>
                    Seu pagamento foi aprovado com sucesso! Obrigado pela compra.
                  </p>
                  <div className={styles.paymentActions}>
                    <button 
                      className={styles.continueButton}
                      onClick={() => window.location.href = '/'}
                    >
                      Continuar Comprando
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Resumo do Pedido */}
          <div className={styles.orderSummary}>
            <h3>Resumo do pedido</h3>
            <div className={styles.returnToCart}>
                <a href="/carrinho" className={styles.returnLink}>{'<'} Voltar para o carrinho</a>
            </div>
            {cartItems.map(item => (
              <div key={item.id} className={styles.orderItem}>
                <div className={styles.itemName}>
                  <img src={item.imageUrls?.[0]} alt={item.name} className={styles.orderItemImage} />
                  <span>{item.name}</span>
                </div>
                <div className={styles.itemPrice}>R$ {item.price.toFixed(2)}</div>
              </div>
            ))}
    
            <div className={styles.couponSection}>
              <p>Adicione seu cupom aqui</p>
              <button className={styles.addCoupon}>ADICIONAR</button>
            </div>
    
            <div className={styles.summaryTotals}>
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
    
              <div className={styles.summaryRow}>
                <span>Desconto</span>
                <span>- R$ {discount.toFixed(2)}</span>
              </div>
    
              <div className={styles.summaryRow}>
                <span>Entrega</span>
                <span>{shipping > 0 ? `R$ ${shipping.toFixed(2)}` : 'A calcular'}</span>
              </div>
    
              <div className={styles.summaryTotal}>
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>
            {step === 3 && (
              <button className={styles.finalizeButton}>
                FINALIZAR COMPRA
              </button>
            )}
          </div>
        </div>
      </div>
  
      {processing && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>Processando seu pagamento...</p>
        </div>
      )}
    </div>
  );
};

export default Checkout;