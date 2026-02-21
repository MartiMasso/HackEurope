# Toolbox Search Bar + OpenAI Backend

Extensión de Chrome (Manifest V3) con barra de IA flotante que envía prompts a un backend local.  
La `OPENAI_API_KEY` vive solo en el backend (`.env`), no en el frontend de la extensión.

## Estructura

```text
.
├── assets/
│   ├── icon.png
│   └── logo1.png
├── backend/
│   └── server.js
├── background.js
├── content.js
├── manifest.json
├── package.json
├── .env
├── .env.example
└── README.md
```

## 1) Configurar backend local

Requisito: Node.js 18+.

1. Instala dependencias:

```bash
npm install
```

2. Edita `.env` y pon tu clave real:

```env
OPENAI_API_KEY=tu_clave_real_de_openai
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_OUTPUT_TOKENS=1400
BACKEND_PORT=8787
```

3. Arranca el backend:

```bash
npm run start:backend
```

4. Comprueba salud (opcional):

```bash
curl http://127.0.0.1:8787/health
```

## 2) Cargar la extensión

1. Abre `chrome://extensions/`.
2. Activa **Developer mode**.
3. Pulsa **Load unpacked** y selecciona esta carpeta.
4. Si ya estaba cargada, pulsa **Reload** en la extensión.

## 3) Uso

1. Abre una web normal (`http`/`https`).
2. Haz click en el icono de la extensión o usa `Ctrl+Shift+Space`.
3. Se abre directamente la barra de chat en la parte inferior.
4. Escribe un prompt y pulsa Enter (o botón de envío).
5. El input inferior se limpia automáticamente y tu pregunta aparece arriba de la respuesta.
6. La barra se expande verticalmente para mostrar la respuesta dentro del mismo componente.
7. En la esquina superior derecha de la respuesta tienes 3 controles: pin azul (fijar), cerrar rojo y reducir amarillo.
8. Si pulsas otra vez `Ctrl+Shift+Space`, se crea una nueva barra; la anterior se conserva solo si ya tenía respuesta.
9. Si la barra anterior estaba vacía (sin respuesta), se cierra automáticamente al crear la nueva.
10. Al pinear una tab, se oculta su input de chat; al quitar el pin, el input vuelve a mostrarse.
11. Cada tab mantiene su propio contexto de conversación para follow-ups.
12. Puedes redimensionar tabs dentro de límites arrastrando el handle de resize.

La UI de respuesta ahora incluye:
- Espacio de respuesta que se expande automáticamente cuando el contenido es largo.
- Sección `Chain of thought` (resumen por pasos plegables).

En cada prompt, la extensión adjunta contexto de la página actual:
- URL y título.
- Texto seleccionado (si hay).
- Texto del campo enfocado (si estás escribiendo en un editor/input).
- Texto visible en el viewport (lo que estás viendo en pantalla).

## Flujo técnico

1. `content.js` captura el prompt.
2. `content.js` extrae contexto visible de la página.
3. `content.js` envía prompt + contexto a `background.js`.
4. `background.js` (opcional) hace `captureVisibleTab` cuando pides recorte parcial.
5. `background.js` llama a `http://127.0.0.1:8787/api/chat` con prompt + contexto + adjuntos.
6. `backend/server.js` llama a OpenAI con `OPENAI_API_KEY`.
7. El backend devuelve `answer + chainOfThought`.
8. La UI renderiza respuesta + pasos y ajusta la altura del panel dinámicamente.

## Supabase

No es obligatorio para esta funcionalidad: el adjunto de imagen se envía directamente al backend local y de ahí a OpenAI.
Supabase solo sería necesario si quieres persistir capturas, historial o compartir assets entre dispositivos.

## Privacidad

El contexto visible de la página se envía a tu backend local y desde ahí a OpenAI para responder mejor.

## Debug rápido

1. Service worker: `chrome://extensions/` -> **Service worker** -> **Inspect**.
2. Content script: DevTools de la página -> pestaña **Console/Sources**.
3. Backend: logs del terminal donde corriste `npm run start:backend`.
