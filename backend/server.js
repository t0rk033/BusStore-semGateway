const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

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
console.log('Variáveis de ambiente:');
console.log('BREVO_SMTP_USER:', process.env.BREVO_SMTP_USER ? 'Definida' : 'Não definida');
console.log('BREVO_FROM_EMAIL:', process.env.BREVO_FROM_EMAIL ? 'Definida' : 'Não definida');
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL ? 'Definida' : 'Não definida');

// Configuração do Mercado Pago (atualizada para a versão mais recente do SDK)
let client;
let mercadoPago;

try {
  client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-2424042295647561-020514-9b1628e7f33b6ff8f121ea721bc3ffd7-1804058981',
  });
  mercadoPago = {
    payment: new Payment(client)
  };
  console.log('Mercado Pago configurado com sucesso');
} catch (error) {
  console.error('Erro ao configurar Mercado Pago:', error);
}

// Configuração do Nodemailer com Brevo (com fallback)
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
      rejectUnauthorized: false // Para evitar problemas de certificado em desenvolvimento
    }
  });
  
  // Testar a conexão SMTP
  transporter.verify((error, success) => {
    if (error) {
      console.error('Erro na conexão SMTP:', error);
    } else {
      console.log('Conexão SMTP configurada com sucesso');
    }
  });
} catch (error) {
  console.error('Erro ao configurar o transporter de e-mail:', error);
}

// Função para enviar e-mails (com fallback robusto)
async function sendEmail(to, subject, html) {
  // Se não houver transporter configurado, apenas log e retorne
  if (!transporter) {
    console.log(`Simulando envio de e-mail para: ${to}, Assunto: ${subject}`);
    return true;
  }

  try {
    const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@batatabowl.com';
    const mailOptions = {
      from: `BatataBowl <${fromEmail}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`E-mail enviado para ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    // Não falhe o processo de pagamento por causa de erro de e-mail
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
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Endpoint de saúde da API
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Servidor está funcionando',
    timestamp: new Date().toISOString(),
    mercadopago: client ? 'Configurado' : 'Não configurado',
    email: transporter ? 'Configurado' : 'Não configurado'
  });
});

