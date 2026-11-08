# API compilada (tsc → dist/) rodando como usuário sem privilégios.
#  deps:      todas as dependências (para gerar o client do Prisma e compilar)
#  build:     prisma generate + tsc + cópia do client gerado para dist/
#  prod-deps: só as dependências de produção
#  final:     node_modules de produção, dist/, prisma/ (schema, migrações, conteúdo), seed-media/ e, para o seed e os
#             scripts de conteúdo (rodam com tsx), src/ e scripts/
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app

# Arquivos da aplicação ficam com o root (só leitura para o processo); só a pasta de uploads é do usuário `node`
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json prisma.config.ts tsconfig.json entrypoint.sh ./
COPY prisma ./prisma
COPY seed-media ./seed-media
COPY scripts ./scripts
COPY src ./src
COPY --from=build /app/dist ./dist
# O seed e os scripts (tsx) importam o client gerado de src/; aponta para o mesmo client de dist/ em vez de duplicar
RUN ln -s ../../dist/database/generated src/database/generated \
  && mkdir -p uploads && chown node:node uploads \
  && chmod +x entrypoint.sh

USER node
EXPOSE 3333
ENTRYPOINT ["./entrypoint.sh"]
