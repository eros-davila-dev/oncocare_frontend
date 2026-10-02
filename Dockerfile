FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Dominios publicos de cada app (enlace "ir al portal / a la intranet"). En
# produccion los pasa docker-compose.prod.yml; por defecto, los puertos locales.
ARG PORTAL_URL=http://localhost:4200
ARG INTRANET_URL=http://localhost:4300
RUN sed -i "s#portalUrl: '[^']*'#portalUrl: '${PORTAL_URL}'#; s#intranetUrl: '[^']*'#intranetUrl: '${INTRANET_URL}'#" \
        src/environments/environment.ts \
    && grep -q "portalUrl: '${PORTAL_URL}'" src/environments/environment.ts \
    && npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist/portal/browser /usr/share/nginx/html/portal
COPY --from=build /app/dist/intranet/browser /usr/share/nginx/html/intranet
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-comun.conf /etc/nginx/snippets/comun.conf

# 80: portal del paciente · 81: intranet del personal
EXPOSE 80 81
