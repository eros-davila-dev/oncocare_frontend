/**
 * Produccion (docker compose): nginx publica el portal y la intranet en
 * puertos/dominios distintos y reenvia /api al backend. Ajustar portalUrl e
 * intranetUrl a los dominios reales al desplegar.
 */
export const environment = {
  production: true,
  apiUrl: '/api/v1',
  portalUrl: 'http://localhost:4200',
  intranetUrl: 'http://localhost:4300',
};
