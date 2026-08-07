# SSG: build gera HTML estático (build/client); nginx serve os arquivos.
FROM node:24-alpine AS build
# As VITE_* saem do .env do contexto de build (ver .env.example); em prod o
# deploy.sh copia o front.env da raiz ops para cá antes do build.
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/client /usr/share/nginx/html
