const TOGGLE_MESSAGE_TYPE = "TOGGLE_TOOLBOX_BUBBLE";
const CHAT_MESSAGE_TYPE = "TOOLBOX_CHAT_REQUEST";
const CAPTURE_MESSAGE_TYPE = "TOOLBOX_CAPTURE_VISIBLE_TAB";
const BACKEND_CHAT_URL = "http://127.0.0.1:8787/api/chat";

async function askLocalBackend(prompt, pageContext, attachments = []) {
  const response = await fetch(BACKEND_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt, pageContext, attachments })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Error del backend local (${response.status}).`;
    throw new Error(errorMessage);
  }

  if (!payload || typeof payload.text !== "string" || !payload.text.trim()) {
    throw new Error("El backend devolvió una respuesta vacía.");
  }

  return {
    text: payload.text.trim(),
    chainOfThought: Array.isArray(payload.chainOfThought) ? payload.chainOfThought : []
  };
}

function captureVisibleTab(windowId) {
  return new Promise((resolve, reject) => {
    const captureTarget = Number.isFinite(windowId) ? windowId : undefined;
    chrome.tabs.captureVisibleTab(captureTarget, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "Capture failed."));
        return;
      }
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
        reject(new Error("No image data returned from capture."));
        return;
      }
      resolve(dataUrl);
    });
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab || typeof tab.id !== "number") {
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: TOGGLE_MESSAGE_TYPE }, () => {
    if (chrome.runtime.lastError) {
      // Expected on restricted pages like chrome://, edge:// or the Web Store.
      console.debug("Toolbox Bubble not toggled:", chrome.runtime.lastError.message);
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return;
  }

  if (message.type === CAPTURE_MESSAGE_TYPE) {
    const windowId = Number.isFinite(_sender?.tab?.windowId) ? _sender.tab.windowId : undefined;

    captureVisibleTab(windowId)
      .then((dataUrl) => {
        sendResponse({ ok: true, dataUrl });
      })
      .catch((error) => {
        const messageText =
          error instanceof Error && error.message
            ? error.message
            : "No se pudo capturar la pestaña visible.";
        sendResponse({ ok: false, error: messageText });
      });

    return true;
  }

  if (message.type !== CHAT_MESSAGE_TYPE) {
    return;
  }

  const prompt = typeof message.prompt === "string" ? message.prompt.trim() : "";
  if (!prompt) {
    sendResponse({ ok: false, error: "El prompt está vacío." });
    return;
  }
  const pageContext =
    message.pageContext && typeof message.pageContext === "object" ? message.pageContext : null;
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];

  askLocalBackend(prompt, pageContext, attachments)
    .then((result) => {
      sendResponse({
        ok: true,
        text: result.text,
        chainOfThought: result.chainOfThought
      });
    })
    .catch((error) => {
      const messageText =
        error instanceof Error && error.message
          ? error.message
          : "No se pudo contactar con el backend local.";
      sendResponse({ ok: false, error: messageText });
    });

  return true;
});
