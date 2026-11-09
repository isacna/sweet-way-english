FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O navegador chama /api na própria origem; o Next repassa ao backend (rewrites em next.config.ts).
# O destino do rewrite é fixado no build, por isso BACKEND_URL é um build arg (no Compose, o serviço "backend").
ARG BACKEND_URL=http://backend:3333
ENV BACKEND_URL=$BACKEND_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Escuta em todas as interfaces do container (o HOSTNAME padrão do Docker é o id do container)
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# Usado em runtime pelos server components (ex.: logo no layout da professora)
ARG BACKEND_URL=http://backend:3333
ENV BACKEND_URL=$BACKEND_URL

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# O otimizador de imagens (next/image) grava em .next/cache. Sem permissão o Next não só deixa de guardar:
# a próxima requisição da mesma imagem fica pendurada para sempre. O resto do app continua só leitura.
RUN mkdir -p .next/cache && chown node:node .next/cache

USER node
EXPOSE 3000
CMD ["node", "server.js"]
