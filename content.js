(() => {
  /* ================================================================
   *  IDENTIFIERS
   * ================================================================ */
  const BAR_CONTAINER_ID = "__toolbox_bar_container__";
  const BAR_INPUT_ID = "__toolbox_bar_input__";
  const BAR_GRADIENT_ID = "__toolbox_bottom_gradient__";
  const PANEL_ID = "__toolbox_panel__";
  const PANEL_CONTENT_ID = "__toolbox_panel_content__";
  const PANEL_ANSWER_ID = "__toolbox_panel_answer__";
  const PANEL_COT_ID = "__toolbox_panel_chain_of_thought__";
  const BAR_ATTACHMENTS_ID = "__toolbox_bar_attachments__";
  const FLOATING_ICON_ID = "__toolbox_icon__";
  const FLOATING_NODE_ID_PREFIX = "__toolbox_node__";
  const FLOATING_POPUP_ID = "__toolbox_template_popup__";
  const SCREENSHOT_OVERLAY_ID = "__toolbox_screen_capture_overlay__";
  const SCREENSHOT_SELECTION_ID = "__toolbox_screen_capture_selection__";
  const TOGGLE_MESSAGE_TYPE = "TOGGLE_TOOLBOX_BUBBLE";
  const CHAT_MESSAGE_TYPE = "TOOLBOX_CHAT_REQUEST";
  const CAPTURE_MESSAGE_TYPE = "TOOLBOX_CAPTURE_VISIBLE_TAB";
  const ICON_SRC = chrome.runtime.getURL("assets/icon.png");

  /* ================================================================
   *  DIMENSION & STYLE CONSTANTS
   * ================================================================ */
  const BAR_WIDTH_PX = 520;
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
  const PAGE_CONTEXT_MAX_CHARS = 12000;
  const PAGE_SELECTION_MAX_CHARS = 2000;
  const PAGE_ACTIVE_ELEMENT_MAX_CHARS = 2000;

  /* ── animation ── */
  const SLIDE_DURATION_MS = 380;
  const EXPAND_DURATION_MS = 320;
  const EASING = "cubic-bezier(0.25, 1, 0.5, 1)";

  /* ── colours ── */
  const BG_COLOR = "rgba(17, 24, 39, 0.92)";
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
    pending: false,
    requestId: 0,
    barBottom: BAR_BOTTOM_PX,
    barLeft: 0,        // will be centred on create
    onResize: null,
    onKeydown: null,
    floatingExpanded: false,
    floatingCenterX: 0,
    floatingCenterY: 0,
    floatingNodeMap: new Map(),
    floatingPopupCloseTimer: null,
    floatingOnResize: null,
    imageAttachment: null,
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
  function getBar() {
    return getEl(BAR_CONTAINER_ID);
  }
  function getInput() {
    return getEl(BAR_INPUT_ID);
  }
  function getPanel() {
    return getEl(PANEL_ID);
  }
  function getPanelContent() {
    return getEl(PANEL_CONTENT_ID);
  }
  function getPanelAnswer() {
    return getEl(PANEL_ANSWER_ID);
  }
  function getPanelChainOfThought() {
    return getEl(PANEL_COT_ID);
  }
  function getAttachmentStrip() {
    return getEl(BAR_ATTACHMENTS_ID);
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
    const uiElements = [getFloatingIcon(), getBar(), getBottomGradient(), getFloatingPopup()];
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
    const barBottom = bar ? parseFloat(bar.style.bottom) || state.barBottom : state.barBottom;
    const availableAboveBar = Math.max(
      110,
      window.innerHeight - Math.max(0, barBottom) - BAR_HEIGHT_PX - 24
    );
    const ratioCap = Math.floor(window.innerHeight * PANEL_MAX_HEIGHT_RATIO);
    return Math.max(110, Math.min(PANEL_MAX_HEIGHT_PX, ratioCap, availableAboveBar));
  }

  function resizePanelToContent() {
    const panel = getPanel();
    const panelContent = getPanelContent();
    if (!panel || !panelContent || !state.expanded) return;

    const maxHeight = computePanelMaxHeight();
    const minHeight = Math.min(PANEL_MIN_HEIGHT_PX, maxHeight);
    const desiredHeight = Math.min(
      Math.max(panelContent.scrollHeight + 18, minHeight),
      maxHeight
    );

    panel.style.maxHeight = `${Math.round(desiredHeight)}px`;
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

  function setPanelContent(text, { muted = false, error = false, chainOfThought = [] } = {}) {
    const panelContent = getPanelContent();
    if (!panelContent) return;

    const answer = getPanelAnswer();
    if (!answer) {
      panelContent.textContent = text;
      panelContent.style.opacity = muted ? "0.6" : "1";
      panelContent.style.color = error ? "#fca5a5" : INPUT_COLOR;
      if (state.expanded) requestAnimationFrame(resizePanelToContent);
      return;
    }

    answer.textContent = text;
    answer.style.opacity = muted ? "0.75" : "1";
    answer.style.color = error ? "#fca5a5" : INPUT_COLOR;
    answer.style.borderColor = error ? "rgba(252, 165, 165, 0.45)" : "rgba(255, 255, 255, 0.08)";
    answer.style.background = error ? "rgba(127, 29, 29, 0.26)" : "rgba(15, 23, 42, 0.35)";

    renderChainOfThought(chainOfThought, { muted });

    if (state.expanded) requestAnimationFrame(resizePanelToContent);
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

    const requestId = ++state.requestId;
    state.pending = true;
    input.disabled = true;
    const pageContext = buildPageContext();
    const attachments = toImageAttachmentPayload();
    const hasImageAttachment = attachments.length > 0;
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
    setPanelContent(
      hasImageAttachment
        ? "Analyzing your request with page context and screenshot..."
        : "Analyzing your request with page context...",
      {
      muted: true,
      chainOfThought: loadingChain
      }
    );

    try {
      const result = await requestChatAnswer(prompt, pageContext, attachments);
      if (requestId !== state.requestId) return;
      setPanelContent(result.text, { chainOfThought: result.chainOfThought });
      if (hasImageAttachment) clearImageAttachment();
    } catch (error) {
      if (requestId !== state.requestId) return;
      const message =
        error instanceof Error && error.message
          ? error.message
          : "No se pudo obtener respuesta.";
      setPanelContent(`Error: ${message}`, { error: true, chainOfThought: [] });
    } finally {
      if (requestId !== state.requestId) return;
      state.pending = false;
      input.disabled = false;
      input.focus();
      input.select();
    }
  }

  /* ================================================================
   *  CREATE BAR
   * ================================================================ */
  function createBar() {
    injectPlaceholderStyle();
    const gradient = ensureBottomGradient();

    /* ── container (pill bar) ── */
    const bar = document.createElement("div");
    bar.id = BAR_CONTAINER_ID;

    const startLeft = Math.max(0, (window.innerWidth - BAR_WIDTH_PX) / 2);
    state.barLeft = startLeft;
    state.barBottom = BAR_BOTTOM_PX;

    Object.assign(bar.style, {
      position: "fixed",
      bottom: `-${BAR_HEIGHT_PX + 20}px`,  /* starts off-screen */
      left: `${startLeft}px`,
      width: `${BAR_WIDTH_PX}px`,
      height: `${BAR_HEIGHT_PX}px`,
      borderRadius: `${BAR_RADIUS_PX}px`,
      background: BG_COLOR,
      backdropFilter: BG_BLUR,
      WebkitBackdropFilter: BG_BLUR,
      border: `1px solid ${BORDER_COLOR}`,
      boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.04) inset",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "0 16px",
      zIndex: "2147483647",
      cursor: "grab",
      userSelect: "none",
      touchAction: "none",
      transition: `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`,
      opacity: "0",
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      boxSizing: "border-box"
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

    bar.appendChild(icon);
    bar.appendChild(attachmentStrip);
    bar.appendChild(input);
    bar.appendChild(sendHint);

    /* ── results panel (hidden) ── */
    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    Object.assign(panel.style, {
      position: "absolute",
      bottom: `${BAR_HEIGHT_PX + 8}px`,
      left: "0",
      width: "100%",
      maxHeight: "0",
      overflowX: "hidden",
      overflowY: "auto",
      borderRadius: `${PANEL_RADIUS_PX}px`,
      background: BG_COLOR,
      backdropFilter: BG_BLUR,
      WebkitBackdropFilter: BG_BLUR,
      border: `1px solid ${BORDER_COLOR}`,
      boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.35)",
      transition: `max-height ${EXPAND_DURATION_MS}ms ${EASING}, opacity ${EXPAND_DURATION_MS}ms ease`,
      opacity: "0",
      boxSizing: "border-box",
      padding: "0 20px",
      color: INPUT_COLOR,
      fontSize: "14px",
      fontFamily: "inherit",
      lineHeight: "1.6"
    });

    /* placeholder content inside panel */
    const panelInner = document.createElement("div");
    panelInner.id = PANEL_CONTENT_ID;
    Object.assign(panelInner.style, {
      padding: "20px 0",
      display: "flex",
      flexDirection: "column",
      gap: "12px"
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

    panelInner.appendChild(answer);
    panelInner.appendChild(chainWrap);
    panel.appendChild(panelInner);

    bar.appendChild(panel);

    /* ================================================================
     *  DRAG  (reposition bar)
     * ================================================================ */
    let activePointerId = null;
    let pStartX = 0;
    let pStartY = 0;
    let originLeft = 0;
    let originBottom = 0;
    let hasDragged = false;

    bar.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      bar.setPointerCapture(e.pointerId);
      activePointerId = e.pointerId;
      pStartX = e.clientX;
      pStartY = e.clientY;
      hasDragged = false;

      originLeft = parseFloat(bar.style.left) || state.barLeft;
      originBottom = parseFloat(bar.style.bottom) || state.barBottom;

      bar.style.cursor = "grabbing";
      bar.style.transition = "none"; /* disable transition during drag */
    });

    bar.addEventListener("pointermove", (e) => {
      if (e.pointerId !== activePointerId) return;

      const dx = e.clientX - pStartX;
      const dy = e.clientY - pStartY;

      if (!hasDragged && Math.hypot(dx, dy) > BAR_DRAG_THRESHOLD_PX) {
        hasDragged = true;
      }
      if (!hasDragged) return;

      const newLeft = Math.max(0, Math.min(originLeft + dx, window.innerWidth - BAR_WIDTH_PX));
      const newBottom = Math.max(0, Math.min(originBottom - dy, window.innerHeight - BAR_HEIGHT_PX - 20));

      bar.style.left = `${newLeft}px`;
      bar.style.bottom = `${newBottom}px`;
      state.barLeft = newLeft;
      state.barBottom = newBottom;
      if (state.expanded) resizePanelToContent();
    });

    bar.addEventListener("pointerup", (e) => {
      if (e.pointerId !== activePointerId) return;
      bar.releasePointerCapture(e.pointerId);
      activePointerId = null;
      bar.style.cursor = "grab";
      /* restore transitions */
      bar.style.transition = `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`;
    });

    bar.addEventListener("pointercancel", (e) => {
      if (e.pointerId !== activePointerId) return;
      activePointerId = null;
      bar.style.cursor = "grab";
      bar.style.transition = `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`;
    });

    /* ── mount ── */
    (document.body || document.documentElement).appendChild(bar);
    renderAttachmentStrip();

    /* slide in */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        gradient.style.opacity = "1";
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
        if (state.expanded) {
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
      /* re-centre if needed */
      const maxLeft = Math.max(0, window.innerWidth - BAR_WIDTH_PX);
      if (state.barLeft > maxLeft) {
        state.barLeft = maxLeft;
        b.style.left = `${maxLeft}px`;
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
    panel.style.opacity = "1";
    panel.style.padding = "0 20px";
    requestAnimationFrame(resizePanelToContent);
  }

  function collapsePanel() {
    const panel = getPanel();
    if (!panel) return;

    state.expanded = false;
    panel.style.maxHeight = "0";
    panel.style.opacity = "0";
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
    const input = getInput();
    if (input) input.disabled = false;

    /* first collapse panel if open */
    if (state.expanded) collapsePanel();

    /* restore transition in case it was removed during drag */
    bar.style.transition = `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`;

    requestAnimationFrame(() => {
      if (gradient) gradient.style.opacity = "0";
      bar.style.bottom = `-${BAR_HEIGHT_PX + 20}px`;
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
    state.pending = false;
  }

  /* ================================================================
   *  TOGGLE ENTRY POINT
   * ================================================================ */
  function activateToolbox() {
    createFloatingIcon();
  }

  function deactivateToolbox() {
    finishScreenCaptureOverlay();
    if (state.visible) {
      dismissBar({ removeFloating: true });
      return;
    }
    clearImageAttachment();
    removeFloatingUI();
  }

  function toggleToolbox() {
    if (getFloatingIcon()) {
      deactivateToolbox();
    } else {
      activateToolbox();
    }
  }

  /* ── message listener (unchanged contract) ── */
  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== TOGGLE_MESSAGE_TYPE) return;
    toggleToolbox();
  });
})();
