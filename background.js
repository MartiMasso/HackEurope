const SET_VISIBILITY_MESSAGE_TYPE = "TOOLBOX_SET_VISIBILITY";
const QUERY_STATE_MESSAGE_TYPE = "TOOLBOX_QUERY_STATE";
const CHAT_MESSAGE_TYPE = "TOOLBOX_CHAT_REQUEST";
const AGENT_MESSAGE_TYPE = "TOOLBOX_AGENT_REQUEST";
const CAPTURE_MESSAGE_TYPE = "TOOLBOX_CAPTURE_VISIBLE_TAB";
const SET_OPENAI_CONFIG_MESSAGE_TYPE = "TOOLBOX_SET_OPENAI_CONFIG";
const ACTIVE_TABS_STORAGE_KEY = "toolbox_active_tabs_v1";
const DIRECT_OPENAI_API_KEY_STORAGE_KEY = "toolbox_direct_openai_api_key_v1";
const DIRECT_OPENAI_MODEL_STORAGE_KEY = "toolbox_direct_openai_model_v1";
const BACKEND_CHAT_URL = "http://127.0.0.1:8787/api/chat";
const BACKEND_AGENT_URL = "http://127.0.0.1:8787/api/agent/step";
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DIRECT_OPENAI_DEFAULT_MODEL = "gpt-4o-mini";
const DIRECT_OPENAI_MAX_OUTPUT_TOKENS = 1400;
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
        const missingReceiver =
          /Receiving end does not exist|Could not establish connection/i.test(errorText);
        if (!missingReceiver) {
          console.debug("Toolbox visibility sync failed:", errorText);
        }
        resolve({ ok: false, error: errorText, missingReceiver });
        return;
      }
      resolve({ ok: true });
    });
  });
}

function isScriptableTabUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return false;
  const url = rawUrl.trim().toLowerCase();
  return /^(https?:|file:)/.test(url);
}

function injectContentScriptIntoTab(tabId) {
  return new Promise((resolve) => {
    if (!chrome.scripting || typeof chrome.scripting.executeScript !== "function") {
      resolve({ ok: false, error: "chrome.scripting is not available." });
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["content.js"]
      },
      () => {
        if (chrome.runtime.lastError) {
          resolve({
            ok: false,
            error: chrome.runtime.lastError.message || "Failed to inject content script."
          });
          return;
        }
        resolve({ ok: true });
      }
    );
  });
}

function getTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(tab || null);
    });
  });
}

async function sendToolboxVisibilityEnsuringContentScript(tabLike, visible) {
  const tabId = Number.isInteger(tabLike?.id) ? tabLike.id : -1;
  if (tabId < 0) {
    return { ok: false, error: "Invalid tab id." };
  }

  const firstTry = await sendToolboxVisibility(tabId, visible);
  if (firstTry.ok || !firstTry.missingReceiver) {
    return firstTry;
  }

  const tab = tabLike && typeof tabLike.url === "string" ? tabLike : await getTab(tabId);
  const url = typeof tab?.url === "string" ? tab.url : "";
  if (!isScriptableTabUrl(url)) {
    return {
      ok: false,
      restricted: true,
      error:
        "Chrome no permite inyectar la extensión en esta página (por ejemplo chrome://*, Chrome Web Store o páginas internas)."
    };
  }

  const injectResult = await injectContentScriptIntoTab(tabId);
  if (!injectResult.ok) {
    return injectResult;
  }

  return sendToolboxVisibility(tabId, visible);
}

function getPersistentStorageArea() {
  if (chrome.storage && chrome.storage.local) return chrome.storage.local;
  return getStorageArea();
}

function getDirectOpenAiConfig() {
  return new Promise((resolve) => {
    const storageArea = getPersistentStorageArea();
    if (!storageArea) {
      resolve({ apiKey: "", model: DIRECT_OPENAI_DEFAULT_MODEL });
      return;
    }

    storageArea.get([DIRECT_OPENAI_API_KEY_STORAGE_KEY, DIRECT_OPENAI_MODEL_STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        resolve({ apiKey: "", model: DIRECT_OPENAI_DEFAULT_MODEL });
        return;
      }

      const apiKey =
        typeof result?.[DIRECT_OPENAI_API_KEY_STORAGE_KEY] === "string"
          ? result[DIRECT_OPENAI_API_KEY_STORAGE_KEY].trim()
          : "";
      const model =
        typeof result?.[DIRECT_OPENAI_MODEL_STORAGE_KEY] === "string" &&
        result[DIRECT_OPENAI_MODEL_STORAGE_KEY].trim()
          ? result[DIRECT_OPENAI_MODEL_STORAGE_KEY].trim()
          : DIRECT_OPENAI_DEFAULT_MODEL;

      resolve({ apiKey, model });
    });
  });
}