// Endpoint para processar pagamentos 
app.post('/api/process-payment', async (req, res) => {
  console.log('Recebida requisição de pagamento:', JSON.stringify({
    ...req.body,
    token: req.body.token ? 'PRESENTE' : 'AUSENTE'
  }));

  try {
    const { token, amount, description, installments, payment_method_id, issuer_id, email, items = [] } = req.body;

    if (!token || !amount || !email) {
      console.error('Dados de pagamento incompletos:', { token: !!token, amount: !!amount, email: !!email });
      return res.status(400).json({
        status: 'invalid_request',
        message: 'Dados de pagamento incompletos',
        details: 'Token, valor e email são obrigatórios'
      });
    }

    // Validar e formatar o amount
    const transactionAmount = parseFloat(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      return res.status(400).json({
        status: 'invalid_amount',
        message: 'Valor de transação inválido',
        details: 'O valor deve ser um número positivo'
      });
    }

    const paymentData = {
      token,
      transaction_amount: transactionAmount,
      description: description || 'Compra no BatataBowl',
      installments: installments ? parseInt(installments) : 1,
      payment_method_id: payment_method_id || null,
      issuer_id: issuer_id || null,
      payer: {
        email,
        identification: {
          type: req.body.identification_type || 'CPF',
          number: req.body.identification_number || ''
        }
      }
    };

    console.log('Criando pagamento no Mercado Pago:', JSON.stringify({
      ...paymentData,
      token: 'OCULTADO' // Não logar o token completo por segurança
    }));

    const paymentResponse = await mercadoPago.payment.create({ body: paymentData });
    console.log('Resposta do Mercado Pago:', JSON.stringify(paymentResponse));

    // Envio de e-mails se pagamento aprovado
    if (paymentResponse.status === 'approved') {
      // E-mail para o cliente
      const buyerEmail = `
        <h1 style="color: #ff6b00;">Obrigado por comprar na BusStore!</h1>
        <p>Seu pedido #${paymentResponse.id} foi confirmado.</p>
        <h3>Resumo da compra:</h3>
        <ul>
          ${items.map(item => `
            <li>${item.name} - ${item.quantity}x R$ ${item.price.toFixed(2)}</li>
          `).join('')}
        </ul>
        <p><strong>Total: R$ ${transactionAmount.toFixed(2)}</strong></p>
        <p>Qualquer dúvida, responda este e-mail.</p>
      `;

      // E-mail para o admin
      const adminEmail = `
        <h1>Nova venda #${paymentResponse.id}</h1>
        <p><strong>Cliente:</strong> ${email}</p>
        <h3>Itens:</h3>
        <ul>
          ${items.map(item => `
            <li>${item.name} - ${item.quantity}x R$ ${item.price.toFixed(2)}</li>
          `).join('')}
        </ul>
        <p><strong>Total:</strong> R$ ${transactionAmount.toFixed(2)}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      `;

      // Enviar e-mails em segundo plano (não bloquear a resposta)
      Promise.all([
        sendEmail(email, '✅ Compra confirmada - BatataBowl', buyerEmail),
        sendEmail(process.env.ADMIN_EMAIL || 'admin@example.com', `🛒 Nova venda #${paymentResponse.id}`, adminEmail)
      ]).catch(emailError => {
        console.error('Erro ao enviar e-mails:', emailError);
      });
    }

    // Preparar resposta
    const statusResponse = paymentStatusMessages[paymentResponse.status] || {
      status: paymentResponse.status,
      message: 'Status de pagamento desconhecido',
      description: 'O status do pagamento não pôde ser determinado.'
    };

   // Após processar o pagamento, retorne:
const response = {
  status: paymentResponse.status,
  message: statusResponse.message,
  description: statusResponse.description,
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

return res.status(httpStatus).json(response);

    console.log(`Pagamento processado com status: ${paymentResponse.status}`);
    return res.status(httpStatus).json(response);

  } catch (error) {
    console.error('Erro no processamento do pagamento:', error);

    // Log detalhado do erro
    if (error.response && error.response.data) {
      console.error('Detalhes do erro Mercado Pago:', JSON.stringify(error.response.data));
    }

    if (error.response && error.response.data) {
      const mpError = error.response.data;
      return res.status(error.response.status || 400).json({
        status: 'mp_error',
        message: mpError.message || 'Erro no processamento do pagamento',
        error_code: mpError.error,
        causes: mpError.causes || [],
        status_code: mpError.status || 400
      });
    }

    return res.status(500).json({
      status: 'server_error',
      message: 'Erro interno no servidor',
      details: error.message
    });
  }
});

// Endpoint para calcular frete (com melhor tratamento de erro)
app.post('/api/shipping-quote', async (req, res) => {
  console.log('Recebida requisição de cálculo de frete:', req.body);
  
  const { cepDestino, produtos } = req.body;

  if (!cepDestino || !Array.isArray(produtos) || produtos.length === 0) {
    return res.status(400).json({ 
      status: 'invalid_request',
      message: 'Dados de frete incompletos',
      details: 'CEP de destino e lista de produtos são obrigatórios'
    });
  }

  try {
    const items = produtos.map(produto => ({
      width: produto.width || 10,
      height: produto.height || 10,
      length: produto.length || 10,
      weight: produto.weight || 0.5,
      insurance_value: produto.insurance_value || 0,
      quantity: produto.quantity,
    }));

    // Verificar se temos o token do Melhor Envio
    if (!process.env.MELHOR_ENVIO_TOKEN) {
      console.warn('Token do Melhor Envio não configurado, retornando frete simulado');
      
      // Retornar valores simulados para desenvolvimento
      return res.json({
        status: 'success',
        data: {
          id: 'simulated',
          name: 'Frete Simulado',
          price: '15.90',
          delivery_time: 5,
          error: false
        },
        message: 'Cálculo de frete simulado (token não configurado)'
      });
    }

    const response = await axios.post(
      'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate',
      {
        from: { postal_code: '36047040' },
        to: { postal_code: cepDestino },
        products: items,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
          'User-Agent': 'BatataBowlApp (admin@batatabowl.com)'
        },
        timeout: 10000 // 10 segundos de timeout
      }
    );

    res.json({
      status: 'success',
      data: response.data,
      message: 'Cálculo de frete realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao consultar frete:', error.response?.data || error.message);
    
    // Se for timeout ou erro de conexão, retornar um erro mais amigável
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(500).json({
        status: 'timeout',
        message: 'Tempo esgotado ao calcular frete',
        details: 'O serviço de frete está demorando muito para responder'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Erro ao calcular frete',
      details: error.response?.data || error.message,
      error_code: error.code
    });
  }
});

// Rota de teste melhorada
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend da loja está funcionando!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.1'
  });
});

// Rota para visualizar configuração (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.get('/debug/config', (req, res) => {
    res.json({
      mercadopago: {
        configured: !!client,
        accessToken: process.env.MP_ACCESS_TOKEN ? 'DEFINIDO' : 'NÃO DEFINIDO'
      },
      email: {
        configured: !!transporter,
        user: process.env.BREVO_SMTP_USER,
        from: process.env.BREVO_FROM_EMAIL
      },
      melhor_envio: {
        token: process.env.MELHOR_ENVIO_TOKEN ? 'DEFINIDO' : 'NÃO DEFINIDO'
      }
    });
  });
}

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
  console.error('Erro não tratado:', error);
  res.status(500).json({
    status: 'error',
    message: 'Erro interno no servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Ocorreu um erro inesperado'
  });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  
  // Verificar configurações essenciais
  if (!process.env.MP_ACCESS_TOKEN) {
    console.warn('AVISO: MP_ACCESS_TOKEN não definido. Usando token de teste.');
  }
  
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    console.warn('AVISO: Credenciais de e-mail não definidas. O envio de e-mails será simulado.');
  }
});