/**
 * Produccion (docker compose): nginx publica el portal y la intranet en
 * puertos/dominios distintos y reenvia /api al backend. portalUrl e
 * intranetUrl se reemplazan al construir la imagen (ARG PORTAL_URL /
 * INTRANET_URL del Dockerfile, ver docker-compose.prod.yml).
 */
export const environment = {
  production: true,
  apiUrl: '/api/v1',
  portalUrl: 'http://localhost:4200',
  intranetUrl: 'http://localhost:4300',
};
