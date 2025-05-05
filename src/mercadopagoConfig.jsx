const mercadopago = require('mercadopago');

// Configura a SDK com as credenciais
mercadopago.configure({
  access_token: 'TEST-2424042295647561-020514-9b1628e7f33b6ff8f121ea721bc3ffd7-1804058981', 
});

module.exports = mercadopago;