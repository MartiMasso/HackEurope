# Toolbox Search Bar + OpenAI + ElevenLabs

Extensión de Chrome (Manifest V3) con barra de IA flotante y backend local.

- `OPENAI_API_KEY` vive solo en backend (`.env`).
- `ELEVENLABS_API_KEY` (para text-to-speech) también vive solo en backend (`.env`).
- El frontend de la extensión no guarda claves.

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

2. Crea `.env` desde `.env.example` y completa tus claves:

```env
OPENAI_API_KEY=tu_clave_real_de_openai
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_OUTPUT_TOKENS=1400

ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
ELEVENLABS_MODEL_ID=eleven_multilingual_v2

BACKEND_PORT=8787
```

Notas TTS (ElevenLabs):
- Deja `ELEVENLABS_API_KEY` vacío si no usarás TTS todavía.
- Si está vacío, el botón de voz devolverá error de backend hasta que pongas la key.
- Puedes cambiar `ELEVENLABS_VOICE_ID` por cualquier voz de tu cuenta.

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
5. El input inferior se limpia y tu pregunta aparece arriba de la respuesta.
6. La barra se expande verticalmente para mostrar la respuesta en la misma tab.
7. En la esquina superior derecha de la respuesta tienes controles:
   - `S` verde: text-to-speech (lee la respuesta con ElevenLabs).
   - pin azul: fijar tab.
   - `x` rojo: cerrar tab.
   - `-` amarillo: minimizar tab.
8. En la fila del input tienes botones permanentes:
   - `A`: activar/desactivar Agent Mode.
   - `M`: speech-to-text (micrófono -> escribe el prompt).
9. Si pulsas otra vez `Ctrl+Shift+Space`, se crea una nueva tab:
   - las tabs previas con respuesta se conservan,
   - la tab activa vacía se cierra.
10. Al pinear una tab, se oculta su input; al quitar pin, vuelve el input.
11. Cada tab conserva su contexto de conversación para follow-ups.
12. Puedes redimensionar tabs arrastrando desde bordes y esquinas (estilo ventana), dentro de límites.

### Speech-to-text (mic)

- Usa Speech Recognition del navegador (`SpeechRecognition` / `webkitSpeechRecognition`).
- Al pulsar `M`, Chrome pedirá permiso de micrófono si aplica.
- Si detecta silencio breve después de hablar, envía el prompt automáticamente.
- Pulsa `M` otra vez para detener la captura manualmente.

### Text-to-speech (respuesta)

- Usa ElevenLabs vía backend local (`POST /api/tts`).
- Si no configuraste `ELEVENLABS_API_KEY`, el backend responderá error descriptivo.

## Flujo técnico

1. `content.js` captura prompt + contexto visible de la página.
2. `content.js` envía al service worker (`background.js`).
3. `background.js` enruta según tipo:
   - chat -> `/api/chat`
   - agent -> `/api/agent/step`
   - tts -> `/api/tts`
4. `backend/server.js` llama:
   - OpenAI para chat/agent,
   - ElevenLabs para TTS.
5. La UI renderiza respuesta, chain of thought y audio TTS bajo demanda.

## Privacidad

- El contexto visible de página se envía a tu backend local para generar respuestas.
- El texto que reproduces con TTS se envía desde backend a ElevenLabs.
- Las claves permanecen en tu `.env` local.

## Debug rápido

1. Service worker: `chrome://extensions/` -> **Service worker** -> **Inspect**.
2. Content script: DevTools de la página -> **Console/Sources**.
3. Backend: terminal donde corriste `npm run start:backend`.
