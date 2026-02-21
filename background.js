const SET_VISIBILITY_MESSAGE_TYPE = "TOOLBOX_SET_VISIBILITY";
const QUERY_STATE_MESSAGE_TYPE = "TOOLBOX_QUERY_STATE";
const CHAT_MESSAGE_TYPE = "TOOLBOX_CHAT_REQUEST";
const AGENT_MESSAGE_TYPE = "TOOLBOX_AGENT_REQUEST";
const CAPTURE_MESSAGE_TYPE = "TOOLBOX_CAPTURE_VISIBLE_TAB";
const ACTIVE_TABS_STORAGE_KEY = "toolbox_active_tabs_v1";
const BACKEND_CHAT_URL = "http://127.0.0.1:8787/api/chat";
const BACKEND_AGENT_URL = "http://127.0.0.1:8787/api/agent/step";
const BACKEND_AGENT_FALLBACK_URLS = [
  BACKEND_AGENT_URL,
  "http://127.0.0.1:8787/api/agent-step",
  "http://127.0.0.1:8787/api/agent"
];
const activeTabsFallback = new Set();

function getStorageArea() {
  if (chrome.storage && chrome.storage.session) return chrome.storage.session;
  if (chrome.storage && chrome.storage.local) return chrome.storage.local;
  return null;
}

function getActiveTabSet() {
  return new Promise((resolve) => {
    const storageArea = getStorageArea();
    if (!storageArea) {
      resolve(new Set(activeTabsFallback));
      return;
    }
    storageArea.get([ACTIVE_TABS_STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        resolve(new Set(activeTabsFallback));
        return;
      }
      const raw = Array.isArray(result?.[ACTIVE_TABS_STORAGE_KEY])
        ? result[ACTIVE_TABS_STORAGE_KEY]
        : [];
      const filtered = raw.filter((id) => Number.isInteger(id) && id >= 0);
      resolve(new Set(filtered));
    });
  });
}

function persistActiveTabSet(tabSet) {
  return new Promise((resolve) => {
    const values = Array.from(tabSet);
    const storageArea = getStorageArea();
    activeTabsFallback.clear();
    values.forEach((id) => {
      activeTabsFallback.add(id);
    });

    if (!storageArea) {
      resolve();
      return;
    }

    storageArea.set({ [ACTIVE_TABS_STORAGE_KEY]: values }, () => {
      resolve();
    });
  });
}

async function isToolboxActiveForTab(tabId) {
  if (!Number.isInteger(tabId) || tabId < 0) return false;
  const tabSet = await getActiveTabSet();
  return tabSet.has(tabId);
}

async function setToolboxActiveForTab(tabId, active) {
  if (!Number.isInteger(tabId) || tabId < 0) return;
  const tabSet = await getActiveTabSet();
  if (active) {
    tabSet.add(tabId);
  } else {
    tabSet.delete(tabId);
  }
  await persistActiveTabSet(tabSet);
}

function sendToolboxVisibility(tabId, visible) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: SET_VISIBILITY_MESSAGE_TYPE, visible }, () => {
      if (chrome.runtime.lastError) {
        const errorText = chrome.runtime.lastError.message || "";
        const isExpected =
          /Receiving end does not exist|Could not establish connection/i.test(errorText);
        if (!isExpected) {
          console.debug("Toolbox visibility sync failed:", errorText);
        }
      }
      resolve();
    });
  });
}

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

async function askLocalAgent(
  goal,
  pageContext,
  actionableElements,
  history = [],
  metadata = null,
  screenshot = null
) {
  let lastError = null;

  for (const endpoint of BACKEND_AGENT_FALLBACK_URLS) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ goal, pageContext, actionableElements, history, metadata, screenshot })
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
          : `Error del backend de agente (${response.status}).`;
      lastError = new Error(errorMessage);

      if (response.status === 404) {
        continue;
      }
      throw lastError;
    }

    if (!payload || typeof payload !== "object" || !payload.action) {
      throw new Error("El backend de agente devolvió una respuesta vacía.");
    }

    return payload;
  }

  throw (
    lastError ||
    new Error(
      "No se encontró endpoint de Agent Mode (404). Reinicia backend y recarga la extensión."
    )
  );
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

  void (async () => {
    const currentlyActive = await isToolboxActiveForTab(tab.id);
    const nextActive = !currentlyActive;
    await setToolboxActiveForTab(tab.id, nextActive);
    await sendToolboxVisibility(tab.id, nextActive);
  })();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!Number.isInteger(tabId) || tabId < 0) return;
  if (!changeInfo || changeInfo.status !== "complete") return;

  void (async () => {
    const shouldShow = await isToolboxActiveForTab(tabId);
    if (shouldShow) {
      await sendToolboxVisibility(tabId, true);
    }
  })();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (!Number.isInteger(tabId) || tabId < 0) return;
  void setToolboxActiveForTab(tabId, false);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return;
  }

  if (message.type === QUERY_STATE_MESSAGE_TYPE) {
    const tabId = Number.isInteger(_sender?.tab?.id) ? _sender.tab.id : -1;
    if (tabId < 0) {
      sendResponse({ ok: true, active: false });
      return;
    }

    isToolboxActiveForTab(tabId)
      .then((active) => {
        sendResponse({ ok: true, active });
      })
      .catch(() => {
        sendResponse({ ok: true, active: false });
      });

    return true;
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

  if (message.type === AGENT_MESSAGE_TYPE) {

    const goal = typeof message.goal === "string" ? message.goal.trim() : "";
    if (!goal) {
      sendResponse({ ok: false, error: "Agent goal is empty." });
      return;
    }
    const pageContext =
      message.pageContext && typeof message.pageContext === "object" ? message.pageContext : null;
    const actionableElements = Array.isArray(message.actionableElements)
      ? message.actionableElements
      : [];
    const history = Array.isArray(message.history) ? message.history : [];
    const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata : null;
    const screenshot =
      message.screenshot && typeof message.screenshot === "object" ? message.screenshot : null;

    askLocalAgent(goal, pageContext, actionableElements, history, metadata, screenshot)
      .then((result) => {
        sendResponse({
          ok: true,
          action: result.action,
          reasoning: typeof result.reasoning === "string" ? result.reasoning : "",
          message: typeof result.message === "string" ? result.message : ""
        });
      })
      .catch((error) => {
        const messageText =
          error instanceof Error && error.message
            ? error.message
            : "No se pudo contactar con el backend de agente.";
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
