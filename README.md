# Toolbox Floating Icon (Chrome Extension MV3)

MVP de una extensión de Google Chrome (Manifest V3) que, al hacer click en el icono, hace toggle de un icono flotante arrastrable en la pestaña activa.

## Estructura

```text
.
├── assets/
│   ├── icon.png
│   └── logo1.png
├── background.js
├── content.js
├── manifest.json
└── README.md
```

## Cargar la extensión (Load unpacked)

1. Abre `chrome://extensions/`.
2. Activa **Developer mode** (arriba a la derecha).
3. Haz click en **Load unpacked**.
4. Selecciona la carpeta raíz de este proyecto.

## Recargar la extensión

1. Ve a `chrome://extensions/`.
2. En la tarjeta de **Toolbox Floating Icon**, pulsa el botón **Reload**.
3. Refresca cualquier pestaña donde quieras probarla.

## Uso

1. Abre cualquier página web normal (`http` o `https`).
2. Haz click en el icono de la extensión.
3. Se crea o elimina el icono flotante con id `__toolbox_icon__` en la esquina superior derecha.
4. Puedes arrastrarlo con el ratón para moverlo por la pantalla.

Nota: en páginas restringidas (`chrome://`, Chrome Web Store, etc.) Chrome bloquea content scripts; ahí no se mostrará el icono flotante.

## Depurar Service Worker (background.js)

1. Ve a `chrome://extensions/`.
2. En la extensión, entra en **Service worker** y pulsa **Inspect**.
3. Usa la consola de DevTools para ver logs de `background.js`.

## Depurar Content Script (content.js)

1. Abre una página donde la extensión esté permitida.
2. Abre DevTools de esa pestaña (`Right click` -> **Inspect**).
3. En **Sources**, busca la sección de content scripts de la extensión y abre `content.js`.
4. Revisa logs/errores en **Console**.

## Icono

La UI flotante en la página usa `assets/icon.png`.
El icono de la acción de la extensión en la toolbar usa `assets/logo1.png` (declarado en `manifest.json`).
