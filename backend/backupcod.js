const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { MercadoPagoConfig, Payment, MercadoPago } = require('mercadopago');
const nodemailer = require('nodemailer');
const { db } = require('./firebase-admin.js');
const winston = require('winston');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();

// DEBUG INICIAL
console.log('=== INICIALIZAÇÃO DO SERVIDOR ===');
console.log('MERCADOPAGO_ACCESS_TOKEN:', process.env.MERCADOPAGO_ACCESS_TOKEN ? 'PRESENTE' : 'AUSENTE');
console.log('MP_ACCESS_TOKEN:', process.env.MP_ACCESS_TOKEN ? 'PRESENTE' : 'AUSENTE');
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

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =============================================================================
// CONFIGURAÇÃO MERCADO PAGO
// =============================================================================

let mercadoPagoClient = null;

// Função para inicializar o Mercado Pago
const initializeMercadoPago = () => {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('Nenhum token do Mercado Pago encontrado nas variáveis de ambiente');
    }

    console.log('🔑 Inicializando Mercado Pago com token:', accessToken.substring(0, 20) + '...');

    // Configuração CORRETA segundo a documentação
    const client = new MercadoPagoConfig({ 
      accessToken: accessToken,
      options: { 
        timeout: 5000,
        idempotencyKey: 'busstore-' + Date.now()
      }
    });

    mercadoPagoClient = new Payment(client);
    console.log('✅ Mercado Pago inicializado com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Falha crítica na inicialização do Mercado Pago:', error.message);
    mercadoPagoClient = null;
    return false;
  }
};

// Inicializar ao iniciar o servidor
initializeMercadoPago();

// =============================================================================
// FUNÇÕES AUXILIARES
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

// Mapeamento de status do Mercado Pago
const paymentStatusMessages = {
  'approved': { status: 'approved', message: 'Pagamento aprovado!' },
  'pending': { status: 'pending', message: 'Pagamento pendente' },
  'in_process': { status: 'in_process', message: 'Pagamento em análise' },
  'rejected': { status: 'rejected', message: 'Pagamento recusado' },
  'cancelled': { status: 'cancelled', message: 'Pagamento cancelado' },
  'authorized': { status: 'authorized', message: 'Pagamento autorizado' }
};

