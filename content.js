(() => {
  /* ================================================================
   *  IDENTIFIERS
   * ================================================================ */
  const BAR_CONTAINER_ID = "__toolbox_bar_container__";
  const BAR_INPUT_ID = "__toolbox_bar_input__";
  const BAR_INPUT_ROW_ID = "__toolbox_bar_input_row__";
  const BAR_MIC_BUTTON_ID = "__toolbox_bar_mic_button__";
  const BAR_GRADIENT_ID = "__toolbox_bottom_gradient__";
  const PANEL_ID = "__toolbox_panel__";
  const PANEL_CONTENT_ID = "__toolbox_panel_content__";
  const PANEL_PROMPT_ID = "__toolbox_panel_prompt__";
  const PANEL_ANSWER_ID = "__toolbox_panel_answer__";
  const PANEL_COT_ID = "__toolbox_panel_chain_of_thought__";
  const PANEL_TTS_BUTTON_ID = "__toolbox_panel_tts_button__";
  const PANEL_AGENT_BUTTON_ID = "__toolbox_panel_agent_button__";
  const PANEL_PIN_BUTTON_ID = "__toolbox_panel_pin_button__";
  const PANEL_CLOSE_BUTTON_ID = "__toolbox_panel_close_button__";
  const PANEL_MINIMIZE_BUTTON_ID = "__toolbox_panel_minimize_button__";
  const ARCHIVE_TAB_CLASS = "__toolbox_archive_tab__";
  const BAR_ATTACHMENTS_ID = "__toolbox_bar_attachments__";
  const AGENT_OVERLAY_ID = "__toolbox_agent_overlay__";
  const AGENT_CURSOR_ID = "__toolbox_agent_cursor__";
  const AGENT_STATUS_ID = "__toolbox_agent_status__";
  const FLOATING_ICON_ID = "__toolbox_icon__";
  const FLOATING_NODE_ID_PREFIX = "__toolbox_node__";
  const FLOATING_POPUP_ID = "__toolbox_template_popup__";
  const SCREENSHOT_OVERLAY_ID = "__toolbox_screen_capture_overlay__";
  const SCREENSHOT_SELECTION_ID = "__toolbox_screen_capture_selection__";
  const TOGGLE_MESSAGE_TYPE = "TOGGLE_TOOLBOX_BUBBLE";
  const CHAT_MESSAGE_TYPE = "TOOLBOX_CHAT_REQUEST";
  const AGENT_MESSAGE_TYPE = "TOOLBOX_AGENT_REQUEST";
  const TTS_MESSAGE_TYPE = "TOOLBOX_TTS_REQUEST";
  const CAPTURE_MESSAGE_TYPE = "TOOLBOX_CAPTURE_VISIBLE_TAB";
  const ICON_SRC = chrome.runtime.getURL("assets/icon.png");
  const PIN_ICON_SRC = chrome.runtime.getURL("assets/pin.png");

  /* ================================================================
   *  DIMENSION & STYLE CONSTANTS
   * ================================================================ */
  const BAR_WIDTH_PX = 520;
  const BAR_MIN_WIDTH_PX = 360;
  const BAR_MAX_WIDTH_PX = 920;
  const BAR_HEIGHT_PX = 54;
  const BAR_RADIUS_PX = 27;
  const BAR_BOTTOM_PX = 18;
  const BAR_GRADIENT_HEIGHT_PX = 220;
  const FLOATING_ICON_SIZE_PX = 56;
  const FLOATING_NODE_SIZE_PX = 40;
  const FLOATING_NODE_DISTANCE_PX = 86;
  const FLOATING_SCREEN_MARGIN_PX = 16;
  const FLOATING_DRAG_THRESHOLD_PX = 6;
  const FLOATING_QUICK_CLICK_MS = 300;
  const SCREENSHOT_MIN_SELECTION_PX = 14;
  const SCREENSHOT_MAX_SIDE_PX = 1400;
  const PANEL_MAX_HEIGHT_PX = 900;
  const PANEL_MIN_HEIGHT_PX = 170;
  const PANEL_MAX_HEIGHT_RATIO = 0.78;
  const PANEL_RADIUS_PX = 18;
  const BAR_DRAG_THRESHOLD_PX = 5;
  const AGENT_MAX_STEPS = 8;
  const AGENT_MAX_HISTORY = 10;
  const RESIZE_HIT_AREA_PX = 8;
  const BAR_MIN_TOTAL_HEIGHT_PX = 72;
  const BAR_MAX_TOTAL_HEIGHT_PX = 980;
  const PAGE_CONTEXT_MAX_CHARS = 12000;
  const PAGE_SELECTION_MAX_CHARS = 2000;
  const PAGE_ACTIVE_ELEMENT_MAX_CHARS = 2000;
  const SPEECH_AUTO_SUBMIT_SILENCE_MS = 1200;

  /* ── animation ── */
  const SLIDE_DURATION_MS = 380;
  const EXPAND_DURATION_MS = 320;
  const EASING = "cubic-bezier(0.25, 1, 0.5, 1)";

  /* ── colours ── */
  const BG_COLOR = "rgba(17, 24, 39, 0.92)";
  const BAR_BG_UNPINNED = "rgba(17, 24, 39, 0.72)";
  const BAR_BG_PINNED = "rgba(17, 24, 39, 0.9)";
  const PANEL_BG_UNPINNED = "rgba(17, 24, 39, 0.66)";
  const PANEL_BG_PINNED = "rgba(17, 24, 39, 0.86)";
  const BG_BLUR = "blur(18px)";
  const BORDER_COLOR = "rgba(255, 255, 255, 0.08)";
  const INPUT_COLOR = "#f3f4f6";
  const PLACEHOLDER_ID = "__toolbox_placeholder_style__";
  const ACCENT = "rgba(99, 102, 241, 0.55)";

  /* ================================================================
   *  STATE
   * ================================================================ */
  const state = {
    visible: false,
    expanded: false,   // results panel open
    panelBodyHidden: false,
    pending: false,
    requestId: 0,
    barBottom: BAR_BOTTOM_PX,
    barLeft: 0,        // will be centred on create
    barTop: 0,
    barWidth: BAR_WIDTH_PX,
    barHeight: null,
    pinned: false,
    currentTabHasResponse: false,
    currentConversation: [],
    onResize: null,
    onKeydown: null,
    floatingExpanded: false,
    floatingCenterX: 0,
    floatingCenterY: 0,
    floatingNodeMap: new Map(),
    floatingPopupCloseTimer: null,
    floatingOnResize: null,
    imageAttachment: null,
    agentModeEnabled: false,
    agentRunning: false,
    agentStopRequested: false,
    speechRecognition: null,
    speechSupported: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    speechRecording: false,
    speechStopRequested: false,
    speechBaseText: "",
    speechFinalText: "",
    speechAutoSubmitTimer: null,
    speechAutoSubmitPending: false,
    ttsPending: false,
    ttsPlaying: false,
    ttsAudio: null,
    screenCaptureCleanup: null,
    screenCaptureInProgress: false
  };

  const floatingDirections = [
    { key: "top", dx: 0, dy: -FLOATING_NODE_DISTANCE_PX, label: "TOP" },
    { key: "left", dx: -FLOATING_NODE_DISTANCE_PX, dy: 0, label: "LEFT" },
    { key: "right", dx: FLOATING_NODE_DISTANCE_PX, dy: 0, label: "RIGHT" },
    { key: "bottom", dx: 0, dy: FLOATING_NODE_DISTANCE_PX, label: "BOTTOM" }
  ];

  /* ── helpers ── */
  function getEl(id) {
    return document.getElementById(id);
  }
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  function getResizeDirectionForRect(clientX, clientY, rect) {
    if (!rect) return "";
    const nearLeft = clientX - rect.left <= RESIZE_HIT_AREA_PX;
    const nearRight = rect.right - clientX <= RESIZE_HIT_AREA_PX;
    const nearTop = clientY - rect.top <= RESIZE_HIT_AREA_PX;
    const nearBottom = rect.bottom - clientY <= RESIZE_HIT_AREA_PX;

    if (nearTop && nearLeft) return "nw";
    if (nearTop && nearRight) return "ne";
    if (nearBottom && nearLeft) return "sw";
    if (nearBottom && nearRight) return "se";
    if (nearTop) return "n";
    if (nearBottom) return "s";
    if (nearLeft) return "w";
    if (nearRight) return "e";
    return "";
  }
  function getResizeCursor(direction) {
    switch (direction) {
      case "n":
      case "s":
        return "ns-resize";
      case "e":
      case "w":
        return "ew-resize";
      case "ne":
      case "sw":
        return "nesw-resize";
      case "nw":
      case "se":
        return "nwse-resize";
      default:
        return "grab";
    }
  }
  function getBar() {
    return getEl(BAR_CONTAINER_ID);
  }
  function getInput() {
    return getEl(BAR_INPUT_ID);
  }
  function getInputRow() {
    return getEl(BAR_INPUT_ROW_ID);
  }
  function getMicButton() {
    return getEl(BAR_MIC_BUTTON_ID);
  }
  function getPanel() {
    return getEl(PANEL_ID);
  }
  function getPanelContent() {
    return getEl(PANEL_CONTENT_ID);
  }
  function getPanelPrompt() {
    return getEl(PANEL_PROMPT_ID);
  }
  function getPanelAnswer() {
    return getEl(PANEL_ANSWER_ID);
  }
  function getPanelChainOfThought() {
    return getEl(PANEL_COT_ID);
  }
  function getPanelTtsButton() {
    return getEl(PANEL_TTS_BUTTON_ID);
  }
  function getPanelAgentButton() {
    return getEl(PANEL_AGENT_BUTTON_ID);
  }
  function getPanelPinButton() {
    return getEl(PANEL_PIN_BUTTON_ID);
  }
  function getPanelMinimizeButton() {
    return getEl(PANEL_MINIMIZE_BUTTON_ID);
  }
  function getAttachmentStrip() {
    return getEl(BAR_ATTACHMENTS_ID);
  }
  function getAgentOverlay() {
    return getEl(AGENT_OVERLAY_ID);
  }
  function getAgentCursor() {
    return getEl(AGENT_CURSOR_ID);
  }
  function getAgentStatus() {
    return getEl(AGENT_STATUS_ID);
  }
  function getBottomGradient() {
    return getEl(BAR_GRADIENT_ID);
  }
  function getFloatingIcon() {
    return getEl(FLOATING_ICON_ID);
  }
  function getFloatingPopup() {
    return getEl(FLOATING_POPUP_ID);
  }
  function getFloatingNode(key) {
    return getEl(`${FLOATING_NODE_ID_PREFIX}_${key}`);
  }
  function getScreenCaptureOverlay() {
    return getEl(SCREENSHOT_OVERLAY_ID);
  }
  function getDocumentSize() {
    const docEl = document.documentElement;
    const body = document.body;
    return {
      width: Math.max(docEl?.scrollWidth || 0, body?.scrollWidth || 0, window.innerWidth),
      height: Math.max(docEl?.scrollHeight || 0, body?.scrollHeight || 0, window.innerHeight)
    };
  }

  function showBottomGradient() {
    const gradient = getBottomGradient();
    if (!gradient) return;
    gradient.style.opacity = "1";
  }

  function hideBottomGradient() {
    const gradient = getBottomGradient();
    if (!gradient) return;
    gradient.style.opacity = "0";
  }

  function ensureBottomGradient() {
    let gradient = getBottomGradient();
    if (gradient) return gradient;

    gradient = document.createElement("div");
    gradient.id = BAR_GRADIENT_ID;

    Object.assign(gradient.style, {
      position: "fixed",
      left: "0",
      bottom: "0",
      width: "100vw",
      height: `${BAR_GRADIENT_HEIGHT_PX}px`,
      background:
        "linear-gradient(to top, rgba(37, 99, 235, 0.22) 0%, rgba(17, 24, 39, 0.18) 34%, rgba(17, 24, 39, 0.10) 58%, rgba(17, 24, 39, 0.04) 78%, rgba(17, 24, 39, 0) 100%)",
      pointerEvents: "none",
      zIndex: "2147483646",
      opacity: "0",
      transition: `opacity ${SLIDE_DURATION_MS}ms ease`
    });

    (document.body || document.documentElement).appendChild(gradient);
    return gradient;
  }

  function setFloatingIconPosition(left, top) {
    const icon = getFloatingIcon();
    if (!icon) return;

    const maxLeft = Math.max(0, window.innerWidth - FLOATING_ICON_SIZE_PX);
    const maxTop = Math.max(0, window.innerHeight - FLOATING_ICON_SIZE_PX);
    const nextLeft = clamp(left, 0, maxLeft);
    const nextTop = clamp(top, 0, maxTop);

    icon.style.left = `${nextLeft}px`;
    icon.style.top = `${nextTop}px`;
    state.floatingCenterX = nextLeft + FLOATING_ICON_SIZE_PX / 2;
    state.floatingCenterY = nextTop + FLOATING_ICON_SIZE_PX / 2;

    updateFloatingNodePositions();
  }

  function showFloatingPopup(directionLabel) {
    let popup = getFloatingPopup();
    if (!popup) {
      popup = document.createElement("div");
      popup.id = FLOATING_POPUP_ID;

      Object.assign(popup.style, {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "14px 16px",
        borderRadius: "12px",
        background: "#111827",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: "0 10px 28px rgba(0, 0, 0, 0.35)",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        zIndex: "2147483647"
      });

      const image = document.createElement("img");
      image.src = ICON_SRC;
      image.alt = "Template";
      Object.assign(image.style, {
        width: "28px",
        height: "28px",
        objectFit: "contain",
        flexShrink: "0"
      });

      const text = document.createElement("span");
      text.id = `${FLOATING_POPUP_ID}_text`;

      popup.appendChild(image);
      popup.appendChild(text);
      (document.body || document.documentElement).appendChild(popup);
    }

    const textElement = getEl(`${FLOATING_POPUP_ID}_text`);
    if (textElement) {
      textElement.textContent = `Template image selected: ${directionLabel}`;
    }

    if (state.floatingPopupCloseTimer) {
      clearTimeout(state.floatingPopupCloseTimer);
    }

    state.floatingPopupCloseTimer = setTimeout(() => {
      const currentPopup = getFloatingPopup();
      if (currentPopup) currentPopup.remove();
      state.floatingPopupCloseTimer = null;
    }, 2200);
  }

  function updateFloatingNodePositions() {
    floatingDirections.forEach(({ key, dx, dy }) => {
      const node = state.floatingNodeMap.get(key) || getFloatingNode(key);
      if (!node) return;

      if (!state.floatingExpanded) {
        node.style.display = "none";
        return;
      }

      node.style.display = "flex";
      const nodeLeft = state.floatingCenterX + dx - FLOATING_NODE_SIZE_PX / 2;
      const nodeTop = state.floatingCenterY + dy - FLOATING_NODE_SIZE_PX / 2;
      node.style.left = `${nodeLeft}px`;
      node.style.top = `${nodeTop}px`;
    });
  }

  function toggleFloatingNodes() {
    state.floatingExpanded = !state.floatingExpanded;
    updateFloatingNodePositions();
  }

  function createFloatingNode({ key, label }) {
    const node = document.createElement("button");
    node.id = `${FLOATING_NODE_ID_PREFIX}_${key}`;
    node.type = "button";
    node.textContent = label;

    Object.assign(node.style, {
      position: "fixed",
      width: `${FLOATING_NODE_SIZE_PX}px`,
      height: `${FLOATING_NODE_SIZE_PX}px`,
      borderRadius: "9999px",
      border: "none",
      background: "#1f2937",
      color: "#ffffff",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      fontWeight: "700",
      cursor: "pointer",
      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.28)",
      zIndex: "2147483647"
    });

    node.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (key === "bottom") {
        state.floatingExpanded = false;
        updateFloatingNodePositions();
        openChatFromFloating();
        return;
      }
      if (key === "left") {
        state.floatingExpanded = false;
        updateFloatingNodePositions();
        startScreenCaptureSelection();
        return;
      }
      showFloatingPopup(label);
    });

    state.floatingNodeMap.set(key, node);
    (document.body || document.documentElement).appendChild(node);
  }

  function openChatFromFloating() {
    if (state.visible) {
      const input = getInput();
      if (input) {
        input.focus();
        input.select();
      }
      return;
    }
    createBar();
  }

  function createFloatingIcon() {
    if (getFloatingIcon()) return;

    const icon = document.createElement("img");
    icon.id = FLOATING_ICON_ID;
    icon.src = ICON_SRC;
    icon.alt = "Toolbox";
    icon.draggable = false;

    Object.assign(icon.style, {
      position: "fixed",
      top: "0px",
      left: "0px",
      width: `${FLOATING_ICON_SIZE_PX}px`,
      height: `${FLOATING_ICON_SIZE_PX}px`,
      objectFit: "contain",
      cursor: "grab",
      userSelect: "none",
      WebkitUserDrag: "none",
      pointerEvents: "auto",
      touchAction: "none",
      borderRadius: "9999px",
      boxShadow: "0 10px 24px rgba(0, 0, 0, 0.28)",
      zIndex: "2147483647"
    });

    let activePointerId = null;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let originLeft = 0;
    let originTop = 0;
    let pointerDownAt = 0;
    let hasDragged = false;

    icon.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });

    icon.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;

      event.preventDefault();
      icon.setPointerCapture(event.pointerId);
      activePointerId = event.pointerId;
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      pointerDownAt = Date.now();
      hasDragged = false;
      const rect = icon.getBoundingClientRect();
      originLeft = rect.left;
      originTop = rect.top;
      icon.style.cursor = "grabbing";
    });

    icon.addEventListener("pointermove", (event) => {
      if (event.pointerId !== activePointerId) return;

      const dx = event.clientX - pointerStartX;
      const dy = event.clientY - pointerStartY;
      if (Math.hypot(dx, dy) > FLOATING_DRAG_THRESHOLD_PX) {
        hasDragged = true;
      }
      if (!hasDragged) return;

      setFloatingIconPosition(originLeft + dx, originTop + dy);
    });

    icon.addEventListener("pointerup", (event) => {
      if (event.pointerId !== activePointerId) return;

      icon.releasePointerCapture(event.pointerId);
      activePointerId = null;
      icon.style.cursor = "grab";

      const clickDuration = Date.now() - pointerDownAt;
      if (!hasDragged && clickDuration <= FLOATING_QUICK_CLICK_MS) {
        toggleFloatingNodes();
      }
    });

    icon.addEventListener("pointercancel", (event) => {
      if (event.pointerId !== activePointerId) return;
      activePointerId = null;
      icon.style.cursor = "grab";
    });

    const mountTarget = document.body || document.documentElement;
    if (!mountTarget) return;

    mountTarget.appendChild(icon);
    floatingDirections.forEach((direction) => createFloatingNode(direction));
    state.floatingExpanded = false;

    setFloatingIconPosition(
      window.innerWidth - FLOATING_ICON_SIZE_PX - FLOATING_SCREEN_MARGIN_PX,
      FLOATING_SCREEN_MARGIN_PX
    );

    state.floatingOnResize = () => {
      const bubble = getFloatingIcon();
      if (!bubble) return;
      const rect = bubble.getBoundingClientRect();
      setFloatingIconPosition(rect.left, rect.top);
    };
    window.addEventListener("resize", state.floatingOnResize);
  }

  function removeFloatingUI() {
    const icon = getFloatingIcon();
    if (icon) icon.remove();

    floatingDirections.forEach(({ key }) => {
      const node = state.floatingNodeMap.get(key) || getFloatingNode(key);
      if (node) node.remove();
    });
    state.floatingNodeMap.clear();
    state.floatingExpanded = false;

    const popup = getFloatingPopup();
    if (popup) popup.remove();
    if (state.floatingPopupCloseTimer) {
      clearTimeout(state.floatingPopupCloseTimer);
      state.floatingPopupCloseTimer = null;
    }

    if (state.floatingOnResize) {
      window.removeEventListener("resize", state.floatingOnResize);
      state.floatingOnResize = null;
    }
  }

  function toImageAttachmentPayload() {
    if (!state.imageAttachment || typeof state.imageAttachment.dataUrl !== "string") {
      return [];
    }

    return [
      {
        type: "image",
        dataUrl: state.imageAttachment.dataUrl,
        mimeType: state.imageAttachment.mimeType || "image/jpeg",
        width: Number.isFinite(state.imageAttachment.width)
          ? Math.max(1, Math.floor(state.imageAttachment.width))
          : undefined,
        height: Number.isFinite(state.imageAttachment.height)
          ? Math.max(1, Math.floor(state.imageAttachment.height))
          : undefined,
        label: "User screen crop"
      }
    ];
  }

  function renderAttachmentStrip() {
    const strip = getAttachmentStrip();
    if (!strip) return;

    strip.innerHTML = "";

    if (!state.imageAttachment || !state.imageAttachment.dataUrl) {
      strip.style.display = "none";
      return;
    }

    strip.style.display = "flex";

    const chip = document.createElement("div");
    Object.assign(chip.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      border: "1px solid rgba(147, 197, 253, 0.45)",
      borderRadius: "10px",
      background: "rgba(30, 58, 138, 0.25)",
      padding: "3px 6px",
      maxWidth: "150px",
      flexShrink: "0"
    });

    const thumb = document.createElement("img");
    thumb.src = state.imageAttachment.dataUrl;
    thumb.alt = "Screenshot attachment";
    Object.assign(thumb.style, {
      width: "30px",
      height: "24px",
      objectFit: "cover",
      borderRadius: "6px",
      border: "1px solid rgba(255, 255, 255, 0.16)",
      flexShrink: "0"
    });

    const text = document.createElement("span");
    text.textContent = "Screenshot";
    Object.assign(text.style, {
      color: "rgba(219, 234, 254, 0.95)",
      fontSize: "11px",
      lineHeight: "1.2",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "x";
    Object.assign(removeBtn.style, {
      width: "18px",
      height: "18px",
      borderRadius: "9999px",
      border: "none",
      cursor: "pointer",
      color: "#dbeafe",
      background: "rgba(30, 64, 175, 0.55)",
      lineHeight: "1",
      padding: "0",
      fontSize: "11px",
      flexShrink: "0"
    });
    removeBtn.addEventListener("pointerdown", (event) => event.stopPropagation());
    removeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.imageAttachment = null;
      renderAttachmentStrip();
    });

    chip.appendChild(thumb);
    chip.appendChild(text);
    chip.appendChild(removeBtn);
    strip.appendChild(chip);
  }

  function setImageAttachment(attachment) {
    if (!attachment || typeof attachment.dataUrl !== "string") {
      state.imageAttachment = null;
    } else {
      state.imageAttachment = attachment;
    }
    renderAttachmentStrip();
  }

  function clearImageAttachment() {
    state.imageAttachment = null;
    renderAttachmentStrip();
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, Math.max(0, Math.floor(ms)));
    });
  }

  function escapeCssValue(value) {
    if (typeof value !== "string") return "";
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return value.replace(/["\\]/g, "\\$&");
  }

  function buildElementSelector(element) {
    if (!(element instanceof Element)) return "";
    const tag = element.tagName.toLowerCase();

    if (element.id) {
      return `#${escapeCssValue(element.id)}`;
    }

    const testId = element.getAttribute("data-testid");
    if (testId && testId.length < 120) {
      return `${tag}[data-testid="${escapeCssValue(testId)}"]`;
    }

    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.length < 120) {
      return `${tag}[aria-label="${escapeCssValue(ariaLabel)}"]`;
    }

    const name = element.getAttribute("name");
    if (name && name.length < 120) {
      return `${tag}[name="${escapeCssValue(name)}"]`;
    }

    const parts = [];
    let current = element;
    for (let depth = 0; depth < 5; depth += 1) {
      if (!current || !(current instanceof Element)) break;
      const currentTag = current.tagName.toLowerCase();
      let segment = currentTag;
      if (current.id) {
        segment += `#${escapeCssValue(current.id)}`;
        parts.unshift(segment);
        break;
      }
      const parent = current.parentElement;
      if (parent) {
        const sameTagSiblings = Array.from(parent.children).filter(
          (child) => child.tagName === current.tagName
        );
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(current) + 1;
          segment += `:nth-of-type(${index})`;
        }
      }
      parts.unshift(segment);
      current = parent;
      if (!current || current === document.body) break;
    }

    return parts.join(" > ");
  }

  function collectActionableElements() {
    const selector =
      'a[href],button,input:not([type="hidden"]),textarea,select,[role="button"],[role="link"],[contenteditable="true"]';
    const nodes = Array.from(document.querySelectorAll(selector));
    const elements = [];
    const seenSelectors = new Set();

    for (const element of nodes) {
      if (!(element instanceof HTMLElement)) continue;
      if (!isElementVisibleInViewport(element)) continue;

      const tag = element.tagName.toLowerCase();
      const selectorText = buildElementSelector(element);
      if (!selectorText || seenSelectors.has(selectorText)) continue;
      seenSelectors.add(selectorText);

      const rect = element.getBoundingClientRect();
      const text = truncateText(
        normalizeText(
          element.getAttribute("aria-label") ||
            element.getAttribute("title") ||
            element.innerText ||
            element.textContent ||
            ""
        ),
        110
      );
      const placeholder = truncateText(
        normalizeText(element.getAttribute("placeholder") || ""),
        80
      );
      const type = truncateText(normalizeText(element.getAttribute("type") || ""), 40);
      const role = truncateText(normalizeText(element.getAttribute("role") || ""), 40);

      elements.push({
        id: `el_${elements.length + 1}`,
        tag,
        selector: selectorText,
        text,
        placeholder,
        type,
        role,
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      });

      if (elements.length >= 28) break;
    }

    return elements;
  }

  function requestAgentStep(goal, pageContext, actionableElements, history) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: AGENT_MESSAGE_TYPE,
          goal,
          pageContext,
          actionableElements,
          history
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(
              new Error("No se pudo contactar con Agent Mode. Recarga la extensión e inténtalo.")
            );
            return;
          }
          if (!response || response.ok !== true || !response.action) {
            const errorMessage =
              response && typeof response.error === "string"
                ? response.error
                : "El backend de agente devolvió una respuesta inválida.";
            reject(new Error(errorMessage));
            return;
          }
          resolve(response);
        }
      );
    });
  }

  function ensureAgentOverlay() {
    let overlay = getAgentOverlay();
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = AGENT_OVERLAY_ID;
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "2147483647"
    });

    const cursor = document.createElement("div");
    cursor.id = AGENT_CURSOR_ID;
    Object.assign(cursor.style, {
      position: "fixed",
      width: "16px",
      height: "16px",
      borderRadius: "9999px",
      border: "2px solid rgba(56, 189, 248, 0.95)",
      background: "rgba(14, 116, 144, 0.35)",
      boxShadow: "0 0 0 10px rgba(56, 189, 248, 0.12)",
      left: "0",
      top: "0",
      transform: "translate(-9999px, -9999px)",
      transition: "transform 260ms ease"
    });

    const status = document.createElement("div");
    status.id = AGENT_STATUS_ID;
    Object.assign(status.style, {
      position: "fixed",
      top: "14px",
      right: "14px",
      padding: "8px 12px",
      borderRadius: "10px",
      background: "rgba(15, 23, 42, 0.92)",
      border: "1px solid rgba(125, 211, 252, 0.45)",
      color: "#e0f2fe",
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      letterSpacing: "0.2px",
      maxWidth: "320px"
    });
    status.textContent = "Agent mode running...";

    overlay.appendChild(cursor);
    overlay.appendChild(status);
    (document.body || document.documentElement).appendChild(overlay);
    return overlay;
  }

  function removeAgentOverlay() {
    const overlay = getAgentOverlay();
    if (overlay) overlay.remove();
  }

  function setAgentStatus(text) {
    ensureAgentOverlay();
    const status = getAgentStatus();
    if (status) {
      status.textContent = text;
    }
  }

  async function moveAgentCursor(x, y) {
    ensureAgentOverlay();
    const cursor = getAgentCursor();
    if (!cursor) return;
    const clampedX = clamp(Math.round(x), 8, Math.max(8, window.innerWidth - 8));
    const clampedY = clamp(Math.round(y), 8, Math.max(8, window.innerHeight - 8));
    cursor.style.transform = `translate(${clampedX - 8}px, ${clampedY - 8}px)`;
    await sleep(280);
  }

  function flashElement(element) {
    if (!(element instanceof HTMLElement)) return;
    const previousOutline = element.style.outline;
    const previousOutlineOffset = element.style.outlineOffset;
    const previousTransition = element.style.transition;

    element.style.outline = "2px solid rgba(56, 189, 248, 0.92)";
    element.style.outlineOffset = "2px";
    element.style.transition = "outline-color 180ms ease";
    setTimeout(() => {
      element.style.outline = previousOutline;
      element.style.outlineOffset = previousOutlineOffset;
      element.style.transition = previousTransition;
    }, 700);
  }

  function resolveActionableElement(elementId, actionableElements) {
    if (!elementId || !Array.isArray(actionableElements)) return null;
    const entry = actionableElements.find((item) => item.id === elementId);
    if (!entry || typeof entry.selector !== "string") return null;
    try {
      const element = document.querySelector(entry.selector);
      return element instanceof HTMLElement ? { element, entry } : null;
    } catch (error) {
      return null;
    }
  }

  async function typeTextLikeHuman(element, text, { clear = true } = {}) {
    const value = typeof text === "string" ? text : "";
    const normalized = value.slice(0, 280);

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const prototype = Object.getPrototypeOf(element);
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      const setElementValue = (nextValue) => {
        if (typeof valueSetter === "function") {
          valueSetter.call(element, nextValue);
        } else {
          element.value = nextValue;
        }
      };

      element.focus();
      if (clear) {
        setElementValue("");
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }
      for (const char of normalized) {
        setElementValue(`${element.value}${char}`);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(24);
      }
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    if (element.isContentEditable) {
      element.focus();
      if (clear) {
        element.textContent = "";
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }
      for (const char of normalized) {
        element.textContent = `${element.textContent || ""}${char}`;
        element.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(24);
      }
      return true;
    }

    return false;
  }

  async function executeAgentAction(action, actionableElements) {
    if (!action || typeof action.type !== "string") {
      return { ok: false, summary: "Invalid agent action." };
    }

    const type = action.type;

    if (type === "scroll") {
      const direction = action.direction === "up" ? "up" : "down";
      const amount = clamp(Number(action.amount) || 520, 120, 1400);
      await moveAgentCursor(window.innerWidth - 28, Math.floor(window.innerHeight * 0.45));
      window.scrollBy({
        top: direction === "up" ? -amount : amount,
        behavior: "smooth"
      });
      await sleep(700);
      return { ok: true, summary: `Scrolled ${direction}.` };
    }

    if (type === "click_element") {
      const resolved = resolveActionableElement(action.elementId, actionableElements);
      if (!resolved) {
        return { ok: false, summary: "Target element not found for click." };
      }
      const { element } = resolved;
      element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      await sleep(320);
      const rect = element.getBoundingClientRect();
      await moveAgentCursor(rect.left + rect.width / 2, rect.top + rect.height / 2);
      flashElement(element);
      element.click();
      await sleep(520);
      return { ok: true, summary: "Clicked target element." };
    }

    if (type === "type_in_element") {
      const resolved = resolveActionableElement(action.elementId, actionableElements);
      if (!resolved) {
        return { ok: false, summary: "Target element not found for typing." };
      }
      const { element } = resolved;
      element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      await sleep(300);
      const rect = element.getBoundingClientRect();
      await moveAgentCursor(rect.left + rect.width / 2, rect.top + rect.height / 2);
      flashElement(element);
      const typed = await typeTextLikeHuman(element, action.text || "", {
        clear: action.clear !== false
      });
      if (!typed) {
        return { ok: false, summary: "Could not type in the target element." };
      }
      if (action.submit === true) {
        element.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })
        );
        element.dispatchEvent(
          new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true })
        );
      }
      await sleep(300);
      return { ok: true, summary: "Typed into target element." };
    }

    if (type === "wait") {
      const ms = clamp(Number(action.ms) || 700, 120, 3000);
      await sleep(ms);
      return { ok: true, summary: `Waited ${ms}ms.` };
    }

    if (type === "finish") {
      return { ok: true, summary: "Agent marked task as finished.", done: true };
    }

    return { ok: false, summary: `Unsupported action: ${type}` };
  }

  function trimAgentLogs(logs, entry) {
    logs.push(entry);
    if (logs.length > AGENT_MAX_HISTORY) {
      logs.splice(0, logs.length - AGENT_MAX_HISTORY);
    }
  }

  function buildAgentChainFromHistory(history) {
    if (!Array.isArray(history) || history.length === 0) return [];
    return history.slice(-4).map((item, index) => ({
      title: `Agent update ${index + 1}`,
      items: [item]
    }));
  }

  function stopTtsPlayback() {
    if (state.ttsAudio) {
      try {
        state.ttsAudio.pause();
      } catch (error) {
        // Ignore pause errors on detached audio instances.
      }
      state.ttsAudio = null;
    }
    state.ttsPlaying = false;
  }

  function updateTtsButtonVisualState() {
    const button = getPanelTtsButton();
    if (!button) return;

    if (!state.currentTabHasResponse && !state.ttsPlaying && !state.ttsPending) {
      button.title = "No response to read yet";
      button.style.opacity = "0.55";
      button.style.cursor = "not-allowed";
      button.textContent = "S";
      return;
    }

    if (state.ttsPending) {
      button.title = "Generating speech...";
      button.style.opacity = "0.65";
      button.style.cursor = "wait";
      button.textContent = "...";
      return;
    }

    if (state.ttsPlaying) {
      button.title = "Stop speech";
      button.style.opacity = "1";
      button.style.cursor = "pointer";
      button.textContent = "[]";
      return;
    }

    button.title = "Read response aloud";
    button.style.opacity = "0.95";
    button.style.cursor = "pointer";
    button.textContent = "S";
  }

  function requestSpeechAudio(text) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: TTS_MESSAGE_TYPE, text },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(
              new Error("No se pudo contactar con TTS. Recarga la extensión e inténtalo.")
            );
            return;
          }

          if (!response || response.ok !== true || typeof response.audioBase64 !== "string") {
            const errorMessage =
              response && typeof response.error === "string"
                ? response.error
                : "El backend TTS devolvió una respuesta inválida.";
            reject(new Error(errorMessage));
            return;
          }

          resolve({
            audioBase64: response.audioBase64,
            mimeType:
              typeof response.mimeType === "string" && response.mimeType
                ? response.mimeType
                : "audio/mpeg"
          });
        }
      );
    });
  }

  async function speakPanelAnswer() {
    if (state.ttsPending) return;
    if (state.ttsPlaying) {
      stopTtsPlayback();
      updateTtsButtonVisualState();
      return;
    }
    if (!state.currentTabHasResponse) return;

    const originBar = getBar();
    const answer = getPanelAnswer();
    const answerText = typeof answer?.textContent === "string" ? answer.textContent.trim() : "";
    if (!answerText) return;

    state.ttsPending = true;
    updateTtsButtonVisualState();

    try {
      const result = await requestSpeechAudio(answerText);
      if (!originBar || originBar !== getBar()) {
        return;
      }
      const audio = new Audio(`data:${result.mimeType};base64,${result.audioBase64}`);
      stopTtsPlayback();
      state.ttsAudio = audio;
      state.ttsPlaying = true;
      updateTtsButtonVisualState();

      const resetAudioState = () => {
        if (state.ttsAudio === audio) {
          state.ttsAudio = null;
          state.ttsPlaying = false;
          updateTtsButtonVisualState();
        }
      };
      audio.addEventListener("ended", resetAudioState, { once: true });
      audio.addEventListener("error", resetAudioState, { once: true });
      await audio.play();
    } catch (error) {
      stopTtsPlayback();
      const button = getPanelTtsButton();
      if (button) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "No se pudo generar audio.";
        button.title = message;
      }
    } finally {
      state.ttsPending = false;
      updateTtsButtonVisualState();
    }
  }

  function clearSpeechAutoSubmitTimer() {
    if (state.speechAutoSubmitTimer) {
      clearTimeout(state.speechAutoSubmitTimer);
      state.speechAutoSubmitTimer = null;
    }
  }

  function submitPromptFromSpeechIfReady() {
    const input = getInput();
    if (!input || state.pending || state.agentRunning) return;
    if (!input.value.trim()) return;
    submitPrompt();
  }

  function scheduleSpeechAutoSubmit() {
    clearSpeechAutoSubmitTimer();

    if (!state.speechRecording || state.pending || state.agentRunning || state.speechStopRequested) {
      return;
    }

    const input = getInput();
    if (!input || !input.value.trim()) return;

    state.speechAutoSubmitTimer = setTimeout(() => {
      state.speechAutoSubmitTimer = null;
      const activeInput = getInput();
      if (
        !activeInput ||
        !activeInput.value.trim() ||
        state.pending ||
        state.agentRunning ||
        !state.speechRecording ||
        state.speechStopRequested
      ) {
        return;
      }

      stopSpeechRecognition({ preserveText: true, autoSubmit: true });
    }, SPEECH_AUTO_SUBMIT_SILENCE_MS);
  }

  function stopSpeechRecognition({ preserveText = true, autoSubmit = false } = {}) {
    clearSpeechAutoSubmitTimer();
    state.speechStopRequested = true;
    state.speechAutoSubmitPending = autoSubmit;

    if (!preserveText) {
      state.speechBaseText = "";
      state.speechFinalText = "";
    }

    const wasRecording = state.speechRecording;
    const recognition = state.speechRecognition;
    if (recognition && wasRecording) {
      try {
        recognition.stop();
      } catch (error) {
        // Ignore stop errors from stale recognition instances.
      }
    }

    state.speechRecording = false;
    updateMicButtonVisualState();

    if (!wasRecording && autoSubmit) {
      state.speechAutoSubmitPending = false;
      submitPromptFromSpeechIfReady();
    }
  }

  function updateMicButtonVisualState() {
    const button = getMicButton();
    if (!button) return;

    if (!state.speechSupported) {
      button.title = "Speech-to-text is not supported in this browser.";
      button.style.opacity = "0.45";
      button.style.cursor = "not-allowed";
      button.style.background = "rgba(71, 85, 105, 0.42)";
      button.style.borderColor = "rgba(148, 163, 184, 0.35)";
      button.textContent = "M";
      return;
    }

    if (state.speechRecording) {
      button.title = "Stop voice input";
      button.style.opacity = "1";
      button.style.cursor = "pointer";
      button.style.background = "rgba(239, 68, 68, 0.58)";
      button.style.borderColor = "rgba(252, 165, 165, 0.88)";
      button.textContent = "[]";
      return;
    }

    button.title = "Start voice input";
    button.style.opacity = state.pending ? "0.6" : "0.95";
    button.style.cursor = state.pending ? "not-allowed" : "pointer";
    button.style.background = "rgba(30, 64, 175, 0.28)";
    button.style.borderColor = "rgba(147, 197, 253, 0.5)";
    button.textContent = "M";
  }

  function applySpeechResultToInput(interimText = "") {
    const input = getInput();
    if (!input) return;
    const composed = `${state.speechBaseText}${state.speechFinalText}${interimText}`.replace(
      /\s+/g,
      " "
    );
    input.value = composed.trimStart();
  }

  function ensureSpeechRecognition() {
    if (!state.speechSupported) return null;
    if (state.speechRecognition) return state.speechRecognition;

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof Ctor !== "function") {
      state.speechSupported = false;
      updateMicButtonVisualState();
      return null;
    }

    const recognition = new Ctor();
    recognition.lang = document.documentElement?.lang || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      state.speechRecording = true;
      state.speechAutoSubmitPending = false;
      clearSpeechAutoSubmitTimer();
      updateMicButtonVisualState();
    };

    recognition.onresult = (event) => {
      let interimText = "";
      let finalTextChunk = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = normalizeText(result?.[0]?.transcript || "");
        if (!transcript) continue;

        if (result.isFinal) {
          finalTextChunk += `${transcript} `;
        } else {
          interimText += `${transcript} `;
        }
      }

      if (finalTextChunk) {
        state.speechFinalText += finalTextChunk;
      }
      applySpeechResultToInput(interimText);
      scheduleSpeechAutoSubmit();
    };

    recognition.onerror = () => {
      clearSpeechAutoSubmitTimer();
      if (!(state.speechStopRequested && state.speechAutoSubmitPending)) {
        state.speechAutoSubmitPending = false;
      }
      state.speechRecording = false;
      updateMicButtonVisualState();
    };

    recognition.onend = () => {
      clearSpeechAutoSubmitTimer();
      state.speechRecording = false;
      const shouldAutoSubmit = state.speechAutoSubmitPending;
      state.speechAutoSubmitPending = false;
      if (!state.speechStopRequested || shouldAutoSubmit) {
        applySpeechResultToInput("");
      }
      state.speechStopRequested = false;
      updateMicButtonVisualState();
      if (shouldAutoSubmit) {
        submitPromptFromSpeechIfReady();
      }
    };

    state.speechRecognition = recognition;
    return recognition;
  }

  function toggleSpeechRecognition() {
    if (state.pending) return;
    if (!state.speechSupported) {
      updateMicButtonVisualState();
      return;
    }

    if (state.speechRecording) {
      stopSpeechRecognition({ preserveText: true });
      return;
    }

    const input = getInput();
    if (!input) return;
    const recognition = ensureSpeechRecognition();
    if (!recognition) return;

    state.speechStopRequested = false;
    state.speechBaseText = input.value.trim();
    if (state.speechBaseText) {
      state.speechBaseText += " ";
    }
    state.speechFinalText = "";
    state.speechAutoSubmitPending = false;
    clearSpeechAutoSubmitTimer();

    try {
      recognition.start();
    } catch (error) {
      state.speechRecording = false;
      updateMicButtonVisualState();
    }
  }

  function updateAgentButtonVisualState() {
    const button = getPanelAgentButton();
    if (!button) return;

    const active = state.agentModeEnabled;
    button.title = active ? "Disable agent mode" : "Enable agent mode";
    button.style.background = active ? "rgba(45, 212, 191, 0.68)" : "rgba(45, 212, 191, 0.46)";
    button.style.borderColor = active
      ? "rgba(153, 246, 228, 0.92)"
      : "rgba(153, 246, 228, 0.72)";
    button.style.color = active ? "#042f2e" : "#083344";
    button.style.opacity = state.pending || state.agentRunning ? "0.6" : "0.95";
    button.style.transform = active ? "scale(1.03)" : "scale(1)";
  }

  function setAgentModeEnabled(enabled) {
    state.agentModeEnabled = Boolean(enabled);
    const input = getInput();
    if (input) {
      input.placeholder = state.agentModeEnabled
        ? "Agent mode: describe the task to execute..."
        : "Ask anything…";
    }
    if (!state.agentModeEnabled && !state.agentRunning) {
      removeAgentOverlay();
    }
    updateAgentButtonVisualState();
  }

  async function runAgentTask(goal) {
    const input = getInput();
    if (!input || state.pending || state.agentRunning) return;

    const requestId = ++state.requestId;
    state.pending = true;
    state.agentRunning = true;
    state.agentStopRequested = false;
    stopSpeechRecognition({ preserveText: true });
    input.disabled = true;
    input.value = "";
    hideBottomGradient();
    if (state.imageAttachment) {
      clearImageAttachment();
    }

    if (!state.expanded) expandPanel();
    if (state.panelBodyHidden) {
      state.panelBodyHidden = false;
      applyPanelBodyVisibility();
    }
    updateAgentButtonVisualState();
    updateMicButtonVisualState();

    const logs = [];
    const history = [];
    let finalMessage = "";
    setPanelContent("Agent mode started. Planning actions on this webpage...", {
      muted: true,
      chainOfThought: [],
      promptText: goal
    });
    setAgentStatus("Agent: planning first step...");

    try {
      for (let step = 1; step <= AGENT_MAX_STEPS; step += 1) {
        if (state.agentStopRequested || requestId !== state.requestId) {
          throw new Error("Agent execution stopped.");
        }

        const pageContext = buildPageContext();
        const actionableElements = collectActionableElements();
        const historyPayload = history.slice(-6).map((item) => ({
          step: item.step,
          action: item.action,
          result: item.result
        }));

        const agentResponse = await requestAgentStep(
          goal,
          pageContext,
          actionableElements,
          historyPayload
        );

        const reasoning =
          typeof agentResponse.reasoning === "string" ? agentResponse.reasoning.trim() : "";
        if (reasoning) {
          trimAgentLogs(logs, `Step ${step} plan: ${reasoning}`);
        }

        const action = agentResponse.action;
        const actionType = typeof action?.type === "string" ? action.type : "unknown";
        setAgentStatus(`Agent step ${step}/${AGENT_MAX_STEPS}: ${actionType}`);

        if (actionType === "finish") {
          const finishMessage =
            typeof agentResponse.message === "string" && agentResponse.message.trim()
              ? agentResponse.message.trim()
              : "Task completed.";
          trimAgentLogs(logs, `Done: ${finishMessage}`);
          finalMessage = finishMessage;
          setPanelContent(finishMessage, {
            chainOfThought: buildAgentChainFromHistory(logs),
            promptText: goal
          });
          state.currentTabHasResponse = true;
          state.currentConversation = trimConversationHistory([
            ...state.currentConversation,
            { user: goal, assistant: finishMessage }
          ]);
          return;
        }

        const execution = await executeAgentAction(action, actionableElements);
        history.push({
          step,
          action: actionType,
          result: execution.summary
        });
        trimAgentLogs(
          logs,
          execution.ok
            ? `Step ${step} executed: ${execution.summary}`
            : `Step ${step} warning: ${execution.summary}`
        );

        finalMessage = logs.join("\n");
        setPanelContent(finalMessage, {
          muted: true,
          chainOfThought: buildAgentChainFromHistory(logs),
          promptText: goal
        });
      }

      finalMessage = "Agent reached max steps without explicit finish.";
      state.currentTabHasResponse = true;
      state.currentConversation = trimConversationHistory([
        ...state.currentConversation,
        { user: goal, assistant: finalMessage }
      ]);
      setPanelContent(finalMessage, {
        error: true,
        chainOfThought: buildAgentChainFromHistory(logs),
        promptText: goal
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Agent mode failed unexpectedly.";
      finalMessage = `Error: ${message}`;
      state.currentTabHasResponse = true;
      state.currentConversation = trimConversationHistory([
        ...state.currentConversation,
        { user: goal, assistant: finalMessage }
      ]);
      setPanelContent(finalMessage, { error: true, chainOfThought: [], promptText: goal });
    } finally {
      removeAgentOverlay();
      state.agentRunning = false;
      state.pending = false;
      state.agentStopRequested = false;
      updateAgentButtonVisualState();
      updateMicButtonVisualState();
      if (requestId === state.requestId) {
        input.disabled = false;
        input.focus();
        input.select();
      }
    }
  }

  function requestVisibleTabCapture() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: CAPTURE_MESSAGE_TYPE }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error("No se pudo capturar la pantalla visible desde la extensión."));
          return;
        }

        if (!response || response.ok !== true || typeof response.dataUrl !== "string") {
          const errorMessage =
            response && typeof response.error === "string"
              ? response.error
              : "No se recibió una imagen válida de la captura.";
          reject(new Error(errorMessage));
          return;
        }

        resolve(response.dataUrl);
      });
    });
  }

  function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("No se pudo cargar la imagen capturada."));
      image.src = dataUrl;
    });
  }

  async function cropScreenshotToAttachment(fullDataUrl, rect) {
    const source = await loadImageFromDataUrl(fullDataUrl);
    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const scaleX = source.naturalWidth / viewportWidth;
    const scaleY = source.naturalHeight / viewportHeight;

    let sx = Math.max(0, Math.round(rect.left * scaleX));
    let sy = Math.max(0, Math.round(rect.top * scaleY));
    let sw = Math.max(1, Math.round(rect.width * scaleX));
    let sh = Math.max(1, Math.round(rect.height * scaleY));

    if (sx + sw > source.naturalWidth) sw = source.naturalWidth - sx;
    if (sy + sh > source.naturalHeight) sh = source.naturalHeight - sy;
    if (sw < 1 || sh < 1) {
      throw new Error("El recorte seleccionado es demasiado pequeño.");
    }

    const resizeFactor = Math.min(1, SCREENSHOT_MAX_SIDE_PX / Math.max(sw, sh));
    const outWidth = Math.max(1, Math.round(sw * resizeFactor));
    const outHeight = Math.max(1, Math.round(sh * resizeFactor));

    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo procesar la imagen recortada.");
    }

    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outWidth, outHeight);

    const mimeType = "image/jpeg";
    const dataUrl = canvas.toDataURL(mimeType, 0.86);
    if (!dataUrl || typeof dataUrl !== "string") {
      throw new Error("No se pudo convertir la imagen recortada.");
    }

    return {
      dataUrl,
      mimeType,
      width: outWidth,
      height: outHeight
    };
  }

  function finishScreenCaptureOverlay() {
    if (typeof state.screenCaptureCleanup === "function") {
      state.screenCaptureCleanup();
    }
  }

  async function withTemporarilyHiddenToolboxUi(run) {
    const uiElements = [
      getFloatingIcon(),
      getBar(),
      getBottomGradient(),
      getFloatingPopup(),
      getAgentOverlay()
    ];
    floatingDirections.forEach(({ key }) => {
      const node = state.floatingNodeMap.get(key) || getFloatingNode(key);
      if (node) uiElements.push(node);
    });

    const previousVisibility = [];
    uiElements.forEach((element) => {
      if (!element) return;
      previousVisibility.push({ element, visibility: element.style.visibility });
      element.style.visibility = "hidden";
    });

    try {
      return await run();
    } finally {
      previousVisibility.forEach(({ element, visibility }) => {
        element.style.visibility = visibility;
      });
    }
  }

  async function captureAndAttachSelection(rect) {
    try {
      const fullDataUrl = await withTemporarilyHiddenToolboxUi(() => requestVisibleTabCapture());
      const attachment = await cropScreenshotToAttachment(fullDataUrl, rect);
      setImageAttachment(attachment);
      openChatFromFloating();
      const input = getInput();
      if (input) input.focus();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "No se pudo completar la captura.";
      openChatFromFloating();
      if (!state.expanded) expandPanel();
      setPanelContent(`Error: ${message}`, { error: true, chainOfThought: [] });
    }
  }

  function startScreenCaptureSelection() {
    if (state.screenCaptureInProgress || getScreenCaptureOverlay()) return;
    const mountTarget = document.body || document.documentElement;
    if (!mountTarget) return;

    const overlay = document.createElement("div");
    overlay.id = SCREENSHOT_OVERLAY_ID;
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      cursor: "crosshair",
      background: "rgba(15, 23, 42, 0.20)",
      userSelect: "none",
      touchAction: "none"
    });

    const helpText = document.createElement("div");
    helpText.textContent = "Drag to crop the area. Press Esc to cancel.";
    Object.assign(helpText.style, {
      position: "fixed",
      top: "18px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "8px 12px",
      borderRadius: "10px",
      color: "#dbeafe",
      background: "rgba(15, 23, 42, 0.92)",
      border: "1px solid rgba(147, 197, 253, 0.35)",
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      letterSpacing: "0.2px",
      pointerEvents: "none"
    });

    const selection = document.createElement("div");
    selection.id = SCREENSHOT_SELECTION_ID;
    Object.assign(selection.style, {
      position: "fixed",
      display: "none",
      border: "2px solid rgba(125, 211, 252, 0.95)",
      background: "rgba(56, 189, 248, 0.15)",
      boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.32)",
      pointerEvents: "none"
    });

    overlay.appendChild(helpText);
    overlay.appendChild(selection);
    mountTarget.appendChild(overlay);
    state.screenCaptureInProgress = true;

    let startX = 0;
    let startY = 0;
    let pointerId = null;
    let selecting = false;
    let currentRect = null;

    function toRect(x1, y1, x2, y2) {
      const left = Math.max(0, Math.min(x1, x2));
      const top = Math.max(0, Math.min(y1, y2));
      const right = Math.min(window.innerWidth, Math.max(x1, x2));
      const bottom = Math.min(window.innerHeight, Math.max(y1, y2));
      return {
        left,
        top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top)
      };
    }

    function renderRect(rect) {
      selection.style.display = "block";
      selection.style.left = `${rect.left}px`;
      selection.style.top = `${rect.top}px`;
      selection.style.width = `${rect.width}px`;
      selection.style.height = `${rect.height}px`;
    }

    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      selecting = true;
      pointerId = event.pointerId;
      overlay.setPointerCapture(event.pointerId);
      startX = event.clientX;
      startY = event.clientY;
      currentRect = toRect(startX, startY, startX, startY);
      renderRect(currentRect);
    };

    const onPointerMove = (event) => {
      if (!selecting || event.pointerId !== pointerId) return;
      event.preventDefault();
      currentRect = toRect(startX, startY, event.clientX, event.clientY);
      renderRect(currentRect);
    };

    const onPointerEnd = (event) => {
      if (!selecting || event.pointerId !== pointerId) return;
      event.preventDefault();
      selecting = false;
      overlay.releasePointerCapture(event.pointerId);

      const rect = currentRect;
      finishScreenCaptureOverlay();
      if (
        !rect ||
        rect.width < SCREENSHOT_MIN_SELECTION_PX ||
        rect.height < SCREENSHOT_MIN_SELECTION_PX
      ) {
        return;
      }
      void captureAndAttachSelection(rect);
    };

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      finishScreenCaptureOverlay();
    };

    overlay.addEventListener("pointerdown", onPointerDown);
    overlay.addEventListener("pointermove", onPointerMove);
    overlay.addEventListener("pointerup", onPointerEnd);
    overlay.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("keydown", onKeyDown, true);

    state.screenCaptureCleanup = () => {
      overlay.removeEventListener("pointerdown", onPointerDown);
      overlay.removeEventListener("pointermove", onPointerMove);
      overlay.removeEventListener("pointerup", onPointerEnd);
      overlay.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("keydown", onKeyDown, true);
      if (overlay.parentNode) overlay.remove();
      state.screenCaptureCleanup = null;
      state.screenCaptureInProgress = false;
    };
  }

  /* ================================================================
   *  PLACEHOLDER STYLE  (can't style ::placeholder inline)
   * ================================================================ */
  function injectPlaceholderStyle() {
    if (getEl(PLACEHOLDER_ID)) return;
    const style = document.createElement("style");
    style.id = PLACEHOLDER_ID;
    style.textContent = `
      #${BAR_INPUT_ID}::placeholder {
        color: rgba(156, 163, 175, 0.7);
        font-style: italic;
      }
      #${BAR_INPUT_ID}:focus {
        outline: none;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function removePlaceholderStyle() {
    const s = getEl(PLACEHOLDER_ID);
    if (s) s.remove();
  }

  function truncateText(value, maxChars) {
    if (typeof value !== "string") return "";
    if (value.length <= maxChars) return value;
    return `${value.slice(0, maxChars)}\n...[truncated]`;
  }

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function isIgnoredTagName(tagName) {
    return (
      tagName === "SCRIPT" ||
      tagName === "STYLE" ||
      tagName === "NOSCRIPT" ||
      tagName === "META" ||
      tagName === "LINK" ||
      tagName === "HEAD"
    );
  }

  function isNodeInsideToolbox(node) {
    let current = node instanceof HTMLElement ? node : node?.parentElement;
    while (current) {
      if (typeof current.id === "string" && current.id.startsWith("__toolbox_")) {
        return true;
      }
      if (
        current.classList &&
        (current.classList.contains(ARCHIVE_TAB_CLASS) ||
          Array.from(current.classList).some((className) => className.startsWith("__toolbox_")))
      ) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  function isElementVisibleInViewport(element) {
    if (!element || !(element instanceof HTMLElement)) return false;
    if (!element.isConnected) return false;
    if (isNodeInsideToolbox(element)) return false;
    if (isIgnoredTagName(element.tagName)) return false;

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;

    return (
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    );
  }

  function getActiveElementText() {
    const active = document.activeElement;
    if (!active || !(active instanceof HTMLElement)) return "";
    if (!isElementVisibleInViewport(active)) return "";

    if (active instanceof HTMLTextAreaElement) {
      return truncateText(normalizeText(active.value), PAGE_ACTIVE_ELEMENT_MAX_CHARS);
    }
    if (active instanceof HTMLInputElement) {
      const inputType = (active.type || "text").toLowerCase();
      if (inputType === "password") return "";
      return truncateText(normalizeText(active.value), PAGE_ACTIVE_ELEMENT_MAX_CHARS);
    }
    if (active.isContentEditable) {
      return truncateText(normalizeText(active.innerText), PAGE_ACTIVE_ELEMENT_MAX_CHARS);
    }

    return "";
  }

  function getVisibleText() {
    const root = document.body;
    if (!root) return "";

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const parts = [];
    let collectedChars = 0;
    let lastValue = "";

    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      if (!textNode || !textNode.nodeValue) continue;
      const parent = textNode.parentElement;
      if (!parent) continue;
      if (isNodeInsideToolbox(parent)) continue;
      if (isIgnoredTagName(parent.tagName)) continue;
      if (!isElementVisibleInViewport(parent)) continue;

      const value = normalizeText(textNode.nodeValue);
      if (!value || value === lastValue) continue;

      const nextChars = collectedChars + value.length + 1;
      if (nextChars > PAGE_CONTEXT_MAX_CHARS) break;

      parts.push(value);
      collectedChars = nextChars;
      lastValue = value;
    }

    return parts.join("\n");
  }

  function getSelectionText() {
    const selection = window.getSelection();
    if (!selection) return "";
    return truncateText(normalizeText(selection.toString()), PAGE_SELECTION_MAX_CHARS);
  }

  function buildPageContext() {
    return {
      url: window.location.href,
      title: document.title || "",
      language: document.documentElement?.lang || "",
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      selectionText: getSelectionText(),
      activeElementText: getActiveElementText(),
      visibleText: getVisibleText()
    };
  }

  function normalizeChainOfThought(chainOfThought) {
    if (!Array.isArray(chainOfThought)) return [];

    return chainOfThought
      .map((step) => {
        const title = typeof step?.title === "string" ? step.title.trim() : "";
        const items = Array.isArray(step?.items)
          ? step.items.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
          : [];
        return { title, items };
      })
      .filter((step) => step.title && step.items.length > 0)
      .slice(0, 6);
  }

  function computePanelMaxHeight() {
    const bar = getBar();
    if (!bar) return PANEL_MIN_HEIGHT_PX;
    let availableAboveBar = 0;
    if (state.pinned) {
      const rect = bar.getBoundingClientRect();
      availableAboveBar = Math.max(
        110,
        window.innerHeight - Math.max(0, rect.top) - BAR_HEIGHT_PX - 28
      );
    } else {
      const barBottom = parseFloat(bar.style.bottom) || state.barBottom;
      availableAboveBar = Math.max(
        110,
        window.innerHeight - Math.max(0, barBottom) - BAR_HEIGHT_PX - 24
      );
    }
    const ratioCap = Math.floor(window.innerHeight * PANEL_MAX_HEIGHT_RATIO);
    return Math.max(110, Math.min(PANEL_MAX_HEIGHT_PX, ratioCap, availableAboveBar));
  }

  function resizePanelToContent() {
    const panel = getPanel();
    const panelContent = getPanelContent();
    const bar = getBar();
    const inputRow = getInputRow();
    if (!panel || !panelContent || !state.expanded) return;
    if (state.panelBodyHidden) {
      panel.style.maxHeight = "40px";
      return;
    }

    const maxHeight = computePanelMaxHeight();
    const minHeight = Math.min(PANEL_MIN_HEIGHT_PX, maxHeight);
    const desiredHeight = Math.min(
      Math.max(panelContent.scrollHeight + 18, minHeight),
      maxHeight
    );
    let nextHeight = desiredHeight;

    if (bar && inputRow && Number.isFinite(state.barHeight) && state.barHeight > 0) {
      const barStyles = window.getComputedStyle(bar);
      const panelStyles = window.getComputedStyle(panel);
      const paddingY =
        (parseFloat(barStyles.paddingTop) || 0) + (parseFloat(barStyles.paddingBottom) || 0);
      const rowGap = parseFloat(barStyles.rowGap || barStyles.gap || "0") || 0;
      const inputRowHeight = inputRow.getBoundingClientRect().height;
      const panelMarginTop = parseFloat(panelStyles.marginTop || "0") || 0;
      const availablePanelHeight = Math.floor(
        state.barHeight - paddingY - inputRowHeight - rowGap - panelMarginTop
      );
      if (availablePanelHeight > 0) {
        nextHeight = clamp(availablePanelHeight, 40, maxHeight);
      }
    }

    panel.style.maxHeight = `${Math.round(nextHeight)}px`;
  }

  function renderChainOfThought(chainOfThought, { muted = false } = {}) {
    const chainWrap = getPanelChainOfThought();
    if (!chainWrap) return;

    chainWrap.innerHTML = "";
    const steps = normalizeChainOfThought(chainOfThought);

    if (steps.length === 0) {
      chainWrap.style.display = "none";
      return;
    }

    chainWrap.style.display = "flex";

    steps.forEach((step, index) => {
      const details = document.createElement("details");
      if (index === 0) details.open = true;

      Object.assign(details.style, {
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
        background: "rgba(15, 23, 42, 0.42)",
        overflow: "hidden",
        opacity: muted ? "0.75" : "1"
      });

      const summary = document.createElement("summary");
      summary.textContent = step.title;
      Object.assign(summary.style, {
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: "600",
        padding: "10px 12px",
        color: "rgba(226, 232, 240, 0.95)",
        listStylePosition: "inside",
        userSelect: "none"
      });

      const list = document.createElement("ul");
      Object.assign(list.style, {
        margin: "0",
        padding: "0 18px 12px 30px",
        color: "rgba(203, 213, 225, 0.95)"
      });

      step.items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        li.style.marginBottom = "6px";
        li.style.fontSize = "13px";
        li.style.lineHeight = "1.45";
        list.appendChild(li);
      });

      details.appendChild(summary);
      details.appendChild(list);
      details.addEventListener("toggle", () => {
        if (state.expanded) requestAnimationFrame(resizePanelToContent);
      });
      chainWrap.appendChild(details);
    });
  }

  function updatePinButtonVisualState() {
    const pinButton = getPanelPinButton();
    if (!pinButton) return;
    pinButton.title = state.pinned ? "Unpin response panel" : "Pin response panel";
    pinButton.style.opacity = state.pinned ? "1" : "0.9";
    pinButton.style.borderColor = state.pinned
      ? "rgba(125, 211, 252, 0.9)"
      : "rgba(125, 211, 252, 0.65)";
    pinButton.style.background = state.pinned
      ? "rgba(56, 189, 248, 0.65)"
      : "rgba(56, 189, 248, 0.45)";
    pinButton.style.transform = state.pinned ? "scale(1.04)" : "scale(1)";
  }

  function updateMinimizeButtonVisualState() {
    const minimizeButton = getPanelMinimizeButton();
    if (!minimizeButton) return;
    const minimized = !state.expanded || state.panelBodyHidden;
    minimizeButton.title = minimized ? "Expand response panel" : "Make panel smaller";
    minimizeButton.style.opacity = minimized ? "1" : "0.92";
    minimizeButton.style.borderColor = minimized
      ? "rgba(253, 224, 71, 0.92)"
      : "rgba(253, 224, 71, 0.7)";
    minimizeButton.style.background = minimized
      ? "rgba(250, 204, 21, 0.84)"
      : "rgba(250, 204, 21, 0.62)";
  }

  function togglePanelCompact() {
    if (!state.expanded) {
      expandPanel();
      return;
    }
    const bar = getBar();
    const previousTop = bar ? bar.getBoundingClientRect().top : null;
    state.panelBodyHidden = !state.panelBodyHidden;
    if (state.panelBodyHidden) {
      state.barHeight = null;
      if (bar) {
        bar.style.height = "auto";
      }
    }
    applyPanelBodyVisibility();
    if (!state.panelBodyHidden) {
      requestAnimationFrame(resizePanelToContent);
    }
    if (bar && previousTop !== null && state.panelBodyHidden) {
      requestAnimationFrame(() => {
        const nextRect = bar.getBoundingClientRect();
        const deltaY = nextRect.top - previousTop;
        if (Math.abs(deltaY) < 1) return;
        if (state.pinned) {
          const nextTop = clamp(
            (parseFloat(bar.style.top) || state.barTop) - deltaY,
            0,
            Math.max(0, getDocumentSize().height - bar.offsetHeight - 12)
          );
          state.barTop = nextTop;
          bar.style.top = `${nextTop}px`;
        } else {
          const maxBottom = Math.max(
            0,
            window.innerHeight - Math.max(BAR_HEIGHT_PX, bar.offsetHeight) - 20
          );
          const nextBottom = clamp(
            (parseFloat(bar.style.bottom) || state.barBottom) + deltaY,
            0,
            maxBottom
          );
          state.barBottom = nextBottom;
          bar.style.bottom = `${nextBottom}px`;
        }
      });
    }
    updateMinimizeButtonVisualState();
  }

  function applyPanelBodyVisibility() {
    const prompt = getPanelPrompt();
    const answer = getPanelAnswer();
    const chain = getPanelChainOfThought();
    const panel = getPanel();
    if (!panel || !answer) return;

    if (state.panelBodyHidden) {
      if (prompt) prompt.style.display = "none";
      answer.style.display = "none";
      if (chain) chain.style.display = "none";
      panel.style.maxHeight = "40px";
      panel.style.opacity = "1";
      panel.style.marginTop = "2px";
      return;
    }

    if (prompt) {
      const hasPrompt = typeof prompt.textContent === "string" && prompt.textContent.trim().length > 0;
      prompt.style.display = hasPrompt ? "block" : "none";
    }
    answer.style.display = "block";
    if (chain && chain.children.length > 0) {
      chain.style.display = "flex";
    }
  }

  function updateActivePinnedVisualState() {
    const bar = getBar();
    const panel = getPanel();
    const inputRow = getInputRow();
    if (!bar || !panel) return;

    bar.style.background = state.pinned ? BAR_BG_PINNED : BAR_BG_UNPINNED;
    panel.style.background = state.pinned ? PANEL_BG_PINNED : PANEL_BG_UNPINNED;

    if (inputRow) {
      inputRow.style.display = state.pinned ? "none" : "flex";
    }
  }

  function togglePinnedBar() {
    const bar = getBar();
    if (!bar) return;
    const currentWidth = Math.max(BAR_MIN_WIDTH_PX, state.barWidth || bar.offsetWidth || BAR_WIDTH_PX);
    hideBottomGradient();

    if (!state.pinned) {
      const rect = bar.getBoundingClientRect();
      const docSize = getDocumentSize();
      const nextLeft = clamp(rect.left + window.scrollX, 0, Math.max(0, docSize.width - currentWidth));
      const nextTop = clamp(
        rect.top + window.scrollY,
        0,
        Math.max(0, docSize.height - bar.offsetHeight - 12)
      );

      state.pinned = true;
      state.barLeft = nextLeft;
      state.barTop = nextTop;
      bar.style.position = "absolute";
      bar.style.bottom = "auto";
      bar.style.top = `${nextTop}px`;
      bar.style.left = `${nextLeft}px`;
      bar.style.transition = `opacity ${SLIDE_DURATION_MS}ms ease`;
    } else {
      const rect = bar.getBoundingClientRect();
      const nextLeft = clamp(rect.left, 0, Math.max(0, window.innerWidth - currentWidth));
      const currentBottom = window.innerHeight - rect.bottom;
      const nextBottom = clamp(currentBottom, 0, Math.max(0, window.innerHeight - BAR_HEIGHT_PX - 20));

      state.pinned = false;
      state.barLeft = nextLeft;
      state.barBottom = nextBottom;
      bar.style.position = "fixed";
      bar.style.top = "auto";
      bar.style.bottom = `${nextBottom}px`;
      bar.style.left = `${nextLeft}px`;
      bar.style.transition = `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`;
    }

    updateActivePinnedVisualState();
    updatePinButtonVisualState();
    updateMinimizeButtonVisualState();
    if (state.expanded) requestAnimationFrame(resizePanelToContent);
  }

  function createArchivedResponseTab(initialConversation = []) {
    const bar = getBar();
    const promptElement = getPanelPrompt();
    const answerElement = getPanelAnswer();
    const mountTarget = document.body || document.documentElement;
    if (!bar || !answerElement || !mountTarget) return;

    const promptText = typeof promptElement?.textContent === "string"
      ? promptElement.textContent.trim()
      : "";
    const answerText = typeof answerElement.textContent === "string"
      ? answerElement.textContent.trim()
      : "";
    if (!answerText) return;

    const rect = bar.getBoundingClientRect();
    const docSize = getDocumentSize();
    const initialWidth = clamp(
      Math.round(rect.width || state.barWidth || BAR_WIDTH_PX),
      BAR_MIN_WIDTH_PX,
      BAR_MAX_WIDTH_PX
    );
    const initialHeight = clamp(
      Math.round(rect.height || state.barHeight || BAR_HEIGHT_PX),
      BAR_MIN_TOTAL_HEIGHT_PX,
      BAR_MAX_TOTAL_HEIGHT_PX
    );
    const initialPinned = Boolean(state.pinned);

    const initialLeft = initialPinned
      ? clamp(rect.left + window.scrollX, 0, Math.max(0, docSize.width - initialWidth))
      : clamp(rect.left, 0, Math.max(0, window.innerWidth - initialWidth));
    const initialTop = initialPinned
      ? clamp(rect.top + window.scrollY, 0, Math.max(0, docSize.height - initialHeight - 12))
      : clamp(rect.top, 0, Math.max(0, window.innerHeight - initialHeight - 12));

    const archive = document.createElement("div");
    archive.className = ARCHIVE_TAB_CLASS;
    Object.assign(archive.style, {
      position: initialPinned ? "absolute" : "fixed",
      left: `${initialLeft}px`,
      top: `${initialTop}px`,
      width: `${initialWidth}px`,
      height: `${initialHeight}px`,
      borderRadius: `${BAR_RADIUS_PX}px`,
      background: initialPinned ? BAR_BG_PINNED : BAR_BG_UNPINNED,
      backdropFilter: BG_BLUR,
      WebkitBackdropFilter: BG_BLUR,
      border: `1px solid ${BORDER_COLOR}`,
      boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
      padding: "8px 12px 10px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      boxSizing: "border-box",
      cursor: "grab",
      userSelect: "none",
      touchAction: "none",
      zIndex: "2147483646",
      overflow: "hidden"
    });

    const actionRow = document.createElement("div");
    Object.assign(actionRow.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "6px",
      flexShrink: "0"
    });

    function createArchiveButton({ title, background, borderColor, textColor = "#0f172a" }) {
      const button = document.createElement("button");
      button.type = "button";
      button.title = title;
      Object.assign(button.style, {
        width: "22px",
        height: "22px",
        borderRadius: "9999px",
        border: `1px solid ${borderColor}`,
        background,
        color: textColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: "0",
        fontWeight: "700",
        fontSize: "11px",
        lineHeight: "1",
        transition: "opacity 150ms ease, transform 150ms ease"
      });
      button.addEventListener("pointerdown", (event) => event.stopPropagation());
      button.addEventListener("pointerenter", () => {
        button.style.opacity = "1";
      });
      return button;
    }

    const pinButton = createArchiveButton({
      title: "Pin tab",
      background: "rgba(56, 189, 248, 0.45)",
      borderColor: "rgba(125, 211, 252, 0.72)",
      textColor: "#082f49"
    });
    pinButton.style.opacity = "0.9";
    const pinIcon = document.createElement("img");
    pinIcon.src = PIN_ICON_SRC;
    pinIcon.alt = "Pin response";
    Object.assign(pinIcon.style, {
      width: "10px",
      height: "10px",
      objectFit: "contain",
      pointerEvents: "none"
    });
    pinButton.appendChild(pinIcon);

    const closeButton = createArchiveButton({
      title: "Close tab",
      background: "rgba(248, 113, 113, 0.86)",
      borderColor: "rgba(252, 165, 165, 0.95)",
      textColor: "#450a0a"
    });
    closeButton.textContent = "x";
    closeButton.style.opacity = "0.95";

    const minimizeButton = createArchiveButton({
      title: "Make tab smaller",
      background: "rgba(250, 204, 21, 0.74)",
      borderColor: "rgba(253, 224, 71, 0.92)",
      textColor: "#713f12"
    });
    minimizeButton.textContent = "-";
    minimizeButton.style.opacity = "0.96";

    const ttsButton = createArchiveButton({
      title: "Read response aloud",
      background: "rgba(16, 185, 129, 0.36)",
      borderColor: "rgba(110, 231, 183, 0.75)",
      textColor: "#052e16"
    });
    ttsButton.textContent = "S";
    ttsButton.style.opacity = "0.95";

    actionRow.appendChild(ttsButton);
    actionRow.appendChild(pinButton);
    actionRow.appendChild(closeButton);
    actionRow.appendChild(minimizeButton);

    const responseWrap = document.createElement("div");
    Object.assign(responseWrap.style, {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
      background: initialPinned ? PANEL_BG_PINNED : PANEL_BG_UNPINNED,
      padding: "10px",
      flex: "1 1 auto",
      minHeight: "0",
      overflowY: "auto"
    });

    const promptCopy = document.createElement("div");
    Object.assign(promptCopy.style, {
      display: promptText ? "block" : "none",
      border: "1px solid rgba(147, 197, 253, 0.38)",
      borderRadius: "12px",
      background: "rgba(30, 58, 138, 0.24)",
      color: "rgba(219, 234, 254, 0.95)",
      padding: "8px 10px",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      fontSize: "12px",
      lineHeight: "1.45",
      fontWeight: "500"
    });
    promptCopy.textContent = promptText;

    const answerCopy = document.createElement("div");
    Object.assign(answerCopy.style, {
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "12px",
      background: "rgba(15, 23, 42, 0.35)",
      padding: "10px",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      color: "rgba(226, 232, 240, 0.95)",
      fontSize: "13px",
      lineHeight: "1.5"
    });
    answerCopy.textContent = answerText;

    responseWrap.appendChild(promptCopy);
    responseWrap.appendChild(answerCopy);

    const chatRow = document.createElement("div");
    Object.assign(chatRow.style, {
      display: initialPinned ? "none" : "flex",
      alignItems: "center",
      gap: "8px",
      flexShrink: "0"
    });

    const chatInput = document.createElement("input");
    chatInput.type = "text";
    chatInput.placeholder = "Follow up in this tab...";
    chatInput.autocomplete = "off";
    chatInput.spellcheck = false;
    Object.assign(chatInput.style, {
      flex: "1",
      height: "30px",
      borderRadius: "9999px",
      border: "1px solid rgba(148, 163, 184, 0.35)",
      background: "rgba(15, 23, 42, 0.45)",
      color: "#e5e7eb",
      padding: "0 12px",
      fontSize: "12px",
      fontFamily: "inherit",
      outline: "none"
    });
    chatInput.addEventListener("pointerdown", (event) => event.stopPropagation());

    const sendButton = document.createElement("button");
    sendButton.type = "button";
    sendButton.textContent = ">";
    Object.assign(sendButton.style, {
      width: "24px",
      height: "24px",
      borderRadius: "9999px",
      border: "1px solid rgba(99, 102, 241, 0.45)",
      background: "rgba(99, 102, 241, 0.36)",
      color: "#e2e8f0",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "700",
      lineHeight: "1",
      padding: "0"
    });
    sendButton.addEventListener("pointerdown", (event) => event.stopPropagation());

    chatRow.appendChild(chatInput);
    chatRow.appendChild(sendButton);

    archive.appendChild(actionRow);
    archive.appendChild(responseWrap);
    archive.appendChild(chatRow);
    mountTarget.appendChild(archive);

    let archivePinned = initialPinned;
    let archiveMinimized = false;
    let archivePending = false;
    let archiveWidth = initialWidth;
    let archiveHeight = initialHeight;
    let archiveStoredHeight = initialHeight;
    let archiveTtsPending = false;
    let archiveTtsPlaying = false;
    let archiveTtsAudio = null;
    let conversationHistory = trimConversationHistory(initialConversation);
    if (conversationHistory.length === 0 && promptText && answerText) {
      conversationHistory.push({ user: promptText, assistant: answerText });
    }

    function updateArchivePinState() {
      pinButton.title = archivePinned ? "Unpin tab" : "Pin tab";
      pinButton.style.background = archivePinned
        ? "rgba(56, 189, 248, 0.65)"
        : "rgba(56, 189, 248, 0.45)";
      pinButton.style.borderColor = archivePinned
        ? "rgba(125, 211, 252, 0.9)"
        : "rgba(125, 211, 252, 0.72)";
      pinButton.style.transform = archivePinned ? "scale(1.03)" : "scale(1)";
      archive.style.background = archivePinned ? BAR_BG_PINNED : BAR_BG_UNPINNED;
      responseWrap.style.background = archivePinned ? PANEL_BG_PINNED : PANEL_BG_UNPINNED;
      chatRow.style.display = archivePinned ? "none" : "flex";
    }

    function stopArchiveTts() {
      if (archiveTtsAudio) {
        try {
          archiveTtsAudio.pause();
        } catch (error) {
          // Ignore pause errors for detached tabs.
        }
        archiveTtsAudio = null;
      }
      archiveTtsPlaying = false;
    }

    function updateArchiveTtsState() {
      if (archiveTtsPending) {
        ttsButton.title = "Generating speech...";
        ttsButton.style.opacity = "0.65";
        ttsButton.style.cursor = "wait";
        ttsButton.textContent = "...";
        return;
      }
      if (archiveTtsPlaying) {
        ttsButton.title = "Stop speech";
        ttsButton.style.opacity = "1";
        ttsButton.style.cursor = "pointer";
        ttsButton.textContent = "[]";
        return;
      }
      ttsButton.title = "Read response aloud";
      ttsButton.style.opacity = "0.95";
      ttsButton.style.cursor = "pointer";
      ttsButton.textContent = "S";
    }

    function updateArchiveMinimizeState() {
      minimizeButton.title = archiveMinimized ? "Expand tab" : "Make tab smaller";
      minimizeButton.style.background = archiveMinimized
        ? "rgba(250, 204, 21, 0.9)"
        : "rgba(250, 204, 21, 0.74)";
      minimizeButton.style.borderColor = archiveMinimized
        ? "rgba(253, 224, 71, 1)"
        : "rgba(253, 224, 71, 0.92)";
      minimizeButton.style.transform = archiveMinimized ? "scale(1.03)" : "scale(1)";

      if (archiveMinimized) {
        responseWrap.style.display = "none";
        archiveHeight = BAR_MIN_TOTAL_HEIGHT_PX;
      } else {
        responseWrap.style.display = "flex";
        archiveHeight = clamp(archiveStoredHeight, BAR_MIN_TOTAL_HEIGHT_PX, BAR_MAX_TOTAL_HEIGHT_PX);
      }
      archive.style.height = `${archiveHeight}px`;
    }

    function positionArchiveWithinBounds() {
      const leftValue = parseFloat(archive.style.left) || 0;
      const topValue = parseFloat(archive.style.top) || 0;

      if (archivePinned) {
        const currentDocSize = getDocumentSize();
        archive.style.left = `${clamp(leftValue, 0, Math.max(0, currentDocSize.width - archiveWidth))}px`;
        archive.style.top = `${clamp(topValue, 0, Math.max(0, currentDocSize.height - archiveHeight - 12))}px`;
      } else {
        archive.style.left = `${clamp(leftValue, 0, Math.max(0, window.innerWidth - archiveWidth))}px`;
        archive.style.top = `${clamp(topValue, 0, Math.max(0, window.innerHeight - archiveHeight - 12))}px`;
      }
    }

    async function submitArchivePrompt() {
      if (archivePending || archivePinned) return;
      const prompt = chatInput.value.trim();
      if (!prompt) return;

      archivePending = true;
      chatInput.disabled = true;
      sendButton.disabled = true;
      chatInput.value = "";

      promptCopy.style.display = "block";
      promptCopy.textContent = prompt;
      answerCopy.style.color = "rgba(226, 232, 240, 0.95)";
      answerCopy.textContent = "Analyzing your request with page context...";
      stopArchiveTts();
      archiveTtsPending = false;
      updateArchiveTtsState();

      const requestPrompt = buildPromptWithConversation(prompt, conversationHistory);
      try {
        const result = await requestChatAnswer(requestPrompt, buildPageContext(), []);
        answerCopy.textContent = result.text;
        conversationHistory = trimConversationHistory([
          ...conversationHistory,
          { user: prompt, assistant: result.text }
        ]);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "No se pudo obtener respuesta.";
        answerCopy.style.color = "#fca5a5";
        answerCopy.textContent = `Error: ${message}`;
        conversationHistory = trimConversationHistory([
          ...conversationHistory,
          { user: prompt, assistant: `Error: ${message}` }
        ]);
      } finally {
        archivePending = false;
        chatInput.disabled = false;
        sendButton.disabled = false;
        if (!archivePinned) chatInput.focus();
      }
    }

    pinButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextRect = archive.getBoundingClientRect();
      if (archivePinned) {
        archivePinned = false;
        archive.style.position = "fixed";
        archive.style.left = `${clamp(nextRect.left, 0, Math.max(0, window.innerWidth - archiveWidth))}px`;
        archive.style.top = `${clamp(nextRect.top, 0, Math.max(0, window.innerHeight - archiveHeight - 12))}px`;
      } else {
        const nextDocSize = getDocumentSize();
        archivePinned = true;
        archive.style.position = "absolute";
        archive.style.left = `${clamp(nextRect.left + window.scrollX, 0, Math.max(0, nextDocSize.width - archiveWidth))}px`;
        archive.style.top = `${clamp(nextRect.top + window.scrollY, 0, Math.max(0, nextDocSize.height - archiveHeight - 12))}px`;
      }
      updateArchivePinState();
      positionArchiveWithinBounds();
    });

    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stopArchiveTts();
      archive.remove();
    });

    ttsButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (archiveTtsPending) return;
      if (archiveTtsPlaying) {
        stopArchiveTts();
        updateArchiveTtsState();
        return;
      }

      const text = typeof answerCopy.textContent === "string" ? answerCopy.textContent.trim() : "";
      if (!text) return;

      archiveTtsPending = true;
      updateArchiveTtsState();
      try {
        const result = await requestSpeechAudio(text);
        if (!archive.isConnected) {
          return;
        }
        const audio = new Audio(`data:${result.mimeType};base64,${result.audioBase64}`);
        stopArchiveTts();
        archiveTtsAudio = audio;
        archiveTtsPlaying = true;
        updateArchiveTtsState();

        const resetAudioState = () => {
          if (archiveTtsAudio === audio) {
            archiveTtsAudio = null;
            archiveTtsPlaying = false;
            updateArchiveTtsState();
          }
        };
        audio.addEventListener("ended", resetAudioState, { once: true });
        audio.addEventListener("error", resetAudioState, { once: true });
        await audio.play();
      } catch (error) {
        stopArchiveTts();
      } finally {
        archiveTtsPending = false;
        updateArchiveTtsState();
      }
    });

    minimizeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      archiveMinimized = !archiveMinimized;
      updateArchiveMinimizeState();
      positionArchiveWithinBounds();
    });

    chatInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void submitArchivePrompt();
    });
    sendButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void submitArchivePrompt();
    });

    let activePointerId = null;
    let interactionMode = "";
    let resizeDirection = "";
    let startClientX = 0;
    let startClientY = 0;
    let startLeft = 0;
    let startTop = 0;
    let startWidth = archiveWidth;
    let startHeight = archiveHeight;

    archive.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest("button, input")) return;

      const rectSnapshot = archive.getBoundingClientRect();
      const direction = getResizeDirectionForRect(event.clientX, event.clientY, rectSnapshot);

      event.preventDefault();
      archive.setPointerCapture(event.pointerId);
      activePointerId = event.pointerId;
      interactionMode = direction ? "resize" : "drag";
      resizeDirection = direction;
      startClientX = event.clientX;
      startClientY = event.clientY;
      startWidth = archiveWidth;
      startHeight = archiveHeight;
      startLeft = parseFloat(archive.style.left) || 0;
      startTop = parseFloat(archive.style.top) || 0;
      archive.style.cursor = interactionMode === "resize" ? getResizeCursor(resizeDirection) : "grabbing";
    });

    archive.addEventListener("pointermove", (event) => {
      if (event.pointerId !== activePointerId) {
        const direction = getResizeDirectionForRect(event.clientX, event.clientY, archive.getBoundingClientRect());
        archive.style.cursor = direction ? getResizeCursor(direction) : "grab";
        return;
      }
      const pointerDx = event.clientX - startClientX;
      const pointerDy = event.clientY - startClientY;

      if (interactionMode === "drag") {
        const nextLeftRaw = startLeft + pointerDx;
        const nextTopRaw = startTop + pointerDy;
        if (archivePinned) {
          const nextDocSize = getDocumentSize();
          archive.style.left = `${clamp(nextLeftRaw, 0, Math.max(0, nextDocSize.width - archiveWidth))}px`;
          archive.style.top = `${clamp(nextTopRaw, 0, Math.max(0, nextDocSize.height - archiveHeight - 12))}px`;
        } else {
          archive.style.left = `${clamp(nextLeftRaw, 0, Math.max(0, window.innerWidth - archiveWidth))}px`;
          archive.style.top = `${clamp(nextTopRaw, 0, Math.max(0, window.innerHeight - archiveHeight - 12))}px`;
        }
        return;
      }

      if (interactionMode !== "resize") return;
      let nextWidth = startWidth;
      let nextHeight = startHeight;
      let nextLeft = startLeft;
      let nextTop = startTop;

      if (resizeDirection.includes("e")) {
        nextWidth = clamp(startWidth + pointerDx, BAR_MIN_WIDTH_PX, BAR_MAX_WIDTH_PX);
      }
      if (resizeDirection.includes("w")) {
        nextWidth = clamp(startWidth - pointerDx, BAR_MIN_WIDTH_PX, BAR_MAX_WIDTH_PX);
        nextLeft = startLeft + (startWidth - nextWidth);
      }
      if (resizeDirection.includes("s")) {
        nextHeight = clamp(startHeight + pointerDy, BAR_MIN_TOTAL_HEIGHT_PX, BAR_MAX_TOTAL_HEIGHT_PX);
      }
      if (resizeDirection.includes("n")) {
        nextHeight = clamp(startHeight - pointerDy, BAR_MIN_TOTAL_HEIGHT_PX, BAR_MAX_TOTAL_HEIGHT_PX);
        nextTop = startTop + (startHeight - nextHeight);
      }

      if (archivePinned) {
        const nextDocSize = getDocumentSize();
        nextLeft = clamp(nextLeft, 0, Math.max(0, nextDocSize.width - nextWidth));
        nextTop = clamp(nextTop, 0, Math.max(0, nextDocSize.height - nextHeight - 12));
      } else {
        nextLeft = clamp(nextLeft, 0, Math.max(0, window.innerWidth - nextWidth));
        nextTop = clamp(nextTop, 0, Math.max(0, window.innerHeight - nextHeight - 12));
      }

      archiveWidth = nextWidth;
      archiveHeight = nextHeight;
      archiveStoredHeight = archiveMinimized
        ? Math.max(archiveStoredHeight, archiveHeight)
        : archiveHeight;
      archive.style.width = `${archiveWidth}px`;
      archive.style.height = `${archiveHeight}px`;
      archive.style.left = `${nextLeft}px`;
      archive.style.top = `${nextTop}px`;
    });

    archive.addEventListener("pointerup", (event) => {
      if (event.pointerId !== activePointerId) return;
      archive.releasePointerCapture(event.pointerId);
      activePointerId = null;
      interactionMode = "";
      resizeDirection = "";
      archive.style.cursor = "grab";
      positionArchiveWithinBounds();
    });

    archive.addEventListener("pointercancel", (event) => {
      if (event.pointerId !== activePointerId) return;
      activePointerId = null;
      interactionMode = "";
      resizeDirection = "";
      archive.style.cursor = "grab";
      positionArchiveWithinBounds();
    });

    updateArchivePinState();
    updateArchiveMinimizeState();
    updateArchiveTtsState();
    positionArchiveWithinBounds();
  }

  function setPanelContent(
    text,
    { muted = false, error = false, chainOfThought = [], promptText = "" } = {}
  ) {
    const panelContent = getPanelContent();
    if (!panelContent) return;

    const prompt = getPanelPrompt();
    if (prompt) {
      const normalizedPrompt = typeof promptText === "string" ? promptText.trim() : "";
      if (normalizedPrompt) {
        prompt.style.display = "block";
        prompt.textContent = normalizedPrompt;
      } else {
        prompt.style.display = "none";
        prompt.textContent = "";
      }
    }

    const answer = getPanelAnswer();
    if (!answer) {
      panelContent.textContent = text;
      panelContent.style.opacity = muted ? "0.6" : "1";
      panelContent.style.color = error ? "#fca5a5" : INPUT_COLOR;
      if (state.expanded) requestAnimationFrame(resizePanelToContent);
      return;
    }

    const nextText = typeof text === "string" ? text : "";
    const answerChanged = answer.textContent !== nextText;
    if (answerChanged && (state.ttsPlaying || state.ttsPending)) {
      stopTtsPlayback();
      state.ttsPending = false;
    }

    answer.textContent = nextText;
    answer.style.opacity = muted ? "0.75" : "1";
    answer.style.color = error ? "#fca5a5" : INPUT_COLOR;
    answer.style.borderColor = error ? "rgba(252, 165, 165, 0.45)" : "rgba(255, 255, 255, 0.08)";
    answer.style.background = error ? "rgba(127, 29, 29, 0.26)" : "rgba(15, 23, 42, 0.35)";

    renderChainOfThought(chainOfThought, { muted });
    updateTtsButtonVisualState();

    if (state.expanded) requestAnimationFrame(resizePanelToContent);
  }

  function trimConversationHistory(history, maxTurns = 10) {
    if (!Array.isArray(history)) return [];
    return history
      .filter(
        (turn) =>
          turn &&
          typeof turn.user === "string" &&
          turn.user.trim() &&
          typeof turn.assistant === "string" &&
          turn.assistant.trim()
      )
      .slice(-maxTurns);
  }

  function buildPromptWithConversation(prompt, history) {
    const currentPrompt = typeof prompt === "string" ? prompt.trim() : "";
    if (!currentPrompt) return "";
    const turns = trimConversationHistory(history, 8);
    if (turns.length === 0) return currentPrompt;

    const serializedHistory = turns
      .map(
        (turn, index) =>
          `Turn ${index + 1} user:\n${truncateText(turn.user, 1200)}\n` +
          `Turn ${index + 1} assistant:\n${truncateText(turn.assistant, 1600)}`
      )
      .join("\n\n");

    return (
      "Conversation context (keep continuity with it):\n" +
      `${serializedHistory}\n\n` +
      `Current user message:\n${currentPrompt}`
    );
  }

  function requestChatAnswer(prompt, pageContext, attachments = []) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: CHAT_MESSAGE_TYPE, prompt, pageContext, attachments },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(
              new Error("No se pudo contactar con la extensión. Recárgala e inténtalo de nuevo.")
            );
            return;
          }

          if (!response || response.ok !== true || typeof response.text !== "string") {
            const errorMessage =
              response && typeof response.error === "string"
                ? response.error
                : "El backend devolvió una respuesta inválida.";
            reject(new Error(errorMessage));
            return;
          }

          resolve({
            text: response.text,
            chainOfThought: Array.isArray(response.chainOfThought) ? response.chainOfThought : []
          });
        }
      );
    });
  }

  async function submitPrompt() {
    const input = getInput();
    if (!input || state.pending) return;

    const prompt = input.value.trim();
    if (!prompt) return;

    if (state.agentModeEnabled) {
      await runAgentTask(prompt);
      return;
    }

    const requestId = ++state.requestId;
    state.pending = true;
    input.disabled = true;
    stopSpeechRecognition({ preserveText: true });
    updateAgentButtonVisualState();
    updateMicButtonVisualState();
    input.value = "";
    hideBottomGradient();
    const pageContext = buildPageContext();
    const attachments = toImageAttachmentPayload();
    const hasImageAttachment = attachments.length > 0;
    const requestPrompt = buildPromptWithConversation(prompt, state.currentConversation);
    const loadingChain = [
      {
        title: "Reading what you are viewing",
        items: [
          pageContext.title
            ? `Current page: ${truncateText(pageContext.title, 120)}`
            : "Collecting visible page title and URL.",
          pageContext.selectionText
            ? "Using your selected text as high-priority context."
            : "No selected text detected; using visible content."
        ]
      },
      {
        title: "Preparing a detailed answer",
        items: [
          hasImageAttachment
            ? "Grounding the response in page context and attached screenshot."
            : "Grounding the response in page context when relevant.",
          "Building a concise reasoning summary."
        ]
      }
    ];

    if (!state.expanded) expandPanel();
    if (state.panelBodyHidden) {
      state.panelBodyHidden = false;
      applyPanelBodyVisibility();
    }
    setPanelContent(
      hasImageAttachment
        ? "Analyzing your request with page context and screenshot..."
        : "Analyzing your request with page context...",
      {
      muted: true,
      chainOfThought: loadingChain,
      promptText: prompt
      }
    );

    try {
      const result = await requestChatAnswer(requestPrompt, pageContext, attachments);
      if (requestId !== state.requestId) return;
      state.currentTabHasResponse = true;
      state.currentConversation = trimConversationHistory([
        ...state.currentConversation,
        { user: prompt, assistant: result.text }
      ]);
      setPanelContent(result.text, { chainOfThought: result.chainOfThought, promptText: prompt });
      if (hasImageAttachment) clearImageAttachment();
    } catch (error) {
      if (requestId !== state.requestId) return;
      const message =
        error instanceof Error && error.message
          ? error.message
          : "No se pudo obtener respuesta.";
      state.currentTabHasResponse = true;
      state.currentConversation = trimConversationHistory([
        ...state.currentConversation,
        { user: prompt, assistant: `Error: ${message}` }
      ]);
      setPanelContent(`Error: ${message}`, {
        error: true,
        chainOfThought: [],
        promptText: prompt
      });
    } finally {
      if (requestId !== state.requestId) return;
      state.pending = false;
      input.disabled = false;
      updateAgentButtonVisualState();
      updateMicButtonVisualState();
      input.focus();
      input.select();
    }
  }

  /* ================================================================
   *  CREATE BAR
   * ================================================================ */
  function createBar() {
    injectPlaceholderStyle();
    ensureBottomGradient();

    /* ── container (pill bar) ── */
    const bar = document.createElement("div");
    bar.id = BAR_CONTAINER_ID;

    const startWidth = clamp(state.barWidth || BAR_WIDTH_PX, BAR_MIN_WIDTH_PX, BAR_MAX_WIDTH_PX);
    const startLeft = Math.max(0, (window.innerWidth - startWidth) / 2);
    state.barLeft = startLeft;
    state.barBottom = BAR_BOTTOM_PX;
    state.barTop = window.scrollY + BAR_BOTTOM_PX;
    state.barWidth = startWidth;
    state.barHeight = null;
    state.pinned = false;
    state.currentTabHasResponse = false;
    state.currentConversation = [];

    Object.assign(bar.style, {
      position: "fixed",
      bottom: `-${BAR_HEIGHT_PX + 20}px`,  /* starts off-screen */
      left: `${startLeft}px`,
      width: `${startWidth}px`,
      minHeight: `${BAR_HEIGHT_PX}px`,
      borderRadius: `${BAR_RADIUS_PX}px`,
      background: BAR_BG_UNPINNED,
      backdropFilter: BG_BLUR,
      WebkitBackdropFilter: BG_BLUR,
      border: `1px solid ${BORDER_COLOR}`,
      boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.04) inset",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      gap: "10px",
      padding: "10px 16px",
      zIndex: "2147483647",
      cursor: "grab",
      userSelect: "none",
      touchAction: "none",
      transition: `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`,
      opacity: "0",
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      boxSizing: "border-box",
      overflow: "hidden"
    });

    const inputRow = document.createElement("div");
    inputRow.id = BAR_INPUT_ROW_ID;
    Object.assign(inputRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      width: "100%",
      minHeight: `${BAR_HEIGHT_PX - 22}px`
    });

    /* ── icon ── */
    const icon = document.createElement("img");
    icon.src = ICON_SRC;
    icon.alt = "Toolbox";
    icon.draggable = false;
    Object.assign(icon.style, {
      width: "30px",
      height: "30px",
      objectFit: "contain",
      flexShrink: "0",
      pointerEvents: "none",
      borderRadius: "50%"
    });

    const agentButton = document.createElement("button");
    agentButton.id = PANEL_AGENT_BUTTON_ID;
    agentButton.type = "button";
    agentButton.title = "Enable agent mode";
    agentButton.textContent = "A";
    Object.assign(agentButton.style, {
      width: "28px",
      height: "28px",
      borderRadius: "9999px",
      border: "1px solid rgba(153, 246, 228, 0.72)",
      background: "rgba(45, 212, 191, 0.46)",
      color: "#083344",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: "0",
      fontSize: "12px",
      fontWeight: "700",
      lineHeight: "1",
      opacity: "0.95",
      transition: "all 150ms ease",
      flexShrink: "0"
    });
    agentButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    agentButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state.pending || state.agentRunning) return;
      setAgentModeEnabled(!state.agentModeEnabled);
      const activeInput = getInput();
      if (activeInput && !state.pinned) {
        activeInput.focus();
      }
    });
    agentButton.addEventListener("pointerenter", () => {
      agentButton.style.opacity = "1";
    });
    agentButton.addEventListener("pointerleave", () => {
      updateAgentButtonVisualState();
    });

    const attachmentStrip = document.createElement("div");
    attachmentStrip.id = BAR_ATTACHMENTS_ID;
    Object.assign(attachmentStrip.style, {
      display: "none",
      alignItems: "center",
      gap: "6px",
      flexShrink: "0",
      maxWidth: "164px"
    });
    attachmentStrip.addEventListener("pointerdown", (event) => event.stopPropagation());

    /* ── text input ── */
    const input = document.createElement("input");
    input.id = BAR_INPUT_ID;
    input.type = "text";
    input.placeholder = "Ask anything…";
    input.autocomplete = "off";
    input.spellcheck = false;

    Object.assign(input.style, {
      flex: "1",
      height: "100%",
      border: "none",
      background: "transparent",
      color: INPUT_COLOR,
      fontSize: "15px",
      fontFamily: "inherit",
      padding: "0",
      margin: "0",
      caretColor: ACCENT,
      cursor: "text"
    });

    /* prevent drag when interacting with input */
    input.addEventListener("pointerdown", (e) => e.stopPropagation());

    /* Enter → expand panel */
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitPrompt();
      }
    });

    const micButton = document.createElement("button");
    micButton.id = BAR_MIC_BUTTON_ID;
    micButton.type = "button";
    micButton.title = "Start voice input";
    micButton.textContent = "M";
    Object.assign(micButton.style, {
      width: "30px",
      height: "30px",
      borderRadius: "9999px",
      border: "1px solid rgba(147, 197, 253, 0.5)",
      background: "rgba(30, 64, 175, 0.28)",
      color: "#dbeafe",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: "0",
      fontSize: "11px",
      fontWeight: "700",
      lineHeight: "1",
      opacity: "0.95",
      transition: "all 150ms ease",
      flexShrink: "0"
    });
    micButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    micButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleSpeechRecognition();
    });

    /* ── send hint icon (decorative) ── */
    const sendHint = document.createElement("div");
    Object.assign(sendHint.style, {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      background: "rgba(99, 102, 241, 0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: "0",
      cursor: "pointer",
      transition: "background 150ms ease"
    });
    sendHint.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${INPUT_COLOR}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    sendHint.addEventListener("pointerdown", (e) => e.stopPropagation());
    sendHint.addEventListener("click", (e) => {
      e.stopPropagation();
      submitPrompt();
    });
    sendHint.addEventListener("pointerenter", () => {
      sendHint.style.background = "rgba(99, 102, 241, 0.45)";
    });
    sendHint.addEventListener("pointerleave", () => {
      sendHint.style.background = "rgba(99, 102, 241, 0.25)";
    });

    inputRow.appendChild(icon);
    inputRow.appendChild(agentButton);
    inputRow.appendChild(attachmentStrip);
    inputRow.appendChild(input);
    inputRow.appendChild(micButton);
    inputRow.appendChild(sendHint);
    bar.appendChild(inputRow);

    /* ── results panel (hidden) ── */
    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    Object.assign(panel.style, {
      position: "relative",
      width: "100%",
      maxHeight: "0",
      overflowX: "hidden",
      overflowY: "auto",
      borderRadius: `${PANEL_RADIUS_PX}px`,
      background: PANEL_BG_UNPINNED,
      backdropFilter: BG_BLUR,
      WebkitBackdropFilter: BG_BLUR,
      border: `1px solid ${BORDER_COLOR}`,
      boxShadow: "0 8px 26px rgba(0, 0, 0, 0.28)",
      transition:
        `max-height ${EXPAND_DURATION_MS}ms ${EASING}, opacity ${EXPAND_DURATION_MS}ms ease, ` +
        `margin-top ${EXPAND_DURATION_MS}ms ${EASING}`,
      opacity: "0",
      boxSizing: "border-box",
      padding: "0 14px",
      marginTop: "0",
      color: INPUT_COLOR,
      fontSize: "14px",
      fontFamily: "inherit",
      lineHeight: "1.6",
      flex: "1 1 auto",
      minHeight: "0"
    });

    /* placeholder content inside panel */
    const panelInner = document.createElement("div");
    panelInner.id = PANEL_CONTENT_ID;
    Object.assign(panelInner.style, {
      padding: "10px 0 14px",
      display: "flex",
      flexDirection: "column",
      gap: "12px"
    });

    const panelActions = document.createElement("div");
    Object.assign(panelActions.style, {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: "6px"
    });

    const ttsButton = document.createElement("button");
    ttsButton.id = PANEL_TTS_BUTTON_ID;
    ttsButton.type = "button";
    ttsButton.title = "Read response aloud";
    ttsButton.textContent = "S";
    Object.assign(ttsButton.style, {
      width: "24px",
      height: "24px",
      borderRadius: "9999px",
      border: "1px solid rgba(110, 231, 183, 0.75)",
      background: "rgba(16, 185, 129, 0.36)",
      color: "#052e16",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: "0",
      fontSize: "11px",
      fontWeight: "700",
      lineHeight: "1",
      opacity: "0.95",
      transition: "all 150ms ease"
    });
    ttsButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    ttsButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void speakPanelAnswer();
    });
    panelActions.appendChild(ttsButton);

    const pinButton = document.createElement("button");
    pinButton.id = PANEL_PIN_BUTTON_ID;
    pinButton.type = "button";
    pinButton.title = "Pin response panel";
    Object.assign(pinButton.style, {
      width: "24px",
      height: "24px",
      borderRadius: "9999px",
      border: "1px solid rgba(125, 211, 252, 0.72)",
      background: "rgba(56, 189, 248, 0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: "0",
      transition: "all 150ms ease",
      opacity: "0.9"
    });
    pinButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    pinButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      togglePinnedBar();
    });
    pinButton.addEventListener("pointerenter", () => {
      pinButton.style.opacity = "1";
    });
    pinButton.addEventListener("pointerleave", () => {
      updatePinButtonVisualState();
    });

    const pinIcon = document.createElement("img");
    pinIcon.src = PIN_ICON_SRC;
    pinIcon.alt = "Pin response";
    Object.assign(pinIcon.style, {
      width: "12px",
      height: "12px",
      objectFit: "contain",
      pointerEvents: "none"
    });
    pinButton.appendChild(pinIcon);
    panelActions.appendChild(pinButton);

    const closeButton = document.createElement("button");
    closeButton.id = PANEL_CLOSE_BUTTON_ID;
    closeButton.type = "button";
    closeButton.title = "Close tab";
    closeButton.textContent = "x";
    Object.assign(closeButton.style, {
      width: "24px",
      height: "24px",
      borderRadius: "9999px",
      border: "1px solid rgba(252, 165, 165, 0.95)",
      background: "rgba(248, 113, 113, 0.86)",
      color: "#450a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: "0",
      fontSize: "12px",
      fontWeight: "700",
      lineHeight: "1",
      opacity: "0.95",
      transition: "opacity 150ms ease, transform 150ms ease"
    });
    closeButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      dismissBar();
    });
    closeButton.addEventListener("pointerenter", () => {
      closeButton.style.opacity = "1";
      closeButton.style.transform = "scale(1.03)";
    });
    closeButton.addEventListener("pointerleave", () => {
      closeButton.style.opacity = "0.95";
      closeButton.style.transform = "scale(1)";
    });
    panelActions.appendChild(closeButton);

    const minimizeButton = document.createElement("button");
    minimizeButton.id = PANEL_MINIMIZE_BUTTON_ID;
    minimizeButton.type = "button";
    minimizeButton.title = "Make panel smaller";
    minimizeButton.textContent = "-";
    Object.assign(minimizeButton.style, {
      width: "24px",
      height: "24px",
      borderRadius: "9999px",
      border: "1px solid rgba(253, 224, 71, 0.92)",
      background: "rgba(250, 204, 21, 0.74)",
      color: "#713f12",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: "0",
      fontSize: "13px",
      fontWeight: "700",
      lineHeight: "1",
      opacity: "0.96",
      transition: "all 150ms ease"
    });
    minimizeButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    minimizeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      togglePanelCompact();
    });
    minimizeButton.addEventListener("pointerenter", () => {
      minimizeButton.style.opacity = "1";
    });
    minimizeButton.addEventListener("pointerleave", () => {
      updateMinimizeButtonVisualState();
    });
    panelActions.appendChild(minimizeButton);

    const prompt = document.createElement("div");
    prompt.id = PANEL_PROMPT_ID;
    Object.assign(prompt.style, {
      display: "none",
      border: "1px solid rgba(147, 197, 253, 0.38)",
      borderRadius: "12px",
      background: "rgba(30, 58, 138, 0.24)",
      color: "rgba(219, 234, 254, 0.95)",
      padding: "10px 12px",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      fontSize: "13px",
      lineHeight: "1.5",
      fontWeight: "500"
    });

    const answer = document.createElement("div");
    answer.id = PANEL_ANSWER_ID;
    Object.assign(answer.style, {
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "14px",
      background: "rgba(15, 23, 42, 0.35)",
      padding: "14px 14px",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      color: "rgba(226, 232, 240, 0.95)",
      opacity: "0.78",
      fontSize: "14px",
      lineHeight: "1.55"
    });
    answer.textContent = "Ask a question and press Enter.";

    const chainWrap = document.createElement("div");
    chainWrap.id = PANEL_COT_ID;
    Object.assign(chainWrap.style, {
      display: "none",
      flexDirection: "column",
      gap: "8px"
    });

    panelInner.appendChild(panelActions);
    panelInner.appendChild(prompt);
    panelInner.appendChild(answer);
    panelInner.appendChild(chainWrap);
    panel.appendChild(panelInner);

    bar.appendChild(panel);
    updateActivePinnedVisualState();
    updatePinButtonVisualState();
    updateMinimizeButtonVisualState();

    /* ================================================================
     *  DRAG  (reposition bar)
     * ================================================================ */
    let activePointerId = null;
    let interactionMode = "";
    let resizeDirection = "";
    let pStartX = 0;
    let pStartY = 0;
    let startRectLeft = 0;
    let startRectTop = 0;
    let dragStartWidth = 0;
    let dragStartHeight = 0;
    let originLeft = 0;
    let originBottom = 0;
    let originTop = 0;
    let hasDragged = false;

    bar.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const rect = bar.getBoundingClientRect();
      const hoverDirection = getResizeDirectionForRect(e.clientX, e.clientY, rect);
      const wantsVerticalResize =
        hoverDirection.includes("n") || hoverDirection.includes("s");
      const canResize = Boolean(hoverDirection) && (!wantsVerticalResize || state.expanded);

      e.preventDefault();
      bar.setPointerCapture(e.pointerId);
      activePointerId = e.pointerId;
      interactionMode = canResize ? "resize" : "drag";
      resizeDirection = canResize ? hoverDirection : "";
      pStartX = e.clientX;
      pStartY = e.clientY;
      startRectLeft = rect.left;
      startRectTop = rect.top;
      dragStartWidth = rect.width;
      dragStartHeight = rect.height;
      hasDragged = false;

      originLeft = parseFloat(bar.style.left) || state.barLeft;
      if (state.pinned) {
        originTop = parseFloat(bar.style.top) || state.barTop;
      } else {
        originBottom = parseFloat(bar.style.bottom) || state.barBottom;
      }

      bar.style.cursor =
        interactionMode === "resize" ? getResizeCursor(resizeDirection) : "grabbing";
      bar.style.transition = "none"; /* disable transition during drag */
    });

    bar.addEventListener("pointermove", (e) => {
      if (e.pointerId !== activePointerId) {
        const direction = getResizeDirectionForRect(e.clientX, e.clientY, bar.getBoundingClientRect());
        const wantsVerticalResize = direction.includes("n") || direction.includes("s");
        const canResize = Boolean(direction) && (!wantsVerticalResize || state.expanded);
        bar.style.cursor = canResize ? getResizeCursor(direction) : "grab";
        return;
      }

      const dx = e.clientX - pStartX;
      const dy = e.clientY - pStartY;

      if (interactionMode === "drag") {
        if (!hasDragged && Math.hypot(dx, dy) > BAR_DRAG_THRESHOLD_PX) {
          hasDragged = true;
          hideBottomGradient();
        }
        if (!hasDragged) return;

        if (state.pinned) {
          const docSize = getDocumentSize();
          const maxLeft = Math.max(0, docSize.width - state.barWidth);
          const maxTop = Math.max(0, docSize.height - bar.offsetHeight - 12);
          const newLeft = clamp(originLeft + dx, 0, maxLeft);
          const newTop = clamp(originTop + dy, 0, maxTop);
          bar.style.left = `${newLeft}px`;
          bar.style.top = `${newTop}px`;
          state.barLeft = newLeft;
          state.barTop = newTop;
        } else {
          const newLeft = clamp(originLeft + dx, 0, Math.max(0, window.innerWidth - state.barWidth));
          const maxBottom = Math.max(
            0,
            window.innerHeight - Math.max(BAR_HEIGHT_PX, bar.offsetHeight) - 20
          );
          const newBottom = clamp(originBottom - dy, 0, maxBottom);
          bar.style.left = `${newLeft}px`;
          bar.style.bottom = `${newBottom}px`;
          state.barLeft = newLeft;
          state.barBottom = newBottom;
        }
        if (state.expanded) resizePanelToContent();
        return;
      }

      if (interactionMode !== "resize") return;
      hideBottomGradient();

      let nextWidth = dragStartWidth;
      let nextHeight = dragStartHeight;
      let nextLeftViewport = startRectLeft;
      let nextTopViewport = startRectTop;

      if (resizeDirection.includes("e")) {
        nextWidth = clamp(dragStartWidth + dx, BAR_MIN_WIDTH_PX, BAR_MAX_WIDTH_PX);
      }
      if (resizeDirection.includes("w")) {
        nextWidth = clamp(dragStartWidth - dx, BAR_MIN_WIDTH_PX, BAR_MAX_WIDTH_PX);
        nextLeftViewport = startRectLeft + (dragStartWidth - nextWidth);
      }
      if (state.expanded && resizeDirection.includes("s")) {
        nextHeight = clamp(
          dragStartHeight + dy,
          BAR_MIN_TOTAL_HEIGHT_PX,
          BAR_MAX_TOTAL_HEIGHT_PX
        );
      }
      if (state.expanded && resizeDirection.includes("n")) {
        nextHeight = clamp(
          dragStartHeight - dy,
          BAR_MIN_TOTAL_HEIGHT_PX,
          BAR_MAX_TOTAL_HEIGHT_PX
        );
        nextTopViewport = startRectTop + (dragStartHeight - nextHeight);
      }

      if (state.pinned) {
        const docSize = getDocumentSize();
        const nextLeft = clamp(
          nextLeftViewport + window.scrollX,
          0,
          Math.max(0, docSize.width - nextWidth)
        );
        const nextTop = clamp(
          nextTopViewport + window.scrollY,
          0,
          Math.max(0, docSize.height - nextHeight - 12)
        );
        bar.style.left = `${nextLeft}px`;
        bar.style.top = `${nextTop}px`;
        state.barLeft = nextLeft;
        state.barTop = nextTop;
      } else {
        const clampedLeftViewport = clamp(
          nextLeftViewport,
          0,
          Math.max(0, window.innerWidth - nextWidth)
        );
        const clampedTopViewport = clamp(
          nextTopViewport,
          0,
          Math.max(0, window.innerHeight - nextHeight - 12)
        );
        const nextBottom = clamp(
          window.innerHeight - clampedTopViewport - nextHeight,
          0,
          Math.max(0, window.innerHeight - Math.max(BAR_HEIGHT_PX, nextHeight) - 20)
        );
        bar.style.left = `${clampedLeftViewport}px`;
        bar.style.bottom = `${nextBottom}px`;
        state.barLeft = clampedLeftViewport;
        state.barBottom = nextBottom;
      }

      state.barWidth = nextWidth;
      bar.style.width = `${nextWidth}px`;

      if (state.expanded && (resizeDirection.includes("n") || resizeDirection.includes("s"))) {
        state.barHeight = nextHeight;
        bar.style.height = `${nextHeight}px`;
      }

      if (state.expanded) {
        resizePanelToContent();
      }
    });

    bar.addEventListener("pointerup", (e) => {
      if (e.pointerId !== activePointerId) return;
      bar.releasePointerCapture(e.pointerId);
      activePointerId = null;
      interactionMode = "";
      resizeDirection = "";
      bar.style.cursor = "grab";
      /* restore transitions */
      if (state.pinned) {
        bar.style.transition = `opacity ${SLIDE_DURATION_MS}ms ease`;
      } else {
        bar.style.transition = `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`;
      }
    });

    bar.addEventListener("pointercancel", (e) => {
      if (e.pointerId !== activePointerId) return;
      activePointerId = null;
      interactionMode = "";
      resizeDirection = "";
      bar.style.cursor = "grab";
      if (state.pinned) {
        bar.style.transition = `opacity ${SLIDE_DURATION_MS}ms ease`;
      } else {
        bar.style.transition = `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`;
      }
    });

    /* ── mount ── */
    (document.body || document.documentElement).appendChild(bar);
    setAgentModeEnabled(state.agentModeEnabled);
    updateMicButtonVisualState();
    updateTtsButtonVisualState();
    renderAttachmentStrip();

    /* slide in */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        showBottomGradient();
        bar.style.bottom = `${BAR_BOTTOM_PX}px`;
        bar.style.opacity = "1";
      });
    });

    /* focus input after slide-in finishes */
    setTimeout(() => {
      const inp = getInput();
      if (inp) inp.focus();
    }, SLIDE_DURATION_MS + 50);

    /* ── global Escape handler ── */
    state.onKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (state.speechRecording) {
          stopSpeechRecognition({ preserveText: true });
        } else if (state.agentRunning) {
          state.agentStopRequested = true;
          setAgentStatus("Agent: stopping...");
        } else if (state.expanded) {
          collapsePanel();
        } else {
          dismissBar();
        }
      }
    };
    window.addEventListener("keydown", state.onKeydown, true);

    /* ── resize handler ── */
    state.onResize = () => {
      const b = getBar();
      if (!b) return;
      if (state.pinned) {
        const docSize = getDocumentSize();
        const maxLeft = Math.max(0, docSize.width - state.barWidth);
        const maxTop = Math.max(0, docSize.height - b.offsetHeight - 12);
        if (state.barLeft > maxLeft) {
          state.barLeft = maxLeft;
          b.style.left = `${maxLeft}px`;
        }
        if (state.barTop > maxTop) {
          state.barTop = maxTop;
          b.style.top = `${maxTop}px`;
        }
      } else {
        const maxLeft = Math.max(0, window.innerWidth - state.barWidth);
        if (state.barLeft > maxLeft) {
          state.barLeft = maxLeft;
          b.style.left = `${maxLeft}px`;
        }
      }
      if (state.expanded) resizePanelToContent();
    };
    window.addEventListener("resize", state.onResize);

    state.visible = true;
  }

  /* ================================================================
   *  EXPAND / COLLAPSE PANEL
   * ================================================================ */
  function expandPanel() {
    const panel = getPanel();
    if (!panel) return;

    state.expanded = true;
    state.panelBodyHidden = false;
    panel.style.opacity = "1";
    panel.style.marginTop = "2px";
    applyPanelBodyVisibility();
    updateMinimizeButtonVisualState();
    requestAnimationFrame(resizePanelToContent);
  }

  function collapsePanel() {
    const panel = getPanel();
    const bar = getBar();
    if (!panel) return;

    state.expanded = false;
    state.panelBodyHidden = false;
    state.barHeight = null;
    if (bar) {
      bar.style.height = "auto";
    }
    panel.style.maxHeight = "0";
    panel.style.opacity = "0";
    panel.style.marginTop = "0";
    updateMinimizeButtonVisualState();
  }

  /* ================================================================
   *  DISMISS BAR  (slide down off-screen, then remove)
   * ================================================================ */
  function dismissBar({ removeFloating = false } = {}) {
    const bar = getBar();
    const gradient = getBottomGradient();
    if (!bar) return;

    state.requestId += 1;
    state.pending = false;
    state.agentStopRequested = true;
    state.agentRunning = false;
    stopSpeechRecognition({ preserveText: true });
    state.ttsPending = false;
    stopTtsPlayback();
    removeAgentOverlay();
    const input = getInput();
    if (input) input.disabled = false;
    updateAgentButtonVisualState();
    updateMicButtonVisualState();
    updateTtsButtonVisualState();

    /* first collapse panel if open */
    if (state.expanded) collapsePanel();

    /* restore transition in case it was removed during drag */
    if (state.pinned) {
      bar.style.transition = `opacity ${SLIDE_DURATION_MS}ms ease`;
    } else {
      bar.style.transition = `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`;
    }

    requestAnimationFrame(() => {
      if (gradient) gradient.style.opacity = "0";
      if (!state.pinned) {
        bar.style.bottom = `-${BAR_HEIGHT_PX + 20}px`;
      }
      bar.style.opacity = "0";
    });

    setTimeout(() => {
      removeBarUI({ removeFloating });
    }, SLIDE_DURATION_MS + 50);
  }

  /* ================================================================
   *  FULL CLEANUP
   * ================================================================ */
  function removeBarUI({ removeFloating = false } = {}) {
    const bar = getBar();
    if (bar) bar.remove();
    const gradient = getBottomGradient();
    if (gradient) gradient.remove();
    removeAgentOverlay();
    if (removeFloating) {
      clearImageAttachment();
      removeFloatingUI();
    }

    removePlaceholderStyle();

    if (state.onKeydown) {
      window.removeEventListener("keydown", state.onKeydown, true);
      state.onKeydown = null;
    }

    if (state.onResize) {
      window.removeEventListener("resize", state.onResize);
      state.onResize = null;
    }

    state.visible = false;
    state.expanded = false;
    state.panelBodyHidden = false;
    state.pending = false;
    state.agentRunning = false;
    state.agentStopRequested = false;
    state.speechRecording = false;
    state.speechStopRequested = false;
    state.speechBaseText = "";
    state.speechFinalText = "";
    state.speechAutoSubmitPending = false;
    clearSpeechAutoSubmitTimer();
    state.ttsPending = false;
    stopTtsPlayback();
    state.pinned = false;
    state.currentTabHasResponse = false;
    state.currentConversation = [];
    state.barTop = 0;
    state.barHeight = null;
  }

  /* ================================================================
   *  TOGGLE ENTRY POINT
   * ================================================================ */
  function activateToolbox() {
    finishScreenCaptureOverlay();
    removeFloatingUI();
    if (state.visible) {
      const input = getInput();
      if (input) {
        input.focus();
        input.select();
      }
      return;
    }
    createBar();
  }

  function deactivateToolbox() {
    finishScreenCaptureOverlay();
    state.agentStopRequested = true;
    state.agentRunning = false;
    stopSpeechRecognition({ preserveText: true });
    state.ttsPending = false;
    stopTtsPlayback();
    removeAgentOverlay();
    if (state.visible) {
      dismissBar();
      return;
    }
  }

  function openNewToolboxTab() {
    finishScreenCaptureOverlay();
    state.agentStopRequested = true;
    stopSpeechRecognition({ preserveText: true });
    state.ttsPending = false;
    stopTtsPlayback();
    removeAgentOverlay();
    removeFloatingUI();

    const hasActiveTab = state.visible || !!getBar();
    if (!hasActiveTab) {
      activateToolbox();
      return;
    }

    if (state.currentTabHasResponse) {
      createArchivedResponseTab(state.currentConversation);
    }

    state.requestId += 1;
    state.pending = false;
    state.agentRunning = false;
    clearImageAttachment();
    removeBarUI();
    activateToolbox();
  }

  function toggleToolbox() {
    openNewToolboxTab();
  }

  /* ── message listener (unchanged contract) ── */
  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== TOGGLE_MESSAGE_TYPE) return;
    toggleToolbox();
  });
})();
