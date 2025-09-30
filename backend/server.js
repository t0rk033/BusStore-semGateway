const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');
const { db } = require('./firebase-admin.js');
const winston = require('winston');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();

// DEBUG INICIAL - Verificar variáveis de ambiente
console.log('=== INICIALIZAÇÃO DO SERVIDOR ===');
console.log('Diretório:', __dirname);
console.log('MERCADOPAGO_ACCESS_TOKEN:', process.env.MERCADOPAGO_ACCESS_TOKEN ? 'PRESENTE' : 'AUSENTE');
console.log('MP_ACCESS_TOKEN:', process.env.MP_ACCESS_TOKEN ? 'PRESENTE' : 'AUSENTE');
console.log('MELHOR_ENVIO_TOKEN:', process.env.MELHOR_ENVIO_TOKEN ? 'PRESENTE' : 'AUSENTE');
console.log('PORT:', process.env.PORT);
console.log('===============================');

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
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Configuração Melhor Envio
const MELHOR_ENVIO_CONFIG = {
  baseURL: 'https://www.melhorenvio.com.br/api/v2',
  token: process.env.MELHOR_ENVIO_TOKEN
};

// Configuração do CORS mais flexível para desenvolvimento
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Verificar se as variáveis de ambiente estão definidas
logger.info('Variáveis de ambiente:');
logger.info('BREVO_SMTP_USER:', process.env.BREVO_SMTP_USER ? 'Definida' : 'Não definida');
logger.info('BREVO_FROM_EMAIL:', process.env.BREVO_FROM_EMAIL ? 'Definida' : 'Não definida');
logger.info('ADMIN_EMAIL:', process.env.ADMIN_EMAIL ? 'Definida' : 'Não definida');
logger.info('MP_ACCESS_TOKEN:', process.env.MP_ACCESS_TOKEN ? 'Definida' : 'Não definida');
logger.info('MERCADOPAGO_ACCESS_TOKEN:', process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Definida' : 'Não definida');
logger.info('MELHOR_ENVIO_TOKEN:', process.env.MELHOR_ENVIO_TOKEN ? 'Definida' : 'Não definida');

// Configuração do Mercado Pago
let mercadoPago = null;
let mercadoPagoClient = null;

try {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 
                     process.env.MP_ACCESS_TOKEN || 
                     'TEST-2424042295647561-020514-9b1628e7f33b6ff8f121ea721bc3ffd7-1804058981';
  
  console.log('🔑 Token sendo usado:', accessToken.substring(0, 20) + '...');
  
  mercadoPagoClient = new MercadoPagoConfig({ accessToken });
  mercadoPago = {
    payment: new Payment(mercadoPagoClient)
  };
  
  logger.info('Mercado Pago configurado com sucesso');
  console.log('✅ Mercado Pago configurado com sucesso');

} catch (error) {
  logger.error('Erro ao configurar Mercado Pago:', error);
  console.error('❌ ERRO na configuração do Mercado Pago:', error.message);
  
  try {
    console.log('🔄 Tentando fallback de emergência...');
    mercadoPagoClient = new MercadoPagoConfig({ 
      accessToken: 'TEST-2424042295647561-020514-9b1628e7f33b6ff8f121ea721bc3ffd7-1804058981'
    });
    mercadoPago = {
      payment: new Payment(mercadoPagoClient)
    };
    console.log('✅ Fallback de emergência bem-sucedido');
  } catch (fallbackError) {
    console.error('❌ Fallback também falhou:', fallbackError.message);
  }
}

// Verificação final
if (!mercadoPago) {
  console.error('⚠️  Mercado Pago não inicializado! O servidor continuará sem funcionalidade de pagamentos.');
} else {
  console.log('✅ Mercado Pago pronto para uso');
}

// Configuração do Nodemailer com Brevo
let transporter;

try {
  transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
    port: process.env.BREVO_SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  transporter.verify((error, success) => {
    if (error) {
      logger.error('Erro na conexão SMTP:', error);
    } else {
      logger.info('Conexão SMTP configurada com sucesso');
    }
  });
} catch (error) {
  logger.error('Erro ao configurar o transporter de e-mail:', error);
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

// Mapeamento de status do Mercado Pago
const paymentStatusMessages = {
  'approved': {
    status: 'approved',
    message: 'Pagamento aprovado com sucesso!',
    description: 'Seu pagamento foi aprovado e o pedido está sendo processado.'
  },
  'pending': {
    status: 'pending',
    message: 'Pagamento pendente de confirmação',
    description: 'Seu pagamento está sendo processado. Em breve você receberá uma confirmação.'
  },
  'authorized': {
    status: 'authorized',
    message: 'Pagamento autorizado',
    description: 'Seu pagamento foi autorizado e está aguardando confirmação.'
  },
  'in_process': {
    status: 'in_process',
    message: 'Pagamento em análise',
    description: 'Seu pagamento está sendo analisado. Isso pode levar até 2 dias úteis.'
  },
  'rejected': {
    status: 'rejected',
    message: 'Pagamento recusado',
    description: 'Infelizmente seu pagamento foi recusado. Por favor, tente novamente com outro método de pagamento.'
  },
  'cancelled': {
    status: 'cancelled',
    message: 'Pagamento cancelado',
    description: 'O pagamento foi cancelado antes da conclusão.'
  },
  'refunded': {
    status: 'refunded',
    message: 'Pagamento reembolsado',
    description: 'O valor do pagamento foi devolvido ao cliente.'
  },
  'charged_back': {
    status: 'charged_back',
    message: 'Estorno realizado',
    description: 'Foi realizado um estorno no valor do pagamento.'
  }
};

// Middleware de logging para todas as requisições
app.use((req, res, next) => {
  logger.info(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Endpoint de saúde da API
app.get('/health', async (req, res) => {
  try {
    await db.collection('health').doc('test').set({ 
      test: new Date().toISOString(),
      message: 'Teste de conexão Firebase'
    });
    await db.collection('health').doc('test').delete();
    
    res.status(200).json({
      status: 'OK',
      message: 'Servidor está funcionando',
      timestamp: new Date().toISOString(),
      mercadopago: mercadoPago ? 'Configurado' : 'Não configurado',
      email: transporter ? 'Configurado' : 'Não configurado',
      firestore: 'Conectado',
      melhorenvio: MELHOR_ENVIO_CONFIG.token ? 'Configurado' : 'Não configurado'
    });
  } catch (error) {
    res.status(200).json({
      status: 'WARNING',
      message: 'Servidor está funcionando mas com problemas de conexão',
      timestamp: new Date().toISOString(),
      mercadopago: mercadoPago ? 'Configurado' : 'Não configurado',
      email: transporter ? 'Configurado' : 'Não configurado',
      firestore: 'Desconectado',
      melhorenvio: MELHOR_ENVIO_CONFIG.token ? 'Configurado' : 'Não configurado',
      error: error.message
    });
  }
});

// Função para salvar pagamento no Firestore
async function savePaymentToFirestore(paymentData) {
  try {
    let paymentId = paymentData.paymentId;
    
    if (!paymentId || typeof paymentId !== 'string' || paymentId.trim() === '') {
      console.warn('⚠️  paymentId inválido ou vazio, gerando novo ID');
      paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      paymentData.paymentId = paymentId;
    }

    paymentId = paymentId.replace(/[\/\.]/g, '_');
    
    console.log('💾 Salvando pagamento no Firestore com ID:', paymentId);
    
    const paymentRef = db.collection('payments').doc(paymentId);
    await paymentRef.set({
      ...paymentData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Pagamento salvo no Firestore:', paymentId);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar pagamento no Firestore:', error);
    
    try {
      console.log('🔄 Tentando salvar com ID automático...');
      const fallbackRef = await db.collection('payments').add({
        ...paymentData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Pagamento salvo com ID automático:', fallbackRef.id);
      return true;
    } catch (fallbackError) {
      console.error('❌ Falha também no fallback:', fallbackError);
      return false;
    }
  }
}

// Função para enviar e-mails de confirmação
async function enviarEmailsConfirmacao(email, orderId, items, amount, paymentMethod) {
  const methodNames = {
    'pix': 'PIX',
    'debit_card': 'Cartão de Débito',
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

// Endpoint para processar pagamentos (PIX, Débito e Crédito)
app.post('/api/process-payment', async (req, res) => {
  if (!mercadoPago || !mercadoPago.payment) {
    console.error('❌ Mercado Pago não disponível para processar pagamento');
    return res.status(500).json({
      status: 'server_error',
      message: 'Serviço de pagamento indisponível no momento',
      details: 'Sistema de pagamento não inicializado corretamente'
    });
  }

  logger.info('Recebida requisição de pagamento:', {
    paymentMethod: req.body.paymentMethod,
    amount: req.body.amount,
    email: req.body.email
  });

  try {
    const { 
      token, 
      amount, 
      description, 
      installments, 
      payment_method_id, 
      issuer_id, 
      email, 
      items = [], 
      orderId, 
      userId,
      paymentMethod, // 'pix', 'debit_card', 'credit_card'
      payer // Dados adicionais para PIX
    } = req.body;

    if (!amount || !email || !orderId || !userId) {
      logger.error('Dados de pagamento incompletos:', { 
        amount: !!amount, 
        email: !!email,
        orderId: !!orderId,
        userId: !!userId
      });
      
      return res.status(400).json({
        status: 'invalid_request',
        message: 'Dados de pagamento incompletos',
        details: 'Valor, email, orderId e userId são obrigatórios'
      });
    }

    const transactionAmount = parseFloat(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      return res.status(400).json({
        status: 'invalid_amount',
        message: 'Valor de transação inválido',
        details: 'O valor deve ser um número positivo'
      });
    }

    // Configuração base do pagamento
    const paymentData = {
      transaction_amount: transactionAmount,
      description: description || 'Compra na BusStore',
      payer: {
        email,
        identification: {
          type: req.body.identification_type || 'CPF',
          number: req.body.identification_number || '12345678900'
        }
      }
    };

    // Configurações específicas por tipo de pagamento
    if (paymentMethod === 'pix') {
      // Pagamento via PIX
      paymentData.payment_method_id = 'pix';
      paymentData.point_of_interaction = {
        type: 'PIX'
      };
      
      // Adicionar dados do comprador para PIX
      if (payer) {
        paymentData.payer.first_name = payer.firstName;
        paymentData.payer.last_name = payer.lastName;
      }
      
    } else if (paymentMethod === 'debit_card') {
      // Pagamento via débito
      paymentData.payment_method_id = payment_method_id || 'pix';
      paymentData.installments = 1; // Débito sempre 1 parcela
      paymentData.token = token;
      
    } else if (paymentMethod === 'credit_card') {
      // Pagamento via crédito
      paymentData.payment_method_id = payment_method_id || 'visa';
      paymentData.installments = installments ? parseInt(installments) : 1;
      paymentData.issuer_id = issuer_id;
      paymentData.token = token;
    }

    console.log('💰 Processando pagamento:', {
      method: paymentMethod,
      amount: transactionAmount,
      email: email
    });

    const paymentResponse = await mercadoPago.payment.create({ body: paymentData });
    
    console.log('✅ Pagamento processado:', {
      id: paymentResponse.id,
      status: paymentResponse.status,
      method: paymentResponse.payment_method_id
    });

    // Preparar dados para salvar no Firestore
    const paymentDataToSave = {
      paymentId: paymentResponse.id,
      orderId,
      userId,
      status: paymentResponse.status,
      amount: transactionAmount,
      paymentMethod: paymentResponse.payment_method_id,
      paymentType: paymentMethod,
      description: paymentResponse.description,
      gatewayResponse: paymentResponse,
      items: items,
      payer: {
        email: paymentResponse.payer.email,
        identification: paymentResponse.payer.identification
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Adicionar dados específicos do PIX
    if (paymentMethod === 'pix' && paymentResponse.point_of_interaction) {
      paymentDataToSave.pixData = {
        qr_code: paymentResponse.point_of_interaction.transaction_data?.qr_code,
        qr_code_base64: paymentResponse.point_of_interaction.transaction_data?.qr_code_base64,
        ticket_url: paymentResponse.point_of_interaction.transaction_data?.ticket_url,
        expiration_date: paymentResponse.point_of_interaction.transaction_data?.expiration_date
      };
    }

    // Salvar no Firestore
    await savePaymentToFirestore(paymentDataToSave);

    // Envio de e-mails se pagamento aprovado
    if (paymentResponse.status === 'approved') {
      await enviarEmailsConfirmacao(email, orderId, items, transactionAmount, paymentMethod);
    }

    // Resposta específica para PIX
    if (paymentMethod === 'pix') {
      const response = {
        status: 'pending',
        message: 'Pagamento PIX criado com sucesso',
        payment_id: paymentResponse.id,
        pix_data: paymentResponse.point_of_interaction?.transaction_data || {},
        qr_code: paymentResponse.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: paymentResponse.point_of_interaction?.transaction_data?.ticket_url,
        expiration_date: paymentResponse.point_of_interaction?.transaction_data?.expiration_date
      };
      
      return res.status(200).json(response);
    }

    const statusResponse = paymentStatusMessages[paymentResponse.status] || {
      status: paymentResponse.status,
      message: 'Status de pagamento desconhecido',
      description: 'O status do pagamento não pôde ser determinado.'
    };

    const response = {
      ...statusResponse,
      payment_id: paymentResponse.id,
      date_created: paymentResponse.date_created,
      date_approved: paymentResponse.date_approved,
      date_last_updated: paymentResponse.date_last_updated,
      payment_method: paymentResponse.payment_method_id,
      payment_type: paymentResponse.payment_type_id,
      status_detail: paymentResponse.status_detail,
      currency_id: paymentResponse.currency_id,
      transaction_amount: paymentResponse.transaction_amount,
      installments: paymentResponse.installments,
      taxes_amount: paymentResponse.taxes_amount,
      shipping_amount: paymentResponse.shipping_amount,
      collector_id: paymentResponse.collector_id,
      payer: paymentResponse.payer
    };

    const httpStatus = paymentResponse.status === 'approved' ? 200 : 
                      paymentResponse.status === 'pending' ? 202 : 400;

    logger.info(`Pagamento processado com status: ${paymentResponse.status}`);
    return res.status(httpStatus).json(response);

  } catch (error) {
    console.error('💥 ERRO DETALHADO no processamento do pagamento:');
    console.error('Mensagem:', error.message);
    console.error('Código:', error.code);
    
    if (error.response) {
      console.error('Status do erro:', error.response.status);
      console.error('Dados do erro:', error.response.data);
      
      logger.error('Detalhes do erro Mercado Pago:', error.response.data);
      
      const mpError = error.response.data;
      return res.status(error.response.status || 400).json({
        status: 'mp_error',
        message: mpError.message || 'Erro no processamento do pagamento',
        error_code: mpError.error,
        causes: mpError.causes || [],
        status_code: mpError.status || 400
      });
    }

    logger.error('Erro no processamento do pagamento:', error);

    return res.status(500).json({
      status: 'server_error',
      message: 'Erro interno no servidor',
      details: error.message,
      error_code: error.code
    });
  }
});

// Endpoint para webhook de notificações do Mercado Pago
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      logger.info('Webhook recebido para pagamento:', paymentId);
      
      // Buscar detalhes atualizados do pagamento
      const paymentDetails = await mercadoPago.payment.get({ id: paymentId });
      
      // Atualizar no Firestore
      try {
        await db.collection('payments').doc(paymentId).update({
          status: paymentDetails.status,
          gatewayResponse: paymentDetails,
          updatedAt: new Date()
        });
        console.log('✅ Status do pagamento atualizado no Firestore:', paymentId);
      } catch (firestoreError) {
        console.error('❌ Erro ao atualizar Firestore:', firestoreError);
      }
      
      logger.info(`Status do pagamento ${paymentId} atualizado para: ${paymentDetails.status}`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Erro no webhook:', error);
    res.status(500).send('Erro ao processar webhook');
  }
});

// Endpoint para consultar pagamento
app.get('/api/payments/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;
    
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    if (!paymentDoc.exists) {
      return res.status(404).json({
        status: 'not_found',
        message: 'Pagamento não encontrado'
      });
    }
    
    res.json({ id: paymentDoc.id, ...paymentDoc.data() });
  } catch (error) {
    logger.error('Erro ao consultar pagamento:', error);
    res.status(500).json({
      status: 'server_error',
      message: 'Erro ao consultar pagamento'
    });
  }
});

// Endpoint para listar pagamentos com filtros
app.get('/api/payments', async (req, res) => {
  try {
    const { status, userId, page = 1, limit = 10 } = req.query;
    let query = db.collection('payments');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    query = query.orderBy('createdAt', 'desc');
    
    // Paginação
    const snapshot = await query
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit))
      .get();
    
    const payments = [];
    snapshot.forEach(doc => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    
    // Para obter o total (pode ser caro em grandes coleções)
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;
    
    res.json({
      payments,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    logger.error('Erro ao listar pagamentos:', error);
    res.status(500).json({
      status: 'server_error',
      message: 'Erro ao listar pagamentos'
    });
  }
});

// =============================================================================
// IMPLEMENTAÇÃO MELHOR ENVIO (ATUALIZADA)
// =============================================================================

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
// ROTAS GERAIS
// =============================================================================

// Rota de teste melhorada
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend da BusStore está funcionando!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    features: {
      mercadopago: true,
      melhorenvio: true,
      pix: true,
      debit_card: true,
      credit_card: true,
      email: !!transporter
    }
  });
});

// Rota para visualizar configuração
app.get('/debug/config', (req, res) => {
  res.json({
    mercadopago: {
      configured: !!mercadoPago,
      accessToken: process.env.MP_ACCESS_TOKEN ? 'DEFINIDO' : 'NÃO DEFINIDO',
      mercadopagoAccessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'DEFINIDO' : 'NÃO DEFINIDO'
    },
    melhorenvio: {
      configured: !!MELHOR_ENVIO_CONFIG.token,
      token: MELHOR_ENVIO_CONFIG.token ? 'DEFINIDO' : 'NÃO DEFINIDO'
    },
    email: {
      configured: !!transporter,
      user: process.env.BREVO_SMTP_USER,
      from: process.env.BREVO_FROM_EMAIL
    },
    firebase: {
      configured: !!db,
      projectId: 'busstore-3240d'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Middleware de tratamento de erros global
app.use((error, req, res, next) => {
  logger.error('Erro não tratado:', error);
  res.status(500).json({
    status: 'error',
    message: 'Erro interno no servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Ocorreu um erro inesperado'
  });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💳 Mercado Pago: ${mercadoPago ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`📦 Melhor Envio: ${MELHOR_ENVIO_CONFIG.token ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`📧 E-mail: ${transporter ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`🔥 Firebase: ${db ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`💰 Pagamentos disponíveis: PIX ✅ | Débito ✅ | Crédito ✅`);
  
  if (!process.env.MP_ACCESS_TOKEN && !process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.log('⚠️  AVISO: Token do Mercado Pago não definido. Usando token de teste.');
  }
  
  if (!MELHOR_ENVIO_CONFIG.token) {
    console.log('⚠️  AVISO: Token do Melhor Envio não definido. O cálculo de frete usará fallback.');
  }
  
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    console.log('⚠️  AVISO: Credenciais de e-mail não definidas. O envio de e-mails será simulado.');
  }
});