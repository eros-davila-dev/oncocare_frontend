# OncoCare — Frontend

Interfaz del sistema de gestion de pacientes de la Fundacion Oncologica Three Partners. Angular 21 (standalone, signals) + Tailwind CSS 4, con **dos aplicaciones sobre el mismo codigo**:

| App | Para quien | Desarrollo | Docker |
|---|---|---|---|
| `portal` | Publico y pacientes: inicio, preguntas frecuentes, registro, mis citas, Telegram, chatbot | http://localhost:4200 | puerto 80 del contenedor |
| `intranet` | Personal: indicadores, agenda, consultas, pacientes, citas, estudio de tesis, auditoria | http://localhost:4300 | puerto 81 del contenedor |

La API es el repositorio **oncocare_backend** (carpeta hermana). El sistema completo con Docker se levanta desde alli (`oncocare_backend/docker`).

## Desarrollo

Requiere Node.js 20+.

```bash
npm install
npm run start:portal     # http://localhost:4200
npm run start:intranet   # http://localhost:4300
npm test                 # Vitest
npm run build            # dist/portal y dist/intranet
```

La URL de la API en desarrollo esta en `src/environments/environment.development.ts`; en produccion es relativa (`/api/v1`) y nginx la reenvia al backend.

## Estructura

```
src/main.portal.ts, src/main.intranet.ts   punto de entrada de cada app
src/app/portal/, src/app/intranet/          rutas y layout propios de cada app
src/app/core/, shared/, features/           codigo compartido (cada app solo empaqueta lo que enruta)
public/                                     logo, favicon y logo-correo.png (cabecera de los correos)
Dockerfile, nginx.conf, nginx-comun.conf    imagen de produccion: nginx sirve ambas apps con cabeceras de seguridad
```

Una cuenta solo inicia sesion en su aplicacion: un paciente que entra a la intranet (o un miembro del personal que entra al portal) recibe el enlace a la que le corresponde. La seguridad real esta en el backend (`@PreAuthorize` por rol).
