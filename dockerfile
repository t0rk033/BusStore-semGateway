# Etapa base
FROM node:20-alpine

WORKDIR /app
RUN npm install -g concurrently serve

COPY . .

RUN npm install 

RUN cd backend && npm install

RUN cd /app

RUN npm run build

EXPOSE 3000 4173

CMD concurrently \
  "node backend/server.js" \
  "serve -s dist -l 4173"
