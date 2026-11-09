# ---- Tahap 1: pasang dependensi ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ---- Tahap 2: image akhir (runtime) ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.js ./
EXPOSE 3000
USER node
CMD ["node", "server.js"]