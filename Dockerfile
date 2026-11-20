FROM node:22-alpine AS builder
WORKDIR /app

ARG NUXT_PUBLIC_API_BASE_URL=https://game-edu-api.nghia196.qzz.io/api/v1
ARG NUXT_PUBLIC_ASSET_CDN_URL=https://cdn.nghia196.qzz.io
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
  location = /runtime-config.js { add_header Cache-Control "no-store, no-cache, must-revalidate"; }\n\
  location / { try_files $uri $uri/ /index.html; }\n\
  location ~* \\.(js|css|webp|png|mp3|woff2)$ { expires 1y; add_header Cache-Control "public, immutable"; }\n\
}\n' > /etc/nginx/conf.d/default.conf
RUN printf '#!/bin/sh\n\
cat <<EOF > /usr/share/nginx/html/runtime-config.js\n\
window.__APP_CONFIG__ = {\n\
  apiBaseUrl: "${NUXT_PUBLIC_API_BASE_URL:-}",\n\
  assetCdnUrl: "${NUXT_PUBLIC_ASSET_CDN_URL:-}"\n\
};\n\
EOF\n' > /docker-entrypoint.d/40-runtime-config.sh && chmod +x /docker-entrypoint.d/40-runtime-config.sh
EXPOSE 80
