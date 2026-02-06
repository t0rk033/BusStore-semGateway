import React, { useState, useEffect } from 'react';
import styles from './Checkout.module.css';
import { useCart } from 'react-use-cart';
import { FaTrash, FaPlus, FaMinus, FaCreditCard, FaBarcode, FaQrcode } from 'react-icons/fa';
import NavBar from '../../components/NavBar';
import { db } from "../../firebase";
import PaymentResultModal from './PaymentResultModal';
import { collection, addDoc, updateDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const Checkout = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [step, setStep] = useState(1);
  const {
    items: cartItems,
    cartTotal,
    emptyCart,
    updateItemQuantity,
    removeItem
  } = useCart();
  
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);

  // CORREÇÃO: Mover o cálculo do total para antes de seu uso
  const subtotal = cartItems.reduce((total, item) => total + (item.oldPrice || item.price) * item.quantity, 0);
  const discount = subtotal - cartTotal;
  const shippingCost = selectedShipping ? selectedShipping.valor : 0;
  const total = cartTotal + shippingCost;

  const [installmentOptions, setInstallmentOptions] = useState([]);
  const [finalTotal, setFinalTotal] = useState(total);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingPix, setProcessingPix] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null); // Mantém os dados do pagamento (boleto/pix)
  const [modalResult, setModalResult] = useState(null); // Controla apenas o modal
  const [summaryOpen, setSummaryOpen] = useState(false);
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
    // Novos campos para cartão
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    installments: 1, // Novo campo para parcelas
  });

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

  // Validações para cartão
  const isValidCardNumber = (number) => /^\d{13,19}$/.test(number.replace(/\s/g, ''));
  const isValidCCV = (ccv) => /^\d{3,4}$/.test(ccv);
  const isValidExpiry = (month, year) => {
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    return true;
  };

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
      if (!formData.paymentMethod) {
        newErrors.paymentMethod = 'Escolha uma forma de pagamento';
      } else if (formData.paymentMethod === 'creditCard') {
        // Validações específicas para cartão
        if (!formData.cardNumber) newErrors.cardNumber = 'Número do cartão é obrigatório';
        else if (!isValidCardNumber(formData.cardNumber)) newErrors.cardNumber = 'Número do cartão inválido';
        
        if (!formData.cardName) newErrors.cardName = 'Nome no cartão é obrigatório';
        
        if (!formData.expiryMonth || !formData.expiryYear) newErrors.expiry = 'Data de validade é obrigatória';
        else if (!isValidExpiry(parseInt(formData.expiryMonth), parseInt(formData.expiryYear))) newErrors.expiry = 'Cartão expirado';
        
        if (!formData.ccv) newErrors.ccv = 'CVV é obrigatório';
        else if (!isValidCCV(formData.ccv)) newErrors.ccv = 'CVV inválido';

        if (!formData.installments || formData.installments < 1) {
          newErrors.installments = 'Selecione o número de parcelas';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  // Carregar opções de parcelamento quando o total mudar
  useEffect(() => {
    const loadInstallments = async () => {
      if (total > 0) {
        try {
          console.log('🔄 Carregando opções de parcelamento para:', total);
          
          const response = await fetch(`${API_URL}/api/simulate-installments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: total })
          });
          
          if (!response.ok) {
            throw new Error('Erro na resposta do servidor');
          }
          
          const data = await response.json();
          
          if (data.status === 'success') {
            setInstallmentOptions(data.installments);
            // Define a parcela padrão como 1x sem juros
            const defaultInstallment = data.installments.find(opt => opt.number === 1);
            setFormData(prev => ({ ...prev, installments: 1 }));
            setFinalTotal(defaultInstallment ? defaultInstallment.total : total);
            setSelectedInstallment(defaultInstallment);
            
            console.log('✅ Parcelas carregadas:', data.installments.length, 'opções');
          }
        } catch (error) {
          console.error('❌ Erro ao carregar parcelas:', error);
          // Fallback: cria parcelas simples sem juros
          const fallbackInstallments = Array.from({ length: 12 }, (_, i) => {
            const num = i + 1;
            const value = total / num;
            return {
              number: num,
              value: value,
              total: total,
              hasInterest: false,
              interestRate: 0,
              display: `${num}x de R$ ${value.toFixed(2)} sem juros`
            };
          });
          setInstallmentOptions(fallbackInstallments);
          
          const defaultInstallment = fallbackInstallments.find(opt => opt.number === 1);
          setFormData(prev => ({ ...prev, installments: 1 }));
          setFinalTotal(total);
          setSelectedInstallment(defaultInstallment);
        }
      }
    };

    loadInstallments();
  }, [total, API_URL]);

  // Função para formatar número do cartão
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches ? matches[0] : '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    return parts.length ? parts.join(' ') : value;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    
    // Formatação específica por campo
    if (name === 'cardNumber') {
      formattedValue = formatCardNumber(value);
    } else if (name === 'cpf') {
      formattedValue = value.replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else if (name === 'cep') {
      formattedValue = value.replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');
    } else if (name === 'phone') {
      formattedValue = value.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
    
    setFormData({
      ...formData,
      [name]: formattedValue
    });
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Função para quando mudar o número de parcelas
  const handleInstallmentChange = (e) => {
    const selectedInstallments = parseInt(e.target.value);
    const installment = installmentOptions.find(opt => opt.number === selectedInstallments);
    
    if (installment) {
      setFormData(prev => ({ ...prev, installments: selectedInstallments }));
      setFinalTotal(installment.total);
      setSelectedInstallment(installment);
      
      console.log('📊 Parcela selecionada:', {
        parcelas: selectedInstallments,
        valorParcela: installment.value,
        totalComJuros: installment.total,
        juros: installment.interestRate
      });
    }
  };

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
    const userDataForSale = {
      fullName: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      cpf: formData.cpf.replace(/\D/g, ''),
      phone: formData.phone.replace(/\D/g, ''),
      street: formData.address,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      zipCode: formData.cep.replace(/\D/g, ''),
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
      status: paymentData.status === 'approved' ? 'approved' : 'pending',
      paymentId: paymentData.payment_id || paymentData.id || paymentData.paymentId || null,
      paymentMethod: formData.paymentMethod,
      userId: user?.uid || 'guest',
      userEmail: formData.email,
      userData: userDataForSale,
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
          await updateDoc(saleRef, {
            ...saleData,
            updatedAt: new Date(),
            status: paymentData.status, // Garante que o status seja atualizado
          });
        } else {
          await setDoc(saleRef, { ...saleData, orderId }, { merge: true });
        }

        // Apenas atualiza o estoque e limpa o carrinho se o pagamento for aprovado
        if (paymentData.status === 'approved') {
          await updateStockAfterPurchase(cartItems);
          emptyCart();
        }

        return;
      }
      
      const docRef = await addDoc(collection(db, "sales"), saleData);
      console.log("finalizePurchase - venda salva com id:", docRef.id);
      // Apenas atualiza o estoque e limpa o carrinho se o pagamento for aprovado
      if (paymentData.status === 'approved') {
        await updateStockAfterPurchase(cartItems);
        emptyCart();
      }
    } catch (err) {
      console.error("finalizePurchase - erro ao salvar venda:", err);
      setPaymentResult({ status: 'error', message: 'Erro ao salvar pedido. Contate o suporte.' });
      throw err;
    }
  };

  // =============================================================================
  // FUNÇÕES DE PAGAMENTO ATUALIZADAS PARA ASAAS
  // =============================================================================

  const processCardPayment = async () => {
    setProcessing(true);
    setPaymentResult(null);
  
    try {
      const requestData = {
        amount: finalTotal, // 🔥 Agora envia o valor COM juros
        email: formData.email,
        paymentMethod: 'credit_card',
        identification_number: formData.cpf.replace(/\D/g, ''),
        items: cartItems,
        payer: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
        // Dados do cartão
        cardName: formData.cardName,
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
        expiryMonth: formData.expiryMonth,
        expiryYear: formData.expiryYear,
        ccv: formData.ccv,
        installments: formData.installments,
        postalCode: formData.cep.replace(/\D/g, ''),
        addressNumber: formData.number,
        phone: formData.phone.replace(/\D/g, '')
      };
  
      console.log('💳 Enviando pagamento parcelado:', {
        parcelas: formData.installments,
        valorOriginal: total,
        valorComJuros: finalTotal,
        valorParcela: (finalTotal / formData.installments).toFixed(2)
      });
  
      const response = await fetch(`${API_URL}/api/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
  
      const data = await response.json();
      console.log('📨 Resposta do Asaas:', data);
  
      if (!response.ok) {
        throw new Error(data.message || `Erro ${response.status}`);
      }
  
      // Apenas mostra o modal para pagamentos com cartão, que têm resultado imediato.
      setModalResult(data);
      
      // Salvar compra se o pagamento foi criado
      if (data.payment_id && data.orderId) {
        // Define o resultado do pagamento para o cartão, que é final
        setPaymentResult(data);
        await finalizePurchase(data);
      }

    } catch (error) {
      console.error('💥 Erro no pagamento com cartão:', error);
      setPaymentResult({
        status: 'error',
        message: error.message || 'Erro ao processar pagamento',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Função para processar pagamento PIX - ATUALIZADA
  const processPixPayment = async () => {
    setProcessingPix(true);
    setPaymentResult(null);
  
    try {
      const requestData = {
        amount: total,
        email: formData.email,
        paymentMethod: 'pix',
        identification_number: formData.cpf.replace(/\D/g, ''),
        items: cartItems,
        payer: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
        phone: formData.phone.replace(/\D/g, ''),
        shipping: selectedShipping ? {
          method: selectedShipping.nome,
          cost: selectedShipping.valor,
          deliveryTime: selectedShipping.prazoEntrega
        } : null
      };
  
      console.log('🔐 Gerando PIX Asaas...');
  
      const response = await fetch(`${API_URL}/api/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || `Erro ${response.status}`);
      }
  
      console.log('✅ PIX gerado:', data);
  
      setPixData(data.pix_data);
      setPaymentResult({
        status: data.status || 'pending',
        message: 'QR Code PIX gerado com sucesso!',
        payment_id: data.payment_id,
        orderId: data.orderId
      });
      setModalResult({ status: 'pending', message: 'QR Code PIX gerado com sucesso!' });
  
      // ✅ NOVO: Salvar compra imediatamente para PIX também
      if (data.payment_id && data.orderId) {
        await finalizePurchase({
          ...data,
          status: 'pending'
        });
      }
  
    } catch (error) {
      console.error('❌ Erro ao processar PIX:', error);
      setModalResult({
        status: 'error',
        message: error.message || 'Erro ao processar PIX',
      });
    } finally {
      setProcessingPix(false);
    }
  };

  // Função para processar boleto - ATUALIZADA
  const processBoletoPayment = async () => {
    setProcessing(true);
    setPaymentResult(null);
  
    try {
      const requestData = {
        amount: total,
        email: formData.email,
        paymentMethod: 'boleto',
        identification_number: formData.cpf.replace(/\D/g, ''),
        items: cartItems,
        payer: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
        phone: formData.phone.replace(/\D/g, ''),
        shipping: selectedShipping ? {
          method: selectedShipping.nome,
          cost: selectedShipping.valor,
          deliveryTime: selectedShipping.prazoEntrega
        } : null
      };
  
      console.log('📄 Gerando boleto Asaas...');
  
      const response = await fetch(`${API_URL}/api/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || `Erro ${response.status}`);
      }
  
      console.log('✅ Boleto gerado:', data);
  
      // ✅ ATUALIZADO: Usar bankSlipUrl para redirecionamento
      setPaymentResult({
        status: data.status || 'pending',
        message: 'Boleto gerado com sucesso!',
        payment_id: data.payment_id,
        orderId: data.orderId,
        boleto_data: data.boleto_data
      });
      setModalResult({ status: 'pending', message: 'Boleto gerado com sucesso!' });
  
      // ✅ NOVO: Salvar compra imediatamente (status pending)
      if (data.payment_id && data.orderId) {
        await finalizePurchase({
          ...data,
          status: 'pending'
        });
      }
  
    } catch (error) {
      console.error('❌ Erro ao gerar boleto:', error);
      setModalResult({
        status: 'error',
        message: error.message || 'Erro ao gerar boleto',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Função para copiar código PIX
  const copyPixCode = async () => {
    if (pixData?.payload) {
      try {
        await navigator.clipboard.writeText(pixData.payload);
        setPixCopied(true);
        setTimeout(() => setPixCopied(false), 2000);
      } catch (error) {
        console.error('Erro ao copiar código PIX:', error);
        const textArea = document.createElement('textarea');
        textArea.value = pixData.payload;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setPixCopied(true);
        setTimeout(() => setPixCopied(false), 2000);
      }
    }
  };

  const nextStep = () => {
    if (validateStep()) setStep(step + 1);
  };
  
  const prevStep = () => setStep(step - 1);

  // Geração de meses e anos para expiração do cartão
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => (currentYear + i).toString().slice(-2));

  return (
    <div>
      <NavBar/>
      <div className={styles.container}>
        
        <div className={styles.checkoutContent}>
          {/* Resumo do Pedido para Mobile */}
          <div className={styles.mobileOrderSummary}>
            <div className={styles.summaryToggle} onClick={() => setSummaryOpen(!summaryOpen)}>
              <span>{summaryOpen ? 'Ocultar resumo do pedido' : 'Ver resumo do pedido'}</span>
              <div className={styles.summaryTotalMobile}>
                <strong>Total: R$ {finalTotal.toFixed(2)}</strong>
                <span className={`${styles.arrow} ${summaryOpen ? styles.arrowUp : ''}`}></span>
              </div>
            </div>
            {summaryOpen && (
              <div className={styles.summaryContent}>
                {cartItems.map(item => (
                  <div key={item.id} className={styles.summaryItem}>
                    <img src={item.imageUrls?.[0]} alt={item.name} className={styles.summaryItemImage} />
                    <div className={styles.summaryItemInfo}>
                      <span className={styles.summaryItemName}>{item.quantity}x {item.name}</span>
                      <span className={styles.summaryItemVariation}>
                        {item.variation?.color} {item.variation?.size}
                      </span>
                    </div>
                    <span className={styles.summaryItemPrice}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className={styles.summaryTotalsMobile}>
                  <p><span>Subtotal:</span> <span>R$ {subtotal.toFixed(2)}</span></p>
                  <p><span>Frete:</span> <span>R$ {shippingCost.toFixed(2)}</span></p>
                </div>
              </div>
            )}
          </div>
          <div className={styles.formContainer}>
            {/* Passo 1: Dados Pessoais - MANTIDO IGUAL */}
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
  
            {/* Passo 2: Entrega - MANTIDO IGUAL */}
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
  
            {/* Passo 3: Pagamento - MODIFICADO PARA ASAAS */}
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
                      <span><FaCreditCard /> Cartão de crédito</span>
                    </label>
                    <label className={styles.paymentOption}>
                      <input type="radio" name="paymentMethod" value="pix" checked={formData.paymentMethod === 'pix'} onChange={handleInputChange} />
                      <span><FaQrcode /> Pix</span>
                    </label>
                    <label className={styles.paymentOption}>
                      <input type="radio" name="paymentMethod" value="boleto" checked={formData.paymentMethod === 'boleto'} onChange={handleInputChange} />
                      <span><FaBarcode /> Boleto</span>
                    </label>
                  </div>
                  {errors.paymentMethod && <span className={styles.errorMessage}>{errors.paymentMethod}</span>}

                  {/* Formulário para cartão de crédito */}
                  {formData.paymentMethod === 'creditCard' && (
                    <div className={styles.cardForm}>
                      <div className={styles.formGroup}>
                        <label>Número do cartão</label>
                        <input 
                          type="text" 
                          name="cardNumber" 
                          value={formData.cardNumber} 
                          onChange={handleInputChange} 
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className={errors.cardNumber ? styles.errorInput : ''}
                        />
                        {errors.cardNumber && <span className={styles.errorMessage}>{errors.cardNumber}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        <label>Nome no cartão</label>
                        <input 
                          type="text" 
                          name="cardName" 
                          value={formData.cardName} 
                          onChange={handleInputChange} 
                          placeholder="Como está no cartão"
                          className={errors.cardName ? styles.errorInput : ''}
                        />
                        {errors.cardName && <span className={styles.errorMessage}>{errors.cardName}</span>}
                      </div>

                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Validade</label>
                          <div className={styles.expiryContainer}>
                            <select 
                              name="expiryMonth" 
                              value={formData.expiryMonth} 
                              onChange={handleInputChange}
                              className={errors.expiry ? styles.errorInput : ''}
                            >
                              <option value="">Mês</option>
                              {months.map(month => (
                                <option key={month} value={month}>{month}</option>
                              ))}
                            </select>
                            <select 
                              name="expiryYear" 
                              value={formData.expiryYear} 
                              onChange={handleInputChange}
                              className={errors.expiry ? styles.errorInput : ''}
                            >
                              <option value="">Ano</option>
                              {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                          {errors.expiry && <span className={styles.errorMessage}>{errors.expiry}</span>}
                        </div>

                        <div className={styles.formGroup}>
                          <label>CVV</label>
                          <input 
                            type="text" 
                            name="ccv" 
                            value={formData.ccv} 
                            onChange={handleInputChange} 
                            placeholder="000"
                            maxLength={4}
                            className={errors.ccv ? styles.errorInput : ''}
                          />
                          {errors.ccv && <span className={styles.errorMessage}>{errors.ccv}</span>}
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Parcelas</label>
                        <select
                          name="installments"
                          value={formData.installments}
                          onChange={handleInstallmentChange}
                          className={errors.installments ? styles.errorInput : ''}
                          disabled={installmentOptions.length === 0}
                        >
                          {installmentOptions.length === 0 ? (
                            <option value="">Carregando parcelas...</option>
                          ) : (
                            installmentOptions.map(installment => (
                              <option key={installment.number} value={installment.number}>
                                {installment.display}
                              </option>
                            ))
                          )}
                        </select>
                        {errors.installments && <span className={styles.errorMessage}>{errors.installments}</span>}
                        
                        {/* MOSTRA O VALOR FINAL COM JUROS */}
                        {selectedInstallment && selectedInstallment.number > 1 && (
                          <div className={styles.installmentSummary}>
                            <p>
                              <strong>Valor total com juros: R$ {finalTotal.toFixed(2)}</strong>
                            </p>
                            <p className={styles.interestNote}>
                              {selectedInstallment.interestRate}% de juros aplicados
                            </p>
                          </div>
                        )}
                      </div>

                      <button 
                        type="button" 
                        className={styles.submitButton}
                        onClick={processCardPayment}
                        disabled={processing || installmentOptions.length === 0}
                      >
                        {processing ? 'Processando...' : `PAGAR R$ ${finalTotal.toFixed(2)}`}
                      </button>
                    </div>
                  )}

                  {/* Seção PIX */}
                  {formData.paymentMethod === 'pix' && (
                    <div className={styles.pixSection}>
                      {!pixData ? (
                        <div className={styles.pixInitial}>
                          <div className={styles.pixInfo}>
                            <h4><FaQrcode /> Pagamento via PIX</h4>
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
                            {processingPix ? 'Gerando QR Code...' : `PAGAR R$ ${total.toFixed(2)} COM PIX`}
                          </button>
                        </div>
                      ) : (
                        <div className={styles.pixGenerated}>
                          <h4>Pague com PIX</h4>
                          <p>Escaneie o QR Code abaixo com seu app bancário:</p>
                          
                          {pixData.qr_code && (
                            <div className={styles.qrCodeContainer}>
                              <img 
                                src={pixData.qr_code.startsWith('data:') ? pixData.qr_code : `data:image/png;base64,${pixData.qr_code}`} 
                                alt="QR Code PIX" 
                                className={styles.qrCode}
                              />
                            </div>
                          )}
                          
                          <div className={styles.pixCodeSection}>
                            <p>Ou copie o código PIX:</p>
                            <div className={styles.pixCodeContainer}>
                              <code className={styles.pixCode}>
                                {pixData.payload || 'Código não disponível'}
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
                            <p>⏰ Vencimento: {pixData.expiration_date ? new Date(pixData.expiration_date).toLocaleString() : 'em 1 hora'}</p>
                          </div>

                          <button 
                            type="button" 
                            className={styles.submitButton}
                          >
                            JÁ PAGUEI COM PIX
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seção Boleto - ATUALIZADA */}
                  {formData.paymentMethod === 'boleto' && (
                    <div className={styles.boletoSection}>
                      <div className={styles.boletoInfo}>
                        <h4><FaBarcode /> Pagamento via Boleto</h4>
                        <p>Pague em qualquer agência bancária ou internet banking.</p>
                        <ul className={styles.boletoBenefits}>
                          <li>✓ Aceito em todos os bancos</li>
                          <li>✓ Prazo de pagamento: 3 dias úteis</li>
                          <li>✓ Sem taxas adicionais</li>
                          <li>✓ Pagamento seguro via Asaas</li>
                        </ul>
                      </div>
                      
                      <button 
                        className={styles.boletoButton}
                        onClick={processBoletoPayment}
                        disabled={processing}
                      >
                        {processing ? 'Gerando boleto...' : `GERAR BOLETO - R$ ${total.toFixed(2)}`}
                      </button>
  
                      {paymentResult?.boleto_data && (
                        <div className={styles.boletoGenerated}>
                          <div className={styles.successMessage}>
                            <span className={styles.successIcon}>✅</span>
                            <h4>Boleto gerado com sucesso!</h4>
                          </div>
                          
                          <p>Clique no botão abaixo para visualizar e imprimir seu boleto:</p>
                          
                          {/* ✅ BOTÃO PRINCIPAL PARA REDIRECIONAR */}
                          <a 
                            href={paymentResult.boleto_data.bankSlipUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.boletoLink}
                          >
                            📄 ABRIR BOLETO PARA PAGAMENTO
                          </a>
  
                          <div className={styles.boletoDetails}>
                            <p><strong>Vencimento:</strong> {new Date(paymentResult.boleto_data.dueDate).toLocaleDateString('pt-BR')}</p>
                            {paymentResult.boleto_data.linha_digitavel && (
                              <div className={styles.linhaDigitavel}>
                                <span>Linha digitável:</span>
                                <code>{paymentResult.boleto_data.linha_digitavel}</code>
                              </div>
                            )}
                          </div>
  
                          <div className={styles.boletoInstructions}>
                            <p><strong>Instruções:</strong></p>
                            <ol>
                              <li>Clique em "ABRIR BOLETO" acima</li>
                              <li>Imprima o boleto ou pague pelo internet banking</li>
                              <li>O pagamento será confirmado em até 3 dias úteis</li>
                            </ol>
                          </div>
  
                          <div className={styles.boletoWarning}>
                            <p>⚠️ <strong>Importante:</strong> O boleto será enviado para o e-mail <strong>{formData.email}</strong></p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.buttonGroup}>
                    <button type="button" className={styles.backButton} onClick={prevStep}>
                      VOLTAR
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
          
          {/* Resumo do Pedido - MANTIDO IGUAL */}
          <div className={styles.orderSummary}>
            <h3>Resumo do pedido</h3>
            <div className={styles.returnToCart}>
                <a href="/carrinho" className={styles.returnLink}>{'<'} Voltar para o carrinho</a>
            </div>
            
            {cartItems.map(item => (
              <div key={item.id} className={styles.orderItem}>                
                <img src={item.imageUrls?.[0]} alt={item.name} className={styles.orderItemImage} />
                <div className={styles.orderItemDetails}>
                  <span className={styles.itemName}>{item.name}</span>
                  <div className={styles.itemPrice}>R$ {item.price.toFixed(2)}</div>
                  <div className={styles.quantityControls}>
                    <button onClick={() => updateItemQuantity(item.id, item.quantity - 1)} className={styles.quantityButton}>
                      <FaMinus />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateItemQuantity(item.id, item.quantity + 1)} className={styles.quantityButton}>
                      <FaPlus />
                    </button>
                  </div>
                </div>
                <button onClick={() => removeItem(item.id)} className={styles.removeItemButton}><FaTrash /></button>
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
                <span>R$ {finalTotal.toFixed(2)}</span>
                {selectedInstallment && selectedInstallment.number > 1 && (
                  <div className={styles.installmentNote}>
                    Em {selectedInstallment.number}x de R$ {selectedInstallment.value.toFixed(2)}
                  </div>
                )}
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
        result={modalResult}
        onClose={() => setModalResult(null)}
        onRetry={() => {
          setModalResult(null);
          if (formData.paymentMethod === 'pix') {
            setPixData(null); // Limpa o QR Code para gerar um novo
          }
        }}
      />
    </div>
  );
};

export default Checkout;