const { MelhorEnvio } = require('@melhorenvio/sdk');

const melhorEnvio = new MelhorEnvio({
  client_id: import.meta.env.VITE_MELHOR_ENVIO_CLIENT,
  client_secret: import.meta.env.VITE_MELHOR_ENVIO_API_KEY,
  sandbox: true, // Use true para ambiente de teste
});