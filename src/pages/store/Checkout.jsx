import React, { useState, useEffect } from 'react';
import styles from './Checkout.module.css';
import { useCart } from 'react-use-cart';
import NavBar from '../../components/NavBar';
import { db } from "../../firebase";
import PaymentResultModal from './PaymentResultModal';
import { collection, addDoc, updateDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const Checkout = () => {
  const [step, setStep] = useState(1);
  const { items: cartItems, cartTotal, emptyCart } = useCart();

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  const [mp, setMp] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingPix, setProcessingPix] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [errors, setErrors] = useState({});

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

  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingError, setShippingError] = useState('');

  // Estados para PIX
  const [pixData, setPixData] = useState(null);
  const [pixCopied, setPixCopied] = useState(false);

  const isValidCPF = (cpf) => {
    if (typeof cpf !== 'string') return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

    const digits = cpf.split('').map(el => +el);

    const calc = (x) => {
      const slice = digits.slice(0, x);
      let factor = x + 1;
      let sum = slice.reduce((acc, digit) => acc + digit * (factor--), 0);
      const rest = (sum * 10) % 11;
      return rest === 10 ? 0 : rest;
    };

    return calc(9) === digits[9] && calc(10) === digits[10];
  };

  const isValidPhone = (phone) => /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/.test(phone);

  const validateStep = () => {
    const newErrors = {};
    if (step === 1) {
      if (!formData.email) newErrors.email = 'Email é obrigatório';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Formato de email inválido';
      if (!formData.firstName) newErrors.firstName = 'Nome é obrigatório';
      if (!formData.lastName) newErrors.lastName = 'Sobrenome é obrigatório';
      if (!formData.cpf) newErrors.cpf = 'CPF é obrigatório';
      else if (!isValidCPF(formData.cpf)) newErrors.cpf = 'CPF inválido';
      if (!formData.phone) newErrors.phone = 'Telefone é obrigatório';
      else if (!isValidPhone(formData.phone)) newErrors.phone = 'Formato de telefone inválido';
    } else if (step === 2) {
      if (!formData.cep) newErrors.cep = 'CEP é obrigatório';
      if (!formData.address) newErrors.address = 'Endereço é obrigatório';
      if (!formData.number) newErrors.number = 'Número é obrigatório';
      if (!formData.neighborhood) newErrors.neighborhood = 'Bairro é obrigatório';
      if (!formData.city) newErrors.city = 'Cidade é obrigatória';
      if (!formData.state) newErrors.state = 'Estado é obrigatório';
      if (!selectedShipping) newErrors.deliveryOption = 'Escolha uma opção de frete';
    } else if (step === 3) {
      if (!formData.paymentMethod) newErrors.paymentMethod = 'Escolha uma forma de pagamento';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const subtotal = cartItems.reduce((total, item) => {
    const originalPrice = item.oldPrice && item.oldPrice > item.price ? item.oldPrice : item.price;
    return total + originalPrice * item.quantity;
  }, 0);

  const discount = subtotal - cartTotal;
  const shippingCost = selectedShipping ? selectedShipping.valor : 0;
  const total = cartTotal + shippingCost;

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

  const handleCalculateShipping = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      setShippingError('CEP inválido. Por favor, verifique.');
      return;
    }

    setCalculatingShipping(true);
    setShippingError('');
    setShippingOptions([]);
    setSelectedShipping(null);

    try {
      // Buscar endereço via BrasilAPI
      try {
        const addressResponse = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
        if (addressResponse.ok) {
          const addressData = await addressResponse.json();
          setFormData(prev => ({
            ...prev,
            address: addressData.street || '',
            neighborhood: addressData.neighborhood || '',
            city: addressData.city || '',
            state: addressData.state || '',
          }));
        }
      } catch (addressError) {
        console.warn('Erro ao buscar endereço, continuando...', addressError);
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Preparar dados para Melhor Envio
      const shippingRequest = {
        cepDestino: cep,
        produtos: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          weight: item.weight || 0.3,
          quantity: item.quantity,
          width: item.dimensions?.width || 15,
          height: item.dimensions?.height || 10,
          length: item.dimensions?.length || 20,
          price: item.price,
          insurance_value: item.price * item.quantity
        }))
      };

      console.log('📤 Enviando requisição para Melhor Envio:', shippingRequest);

      const shippingResponse = await fetch(`${API_URL}/api/shipping-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shippingRequest)
      });

      const result = await shippingResponse.json();

      if (!shippingResponse.ok) {
        throw new Error(result.message || 'Erro ao calcular frete');
      }

      if (result.status === 'success' && Array.isArray(result.data)) {
        setShippingOptions(result.data);
        
        // Verificar se é cálculo de fallback
        if (result.data.length > 0 && result.data[0].origem === 'fallback') {
          setShippingError('Frete calculado com base na região (Melhor Envio temporariamente indisponível).');
        } else {
          setShippingError('');
        }
      } else {
        setShippingError(result.message || 'Não foi possível obter as opções de frete.');
      }

    } catch (error) {
      console.error('Erro no cálculo do frete:', error);
      setShippingError('Serviço de frete temporariamente indisponível. Por favor, tente novamente.');
    } finally {
      setCalculatingShipping(false);
    }
  };

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

  // Função para finalizar compra (reutilizável)
  const finalizePurchase = async (paymentData) => {
    // Estrutura de dados do usuário alinhada com o que StockManagement espera
    const userDataForSale = {
      fullName: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      cpf: formData.cpf,
      phone: formData.phone,
      street: formData.address,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      zipCode: formData.cep,
    };

    const saleData = {
      items: cartItems,
      total: total,
      subtotal: subtotal,
      discount: discount,
      shipping: selectedShipping ? {
        method: selectedShipping.nome,
        transportadora: selectedShipping.transportadora,
        cost: selectedShipping.valor,
        deliveryTime: selectedShipping.prazoEntrega,
        serviceCode: selectedShipping.codigo,
        company: selectedShipping.empresa,
        origem: selectedShipping.origem
      } : null,
      // se não houver status, considerar pending (garante salvar compras cartão sem status imediato)
      status: paymentData.status === 'approved' ? 'approved' : 'pending',
      paymentId: paymentData.payment_id || paymentData.id || paymentData.paymentId || paymentData.transactionId || null,
      paymentMethod: formData.paymentMethod,
      userId: user?.uid || 'guest',
      userEmail: formData.email,
      userData: userDataForSale, // Usando a nova estrutura de dados
      recipientName: `${formData.firstName} ${formData.lastName}`,
      createdAt: new Date(),
      shipped: false,
      pixData: formData.paymentMethod === 'pix' ? pixData : null
    };

    try {
      const orderId = paymentData?.orderId || paymentData?.order_id || null;
      if (orderId) {
        const saleRef = doc(db, "sales", orderId);
        const existing = await getDoc(saleRef);
        if (existing.exists()) {
          // Atualizar mesclando campos: adicionar userData / shipping / recipientName sem perder outros campos
          console.log("finalizePurchase - atualizando venda existente (merge):", orderId, saleData);
          await updateDoc(saleRef, {
            ...saleData,
            updatedAt: new Date()
          });
          await updateStockAfterPurchase(cartItems);
          emptyCart();
          setStep(4);
          return;
        } else {
          // criar com orderId (mesclando para manter compatibilidade com backend)
          console.log("finalizePurchase - criando venda com orderId:", orderId, saleData);
          await setDoc(saleRef, { ...saleData, orderId }, { merge: true });
          await updateStockAfterPurchase(cartItems);
          emptyCart();
          setStep(4);
          return;
        }
      }
      // Caso não tenha orderId, fallback: criar novo documento com id aleatório
      console.log("finalizePurchase - salvando venda (sem orderId):", saleData);
      const docRef = await addDoc(collection(db, "sales"), saleData);
      console.log("finalizePurchase - venda salva com id:", docRef.id);
      await updateStockAfterPurchase(cartItems);
      emptyCart();
      setStep(4);
    } catch (err) {
      console.error("finalizePurchase - erro ao salvar venda:", err);
      setPaymentResult({ status: 'error', message: 'Erro ao salvar pedido. Contate o suporte.' });
      throw err;
    }
  };

  // Função para processar pagamento com cartão (crédito/débito)
  const processPayment = async (cardFormData) => {
    setProcessing(true);
    setPaymentResult(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Determinar o tipo de pagamento baseado na seleção do usuário
      const paymentType = formData.paymentMethod === 'debitCard' ? 'debit_card' : 'credit_card';
      
      // gerar orderId antes da chamada para que possamos criar a venda preliminar no Firestore
      const requestData = {
        ...cardFormData,
        amount: total,
        email: formData.email,
        paymentMethod: paymentType,
        phone: formData.phone,
        identification_type: 'CPF',
        identification_number: formData.cpf.replace(/\D/g, ''),
        description: `Compra na BusStore - ${cartItems.length} item(s)`,
        payer: { // Enviando dados do pagador para o backend
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
        userId: user?.uid || 'guest',
        items: cartItems.map(item => ({
          id: item.id.split('-')[0],
          name: item.name,
          variation: item.variation,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.imageUrls?.[0] || "",
        })),
        shipping: selectedShipping ? {
          ...selectedShipping, // Enviando todos os dados do frete
          method: selectedShipping.nome,
          cost: selectedShipping.valor,
          deliveryTime: selectedShipping.prazoEntrega
        } : null
      };

      const response = await fetch(`${API_URL}/api/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      // Se a resposta não for OK, mas tiver um status de pagamento (ex: in_process),
      // não lançamos um erro, pois queremos tratar esse status.
      const hasPaymentStatus = data.status || data.payment?.status;
      if (!response.ok && !hasPaymentStatus) {
        // Lança erro apenas se a requisição falhou E não há um status de pagamento para analisar.
        const errorMessage = data.message || data.details || `Erro ${response.status}`;
        console.error('Erro do backend sem status de pagamento:', data);
        throw new Error(errorMessage);
      }


      console.log("processPayment - resposta crua do backend:", data);
      // Normalizar status e id caso venham em estruturas diferentes
      const normalizedStatus =
        data.status ||
        data.payment?.status ||
        data.payment_status ||
        data.transaction?.status ||
        data.result?.status ||
        null;

      const normalizedPaymentId =
        data.payment_id ||
        data.id ||
        data.payment?.id ||
        data.paymentId ||
        data.transaction?.id ||
        data.result?.id ||
        null;

      const normalized = {
        ...data,
        status: normalizedStatus,
        payment_id: normalizedPaymentId,
        id: normalizedPaymentId,
        orderId: data.orderId || data.order_id || data.external_reference || null,
      };

      console.log("processPayment - resposta normalizada:", normalized);

      // atualizar UI com resposta normalizada
      setPaymentResult(normalized);
      
      // SALVAR quando:
      // - houver status diferente de 'rejected' (approved, pending, in_process, etc)
      // - ou backend retornou um id/payment_id/orderId (criou pagamento) — tratar como pending
      const isPending = ['pending', 'in_process', 'authorized'].includes(normalized.status);
      const isApproved = normalized.status === 'approved' || normalized.status === 'in_process';
      const hasId = !!(normalized.payment_id || normalized.id || normalized.orderId);
      // Salva e limpa o carrinho se for aprovado, pendente ou tiver um ID de referência
      const shouldSave = isApproved || isPending;
      
      if (shouldSave) {
        console.log('processPayment: irá salvar compra (shouldSave):', { status: normalized.status, hasId });
        try {
          await finalizePurchase(normalized);
        } catch (err) {
          console.error("processPayment - erro ao finalizar compra:", err);
        }
      } else {
        console.log('processPayment: não salvando compra (status/id):', { status: normalized.status, hasId });
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

  // Função para processar pagamento PIX
  const processPixPayment = async () => {
    setProcessingPix(true);
    setPaymentResult(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const requestData = {
        amount: total,
        email: formData.email,
        paymentMethod: 'pix',
        identification_type: 'CPF',
        identification_number: formData.cpf.replace(/\D/g, ''),
        description: `Compra na BusStore - ${cartItems.length} item(s)`,
        phone: formData.phone,
        userId: user?.uid || 'guest',
        payer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email
        },
        items: cartItems.map(item => ({
          id: item.id.split('-')[0],
          name: item.name,
          variation: item.variation,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.imageUrls?.[0] || "",
        })),
        shipping: selectedShipping ? {
          method: selectedShipping.nome,
          ...selectedShipping,
          cost: selectedShipping.valor,
          deliveryTime: selectedShipping.prazoEntrega
        } : null
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

      setPixData(data);
      setPaymentResult({
        status: data.status || 'pending',
        message: 'Aguardando pagamento PIX'
      });

    } catch (error) {
      setPaymentResult({
        status: 'error',
        message: error.message || 'Erro ao processar PIX',
      });
    } finally {
      setProcessingPix(false);
    }
  };

  // Função para copiar código PIX
  const copyPixCode = async () => {
    if (pixData?.qr_code) {
      try {
        await navigator.clipboard.writeText(pixData.qr_code);
        setPixCopied(true);
        setTimeout(() => setPixCopied(false), 2000);
      } catch (error) {
        console.error('Erro ao copiar código PIX:', error);
        // Fallback para método antigo
        const textArea = document.createElement('textarea');
        textArea.value = pixData.qr_code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setPixCopied(true);
        setTimeout(() => setPixCopied(false), 2000);
      }
    }
  };

  // Configuração do Mercado Pago para cartões
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
            onReady: () => {
              console.log('Brick do Mercado Pago carregado');
            },
            onSubmit: (formData) => {
              console.log('Dados do formulário:', formData);
              processPayment(formData);
            },
            onError: (error) => {
              console.error('Erro no brick:', error);
              setPaymentResult({
                status: 'error',
                message: 'Erro ao processar cartão. Tente novamente.'
              });
            },
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
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const nextStep = () => {
    if (validateStep()) setStep(step + 1);
  };
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
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className={errors.email ? styles.errorInput : ''} />
                    {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Primeiro nome</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className={errors.firstName ? styles.errorInput : ''} />
                      {errors.firstName && <span className={styles.errorMessage}>{errors.firstName}</span>}
                    </div>
                    <div className={styles.formGroup}>
                      <label>CPF</label>
                      <input type="text" name="cpf" value={formData.cpf} onChange={handleInputChange} required className={errors.cpf ? styles.errorInput : ''} />
                      {errors.cpf && <span className={styles.errorMessage}>{errors.cpf}</span>}
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Último nome</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className={errors.lastName ? styles.errorInput : ''} />
                      {errors.lastName && <span className={styles.errorMessage}>{errors.lastName}</span>}
                    </div>
                    <div className={styles.formGroup}>
                      <label>Telefone</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className={errors.phone ? styles.errorInput : ''} />
                      {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className={styles.nextButton} 
                    onClick={nextStep}
                    disabled={Object.values(errors).some(e => e)}
                  >
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
                      <input 
                        type="text" 
                        name="cep" 
                        value={formData.cep} 
                        onChange={handleInputChange} 
                        required 
                        className={errors.cep ? styles.errorInput : ''} 
                        placeholder="Apenas números" 
                        maxLength={9}
                      />
                      <button 
                        type="button" 
                        className={styles.cepButton} 
                        onClick={handleCalculateShipping} 
                        disabled={calculatingShipping || formData.cep.replace(/\D/g, '').length !== 8}
                      >
                        {calculatingShipping ? 'Calculando...' : 'CALCULAR FRETE'}
                      </button>
                    </div>
                    {errors.cep && <span className={styles.errorMessage}>{errors.cep}</span>}
                  </div>
                  <div className={styles.addressTable}>
                    <div className={styles.tableRow}>
                      <div className={styles.tableCell}>
                        <label>Endereço</label>
                        <input type="text" name="address" value={formData.address} onChange={handleInputChange} required className={errors.address ? styles.errorInput : ''} />
                        {errors.address && <span className={styles.errorMessage}>{errors.address}</span>}
                      </div>
                      <div className={styles.tableCell}>
                        <label>Número</label>
                        <input type="text" name="number" value={formData.number} onChange={handleInputChange} required className={errors.number ? styles.errorInput : ''} />
                        {errors.number && <span className={styles.errorMessage}>{errors.number}</span>}
                      </div>
                      <div className={styles.tableCell}>
                        <label>Complemento</label>
                        <input type="text" name="complement" value={formData.complement} onChange={handleInputChange} className={errors.complement ? styles.errorInput : ''} />
                      </div>
                    </div>
                    <div className={styles.tableRow}>
                      <div className={styles.tableCell}>
                        <label>Bairro</label>
                        <input type="text" name="neighborhood" value={formData.neighborhood} onChange={handleInputChange} required className={errors.neighborhood ? styles.errorInput : ''} />
                        {errors.neighborhood && <span className={styles.errorMessage}>{errors.neighborhood}</span>}
                      </div>
                      <div className={styles.tableCell}>
                        <label>Cidade</label>
                        <input type="text" name="city" value={formData.city} onChange={handleInputChange} required className={errors.city ? styles.errorInput : ''} />
                        {errors.city && <span className={styles.errorMessage}>{errors.city}</span>}
                      </div>
                      <div className={styles.tableCell}>
                        <label>Estado</label>
                        <input type="text" name="state" value={formData.state} onChange={handleInputChange} required className={errors.state ? styles.errorInput : ''} />
                        {errors.state && <span className={styles.errorMessage}>{errors.state}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <h3>Opções de Frete</h3>
                  {calculatingShipping && <p className={styles.loadingMessage}>Calculando opções de frete...</p>}
                  {shippingError && <p className={styles.errorMessage}>{shippingError}</p>}
                  
                  {shippingOptions.length > 0 && (
                    <div className={styles.deliveryOptions}>
                      {shippingOptions.map(option => (
                        <label key={option.id} className={styles.deliveryOption}>
                          <input 
                            type="radio" 
                            name="deliveryOption" 
                            value={option.id} 
                            checked={selectedShipping?.id === option.id} 
                            onChange={() => setSelectedShipping(option)} 
                          />
                          <div className={styles.optionInfo}>
                            <span className={styles.optionName}>
                              {option.nome} {option.transportadora ? `- ${option.transportadora}` : ''}
                            </span>
                            <span className={styles.optionDetails}>
                              R$ {option.valor.toFixed(2)} • Prazo: {option.prazoEntrega} dia{option.prazoEntrega > 1 ? 's' : ''} útil{option.prazoEntrega > 1 ? 'eis' : ''}
                            </span>
                            {option.detalhes && (
                              <span className={styles.optionExtra}>
                                {option.detalhes.entregaDomiciliar && '• Entrega em domicílio '}
                                {option.detalhes.entregaSabado && '• Entrega aos sábados '}
                                {option.detalhes.observacao && `• ${option.detalhes.observacao}`}
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {errors.deliveryOption && <span className={styles.errorMessage}>{errors.deliveryOption}</span>}
                  
                  <div className={styles.buttonGroup}>
                    <button type="button" className={styles.backButton} onClick={prevStep}>
                      VOLTAR
                    </button>
                    <button 
                      type="button" 
                      className={styles.nextButton} 
                      onClick={nextStep}
                      disabled={!selectedShipping || Object.values(errors).some(e => e)}
                    >
                      IR PARA O PAGAMENTO
                    </button>
                  </div>
                </div>
              )}
              {step > 2 && selectedShipping && (
                <div className={styles.stepSummary}>
                  <p>{formData.address}, {formData.number} - {formData.neighborhood}, {formData.city}/{formData.state}</p>
                  <p>Frete: {selectedShipping.nome} - R$ {selectedShipping.valor.toFixed(2)} ({selectedShipping.prazoEntrega} dias úteis)</p>
                  <p>Transportadora: {selectedShipping.transportadora}</p>
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
                  </div>
                  {errors.paymentMethod && <span className={styles.errorMessage}>{errors.paymentMethod}</span>}

                  {/* Formulário para cartões */}
                  {(formData.paymentMethod === 'creditCard' || formData.paymentMethod === 'debitCard') && (
                    <div id="payment-form-container" className={styles.paymentFormContainer}></div>
                  )}

                  {/* Seção PIX */}
                  {formData.paymentMethod === 'pix' && (
                    <div className={styles.pixSection}>
                      {!pixData ? (
                        <div className={styles.pixInitial}>
                          <div className={styles.pixInfo}>
                            <h4>Pagamento via PIX</h4>
                            <p>Pagamento instantâneo e seguro. Escaneie o QR Code ou copie o código.</p>
                            <ul className={styles.pixBenefits}>
                              <li>✓ Pagamento instantâneo</li>
                              <li>✓ Sem taxas adicionais</li>
                              <li>✓ Confirmado em segundos</li>
                            </ul>
                          </div>
                          <button 
                            className={styles.pixButton}
                            onClick={processPixPayment}
                            disabled={processingPix}
                          >
                            {processingPix ? 'Gerando QR Code...' : 'GERAR QR CODE PIX'}
                          </button>
                        </div>
                      ) : (
                        <div className={styles.pixGenerated}>
                          <h4>Pague com PIX</h4>
                          <p>Escaneie o QR Code abaixo com seu app bancário:</p>
                          
                          {pixData.qr_code_base64 && (
                            <div className={styles.qrCodeContainer}>
                              <img 
                                src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                                alt="QR Code PIX" 
                                className={styles.qrCode}
                              />
                            </div>
                          )}
                          
                          <div className={styles.pixCodeSection}>
                            <p>Ou copie o código PIX:</p>
                            <div className={styles.pixCodeContainer}>
                              <code className={styles.pixCode}>
                                {pixData.qr_code || 'Código não disponível'}
                              </code>
                              <button 
                                className={styles.copyButton}
                                onClick={copyPixCode}
                              >
                                {pixCopied ? '✓ Copiado!' : 'Copiar Código'}
                              </button>
                            </div>
                          </div>
                          
                          <div className={styles.pixInstructions}>
                            <p><strong>Instruções:</strong></p>
                            <ol>
                              <li>Abra seu app bancário</li>
                              <li>Selecione "Pagar com PIX"</li>
                              <li>Escaneie o QR Code ou cole o código</li>
                              <li>Confirme o pagamento</li>
                            </ol>
                          </div>
                          
                          <div className={styles.pixExpiry}>
                            <p>⏰ Este QR Code expira em 30 minutos</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.buttonGroup}>
                    <button type="button" className={styles.backButton} onClick={prevStep}>
                      VOLTAR
                    </button>
                    
                    {/* Botão para PIX após gerar QR Code */}
                    {formData.paymentMethod === 'pix' && pixData && (
                      <button 
                        type="button" 
                        className={styles.submitButton}
                        onClick={async () => {
                          setPaymentResult({ ...pixData, status: 'pending' });
                          await finalizePurchase({ ...pixData, status: 'pending' });
                          setStep(4);
                        }}
                      >
                        JÁ PAGUEI COM PIX
                      </button>
                    )}
                  </div>

                  {/* Mensagens de resultado do pagamento */}
                  {/* O modal de resultado será renderizado fora do fluxo principal */}
                </div>
              )}
            </div>

            {/* Passo 4: Confirmação */}
            {step === 4 && (
              <div className={styles.stepContainer}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>✓</div>
                  <span className={styles.stepTitle}>Confirmação</span>
                </div>
                <div className={styles.stepContent}>
                  <div className={styles.confirmation}>
                    <div className={styles.confirmationCard}>
                      {paymentResult?.status === 'approved' && (
                        <div className={styles.statusHeader}>
                          <span className={styles.statusIcon}>✅</span>
                          <h2>Compra realizada com sucesso!</h2>
                          <p className={styles.statusDescription}>Obrigado pela sua compra. Enviamos a confirmação para o seu e-mail.</p>
                        </div>
                      )}
                      {paymentResult?.status === 'in_process' && (
                        <div className={styles.statusHeader}>
                          <span className={styles.statusIcon}>⏳</span>
                          <h2>Seu pagamento está em análise!</h2>
                          <p className={styles.statusDescription}>
                            A operadora do cartão está analisando seu pagamento. Assim que for aprovado, enviaremos uma confirmação por e-mail.
                          </p>
                        </div>
                      )}
                      {paymentResult?.status === 'pending' && (
                        <div className={styles.statusHeader}>
                          <span className={styles.statusIcon}>⏳</span>
                          <h2>Aguardando confirmação do pagamento!</h2>
                          <p className={styles.statusDescription}>
                            Seu pedido foi registrado! Assim que o pagamento for confirmado, enviaremos uma notificação por e-mail.
                          </p>
                          {formData.paymentMethod === 'pix' && <p className={styles.pixWarning}><strong>Importante:</strong> O pagamento PIX pode levar alguns minutos para ser confirmado.</p>}
                        </div>
                      )}

                      <div className={styles.confirmationDetails}>
                        <h4>Detalhes do Pedido</h4>
                        <p><strong>Nº do Pedido:</strong> {paymentResult?.orderId || 'Não disponível'}</p>
                        <p><strong>Data:</strong> {new Date().toLocaleString()}</p>
                        <p><strong>Total:</strong> R$ {total.toFixed(2)}</p>
                        <p><strong>Pagamento:</strong> {formData.paymentMethod === 'pix' ? 'PIX' : 'Cartão'}</p>
                      </div>

                      {selectedShipping && (
                        <div className={styles.confirmationDetails}>
                          <h4>Detalhes da Entrega</h4>
                          <p><strong>Endereço:</strong> {formData.address}, {formData.number} - {formData.city}/{formData.state}</p>
                          <p><strong>Previsão:</strong> {selectedShipping.prazoEntrega} dia{selectedShipping.prazoEntrega > 1 ? 's' : ''} úteis</p>
                          <p><strong>Método:</strong> {selectedShipping.nome}</p>
                        </div>
                      )}

                      <div className={styles.confirmationItems}>
                        <h4>Itens Comprados</h4>
                        {cartItems.map(item => (
                          <div key={item.id} className={styles.confirmationItem}>
                            <img src={item.imageUrls?.[0]} alt={item.name} />
                            <div className={styles.itemInfo}>
                              <span>{item.name}</span>
                              <span>{item.quantity} x R$ {item.price.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={styles.confirmationActions}>
                        <button className={styles.primaryButton} onClick={() => window.location.href = '/'}>
                          Continuar Comprando
                        </button>
                        {user && (
                          <button className={styles.secondaryButton} onClick={() => window.location.href = '/perfil'}>
                            Ver Meus Pedidos
                          </button>
                        )}
                      </div>
                    </div>
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
                <span>
                  {selectedShipping 
                    ? `R$ ${shippingCost.toFixed(2)} (${selectedShipping.nome})` 
                    : calculatingShipping 
                    ? 'Calculando...' 
                    : 'A calcular'
                  }
                </span>
              </div>
    
              <div className={styles.summaryTotal}>
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      {/* Overlay de loading */}
      {(processing || processingPix) && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>{processingPix ? 'Processando PIX...' : 'Processando pagamento...'}</p>
        </div>
      )}

      {/* Modal de resultado do pagamento */}
      <PaymentResultModal
        result={paymentResult}
        onClose={() => setPaymentResult(null)}
        onRetry={() => {
          setPaymentResult(null); // Fecha o modal
          if (formData.paymentMethod === 'pix') {
            setPixData(null); // Reseta a tela do PIX
          }
        }}
      />
    </div>
  );
};

export default Checkout;