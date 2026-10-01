FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist/portal/browser /usr/share/nginx/html/portal
COPY --from=build /app/dist/intranet/browser /usr/share/nginx/html/intranet
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-comun.conf /etc/nginx/snippets/comun.conf

# 80: portal del paciente · 81: intranet del personal
EXPOSE 80 81