// Middleware de logging para todas as requisições
app.use((req, res, next) => {
  logger.info(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Endpoint de saúde da API
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mercadopago: !!mercadoPagoClient,
    firestore: !!db
  });
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

// =============================================================================
// ENDPOINT DE PAGAMENTO CORRIGIDO
// =============================================================================

app.post('/api/process-payment', async (req, res) => {
  console.log('💰 REQUISIÇÃO DE PAGAMENTO RECEBIDA');
  console.log('📦 Dados recebidos:', JSON.stringify({
    paymentMethod: req.body.paymentMethod,
    amount: req.body.amount,
    email: req.body.email,
    token: req.body.token ? req.body.token.substring(0, 20) + '...' : 'NÃO ENVIADO',
    payment_method_id: req.body.payment_method_id,
    issuer_id: req.body.issuer_id,
    installments: req.body.installments
  }, null, 2));

  // Verificação crítica do Mercado Pago
  if (!mercadoPagoClient) {
    console.error('❌ MERCADO PAGO NÃO INICIALIZADO - Verifique o token de acesso');
    return res.status(500).json({
      status: 'server_error',
      message: 'Serviço de pagamento não configurado',
      code: 'MP_NOT_INITIALIZED'
    });
  }

  try {
    const { 
      amount, 
      email, 
      token,
      payment_method_id,
      issuer_id,
      installments = 1,
      identification_number,
      items = [],
      payer = {}
    } = req.body;

    // VALIDAÇÕES CRÍTICAS
    if (!token) {
      return res.status(400).json({
        status: 'invalid_request',
        message: 'Token do cartão não recebido'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'invalid_amount', 
        message: 'Valor da transação inválido'
      });
    }

    // DADOS DO PAGAMENTO - ESTRUTURA OFICIAL MERCADO PAGO
    const paymentData = {
      transaction_amount: parseFloat(amount),
      token: token,
      description: `Compra BusStore - ${items.length} item(s)`,
      installments: parseInt(installments),
      payment_method_id: payment_method_id,
      payer: {
        email: email,
        first_name: payer.first_name || payer.firstName || 'Test',
        last_name: payer.last_name || payer.lastName || 'User',
        identification: {
          type: 'CPF',
          number: identification_number || '12345678909'
        },
        address: {
          zip_code: '06233902',
          street_name: 'Av das Nações Unidas',
          street_number: '3003',
          neighborhood: 'Bonfim', 
          city: 'Osasco',
          federal_unit: 'SP'
        }
      },
      external_reference: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      capture: true // Capturar o pagamento imediatamente
    };

    // Adicionar issuer_id se disponível
    if (issuer_id) {
      paymentData.issuer_id = parseInt(issuer_id);
    }

    console.log('🔄 Enviando para Mercado Pago:', {
      amount: paymentData.transaction_amount,
      payment_method: paymentData.payment_method_id,
      issuer_id: paymentData.issuer_id || 'não informado',
      installments: paymentData.installments,
      reference: paymentData.external_reference
    });

    // TENTATIVA DE PAGAMENTO
    const payment = await mercadoPagoClient.create({ body: paymentData });
    
    console.log('✅ PAGAMENTO CRIADO COM SUCESSO:', {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      payment_method: payment.payment_method_id,
      authorization_code: payment.authorization_code
    });

    // RESPOSTA DE SUCESSO
    return res.json({
      status: payment.status,
      message: getStatusMessage(payment.status),
      payment_id: payment.id,
      orderId: paymentData.external_reference,
      authorization_code: payment.authorization_code,
      payment_method: payment.payment_method_id
    });

  } catch (error) {
    console.error('💥 ERRO CRÍTICO NO PROCESSAMENTO:');
    console.error('Mensagem:', error.message);
    console.error('Código:', error.code);
    
    // LOG DETALHADO DO ERRO DO MERCADO PAGO
    if (error.response) {
      console.error('Status HTTP:', error.response.status);
      console.error('Resposta MP:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.causes) {
        console.error('Causas do erro:');
        error.response.data.causes.forEach((cause, index) => {
          console.error(`  ${index + 1}. Código: ${cause.code}, Descrição: ${cause.description}`);
        });
      }
    }

    // ANÁLISE ESPECÍFICA DO ERRO
    let userMessage = 'Erro ao processar pagamento';
    let errorCode = 'unknown_error';
    
    if (error.response?.data) {
      const mpError = error.response.data;
      
      // Mapeamento de erros específicos do MP
      if (mpError.message?.includes('internal_error')) {
        userMessage = 'Erro interno no gateway de pagamento. Tente novamente em alguns instantes.';
        errorCode = 'gateway_internal_error';
      } else if (mpError.causes) {
        const firstCause = mpError.causes[0];
        userMessage = firstCause?.description || mpError.message || userMessage;
        errorCode = firstCause?.code || errorCode;
      } else {
        userMessage = mpError.message || userMessage;
        errorCode = mpError.error || errorCode;
      }
    }

    return res.status(500).json({
      status: 'error',
      message: userMessage,
      error_code: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

function getStatusMessage(status) {
  const messages = {
    'approved': 'Pagamento aprovado com sucesso!',
    'pending': 'Pagamento pendente de confirmação',
    'in_process': 'Pagamento em análise',
    'rejected': 'Pagamento recusado'
  };
  return messages[status] || 'Pagamento processado';
}

function getStatusMessage(status) {
  const messages = {
    'approved': 'Pagamento aprovado com sucesso!',
    'pending': 'Pagamento pendente de confirmação', 
    'in_process': 'Pagamento em análise',
    'rejected': 'Pagamento recusado'
  };
  return messages[status] || 'Pagamento processado';
}

// Função auxiliar para mensagens de status
function getStatusMessage(status) {
  const messages = {
    'approved': 'Pagamento aprovado com sucesso!',
    'pending': 'Pagamento pendente de confirmação',
    'in_process': 'Pagamento em análise',
    'rejected': 'Pagamento recusado'
  };
  return messages[status] || 'Pagamento processado';
}

// Função auxiliar para mapear métodos de pagamento
function getPaymentMethodId(paymentMethod) {
  const methods = {
    'credit_card': 'visa', // Será sobrescrito pelo token
    'debit_card': 'debvisa', // Será sobrescrito pelo token  
    'pix': 'pix'
  };
  return methods[paymentMethod] || 'pix';
}

// =============================================================================
// WEBHOOK
// =============================================================================
// Endpoint de emergência - processamento direto
app.post('/api/direct-payment', async (req, res) => {
  try {
    const { amount, email } = req.body;

    console.log('🚨 TENTATIVA DE PAGAMENTO DIRETO');

    // Dados fixos para teste (cartão de teste do MP)
    const paymentData = {
      transaction_amount: parseFloat(amount),
      token: 'ff8080814c11e237014c1ff593b57b4d', // Token fixo de teste
      description: 'Pagamento de Teste BusStore',
      installments: 1,
      payment_method_id: 'visa',
      payer: {
        email: email || 'test_user_123456@testuser.com',
        identification: {
          type: 'CPF',
          number: '12345678909'
        }
      }
    };

    console.log('🔄 Processando com dados fixos...');
    const payment = await mercadoPagoClient.create({ body: paymentData });
    
    console.log('✅ PAGAMENTO DIRETO BEM-SUCEDIDO:', payment.id);
    
    res.json({
      status: 'success',
      message: 'Pagamento de teste realizado com sucesso!',
      payment_id: payment.id,
      status: payment.status
    });

  } catch (error) {
    console.error('❌ FALHA NO PAGAMENTO DIRETO:', error.message);
    
    if (error.response?.data) {
      console.error('Detalhes MP:', JSON.stringify(error.response.data, null, 2));
    }

    res.status(500).json({
      status: 'error',
      message: 'Falha mesmo com dados fixos. Problema no Mercado Pago.',
      details: error.message
    });
  }
});
// Endpoint para webhook de notificações do Mercado Pago
app.post('/api/payments/webhook', async (req, res) => {
  try {
    console.log('🔔 Webhook recebido:', req.query, req.body);

    const { type, data } = req.body; // Notificações via POST body
    const { topic, id } = req.query; // Notificações via query string

    let paymentId;
    let notificationType = type || topic;
    
    if (notificationType === 'payment') {
      if ((topic === 'payment' || type === 'payment') && (id || data?.id)) {
        const paymentId = id || data.id;
        
        console.log('🔄 Processando webhook para pagamento:', paymentId);

        // Buscar detalhes atualizados do Mercado Pago
        const paymentDetails = await mercadoPagoClient.get({ id: paymentId });
        
        console.log('📊 Status atualizado:', paymentDetails.status);

        // Atualizar Firestore
        try {
          const paymentRef = db.collection('payments').doc(String(paymentId));
          await paymentRef.set({
            status: paymentDetails.status,
            gatewayResponse: paymentDetails,
            updatedAt: new Date()
          }, { merge: true });

          // Atualizar pedido se tiver orderId
          if (paymentDetails.external_reference) {
            const saleRef = db.collection('sales').doc(paymentDetails.external_reference);
            await saleRef.update({
              status: paymentDetails.status,
              updatedAt: new Date()
            });
            console.log('✅ Pedido atualizado:', paymentDetails.external_reference);
          }
        } catch (firestoreError) {
          console.error('❌ Erro ao atualizar Firestore:', firestoreError);
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('💥 Erro no webhook:', error);
    res.status(500).send('Erro');
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

// =============================================================================
// ENDPOINTS DE DIAGNÓSTICO
// =============================================================================

// Diagnóstico do Mercado Pago
app.get('/api/debug-mp', async (req, res) => {
  try {
    if (!mercadoPagoClient) {
      return res.json({
        status: 'error',
        message: 'Mercado Pago não inicializado',
        token_present: !!(process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN)
      });
    }

    // Testar com um pagamento mínimo
    const testPayment = {
      transaction_amount: 1.0,
      payment_method_id: 'pix',
      payer: {
        email: 'test@example.com',
        identification: {
          type: 'CPF',
          number: '12345678909'
        }
      }
    };

    const payment = await mercadoPagoClient.create({ body: testPayment });
    
    res.json({
      status: 'success',
      message: 'Mercado Pago funcionando!',
      payment_id: payment.id,
      status: payment.status,
      qr_code: payment.point_of_interaction?.transaction_data?.qr_code
    });

  } catch (error) {
    res.json({
      status: 'error',
      message: error.message,
      response: error.response?.data,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
// IMPLEMENTAÇÃO MELHOR ENVIO
// =============================================================================

// Configuração Melhor Envio
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

// =============================================================================
// INICIALIZAÇÃO DO SERVIDOR
// =============================================================================

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  console.log(`💳 Mercado Pago: ${mercadoPagoClient ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`🌍 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔧 Debug MP: http://localhost:${PORT}/api/debug-mp`);
  
  if (!mercadoPagoClient) {
    console.log('❌ PROBLEMA CRÍTICO: Mercado Pago não inicializado!');
    console.log('❌ Verifique:');
    console.log('   1. Variáveis MP_ACCESS_TOKEN ou MERCADOPAGO_ACCESS_TOKEN');
    console.log('   2. Token válido no Mercado Pago Developers');
    console.log('   3. Conexão com internet');
  }
});