const mercadopago = require('./mercadopagoConfig'); // Importa a SDK configurada

async function createPayment(req, res) {
  const { transaction_amount, description, payment_method_id, payer } = req.body;

  const paymentData = {
    transaction_amount,
    description,
    payment_method_id,
    payer: {
      email: payer.email,
      identification: {
        type: payer.identificationType,
        number: payer.identificationNumber,
      },
    },
  };

  try {
    const response = await mercadopago.payment.create(paymentData);
    res.json(response.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { createPayment };