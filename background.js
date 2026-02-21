const TOGGLE_MESSAGE_TYPE = "TOGGLE_TOOLBOX_BUBBLE";
const CHAT_MESSAGE_TYPE = "TOOLBOX_CHAT_REQUEST";
const BACKEND_CHAT_URL = "http://127.0.0.1:8787/api/chat";

async function askLocalBackend(prompt) {
  const response = await fetch(BACKEND_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
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

  return payload.text.trim();
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
  if (!message || message.type !== CHAT_MESSAGE_TYPE) {
    return;
  }

  const prompt = typeof message.prompt === "string" ? message.prompt.trim() : "";
  if (!prompt) {
    sendResponse({ ok: false, error: "El prompt está vacío." });
    return;
  }

  askLocalBackend(prompt)
    .then((text) => {
      sendResponse({ ok: true, text });
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
