const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const { db } = require('./firebase-admin.js');
const winston = require('winston');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();

// DEBUG INICIAL
console.log('=== INICIALIZAÇÃO DO SERVIDOR ===');
console.log('ASAAS_API_KEY:', process.env.ASAAS_API_KEY ? 'PRESENTE' : 'AUSENTE');
console.log('MELHOR_ENVIO_TOKEN:', process.env.MELHOR_ENVIO_TOKEN ? 'PRESENTE' : 'AUSENTE');
console.log('===============================');

// Função para calcular o valor final com juros, baseada na tabela de taxas
function calculateInstallments(total, installments) {
  const fixedFee = 0.49;
  let rate = 0;

  if (installments === 1) {
    rate = 2.99;
  } else if (installments >= 2 && installments <= 6) {
    rate = 3.49;
  } else if (installments >= 7 && installments <= 12) {
    rate = 3.99;
  }

  // O valor que o cliente paga (total com juros) deve cobrir o valor original + as taxas
  // totalComJuros = total + taxaFixa + (totalComJuros * (taxaPercentual / 100))
  // totalComJuros - (totalComJuros * (taxaPercentual / 100)) = total + taxaFixa
  // totalComJuros * (1 - taxaPercentual / 100) = total + taxaFixa
  // totalComJuros = (total + taxaFixa) / (1 - taxaPercentual / 100)
  const totalWithInterest = (total + fixedFee) / (1 - rate / 100);
  const installmentValue = totalWithInterest / installments;

  return {
    installmentValue: parseFloat(installmentValue.toFixed(2)),
    totalWithInterest: parseFloat(totalWithInterest.toFixed(2)),
    interestRate: rate,
    originalTotal: total
  };
}

// Configuração de logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =============================================================================
// CONFIGURAÇÃO ASAAS
// =============================================================================

let asaasClient = null;

const initializeAsaas = () => {
  try {
    const apiKey = process.env.ASAAS_API_KEY;
    
    if (!apiKey) {
      console.error('❌ ASAAS_API_KEY não encontrada');
      return false;
    }

    console.log('🔑 Inicializando Asaas com API Key:', apiKey.substring(0, 10) + '...');

    // Detectar ambiente automaticamente
    let baseURL;
    if (apiKey.includes('sandbox') || apiKey.toLowerCase().includes('test')) {
      baseURL = 'https://sandbox.asaas.com/api/v3';
      console.log('🧪 Ambiente: SANDBOX (Testes)');
    } else {
      baseURL = 'https://sandbox.asaas.com/api/v3';
      console.log('🚀 Ambiente: PRODUÇÃO');
    }

    asaasClient = {
      apiKey: apiKey,
      baseURL: baseURL
    };
    
    console.log('✅ Asaas inicializado com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Falha na inicialização do Asaas:', error.message);
    asaasClient = null;
    return false;
  }
};

initializeAsaas();

// Função para fazer requisições ao Asaas
async function asaasRequest(endpoint, options = {}) {
  if (!asaasClient) {
    throw new Error('Asaas não inicializado');
  }

  const config = {
    method: options.method || 'GET',
    url: `${asaasClient.baseURL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'access_token': asaasClient.apiKey
    },
    ...options
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('❌ Erro na requisição Asaas:', error.response?.data || error.message);
    throw error;
  }
}

// =============================================================================
// FUNÇÕES AUXILIARES UNIFICADAS
// =============================================================================

// Configuração do Nodemailer
let transporter = null;
try {
  transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
    port: process.env.BREVO_SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS
    }
  });
} catch (error) {
  console.warn('⚠️  E-mail não configurado:', error.message);
}

// Função para enviar e-mails
async function sendEmail(to, subject, html) {
  if (!transporter) {
    logger.info(`Simulando envio de e-mail para: ${to}, Assunto: ${subject}`);
    return true;
  }

  try {
    const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@busstore.com';
    const mailOptions = {
      from: `BusStore <${fromEmail}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`E-mail enviado para ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('Erro ao enviar e-mail:', error);
    return false;
  }
}

// FUNÇÃO UNIFICADA: Salvar venda completa (substitui payments e sales separados)
async function saveCompleteSale(saleData) {
  try {
    const saleId = saleData.orderId || `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('💾 Salvando venda completa no Firestore com ID:', saleId);
    
    const saleRef = db.collection('sales').doc(saleId);
    await saleRef.set(saleData); // Já vem limpo da função cleanDataForFirestore
    
    console.log('✅ Venda salva no Firestore:', saleId);
    return saleId;
  } catch (error) {
    console.error('❌ Erro ao salvar venda no Firestore:', error);
    throw error;
  }
}

