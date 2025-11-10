const admin = require('firebase-admin');

// Inicialize o Firebase Admin com as credenciais de serviço
const serviceAccount = {
  type: "service_account",
  project_id: "busstore-3240d",
  private_key_id: "0442ed3bdfca720d08834e0086a9a61a4b5cd5a1",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2iyBb7eH/1TAT\nu6bW7sir66+Q8b5PCWgn6G1Wt5NDUizIum7uZmHQGwWURbowDIxW1xCI95KD9PJX\n1aFXMje9HweYk5nTXQ3g6fqTi/0AKx6IwJTFBtg7WibVWcN5BjSd4k7INl5Za/mi\nUg/shf+X/wUU60hOeAcx4m7amME90K7Tv451rCQkEbQy6i2BC6J7KDa4766JywIY\n039Hv/GZr2jOClgBXllBhTYHrdky17X7Ev/SWa5wjERLFJGctZRp0W2FZWbCQ9I5\nPafzr4hGcrChkgbWfI4YbYTf/LASh+NelkgWIvvBvbLZ1oVJby49SlBRyrR0gu3c\nuH+0EozHAgMBAAECggEAFZKRi2usdrB6EwrtJ59mhbK/t9Bp3itNbNHyAfqF48HV\nWw91RqVAz/gxi5lF7KG/ABBAev9PCFstPKYZgBWGMsp0+loPJsRrfHYKT9+OUbPG\n0wB3VGV/rlv0FOibyjSqiTISf2S1d7nj8YPjL9+SGiNgNV2s2OEkcIfC9ABzbduF\ndH5xrrrkX+ldEdkFG6mSqaTX+Q06x5jir+gB1Ma+wBh5U6VdUUTAS+okOhBHIS0e\nxwQaFsN8z/Icn1jkyjPZnJmUtMKSPsHsPaDgUoNZLO5pTXxzpIvObmfjg5ku0ECw\nMBlVOi/Y1Cfw4tS9wA8cxOYyqBGKD/ta20lawX/ZKQKBgQDjeVIBRNrs+7ZJ/xdb\nQJV/+TFCRGSTQ+Gfv2Chuu/t+SsofqsfAiqzO+3DDrXy9JhKN8jGtJQMOOHgSEo5\nsG5R9C3tmPb0YJpHHo0sXnER/wVqp6c4/uhNyoxKzzZIJFiF7fZJN7OD79OOs//B\npifFBkePKdC939PcCDzfVeS2ewKBgQDNb2MiQbBKZrzj9wCAuBfKBBzpv9UvaJAY\n2Fn8GUVvpsGeJSw44HWrwEv7rOU3vP/+Hp74EkAUAbEMeEdhcHBAj4NlAbVyGy+9\nsOn/Y0ch4kvqH6wpzBg8IehvZd1uQyYx0PV+khy8Amlt3WXVfkvpdmAlREOJQWAC\nxPlLdUN3JQKBgAiWSdw2ZzVPA0Cj2pPdSkd8drmTr2BHzbqkFNfGIMyQ/WoX7gnL\noSUG/CDC62dyiFU06eVmZ7hWZWB8GiE3YdLCLwGrJpdvFiPdKWMlZYtSXzf5gDyM\nkuRs4wLn85qhlJ3pr8Rvz90JLqlSbjM3PIUZiZYD9BdW3b6OqQ2dRncFAoGBAMgH\nIPuGAmUvS9Sb+H1cwq0M/CoNg0I6CbRnVJbG9HkWYYfeogRvaaPmBRX07usquAdz\nQU5CVuokC4QcyUPy+xmho0qCM237UqzcybrFq8kuUsSQOk4oT6CdU3jEMqrd7x6q\nW572HcxifM1guXr7Emcrv8oJgcjvQtDvgd0bPKmRAoGABEMII2BAYre97uv4av/c\n2VfvCuhJp9FsBYNGIkQckKd7Y8rB9Wd6Dc+ZuMXODYzYtrIrpcmGuAdeGKyRKAqp\nWYwcPIAlMG/UisEG4HIYyz8ZmV52AuOVqMyRioTngh2yj+x25Wh3NE4v7I8xLIVu\ndFO6Aw6BTrWKbB1myQSN47M=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@busstore-3240d.iam.gserviceaccount.com",
  client_id: "118366234332859358302",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40busstore-3240d.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://busstore-3240d.firebaseio.com"
  });
  console.log('Firebase Admin inicializado com sucesso');
} catch (error) {
  console.error('Erro ao inicializar Firebase Admin:', error);
}

const db = admin.firestore();
const authAdmin = admin.auth();

module.exports = { admin, db, authAdmin };