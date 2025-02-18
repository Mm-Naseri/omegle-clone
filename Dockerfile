FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
COPY .env .env
EXPOSE 3000
CMD ["node", "server.js"]
