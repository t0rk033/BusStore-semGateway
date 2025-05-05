const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Configuração do CORS
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Middleware para parsear JSON
app.use(express.json());

// Configuração do Mercado Pago (MANTIDO ORIGINAL)
const client = new MercadoPagoConfig({
  accessToken: 'TEST-2424042295647561-020514-9b1628e7f33b6ff8f121ea721bc3ffd7-1804058981',
});

const mercadoPago = {
  payment: new Payment(client)
};

// Configuração do Nodemailer com Brevo (NOVO)
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER, // Seu e-mail de cadastro no Brevo
    pass: process.env.BREVO_SMTP_PASS  // Senha SMTP gerada no painel
  }
});

// Função para enviar e-mails (ATUALIZADA)
async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `BatataBowl <${process.env.BREVO_FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log(`E-mail enviado para ${to}`);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
  }
}

// Mapeamento de status do Mercado Pago (MANTIDO ORIGINAL)
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

// Endpoint para processar pagamentos (MANTIDO ORIGINAL)
app.post('/api/process-payment', async (req, res) => {
  try {
    const { token, amount, description, installments, payment_method_id, issuer_id, email, items = [] } = req.body;

    if (!token || !amount || !email) {
      return res.status(400).json({
        status: 'invalid_request',
        message: 'Dados de pagamento incompletos',
        details: 'Token, valor e email são obrigatórios'
      });
    }

    const paymentData = {
      token,
      transaction_amount: Number(amount),
      description: description || 'Compra no BatataBowl',
      installments: installments ? Number(installments) : 1,
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

    const paymentResponse = await mercadoPago.payment.create({ body: paymentData });

    // Envio de e-mails se pagamento aprovado (ATUALIZADO)
    if (paymentResponse.status === 'approved') {
      // E-mail para o cliente
      const buyerEmail = `
        <h1 style="color: #ff6b00;">Obrigado por comprar no BatataBowl!</h1>
        <p>Seu pedido #${paymentResponse.id} foi confirmado.</p>
        <h3>Resumo da compra:</h3>
        <ul>
          ${items.map(item => `
            <li>${item.name} - ${item.quantity}x R$ ${item.price.toFixed(2)}</li>
          `).join('')}
        </ul>
        <p><strong>Total: R$ ${amount.toFixed(2)}</strong></p>
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
        <p><strong>Total:</strong> R$ ${amount.toFixed(2)}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      `;

      await Promise.all([
        sendEmail(email, '✅ Compra confirmada - BatataBowl', buyerEmail),
        sendEmail(process.env.ADMIN_EMAIL, `🛒 Nova venda #${paymentResponse.id}`, adminEmail)
      ]);
    }

    // Resposta original (mantida)
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

    return res.status(httpStatus).json(response);

  } catch (error) {
    console.error('Erro no processamento do pagamento:', error);

    if (error.response && error.response.data) {
      const mpError = error.response.data;
      return res.status(400).json({
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

// Endpoint para calcular frete (MANTIDO ORIGINAL)
app.post('/api/shipping-quote', async (req, res) => {
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
        },
      }
    );

    res.json({
      status: 'success',
      data: response.data,
      message: 'Cálculo de frete realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao consultar frete:', error.response?.data || error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao calcular frete',
      details: error.response?.data || error.message,
      error_code: error.code
    });
  }
});

// Rota de teste
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend da loja está funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Inicia o servidor
app.listen(3000, () => {
  console.log('Backend rodando na porta 3000');
  
  // Verifica conexão SMTP
  transporter.verify((error) => {
    if (error) {
      console.error('Erro na conexão SMTP:', error);
    } else {
      console.log('Conexão SMTP configurada com sucesso');
    }
  });
});