FROM node:22-alpine AS builder
WORKDIR /app

ARG NUXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
ARG NUXT_PUBLIC_ASSET_CDN_URL=https://assets.yourdomain.com
ENV NUXT_PUBLIC_API_BASE_URL=$NUXT_PUBLIC_API_BASE_URL
ENV NUXT_PUBLIC_ASSET_CDN_URL=$NUXT_PUBLIC_ASSET_CDN_URL

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn generate

FROM nginx:1.27-alpine
COPY --from=builder /app/.output/public /usr/share/nginx/html
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / { try_files $uri $uri/ /index.html; }\n\
  location ~* \\.(js|css|webp|png|mp3|woff2)$ { expires 1y; add_header Cache-Control "public, immutable"; }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