// Função para atualizar estoque
async function updateStockAfterPurchase(purchasedItems) {
  try {
    for (const item of purchasedItems) {
      const productRef = db.collection('products').doc(item.id.split('-')[0]);
      const productDoc = await productRef.get();
      
      if (productDoc.exists) {
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
          await productRef.update({ variations: updatedVariations });
        }
      }
    }
    console.log('✅ Estoque atualizado com sucesso');
  } catch (error) {
    console.error("❌ Erro ao atualizar estoque:", error);
    throw error;
  }
}

// Função para enviar e-mails de confirmação
async function enviarEmailsConfirmacao(email, orderId, items, amount, paymentMethod) {
  const methodNames = {
    'pix': 'PIX',
    'boleto': 'Boleto',
    'credit_card': 'Cartão de Crédito'
  };

  const buyerEmail = `
    <h1 style="color: #ff6b00;">Obrigado por comprar na BusStore!</h1>
    <p>Seu pedido #${orderId} foi confirmado.</p>
    <p><strong>Método de pagamento:</strong> ${methodNames[paymentMethod] || paymentMethod}</p>
    <h3>Resumo da compra:</h3>
    <ul>
      ${items.map(item => `
        <li>${item.name} - ${item.quantity}x R$ ${item.price.toFixed(2)}</li>
      `).join('')}
    </ul>
    <p><strong>Total: R$ ${amount.toFixed(2)}</strong></p>
    <p>Qualquer dúvida, responda este e-mail.</p>
  `;

  const adminEmail = `
    <h1>Nova venda #${orderId}</h1>
    <p><strong>Cliente:</strong> ${email}</p>
    <p><strong>Método de pagamento:</strong> ${methodNames[paymentMethod] || paymentMethod}</p>
    <h3>Itens:</h3>
    <ul>
      ${items.map(item => `
        <li>${item.name} - ${item.quantity}x R$ ${item.price.toFixed(2)}</li>
      `).join('')}
    </ul>
    <p><strong>Total:</strong> R$ ${amount.toFixed(2)}</p>
    <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
  `;

  Promise.all([
    sendEmail(email, '✅ Compra confirmada - BusStore', buyerEmail),
    sendEmail(process.env.ADMIN_EMAIL || 'admin@example.com', `🛒 Nova venda #${orderId}`, adminEmail)
  ]).catch(emailError => {
    logger.error('Erro ao enviar e-mails:', emailError);
  });
}

// =============================================================================
// ENDPOINT DE PAGAMENTO UNIFICADO
// =============================================================================

