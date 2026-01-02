# PREVINET (Hackatón)
 
 Plataforma **offline-first** para gestión preventiva en terreno. Incluye enrolamiento de trabajadores, módulos de firma digital y generación/estampado de firma en PDF.
 
 ## Demo / Deploy
 
 - Producción (Netlify): https://previnet-kodesk.netlify.app
 
 ## Stack
 
 - React + TypeScript
 - Vite
 - Tailwind CSS
 - Dexie (IndexedDB) para persistencia local
 - PDF: `pdf-lib` + `jspdf`
 
 ## Requisitos
 
 - Node.js LTS (recomendado 18+)
 - npm
 
 ## Levantar el proyecto
 
 1) Instalar dependencias
 
 ```bash
 npm install
 ```
 
 2) Modo desarrollo
 
 ```bash
 npm run dev
 ```
 
 3) Build producción
 
 ```bash
 npm run build
 ```
 
 4) Preview del build
 
 ```bash
 npm run preview
 ```
 
 ## Scripts
 
 - `npm run dev`: servidor de desarrollo (Vite)
 - `npm run build`: TypeScript build + bundle producción
 - `npm run preview`: servir `dist/` localmente
 - `npm run lint`: lint del proyecto
 
 ## Funcionalidad principal
 
 - **Enrolamiento**: alta/actualización de trabajadores.
 - **Firma digital**: firma de asignaciones por trabajador (captura de firma + persistencia).
 - **PDF firmado**: generación de PDF y estampado de firma sobre adjuntos PDF cuando aplique.
 - **Offline-first**: trabajo sin internet usando IndexedDB; la app está pensada para operación en terreno.
 
 ## Roles y navegación
 
 La UI es **role-based** (sidebar y permisos).
 
 Roles típicos:
 - `trabajador`
 - `prevencionista`
 - `supervisor`
 - `administrador`
 - `auditor`
 - `admin`
 
 Para `trabajador` existe un **Inicio** guiado (journey) que fuerza completar firmas paso a paso.
 
 ## Módulos
 
 El código se organiza en `src/modules/*`:
 
 - `enrollment`: enrolamiento / formularios iniciales
 - `workers`: mantenimiento de trabajadores + perfil + journey
 - `art`: ART/AST (incluye verificación de lectura/preguntas antes de firmar cuando corresponda)
 - `irl`: IRL (lectura/confirmación + firma)
 - `documents`: documentos asignados + firma
 - `talks`: charlas + firma
 - `fitForWork`: cuestionario + firma
 - `findingIncidents`: hallazgos/incidencias
 - `dashboard`: dashboard para perfiles con acceso
 
 ## Persistencia offline
 
 - Base local en `src/offline/db.ts` (Dexie / IndexedDB).
 - Servicios de sincronización en `src/offline/*` y `src/services/sync.service.ts`.
 
 ## Estructura del proyecto
 
 ```text
 src/
   app/                 # App principal, rutas y layout
   components/          # Componentes compartidos (ErrorBoundary, etc.)
   hooks/               # Hooks compartidos
   modules/             # Módulos funcionales por dominio
   offline/             # IndexedDB + cola/sync offline
   services/            # Servicios comunes (api/network/sync)
   styles/              # Estilos base
 public/                # Assets estáticos
 ```
 
 ## Deploy a Netlify
 
 Este repo incluye `netlify.toml`:
 
 - Build command: `npm run build`
 - Publish dir: `dist`
 - Redirect SPA (`/* -> /index.html`) para que el router funcione al refrescar.
 
 Deploy manual (CLI):
 
 ```bash
 npm run build
 npx netlify-cli deploy --prod --dir=dist
 ```
 
 ## Troubleshooting
 
 - Si aparece pantalla en blanco, revisar consola; existe `ErrorBoundary` global para visualizar errores runtime.
 - Para routing en producción, asegúrate de mantener el redirect SPA (Netlify).
 
 ## Licencia
 
 Este proyecto está bajo **Licencia Propietaria KODESK**. Ver archivo `LICENSE`.