function setDirectOpenAiConfig({ apiKey, model }) {
  return new Promise((resolve, reject) => {
    const storageArea = getPersistentStorageArea();
    if (!storageArea) {
      reject(new Error("Chrome storage is not available."));
      return;
    }

    const updates = {};
    if (typeof apiKey === "string") {
      const trimmed = apiKey.trim();
      if (!trimmed) {
        reject(new Error("API key is empty."));
        return;
      }
      updates[DIRECT_OPENAI_API_KEY_STORAGE_KEY] = trimmed;
    }

    if (typeof model === "string" && model.trim()) {
      updates[DIRECT_OPENAI_MODEL_STORAGE_KEY] = model.trim();
    }

    if (Object.keys(updates).length === 0) {
      reject(new Error("Nothing to save."));
      return;
    }

    storageArea.set(updates, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "Failed to save config."));
        return;
      }
      resolve();
    });
  });
}

function createCodeError(message, code) {
  const error = new Error(message);
  if (code) {
    error.code = code;
  }
  return error;
}

function extractText(payload) {
  if (!payload || typeof payload !== "object") return "";

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (Array.isArray(payload.output)) {
    const text = payload.output
      .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
      .filter(
        (part) =>
          part &&
          (part.type === "output_text" || part.type === "text") &&
          typeof part.text === "string"
      )
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (text) return text;
  }

  if (Array.isArray(payload.choices)) {
    const content = payload.choices[0]?.message?.content;
    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }
  }

  return "";
}

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function truncateText(value, maxChars) {
  const text = toTrimmedString(value);
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n...[truncated]`;
}

function buildPageContextText(pageContext) {
  if (!pageContext || typeof pageContext !== "object") return "";

  const sections = [];
  const url = truncateText(pageContext.url, 500);
  const title = truncateText(pageContext.title, 500);
  const language = truncateText(pageContext.language, 30);
  const selectionText = truncateText(pageContext.selectionText, 2000);
  const activeElementText = truncateText(pageContext.activeElementText, 2000);
  const visibleText = truncateText(pageContext.visibleText, 12000);
  const viewport =
    pageContext.viewport &&
    Number.isFinite(pageContext.viewport.width) &&
    Number.isFinite(pageContext.viewport.height)
      ? `${Math.max(0, Math.floor(pageContext.viewport.width))}x${Math.max(
          0,
          Math.floor(pageContext.viewport.height)
        )}`
      : "";

  if (url) sections.push(`URL: ${url}`);
  if (title) sections.push(`Title: ${title}`);
  if (language) sections.push(`Language: ${language}`);
  if (viewport) sections.push(`Viewport: ${viewport}`);
  if (selectionText) sections.push(`Selected text:\n${selectionText}`);
  if (activeElementText) sections.push(`Focused field text:\n${activeElementText}`);
  if (visibleText) sections.push(`Visible page text:\n${visibleText}`);

  return sections.join("\n\n");
}

function normalizeDirectImageAttachments(rawAttachments) {
  if (!Array.isArray(rawAttachments)) return [];

  return rawAttachments
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") return null;
      const type = toTrimmedString(attachment.type).toLowerCase();
      if (type && type !== "image") return null;

      const dataUrl = typeof attachment.dataUrl === "string" ? attachment.dataUrl.trim() : "";
      if (!dataUrl || !/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(dataUrl)) return null;

      const label = truncateText(attachment.label, 140);
      return { dataUrl, label };
    })
    .filter(Boolean)
    .slice(0, 2);
}

function buildPromptWithContext(prompt, pageContext, attachments) {
  const pageContextText = buildPageContextText(pageContext);
  if (!pageContextText && (!Array.isArray(attachments) || attachments.length === 0)) {
    return prompt;
  }

  const parts = [
    "The user is asking from a webpage.",
    "Use the page context and attached screenshots when relevant.",
    "If context is missing, clearly say what is not available.",
    ""
  ];

  if (pageContextText) {
    parts.push("[Page context]");
    parts.push(pageContextText);
    parts.push("");
  }

  if (Array.isArray(attachments) && attachments.length > 0) {
    parts.push("[Attached screenshots]");
    attachments.forEach((attachment, index) => {
      parts.push(
        attachment.label
          ? `Attachment ${index + 1}: image (${attachment.label})`
          : `Attachment ${index + 1}: image`
      );
    });
    parts.push("");
  }

  parts.push("[User question]");
  parts.push(prompt);
  return parts.join("\n");
}

async function askDirectOpenAi(prompt, pageContext, attachments = []) {
  const { apiKey, model } = await getDirectOpenAiConfig();
  if (!apiKey) {
    throw createCodeError(
      "No hay backend local disponible y la API key de OpenAI no está configurada en la extensión.",
      "EXTENSION_OPENAI_KEY_REQUIRED"
    );
  }

  const imageAttachments = normalizeDirectImageAttachments(attachments);
  const promptWithContext = buildPromptWithContext(prompt, pageContext, imageAttachments);
  const userContent = [{ type: "input_text", text: promptWithContext }];

  imageAttachments.forEach((attachment, index) => {
    userContent.push({
      type: "input_text",
      text: attachment.label
        ? `Attached screenshot ${index + 1}: ${attachment.label}`
        : `Attached screenshot ${index + 1}`
    });
    userContent.push({
      type: "input_image",
      image_url: attachment.dataUrl
    });
  });

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || DIRECT_OPENAI_DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are a precise assistant integrated into a browser extension. Use page context and screenshots when relevant."
            }
          ]
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_output_tokens: DIRECT_OPENAI_MAX_OUTPUT_TOKENS,
      temperature: 0.4
    })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const upstreamError =
      payload && payload.error && typeof payload.error.message === "string"
        ? payload.error.message
        : "";
    throw createCodeError(
      upstreamError || `OpenAI API failed with status ${response.status}.`,
      "DIRECT_OPENAI_REQUEST_FAILED"
    );
  }

  const text = extractText(payload);
  if (!text) {
    throw createCodeError("OpenAI API devolvió una respuesta vacía.", "DIRECT_OPENAI_EMPTY_RESPONSE");
  }

  return {
    text,
    chainOfThought: []
  };
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

async function askChatWithFallback(prompt, pageContext, attachments = []) {
  try {
    return await askLocalBackend(prompt, pageContext, attachments);
  } catch (localError) {
    try {
      return await askDirectOpenAi(prompt, pageContext, attachments);
    } catch (directError) {
      if (directError && typeof directError === "object" && directError.code) {
        throw directError;
      }

      const localMessage =
        localError instanceof Error && localError.message
          ? localError.message
          : "No se pudo contactar con el backend local.";
      const directMessage =
        directError instanceof Error && directError.message
          ? directError.message
          : "También falló el modo directo con OpenAI.";
      throw new Error(`${localMessage} ${directMessage}`);
    }
  }
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
    const result = await sendToolboxVisibilityEnsuringContentScript(tab, nextActive);

    if (!result.ok && nextActive) {
      await setToolboxActiveForTab(tab.id, false);
      if (result.restricted) {
        console.info(result.error);
      } else if (result.error) {
        console.warn("No se pudo activar Toolbox en esta pestaña:", result.error);
      }
    }
  })();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!Number.isInteger(tabId) || tabId < 0) return;
  if (!changeInfo || changeInfo.status !== "complete") return;

  void (async () => {
    const shouldShow = await isToolboxActiveForTab(tabId);
    if (shouldShow) {
      const result = await sendToolboxVisibilityEnsuringContentScript(
        tab && typeof tab.id === "number" ? tab : { id: tabId },
        true
      );
      if (!result.ok && result.restricted) {
        await setToolboxActiveForTab(tabId, false);
      }
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

  if (message.type === SET_OPENAI_CONFIG_MESSAGE_TYPE) {
    const apiKey = typeof message.apiKey === "string" ? message.apiKey.trim() : "";
    const model = typeof message.model === "string" ? message.model.trim() : "";

    if (!apiKey) {
      sendResponse({ ok: false, error: "La API key está vacía." });
      return;
    }

    setDirectOpenAiConfig({ apiKey, model: model || undefined })
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error) => {
        const messageText =
          error instanceof Error && error.message
            ? error.message
            : "No se pudo guardar la configuración.";
        sendResponse({ ok: false, error: messageText });
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
        let messageText =
          error instanceof Error && error.message
            ? error.message
            : "No se pudo capturar la pestaña visible.";
        if (/Either the '<all_urls>' or 'activeTab' permission is required/i.test(messageText)) {
          messageText =
            "Falta permiso para capturar la pestaña. Recarga la extensión en chrome://extensions y vuelve a probar (aceptando los nuevos permisos).";
        }
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

  askChatWithFallback(prompt, pageContext, attachments)
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
      const errorCode =
        error && typeof error === "object" && typeof error.code === "string" ? error.code : undefined;
      sendResponse({ ok: false, error: messageText, errorCode });
    });

  return true;
});