app.post('/api/process-payment', async (req, res) => {
  console.log('💰 REQUISIÇÃO DE PAGAMENTO RECEBIDA - ASAAS');
  
  if (!asaasClient) {
    return res.status(500).json({
      status: 'server_error',
      message: 'Serviço de pagamento não configurado'
    });
  }

  try {
    const { 
      amount, 
      email, 
      paymentMethod,
      identification_number,
      items = [],
      payer = {},
      shipping, // Dados de frete do frontend
      userId,
      // Dados específicos para cartão
      split, // Recebe o array de split do frontend
      installments, // Recebe o número de parcelas
      cardName,
      cardNumber,
      expiryMonth,
      expiryYear, 
      phone, // Adicionar 'phone' aqui
      ccv,
      postalCode,
      addressNumber
    } = req.body;

    // VALIDAÇÕES
    if (!amount || amount <= 0 || !email) {
      return res.status(400).json({
        status: 'invalid_request', 
        message: 'Dados inválidos'
      });
    }

    // No início do process-payment, após as validações básicas:
    if ((paymentMethod === 'boleto' || paymentMethod === 'pix') && !identification_number) {
      return res.status(400).json({
        status: 'invalid_document',
        message: 'CPF é obrigatório para boleto e PIX'
      });
    }

    // Validação de CPF
    const cleanCPF = identification_number ? identification_number.replace(/\D/g, '') : '';
    if ((paymentMethod === 'boleto' || paymentMethod === 'pix') && cleanCPF.length !== 11) {
      return res.status(400).json({
        status: 'invalid_document', 
        message: 'CPF inválido. Deve conter 11 dígitos.'
      });
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const customerName = `${payer.first_name || payer.firstName || 'Cliente'} ${payer.last_name || payer.lastName || 'BusStore'}`.trim();

    console.log('📝 Criando pedido:', orderId);

    // 1. CRIAR CLIENTE NO ASAAS
    // 1. CRIAR CLIENTE NO ASAAS (ATUALIZADO)
    let customerId;
    try {
      console.log('🔍 Buscando cliente por email:', email);
      
      const customersResponse = await asaasRequest('/customers', {
        method: 'GET',
        params: { 
          email: email,
          limit: 1 
        }
      });
    
      if (customersResponse.data && customersResponse.data.length > 0) {
        customerId = customersResponse.data[0].id;
        console.log('👤 Cliente existente encontrado:', customerId);
        
        // ✅ ATUALIZAR: Garantir que cliente tem CPF para boleto/PIX
        if ((paymentMethod === 'boleto' || paymentMethod === 'pix') && cleanCPF.length === 11) {
          await asaasRequest(`/customers/${customerId}`, {
            method: 'PUT',
            data: { cpfCnpj: cleanCPF }
          });
          console.log('✅ CPF atualizado para cliente existente');
        }
      } else {
        // Criar novo cliente
        console.log('👤 Criando novo cliente...');
        
        const customerData = {
          name: customerName,
          email: email,
          phone: phone || payer.phone || '11999999999',
          notificationDisabled: false
        };
    
        // ✅ ADICIONAR CPF para boleto/PIX
        if ((paymentMethod === 'boleto' || paymentMethod === 'pix') && cleanCPF.length === 11) {
          customerData.cpfCnpj = cleanCPF;
        }
    
        const newCustomer = await asaasRequest('/customers', {
          method: 'POST',
          data: customerData
        });
    
        customerId = newCustomer.id;
        console.log('✅ Novo cliente criado:', customerId);
      }
    } catch (customerError) {
      console.error('❌ Erro crítico ao processar cliente:', customerError.message);
      return res.status(400).json({
        status: 'customer_error',
        message: 'Erro ao criar cliente: ' + customerError.message
      });
    }

    // 2. VERIFICAR SE TEMOS UM CUSTOMER ID VÁLIDO
    if (!customerId) {
      console.error('❌ Customer ID não gerado');
      return res.status(400).json({
        status: 'customer_error',
        message: 'Não foi possível criar o cliente'
      });
    }

    // 3. CRIAR PAGAMENTO NO ASAAS
    console.log('🔄 Criando pagamento para customer:', customerId);
    
    const paymentData = {
      customer: customerId,
      billingType: getBillingType(paymentMethod),
      value: parseFloat(amount),
      dueDate: getDueDate(paymentMethod),
      description: `Compra BusStore - Pedido ${orderId}`,
      externalReference: orderId, // IMPORTANTE: referência para o webhook,

      // Adiciona o parcelamento se for cartão de crédito e tiver mais de 1 parcela
      ...(paymentMethod === 'credit_card' && installments > 1 && { installmentCount: installments }),
      
      // Adiciona o split se ele for enviado pelo frontend
      ...(split && Array.isArray(split) && { split: split })
    };

    if (paymentMethod === 'credit_card') {
      // PAGAMENTO COM CARTÃO - ATUALIZADO PARA INCLUIR JUROS
      if (!cardNumber || !ccv) {
        return res.status(400).json({
          status: 'invalid_card',
          message: 'Dados do cartão incompletos'
        });
      }

      // 🔄 CALCULAR PARCELAS COM JUROS
      let finalAmount = parseFloat(amount);
      let installmentValue = finalAmount;

      if (installments > 1) {
        const installmentCalc = calculateInstallments(finalAmount, installments);
        finalAmount = installmentCalc.totalWithInterest;
        installmentValue = installmentCalc.installmentValue;
        
        console.log('💰 Cálculo de parcelas:', {
          original: amount,
          com_juros: finalAmount,
          valor_parcela: installmentValue,
          parcelas: installments,
          juros: installmentCalc.interestRate + '%'
        });
      }

      paymentData.creditCard = {
        holderName: cardName || customerName,
        number: cardNumber.replace(/\s/g, ''),
        expiryMonth: expiryMonth,
        expiryYear: expiryYear,
        ccv: ccv,
      };

      paymentData.creditCardHolderInfo = {
        name: customerName,
        email: email,
        postalCode: postalCode || '01311000',
        addressNumber: addressNumber || '1000',
        phone: phone ? phone.replace(/\D/g, '') : '32991235697',
      };

      // 🔥 ESTRUTURA CORRETA para parcelamento no Asaas
      if (installments > 1) {
        paymentData.installmentCount = installments;
        paymentData.totalValue = finalAmount; // Valor TOTAL com juros
      } else {
        // À vista
        paymentData.value = finalAmount;
      }

      paymentData.remoteIp = req.ip || '127.0.0.1';
      
      // Adicionar CPF se disponível
      const cleanCPF = identification_number ? identification_number.replace(/\D/g, '') : '';
      if (cleanCPF.length === 11) {
        paymentData.creditCardHolderInfo.cpfCnpj = cleanCPF;
      }
    }

    // 4. PROCESSAR PAGAMENTO
    let paymentResponse;
    try {
      paymentResponse = await asaasRequest('/payments', {
        method: 'POST',
        data: paymentData
      });

      console.log('✅ Pagamento criado com sucesso:', paymentResponse.id);

    } catch (paymentError) {
      console.error('❌ Erro ao criar pagamento:', paymentError.message);
      
      if (paymentError.response?.data?.errors) {
        paymentError.response.data.errors.forEach((err, index) => {
          console.error(`Erro ${index + 1}:`, err);
        });
      }
      
      throw paymentError;
    }

    // 5. SALVAR VENDA COMPLETA NO FIRESTORE (CORRIGIDO)
    const saleData = {
      // Identificação
      orderId: orderId,
      paymentId: paymentResponse.id,
      customerId: customerId,
      
      // Status e pagamento
      status: mapAsaasStatus(paymentResponse.status),
      paymentStatus: paymentResponse.status,
      paymentMethod: paymentMethod,
      amount: parseFloat(amount),
      
      // Dados do gateway
      gateway: 'asaas',
      
      // Dados do cliente
      customer: {
        name: customerName,
        email: email,
        cpf: cleanCPF || null,
        phone: phone || payer.phone || null
      },
      
      // Itens e valores
      items: items,
      subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      discount: 0,
      total: parseFloat(amount),
      
      // Frete
      shipping: shipping || null,
      
      // Metadados
      userId: userId || 'guest',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // ✅ CORRIGIDO: Dados específicos do pagamento
    if (paymentMethod === 'pix') {
      saleData.pixData = {
        qr_code: paymentResponse.encodedImage || null,
        payload: paymentResponse.payload || null,
        expiration_date: paymentResponse.dueDate || null
      };
    } else if (paymentMethod === 'boleto') {
      saleData.boletoData = {
        // ✅ USANDO OS CAMPOS CORRETOS DO ASAAS
        linha_digitavel: paymentResponse.identificationField || null,
        bankSlipUrl: paymentResponse.bankSlipUrl || null,
        dueDate: paymentResponse.dueDate || null,
        nosso_numero: paymentResponse.nossoNumero || null
      };
    }
    
    // ✅ ADICIONE: Função para limpar campos undefined antes de salvar
    function cleanDataForFirestore(data) {
      const cleaned = { ...data };
      Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === undefined) {
          cleaned[key] = null;
        } else if (cleaned[key] && typeof cleaned[key] === 'object' && !Array.isArray(cleaned[key])) {
          cleaned[key] = cleanDataForFirestore(cleaned[key]);
        }
      });
      return cleaned;
    }
    
    // Salvar venda com dados limpos
    await saveCompleteSale(cleanDataForFirestore(saleData));

    // 6. ATUALIZAR ESTOQUE SE PAGAMENTO APROVADO
    if (paymentResponse.status === 'RECEIVED' || paymentResponse.status === 'CONFIRMED') {
      await updateStockAfterPurchase(items);
      await enviarEmailsConfirmacao(email, orderId, items, amount, paymentMethod);
    }

    // 7. MONTAR RESPOSTA PARA FRONTEND (CORRIGIDA)
    const response = {
      status: 'success',
      message: getStatusMessage(paymentResponse.status),
      payment_id: paymentResponse.id,
      orderId: orderId,
      status: mapAsaasStatus(paymentResponse.status)
    };
    
    // ✅ CORRIGIDO: Dados específicos por método
    if (paymentMethod === 'pix') {
      response.pix_data = {
        qr_code: paymentResponse.encodedImage,
        payload: paymentResponse.payload,
        expiration_date: paymentResponse.dueDate
      };
    } else if (paymentMethod === 'boleto') {
      response.boleto_data = {
        // ✅ APENAS DADOS NECESSÁRIOS PARA REDIRECIONAMENTO
        bankSlipUrl: paymentResponse.bankSlipUrl,
        dueDate: paymentResponse.dueDate,
        // Opcional: linha digitável para display
        linha_digitavel: paymentResponse.identificationField
      };
    }
    
    console.log('📨 Resposta para frontend:', {
      payment_id: response.payment_id,
      status: response.status,
      orderId: response.orderId,
      has_bankSlipUrl: !!response.boleto_data?.bankSlipUrl,
      has_qr_code: !!response.pix_data?.qr_code
    });

    return res.json(response);

  } catch (error) {
    console.error('💥 ERRO NO PROCESSAMENTO ASAAS:');
    console.error('Mensagem:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Resposta Asaas:', JSON.stringify(error.response.data, null, 2));
    }

    let userMessage = 'Erro ao processar pagamento';
    let errorCode = 'unknown_error';

    if (error.response?.data?.errors) {
      const firstError = error.response.data.errors[0];
      userMessage = firstError?.description || error.response.data.message || userMessage;
      errorCode = firstError?.code || errorCode;
    }

    return res.status(500).json({
      status: 'error',
      message: userMessage,
      error_code: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================================================
// WEBHOOK ASAAS ATUALIZADO (TRABALHA APENAS COM SALES)
// =============================================================================

app.post('/api/payments/webhook', async (req, res) => {
  try {
    console.log('🔔 Webhook Asaas recebido:', req.body);

    const { event, payment } = req.body;

    if (event && payment) {
      console.log('🔄 Processando webhook:', {
        event: event,
        paymentId: payment.id,
        externalReference: payment.externalReference,
        status: payment.status
      });

      // Buscar venda pelo externalReference (orderId)
      if (payment.externalReference) {
        const saleRef = db.collection('sales').doc(payment.externalReference);
        const saleDoc = await saleRef.get();

        if (saleDoc.exists) {
          const saleData = saleDoc.data();
          
          console.log('📦 Venda encontrada para atualização:', payment.externalReference);
          
          // Atualizar status da venda
          const updates = {
            status: mapAsaasStatus(payment.status),
            paymentStatus: payment.status,
            gatewayResponse: payment,
            updatedAt: new Date()
          };

          // Se o pagamento foi confirmado, atualizar estoque e enviar e-mail
          if ((payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') && 
              saleData.status !== 'approved') {
            
            console.log('✅ Pagamento confirmado, atualizando estoque...');
            
            await updateStockAfterPurchase(saleData.items);
            await enviarEmailsConfirmacao(
              saleData.customer.email, 
              saleData.orderId, 
              saleData.items, 
              saleData.amount, 
              saleData.paymentMethod
            );
            
            updates.stockUpdated = true;
            updates.emailSent = true;
          }

          await saleRef.update(updates);
          console.log('✅ Venda atualizada via webhook:', payment.externalReference);

        } else {
          console.log('❌ Venda não encontrada para externalReference:', payment.externalReference);
        }
      } else {
        console.log('⚠️  Webhook sem externalReference, ignorando...');
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('💥 Erro no webhook Asaas:', error);
    res.status(500).send('Erro');
  }
});

// =============================================================================
// ENDPOINTS PARA GERENCIAR VENDAS (SUBSTITUEM OS DE PAYMENTS)
// =============================================================================

// Listar vendas com filtros
app.get('/api/sales', async (req, res) => {
  try {
    const { status, userId, page = 1, limit = 10 } = req.query;
    let query = db.collection('sales');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    query = query.orderBy('createdAt', 'desc');
    
    const snapshot = await query
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit))
      .get();
    
    const sales = [];
    snapshot.forEach(doc => {
      sales.push({ id: doc.id, ...doc.data() });
    });
    
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;
    
    res.json({
      sales,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    logger.error('Erro ao listar vendas:', error);
    res.status(500).json({
      status: 'server_error',
      message: 'Erro ao listar vendas'
    });
  }
});

// Consultar venda por ID
app.get('/api/sales/:id', async (req, res) => {
  try {
    const saleId = req.params.id;
    const saleDoc = await db.collection('sales').doc(saleId).get();
    
    if (!saleDoc.exists) {
      return res.status(404).json({
        status: 'not_found',
        message: 'Venda não encontrada'
      });
    }
    
    res.json({ id: saleDoc.id, ...saleDoc.data() });
  } catch (error) {
    logger.error('Erro ao consultar venda:', error);
    res.status(500).json({
      status: 'server_error',
      message: 'Erro ao consultar venda'
    });
  }
});

// Consultar venda por orderId
app.get('/api/sales/order/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const snapshot = await db.collection('sales')
      .where('orderId', '==', orderId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({
        status: 'not_found',
        message: 'Venda não encontrada'
      });
    }
    
    const saleDoc = snapshot.docs[0];
    res.json({ id: saleDoc.id, ...saleDoc.data() });
  } catch (error) {
    logger.error('Erro ao consultar venda por orderId:', error);
    res.status(500).json({
      status: 'server_error',
      message: 'Erro ao consultar venda'
    });
  }
});

// =============================================================================
// FUNÇÕES AUXILIARES ASAAS
// =============================================================================

function getBillingType(paymentMethod) {
  const types = {
    'credit_card': 'CREDIT_CARD',
    'pix': 'PIX',
    'boleto': 'BOLETO'
  };
  return types[paymentMethod] || 'PIX';
}

function getDueDate(paymentMethod) {
  const today = new Date();
  
  if (paymentMethod === 'pix') {
    // PIX expira em 1 hora
    today.setHours(today.getHours() + 1);
    return today.toISOString();
  } else if (paymentMethod === 'boleto') {
    // Boleto vence em 3 dias úteis
    today.setDate(today.getDate() + 3);
    return today.toISOString().split('T')[0];
  }
  
  // Cartão usa data atual
  return today.toISOString().split('T')[0];
}

function mapAsaasStatus(asaasStatus) {
  const statusMap = {
    'PENDING': 'pending',
    'RECEIVED': 'approved',
    'CONFIRMED': 'approved',
    'OVERDUE': 'overdue',
    'REFUNDED': 'refunded',
    'RECEIVED_IN_CASH': 'approved'
  };
  return statusMap[asaasStatus] || 'pending';
}

function getStatusMessage(status) {
  const messages = {
    'RECEIVED': 'Pagamento aprovado com sucesso!',
    'CONFIRMED': 'Pagamento confirmado!',
    'PENDING': 'Pagamento pendente de confirmação',
    'OVERDUE': 'Pagamento em atraso'
  };
  return messages[status] || 'Pagamento processado';
}

// =============================================================================
// ENDPOINTS DE DIAGNÓSTICO
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    asaas: !!asaasClient,
    firestore: !!db,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Diagnóstico do Asaas
app.get('/api/debug-asaas', async (req, res) => {
  try {
    if (!asaasClient) {
      return res.json({
        status: 'error',
        message: 'Asaas não inicializado',
        api_key_present: !!process.env.ASAAS_API_KEY
      });
    }

    const customers = await asaasRequest('/customers', {
      params: { limit: 1 }
    });

    res.json({
      status: 'success',
      message: '✅ Asaas funcionando perfeitamente!',
      customers_count: customers.totalCount,
      environment: asaasClient.baseURL.includes('sandbox') ? 'SANDBOX' : 'PRODUÇÃO'
    });

  } catch (error) {
    res.json({
      status: 'error',
      message: error.message,
      response: error.response?.data
    });
  }
});

// Teste de pagamento PIX simplificado
app.post('/api/test-pix', async (req, res) => {
  try {
    const { amount = 1, email = 'test@busstore.com' } = req.body;

    console.log('🧪 Teste PIX com Asaas - Valor:', amount);

    // Criar cliente
    const customerData = {
      name: 'Cliente Teste',
      email: email,
      phone: '11999999999'
    };

    const customer = await asaasRequest('/customers', {
      method: 'POST',
      data: customerData
    });

    // Criar pagamento
    const paymentData = {
      customer: customer.id,
      billingType: 'PIX',
      value: parseFloat(amount),
      dueDate: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: 'Teste PIX BusStore',
      externalReference: `test_${Date.now()}`
    };

    const payment = await asaasRequest('/payments', {
      method: 'POST',
      data: paymentData
    });

    res.json({
      status: 'success',
      message: '✅ PIX gerado com sucesso!',
      payment_id: payment.id,
      qr_code: payment.encodedImage,
      payload: payment.payload,
      expiration_date: payment.dueDate
    });

  } catch (error) {
    console.error('❌ Erro no teste PIX:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Falha no teste PIX',
      error: error.message
    });
  }
});

// =============================================================================
// MELHOR ENVIO (MANTIDO COMPLETO)
// =============================================================================

const MELHOR_ENVIO_CONFIG = {
  baseURL: 'https://www.melhorenvio.com.br/api/v2',
  token: process.env.MELHOR_ENVIO_TOKEN
};

// Headers de autenticação para Melhor Envio
function getMelhorEnvioHeaders() {
  if (!MELHOR_ENVIO_CONFIG.token) {
    throw new Error('Token do Melhor Envio não configurado');
  }
  
  return {
    'Authorization': `Bearer ${MELHOR_ENVIO_CONFIG.token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'BusStore (suporte@busstore.com)',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip'
  };
}

// Função para calcular dimensões do pacote
function calcularDimensoesPacote(produtos) {
  let pesoTotal = 0;
  let valorTotal = 0;
  let maiorComprimento = 0;
  let maiorLargura = 0;
  let alturaTotal = 0;

  produtos.forEach(produto => {
    const quantidade = produto.quantity || 1;
    pesoTotal += (produto.weight || 0.3) * quantidade;
    valorTotal += (produto.insurance_value || produto.price || 0) * quantidade;
    
    // Para múltiplos itens, consideramos a maior dimensão de cada e somamos a altura
    alturaTotal += (produto.height || 10) * quantidade;
    maiorComprimento = Math.max(maiorComprimento, produto.length || 20);
    maiorLargura = Math.max(maiorLargura, produto.width || 15);
  });

  // Limites mínimos e máximos
  return {
    pesoTotal: Math.max(0.1, Math.min(30, pesoTotal)),
    comprimento: Math.max(16, Math.min(105, maiorComprimento)),
    altura: Math.max(2, Math.min(105, alturaTotal)),
    largura: Math.max(11, Math.min(105, maiorLargura)),
    valorTotal: Math.max(0, valorTotal)
  };
}

// Endpoint para calcular frete usando Melhor Envio
app.post('/api/shipping-quote', async (req, res) => {
  console.log('🚚 Recebida requisição de cálculo de frete Melhor Envio');
  
  const { cepDestino, produtos } = req.body;

  if (!cepDestino) {
    return res.status(400).json({ 
      status: 'error',
      message: 'CEP de destino é obrigatório'
    });
  }

  if (!Array.isArray(produtos) || produtos.length === 0) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Lista de produtos é obrigatória'
    });
  }

  // Validar CEP
  const cepLimpo = cepDestino.replace(/\D/g, '');
  if (cepLimpo.length !== 8) {
    return res.status(400).json({
      status: 'invalid_cep',
      message: 'CEP inválido. Deve conter 8 dígitos.'
    });
  }

  try {
    const opcoesFrete = await calcularFreteMelhorEnvio({
      cepDestino: cepLimpo,
      produtos
    });

    return res.json({
      status: 'success',
      data: opcoesFrete,
      message: `Encontradas ${opcoesFrete.length} opções de frete via Melhor Envio`
    });

  } catch (error) {
    console.error('💥 Erro ao calcular frete Melhor Envio:', error);
    
    // Fallback para cálculo estimado
    try {
      const opcoesFallback = calcularFreteEstimado(cepLimpo, produtos);
      
      return res.json({
        status: 'success',
        data: opcoesFallback,
        message: 'Cálculo de frete estimado (API Melhor Envio temporariamente indisponível)'
      });
    } catch (fallbackError) {
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao calcular frete',
        details: error.message
      });
    }
  }
});

// Função principal para cálculo de frete com Melhor Envio
async function calcularFreteMelhorEnvio({ cepDestino, produtos }) {
  try {
    const cepLimpo = cepDestino.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      throw new Error('CEP inválido');
    }

    // Preparar dados para a cotação
    const cotacaoData = {
      from: {
        postal_code: "36047040" // Seu CEP de origem
      },
      to: {
        postal_code: cepLimpo
      },
      products: produtos.map((produto, index) => ({
        id: produto.id || `prod-${index + 1}`,
        width: Number(produto.width || 15),
        height: Number(produto.height || 10),
        length: Number(produto.length || 20),
        weight: Number(produto.weight || 0.3),
        insurance_value: Number(produto.insurance_value || produto.price || 0),
        quantity: Number(produto.quantity || 1)
      })),
      options: {
        insurance_value: produtos.reduce((total, produto) => {
          return total + (Number(produto.insurance_value) || Number(produto.price) || 0) * (Number(produto.quantity) || 1);
        }, 0),
        receipt: false, // Aviso de recebimento
        own_hand: false, // Mão própria
        collect: false // Coleta
      }
    };

    console.log('📦 Enviando cotação para Melhor Envio:', {
      cepDestino: cepLimpo,
      produtos: produtos.length
    });

    // Fazer a requisição para a API do Melhor Envio
    const response = await axios.post(
      `${MELHOR_ENVIO_CONFIG.baseURL}/me/shipment/calculate`,
      cotacaoData,
      {
        headers: getMelhorEnvioHeaders(),
        timeout: 15000
      }
    );

    if (response.data && Array.isArray(response.data)) {
      const opcoesProcessadas = processarRespostaMelhorEnvio(response.data);
      console.log(`✅ ${opcoesProcessadas.length} opções de frete encontradas`);
      return opcoesProcessadas;
    }

    throw new Error('Resposta inválida da API');

  } catch (error) {
    console.error('❌ Erro ao calcular frete com Melhor Envio:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    throw error;
  }
}

// Processar resposta da API do Melhor Envio
function processarRespostaMelhorEnvio(dadosAPI) {
  const opcoesValidas = dadosAPI.filter(opcao => 
    opcao.price > 0 && 
    opcao.delivery_time > 0 && 
    !opcao.error
  );

  return opcoesValidas
    .map(opcao => ({
      id: opcao.id,
      codigo: opcao.id,
      nome: formatarNomeTransportadora(opcao),
      transportadora: opcao.company?.name || 'Transportadora',
      valor: parseFloat(opcao.price),
      prazoEntrega: parseInt(opcao.delivery_time),
      prazoMinimo: parseInt(opcao.delivery_range?.min || opcao.delivery_time),
      prazoMaximo: parseInt(opcao.delivery_range?.max || opcao.delivery_time),
      empresa: 'melhorenvio',
      origem: 'api',
      detalhes: {
        entregaDomiciliar: opcao.delivery_type === 'DOMICILIO',
        entregaSabado: opcao.delivery_type === 'DOMICILIO',
        observacao: opcao.custom_message || '',
        tipoServico: opcao.name,
        erro: opcao.error || null
      },
      metadados: {
        id: opcao.id,
        company_id: opcao.company?.id,
        service: opcao.service
      }
    }))
    .sort((a, b) => a.valor - b.valor); // Ordenar por preço mais baixo
}

// Formatar nome da transportadora
function formatarNomeTransportadora(opcao) {
  const empresas = {
    'Correios': 'Correios',
    'Jadlog': 'Jadlog',
    'Azul Cargo Express': 'Azul',
    'Latam Cargo': 'LATAM',
    'Braspress': 'Braspress',
    'Direct': 'Direct Log'
  };
  
  const empresaNome = empresas[opcao.company?.name] || opcao.company?.name;
  return `${empresaNome} - ${opcao.name}`;
}

// Função de fallback para quando a API do Melhor Envio não está disponível
function calcularFreteEstimado(cepDestino, produtos) {
  const dimensoes = calcularDimensoesPacote(produtos);
  const { pesoTotal } = dimensoes;
  
  const regiao = cepDestino.charAt(0);
  const base = obterBasePorRegiao(regiao);
  
  const opcoes = [
    {
      id: 'correios-pac',
      codigo: '04510',
      nome: 'Correios - PAC',
      transportadora: 'Correios',
      valor: Math.max(base.pac * pesoTotal, 12.00),
      prazoEntrega: base.prazo + 3,
      empresa: 'estimado',
      origem: 'fallback',
      detalhes: {
        entregaDomiciliar: true,
        entregaSabado: false,
        observacao: 'Valor estimado (API indisponível)'
      }
    },
    {
      id: 'correios-sedex',
      codigo: '04014',
      nome: 'Correios - SEDEX',
      transportadora: 'Correios',
      valor: Math.max(base.sedex * pesoTotal, 18.00),
      prazoEntrega: base.prazo,
      empresa: 'estimado',
      origem: 'fallback',
      detalhes: {
        entregaDomiciliar: true,
        entregaSabado: true,
        observacao: 'Valor estimado (API indisponível)'
      }
    },
    {
      id: 'jadlog-package',
      codigo: 'JADLOG_PACKAGE',
      nome: 'Jadlog - Package',
      transportadora: 'Jadlog',
      valor: Math.max(base.jadlog * pesoTotal, 20.00),
      prazoEntrega: base.prazo + 2,
      empresa: 'estimado',
      origem: 'fallback',
      detalhes: {
        entregaDomiciliar: true,
        entregaSabado: true,
        observacao: 'Valor estimado (API indisponível)'
      }
    }
  ];

  return opcoes
    .filter(servico => servico.valor > 0)
    .sort((a, b) => a.valor - b.valor);
}
//teste pra ver se funciona
function obterBasePorRegiao(regiao) {
  const bases = {
    '0': { pac: 2.5, sedex: 3.5, jadlog: 3.0, prazo: 3 }, // SP
    '1': { pac: 3.0, sedex: 4.0, jadlog: 3.5, prazo: 5 }, // Sul/Sudeste
    '2': { pac: 4.0, sedex: 5.0, jadlog: 4.5, prazo: 8 }, // Nordeste
    '3': { pac: 5.0, sedex: 6.0, jadlog: 5.5, prazo: 10 }, // Norte
    '7': { pac: 4.5, sedex: 5.5, jadlog: 5.0, prazo: 7 }  // Centro-Oeste
  };
  
  return bases[regiao] || bases['1'];
}

// Endpoint para saúde do Melhor Envio
app.get('/api/shipping/health', async (req, res) => {
  try {
    if (!MELHOR_ENVIO_CONFIG.token) {
      return res.status(500).json({
        status: 'error',
        message: 'Token do Melhor Envio não configurado'
      });
    }

    const response = await axios.get(
      `${MELHOR_ENVIO_CONFIG.baseURL}/me/companies`,
      {
        headers: getMelhorEnvioHeaders(),
        timeout: 10000
      }
    );
    
    res.json({
      status: 'success',
      message: 'Conexão com Melhor Envio OK',
      transportadoras: response.data.length,
      environment: 'production'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Falha na conexão com Melhor Envio',
      error: error.message
    });
  }
});


// =============================================================================
// ENDPOINT DE SIMULAÇÃO DE PARCELAS
// =============================================================================

app.post('/api/simulate-installments', async (req, res) => {
  try {
    const { amount } = req.body;
    const total = parseFloat(amount);

    if (!total || total <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valor inválido'
      });
    }

    // Mesma tabela de juros
    const interestRates = {
      1: 0, 2: 0, 3: 0, 4: 0.99, 5: 1.99, 6: 2.99,
      7: 3.99, 8: 4.99, 9: 5.99, 10: 6.99, 11: 7.99, 12: 8.99
    };

    const installments = [];

    for (let i = 1; i <= 12; i++) {
      const rate = interestRates[i] || 0;
      const totalWithInterest = total * (1 + rate / 100);
      const installmentValue = totalWithInterest / i;

      installments.push({
        number: i,
        value: parseFloat(installmentValue.toFixed(2)),
        total: parseFloat(totalWithInterest.toFixed(2)),
        hasInterest: rate > 0,
        interestRate: rate,
        display: `${i}x de R$ ${installmentValue.toFixed(2)} ${rate > 0 ? `(Total: R$ ${totalWithInterest.toFixed(2)})` : 'sem juros'}`
      });
    }

    res.json({
      status: 'success',
      installments: installments,
      original_amount: total
    });

  } catch (error) {
    console.error('Erro ao simular parcelas:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao calcular parcelas'
    });
  }
});

// =============================================================================
// INICIALIZAÇÃO DO SERVIDOR
// =============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  console.log(`💳 Asaas: ${asaasClient ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`📦 Melhor Envio: ${MELHOR_ENVIO_CONFIG.token ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`🌍 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔔 Webhook Asaas: http://localhost:${PORT}/api/payments/webhook`);
  
  if (!asaasClient) {
    console.log('❌ CONFIGURE O ASAAS: Adicione ASAAS_API_KEY no .env');
  }
});