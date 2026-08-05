# SSG: build gera HTML estático (build/client); nginx serve os arquivos.
FROM node:24-alpine AS build
# base da API embutida no bundle em build-time (browser chama a API)
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
# contatos da loja (links do header/rodapé e checkout pelo WhatsApp)
ARG VITE_WHATSAPP=5585985242758
ENV VITE_WHATSAPP=$VITE_WHATSAPP
ARG VITE_INSTAGRAM=https://www.instagram.com/dibiepersonalizados/
ENV VITE_INSTAGRAM=$VITE_INSTAGRAM
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/client /usr/share/nginx/html
