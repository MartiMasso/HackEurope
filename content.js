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
  const BAR_FEATURE_TOGGLE_ID = "__toolbox_bar_feature_toggle__";
  const BAR_FEATURE_TRAY_ID = "__toolbox_bar_feature_tray__";
  const BAR_SHELL_ID = "__toolbox_bar_shell__";
  const BAR_IMAGE_BUTTON_ID = "__toolbox_bar_image_button__";
  const BAR_SEND_BUTTON_ID = "__toolbox_bar_send_button__";
  const AGENT_OVERLAY_ID = "__toolbox_agent_overlay__";
  const AGENT_CURSOR_ID = "__toolbox_agent_cursor__";
  const AGENT_STATUS_ID = "__toolbox_agent_status__";
  const FLOATING_ICON_ID = "__toolbox_icon__";
  const FLOATING_NODE_ID_PREFIX = "__toolbox_node__";
  const FLOATING_POPUP_ID = "__toolbox_template_popup__";
  const SCREENSHOT_OVERLAY_ID = "__toolbox_screen_capture_overlay__";
  const SCREENSHOT_SELECTION_ID = "__toolbox_screen_capture_selection__";
  const SCREENSHOT_CURSOR_VISUAL_ID = "__toolbox_screen_capture_cursor__";
  const TOGGLE_MESSAGE_TYPE = "TOGGLE_TOOLBOX_BUBBLE";
  const SET_VISIBILITY_MESSAGE_TYPE = "TOOLBOX_SET_VISIBILITY";
  const QUERY_STATE_MESSAGE_TYPE = "TOOLBOX_QUERY_STATE";
  const CHAT_MESSAGE_TYPE = "TOOLBOX_CHAT_REQUEST";
  const AGENT_MESSAGE_TYPE = "TOOLBOX_AGENT_REQUEST";
  const CAPTURE_MESSAGE_TYPE = "TOOLBOX_CAPTURE_VISIBLE_TAB";
  const SET_OPENAI_CONFIG_MESSAGE_TYPE = "TOOLBOX_SET_OPENAI_CONFIG";
  const ICON_SRC = chrome.runtime.getURL("assets/icons/icon-128.png");

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
  const FEATURE_TRAY_OPEN_WIDTH_PX = 86;
  const FEATURE_BUTTON_SIZE_PX = 28;
  const AGENT_MAX_STEPS = 18;
  const AGENT_STALL_FORCE_FINISH_THRESHOLD = 3;
  const AGENT_SNAPSHOT_MAX_SIDE_PX = 1280;
  const AGENT_SNAPSHOT_QUALITY = 0.72;
  const AGENT_SNAPSHOT_MIN_STEP_INTERVAL = 2;
  const AGENT_MAX_HISTORY = 10;
  const PANEL_MAX_HEIGHT_PX = 900;
  const PANEL_MIN_HEIGHT_PX = 170;
  const PANEL_MAX_HEIGHT_RATIO = 0.78;
  const PANEL_RADIUS_PX = 18;
  const BAR_DRAG_THRESHOLD_PX = 5;
  const PAGE_CONTEXT_MAX_CHARS = 12000;
  const PAGE_SELECTION_MAX_CHARS = 2000;
  const PAGE_ACTIVE_ELEMENT_MAX_CHARS = 2000;
  const SHORTCUT_OPEN_CHAT_KEY = "x";
  const SHORTCUT_SCREENSHOT_KEY = "y";

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
    enabled: false,
    shortcutKeydown: null,
    floatingExpanded: false,
    floatingCenterX: 0,
    floatingCenterY: 0,
    floatingNodeMap: new Map(),
    floatingPopupCloseTimer: null,
    floatingOnResize: null,
    imageAttachments: [],
    featureTrayOpen: false,
    agentModeEnabled: false,
    agentRunning: false,
    agentStopRequested: false,
    invalidContextRecoveryTriggered: false,
    screenCaptureCleanup: null,
    screenCaptureInProgress: false,
    lastPointerX: null,
    lastPointerY: null,
    pointerTrackerHandler: null
  };

  const floatingDirections = [
    { key: "top", dx: 0, dy: -FLOATING_NODE_DISTANCE_PX, label: "TOP" },
    { key: "left", dx: -FLOATING_NODE_DISTANCE_PX, dy: 0, label: "LEFT" },
    { key: "right", dx: FLOATING_NODE_DISTANCE_PX, dy: 0, label: "RIGHT" },
    { key: "bottom", dx: 0, dy: FLOATING_NODE_DISTANCE_PX, label: "BOTTOM" }
  ];

  const chatFeatureItems = [
    {
      key: "agent_mode",
      label: "Agent",
      icon:
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dbeafe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10H7z"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M5 5l2 2"/><path d="M17 17l2 2"/><path d="M19 5l-2 2"/><path d="M7 17l-2 2"/></svg>'
    }
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
  function getFeatureToggle() {
    return getEl(BAR_FEATURE_TOGGLE_ID);
  }
  function getFeatureTray() {
    return getEl(BAR_FEATURE_TRAY_ID);
  }
  function getPromptShell() {
    return getEl(BAR_SHELL_ID);
  }
  function getImageButton() {
    return getEl(BAR_IMAGE_BUTTON_ID);
  }
  function getSendButton() {
    return getEl(BAR_SEND_BUTTON_ID);
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

  function getComposerHeightPx() {
    const bar = getBar();
    if (!bar) return BAR_HEIGHT_PX;
    const rect = bar.getBoundingClientRect();
    const height = Number.isFinite(rect.height) ? rect.height : 0;
    return Math.max(BAR_HEIGHT_PX, Math.round(height) || BAR_HEIGHT_PX);
  }

  function getBarDismissOffsetPx() {
    return getComposerHeightPx() + 20;
  }

  function updatePanelAnchorOffset() {
    const panel = getPanel();
    if (!panel) return;
    const composerHeight = getComposerHeightPx();
    panel.style.bottom = `${Math.max(0, composerHeight - 1)}px`;
  }

  function syncPromptBarFrameStyles() {
    const shell = getPromptShell();
    const panel = getPanel();
    const connected = Boolean(state.expanded);

    if (shell instanceof HTMLElement) {
      shell.style.borderTopLeftRadius = connected ? "0px" : "18px";
      shell.style.borderTopRightRadius = connected ? "0px" : "18px";
    }

    if (panel instanceof HTMLElement) {
      panel.style.borderBottomLeftRadius = connected ? "0px" : `${PANEL_RADIUS_PX}px`;
      panel.style.borderBottomRightRadius = connected ? "0px" : `${PANEL_RADIUS_PX}px`;
      panel.style.borderBottomColor = "transparent";
    }
  }

  function refreshPromptBarActionStates() {
    const input = getInput();
    const sendButton = getSendButton();
    const imageButton = getImageButton();
    const promptDisabled = !input || input.disabled || state.pending || state.agentRunning;
    const hasPrompt = Boolean(input && typeof input.value === "string" && input.value.trim());

    if (sendButton instanceof HTMLButtonElement) {
      const disabled = promptDisabled || !hasPrompt;
      sendButton.disabled = disabled;
      sendButton.classList.toggle("sp-send-off", disabled);
    }

    if (imageButton instanceof HTMLButtonElement) {
      const disabled = promptDisabled || state.screenCaptureInProgress;
      const imageCount = Array.isArray(state.imageAttachments) ? state.imageAttachments.length : 0;
      const hasImage = imageCount > 0;
      imageButton.disabled = disabled;
      imageButton.classList.toggle("sp-image-btn--active", hasImage);
      imageButton.setAttribute("aria-pressed", hasImage ? "true" : "false");

      let badge = imageButton.querySelector(".sp-image-badge");
      if (hasImage) {
        if (!(badge instanceof HTMLElement)) {
          badge = document.createElement("span");
          badge.className = "sp-image-badge";
          imageButton.appendChild(badge);
        }
        badge.textContent = imageCount > 9 ? "9+" : String(imageCount);
      } else if (badge instanceof HTMLElement) {
        badge.remove();
      }
    }

    const agentButtons = document.querySelectorAll('[data-toolbox-feature="agent_mode"]');
    agentButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.disabled = promptDisabled;
      button.setAttribute("aria-pressed", state.agentModeEnabled ? "true" : "false");
    });
  }

  function rememberPointerPosition(event) {
    if (!event) return;
    const x = Number.isFinite(event.clientX) ? event.clientX : null;
    const y = Number.isFinite(event.clientY) ? event.clientY : null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    state.lastPointerX = x;
    state.lastPointerY = y;
  }

  function ensurePointerTracker() {
    if (state.pointerTrackerHandler) return;
    state.pointerTrackerHandler = (event) => {
      rememberPointerPosition(event);
    };
    window.addEventListener("pointermove", state.pointerTrackerHandler, true);
    window.addEventListener("mousemove", state.pointerTrackerHandler, true);
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

  function matchesToolboxShortcut(event, expectedKey) {
    if (!event || event.repeat) return false;
    if (!event.metaKey || !event.shiftKey || event.altKey || event.ctrlKey) return false;
    if (typeof event.key !== "string") return false;
    return event.key.toLowerCase() === expectedKey;
  }

  function ensureShortcutKeydownListener() {
    if (state.shortcutKeydown) return;

    state.shortcutKeydown = (event) => {
      if (matchesToolboxShortcut(event, SHORTCUT_OPEN_CHAT_KEY)) {
        event.preventDefault();
        event.stopPropagation();
        if (state.screenCaptureInProgress) return;
        state.enabled = true;
        openChatFromFloating();
        return;
      }

      if (matchesToolboxShortcut(event, SHORTCUT_SCREENSHOT_KEY)) {
        event.preventDefault();
        event.stopPropagation();
        if (state.screenCaptureInProgress) return;
        state.enabled = true;
        startScreenCaptureSelection();
      }
    };

    window.addEventListener("keydown", state.shortcutKeydown, true);
  }

  function removeShortcutKeydownListener() {
    if (!state.shortcutKeydown) return;
    window.removeEventListener("keydown", state.shortcutKeydown, true);
    state.shortcutKeydown = null;
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
    if (!Array.isArray(state.imageAttachments) || state.imageAttachments.length === 0) {
      return [];
    }

    return state.imageAttachments
      .filter(
        (attachment) => attachment && typeof attachment.dataUrl === "string" && attachment.dataUrl
      )
      .map((attachment, index) => ({
        type: "image",
        dataUrl: attachment.dataUrl,
        mimeType: attachment.mimeType || "image/jpeg",
        width: Number.isFinite(attachment.width)
          ? Math.max(1, Math.floor(attachment.width))
          : undefined,
        height: Number.isFinite(attachment.height)
          ? Math.max(1, Math.floor(attachment.height))
          : undefined,
        label:
          typeof attachment.label === "string" && attachment.label.trim()
            ? attachment.label.trim()
            : `User screen crop ${index + 1}`
      }));
  }

  function renderAttachmentStrip() {
    const strip = getAttachmentStrip();
    if (!strip) return;

    strip.innerHTML = "";
    const attachments = Array.isArray(state.imageAttachments)
      ? state.imageAttachments.filter(
          (attachment) =>
            attachment && typeof attachment.dataUrl === "string" && attachment.dataUrl
        )
      : [];

    if (attachments.length === 0) {
      strip.style.display = "none";
      updatePanelAnchorOffset();
      if (state.expanded) resizePanelToContent();
      refreshPromptBarActionStates();
      return;
    }

    strip.style.display = "flex";

    attachments.forEach((attachment, index) => {
      const chip = document.createElement("div");
      Object.assign(chip.style, {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        border: "1px solid rgba(71, 85, 105, 0.85)",
        borderRadius: "10px",
        background: "rgba(15, 23, 42, 0.9)",
        padding: "4px 6px",
        maxWidth: "156px",
        minWidth: "0",
        flexShrink: "0"
      });

      const thumb = document.createElement("img");
      thumb.src = attachment.dataUrl;
      thumb.alt = `Attachment ${index + 1}`;
      Object.assign(thumb.style, {
        width: "32px",
        height: "24px",
        objectFit: "cover",
        borderRadius: "6px",
        border: "1px solid rgba(255, 255, 255, 0.16)",
        flexShrink: "0"
      });

      const text = document.createElement("span");
      text.textContent =
        typeof attachment.label === "string" && attachment.label.trim()
          ? attachment.label.trim()
          : `Screenshot ${index + 1}`;
      Object.assign(text.style, {
        color: "rgba(226, 232, 240, 0.95)",
        fontSize: "11px",
        lineHeight: "1.2",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        minWidth: "0"
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
        color: "#e2e8f0",
        background: "rgba(51, 65, 85, 0.9)",
        lineHeight: "1",
        padding: "0",
        fontSize: "11px",
        flexShrink: "0"
      });
      removeBtn.addEventListener("pointerdown", (event) => event.stopPropagation());
      removeBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!Array.isArray(state.imageAttachments)) {
          state.imageAttachments = [];
        } else {
          state.imageAttachments = state.imageAttachments.filter((_, i) => i !== index);
        }
        renderAttachmentStrip();
      });

      chip.appendChild(thumb);
      chip.appendChild(text);
      chip.appendChild(removeBtn);
      strip.appendChild(chip);
    });

    updatePanelAnchorOffset();
    if (state.expanded) resizePanelToContent();
    refreshPromptBarActionStates();
  }

  function setImageAttachment(attachment) {
    if (!attachment || typeof attachment.dataUrl !== "string") return;
    if (!Array.isArray(state.imageAttachments)) {
      state.imageAttachments = [];
    }
    state.imageAttachments = [...state.imageAttachments, attachment];
    renderAttachmentStrip();
  }

  function clearImageAttachment() {
    state.imageAttachments = [];
    renderAttachmentStrip();
  }

  function setFeatureTrayOpen(open) {
    const tray = getFeatureTray();
    const toggle = getFeatureToggle();
    const nextOpen = Boolean(open);
    state.featureTrayOpen = nextOpen;

    if (!tray || !toggle) return;

    tray.style.maxWidth = nextOpen ? `${FEATURE_TRAY_OPEN_WIDTH_PX}px` : "0px";
    tray.style.opacity = nextOpen ? "1" : "0";
    tray.style.transform = nextOpen ? "translateX(0)" : "translateX(-8px)";
    tray.style.marginRight = nextOpen ? "2px" : "0";
    toggle.style.background = nextOpen ? "rgba(99, 102, 241, 0.40)" : "rgba(99, 102, 241, 0.20)";
    toggle.style.borderColor = nextOpen
      ? "rgba(191, 219, 254, 0.45)"
      : "rgba(148, 163, 184, 0.28)";
    toggle.setAttribute("aria-expanded", nextOpen ? "true" : "false");
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, Math.max(0, Math.floor(ms)));
    });
  }

  function isExtensionContextInvalidatedError(errorOrMessage) {
    const raw =
      typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorOrMessage && typeof errorOrMessage.message === "string"
          ? errorOrMessage.message
          : "";
    return /Extension context invalidated/i.test(raw);
  }

  function triggerInvalidContextRecovery() {
    if (state.invalidContextRecoveryTriggered) return;
    state.invalidContextRecoveryTriggered = true;
    state.pending = false;
    state.agentRunning = false;
    state.agentStopRequested = true;

    if (!state.expanded) {
      expandPanel();
    }
    setPanelContent(
      "La extensión se ha actualizado y este contexto quedó obsoleto. Reconectando...",
      { error: true, chainOfThought: [] }
    );

    setTimeout(() => {
      window.location.reload();
    }, 650);
  }

  function sendRuntimeMessage(message, callback) {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError && isExtensionContextInvalidatedError(runtimeError.message)) {
          triggerInvalidContextRecovery();
        }
        callback(response, runtimeError || null);
      });
    } catch (error) {
      if (isExtensionContextInvalidatedError(error)) {
        triggerInvalidContextRecovery();
      }
      callback(null, error instanceof Error ? error : new Error(String(error)));
    }
  }

  function saveDirectOpenAiApiKey(apiKey) {
    return new Promise((resolve, reject) => {
      sendRuntimeMessage(
        { type: SET_OPENAI_CONFIG_MESSAGE_TYPE, apiKey },
        (response, runtimeError) => {
          if (runtimeError) {
            reject(
              new Error("No se pudo guardar la API key en la extensión. Recárgala e inténtalo.")
            );
            return;
          }
          if (!response || response.ok !== true) {
            reject(
              new Error(
                response && typeof response.error === "string"
                  ? response.error
                  : "No se pudo guardar la API key en la extensión."
              )
            );
            return;
          }
          resolve();
        }
      );
    });
  }

  async function promptAndSaveDirectOpenAiApiKey() {
    const raw = window.prompt(
      "No hay backend local disponible. Pega tu OpenAI API key para usar modo directo desde la extensión (se guardará en Chrome local):"
    );
    if (raw === null) return false;

    const apiKey = typeof raw === "string" ? raw.trim() : "";
    if (!apiKey) {
      throw new Error("No se introdujo ninguna API key.");
    }

    await saveDirectOpenAiApiKey(apiKey);
    return true;
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

  function extractGoalKeywords(goal) {
    const text = normalizeText(goal || "").toLowerCase();
    if (!text) return [];

    const tokens = text
      .split(/[^a-z0-9áéíóúñüçàèìòùäëïöß]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);
    if (tokens.length === 0) return [];

    const stopwords = new Set([
      "para",
      "por",
      "con",
      "sin",
      "que",
      "this",
      "that",
      "from",
      "into",
      "find",
      "buscar",
      "encuentra",
      "haz",
      "luego",
      "scroll",
      "hacia",
      "abajo",
      "arriba",
      "the",
      "and",
      "then",
      "latest",
      "email",
      "correo"
    ]);

    const unique = [];
    for (const token of tokens) {
      if (stopwords.has(token)) continue;
      if (!unique.includes(token)) unique.push(token);
      if (unique.length >= 8) break;
    }

    return unique;
  }

  function computeGoalMatchScore(labelText, keywords) {
    if (!Array.isArray(keywords) || keywords.length === 0) return 0;
    const label = normalizeText(labelText || "").toLowerCase();
    if (!label) return 0;
    let score = 0;
    keywords.forEach((keyword) => {
      if (!keyword) return;
      if (label.includes(keyword)) {
        score += keyword.length >= 6 ? 2 : 1;
      }
    });
    return score;
  }

  function collectActionableElements(goal = "") {
    const goalKeywords = extractGoalKeywords(goal);
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
      const name = truncateText(normalizeText(element.getAttribute("name") || ""), 60);
      const idAttr = truncateText(normalizeText(element.getAttribute("id") || ""), 60);
      const label = `${text} ${placeholder} ${name}`.toLowerCase();
      const goalMatchScore = computeGoalMatchScore(`${text} ${placeholder} ${name} ${idAttr}`, goalKeywords);
      const likelySearch =
        /\b(search|buscar|filter|filtrar|query|lookup)\b/.test(label) ||
        type === "search" ||
        name === "q" ||
        name === "query";

      elements.push({
        id: `el_${elements.length + 1}`,
        tag,
        selector: selectorText,
        text,
        placeholder,
        type,
        role,
        name,
        idAttr,
        goalMatchScore,
        likelySearch,
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      });

      if (elements.length >= 84) break;
    }

    elements.sort((a, b) => {
      if (b.goalMatchScore !== a.goalMatchScore) {
        return b.goalMatchScore - a.goalMatchScore;
      }
      if (a.likelySearch !== b.likelySearch) {
        return a.likelySearch ? -1 : 1;
      }
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    return elements.slice(0, 28);
  }

  function requestAgentStep(
    goal,
    pageContext,
    actionableElements,
    history,
    metadata = null,
    screenshot = null
  ) {
    return new Promise((resolve, reject) => {
      sendRuntimeMessage(
        {
          type: AGENT_MESSAGE_TYPE,
          goal,
          pageContext,
          actionableElements,
          history,
          metadata,
          screenshot
        },
        (response, runtimeError) => {
          if (runtimeError) {
            if (isExtensionContextInvalidatedError(runtimeError)) {
              reject(new Error("Extension context invalidated."));
              return;
            }
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

  function dispatchSyntheticEnter(target) {
    if (!(target instanceof HTMLElement)) return;
    const eventInit = { key: "Enter", code: "Enter", bubbles: true, cancelable: true };
    target.dispatchEvent(new KeyboardEvent("keydown", eventInit));
    target.dispatchEvent(new KeyboardEvent("keypress", eventInit));
    target.dispatchEvent(new KeyboardEvent("keyup", eventInit));

    const form = target instanceof HTMLInputElement ? target.form : target.closest("form");
    if (form instanceof HTMLFormElement) {
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
    }
  }

  function shouldAutoSubmitAfterTyping(action, entry, goal) {
    if (action.submit === true) return true;
    const label = `${entry?.text || ""} ${entry?.placeholder || ""} ${entry?.name || ""}`.toLowerCase();
    const goalText = normalizeText(goal || "").toLowerCase();
    const isSearchLikeGoal =
      /\b(search|find|lookup|buscar|encuentra|correo|email|inbox|github|repo|repositorio)\b/.test(
        goalText
      );
    const isSearchLikeTarget =
      Boolean(entry?.likelySearch) ||
      /\b(search|buscar|query|find|lookup|filtrar|filter)\b/.test(label);
    return isSearchLikeGoal && isSearchLikeTarget;
  }

  function isRefreshLikeActionTarget(entry) {
    const label = normalizeText(
      `${entry?.text || ""} ${entry?.placeholder || ""} ${entry?.name || ""} ${entry?.idAttr || ""}`
    ).toLowerCase();
    return /\b(refresh|reload|recargar|actualizar|actualitza)\b/.test(label);
  }

  function isDangerousNavigationElement(element, entry, goal) {
    if (!(element instanceof HTMLElement)) return false;
    if (goalExplicitlyRequestsRefresh(goal)) return false;

    const refreshKeywords = /\b(refresh|reload|recargar|actualizar|actualitza)\b/;
    const textParts = [
      entry?.text || "",
      entry?.placeholder || "",
      entry?.name || "",
      entry?.idAttr || "",
      element.getAttribute("aria-label") || "",
      element.getAttribute("title") || "",
      element.getAttribute("data-tooltip") || "",
      element.id || "",
      element.className || "",
      element.textContent || ""
    ];
    const label = normalizeText(textParts.join(" ")).toLowerCase();
    if (refreshKeywords.test(label)) {
      return true;
    }

    const onclickAttr = normalizeText(element.getAttribute("onclick") || "").toLowerCase();
    if (/(location\.reload|window\.location\.reload|history\.go\(0\))/i.test(onclickAttr)) {
      return true;
    }

    const anchor = element.closest("a");
    if (anchor instanceof HTMLAnchorElement) {
      const href = anchor.getAttribute("href") || "";
      const normalizedHref = normalizeText(href).toLowerCase();
      if (!normalizedHref) return false;
      if (refreshKeywords.test(normalizedHref)) return true;

      const absoluteHref = anchor.href || "";
      if (absoluteHref && absoluteHref === window.location.href) {
        return true;
      }
    }

    return false;
  }

  function goalExplicitlyRequestsRefresh(goal) {
    const text = normalizeText(goal || "").toLowerCase();
    return /\b(refresh|reload|recargar|actualizar|actualitza)\b/.test(text);
  }

  async function executeAgentAction(action, actionableElements, goal = "") {
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
      const { element, entry } = resolved;
      if (
        (isRefreshLikeActionTarget(entry) || isDangerousNavigationElement(element, entry, goal)) &&
        !goalExplicitlyRequestsRefresh(goal)
      ) {
        return {
          ok: false,
          summary: "Blocked clicking a refresh-like control to avoid losing page context."
        };
      }
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
      const { element, entry } = resolved;
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

      if (shouldAutoSubmitAfterTyping(action, entry, goal)) {
        dispatchSyntheticEnter(element);
      }
      await sleep(300);
      return { ok: true, summary: "Typed into target element." };
    }

    if (type === "press_enter") {
      const resolved = resolveActionableElement(action.elementId, actionableElements);
      const target = resolved?.element || document.activeElement;
      if (!(target instanceof HTMLElement)) {
        return { ok: false, summary: "No valid target for Enter key action." };
      }
      target.focus();
      dispatchSyntheticEnter(target);
      await sleep(260);
      return { ok: true, summary: "Pressed Enter on target element." };
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

  function toAgentActionSignature(action) {
    if (!action || typeof action.type !== "string") return "unknown";
    const parts = [action.type];
    if (typeof action.elementId === "string" && action.elementId) {
      parts.push(`el=${action.elementId}`);
    }
    if (typeof action.direction === "string" && action.direction) {
      parts.push(`dir=${action.direction}`);
    }
    if (typeof action.text === "string" && action.text.trim()) {
      parts.push(`text=${truncateText(normalizeText(action.text), 80)}`);
    }
    return parts.join("|");
  }

  function buildAgentContextFingerprint(pageContext) {
    if (!pageContext || typeof pageContext !== "object") return "";
    const visible = truncateText(normalizeText(pageContext.visibleText || ""), 1400);
    const selected = truncateText(normalizeText(pageContext.selectionText || ""), 260);
    const active = truncateText(normalizeText(pageContext.activeElementText || ""), 260);
    const title = truncateText(normalizeText(pageContext.title || ""), 180);
    return [title, selected, active, visible].join("||");
  }

  function firstMatchIndex(text, patterns) {
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match && Number.isFinite(match.index)) {
        return match.index;
      }
    }
    return -1;
  }

  function buildScriptedScrollActions(goal) {
    const text = normalizeText(goal || "").toLowerCase();
    if (!text) return [];

    const downPatterns = [
      /\bscroll\s*down\b/,
      /\bscroll(?:ea|ear)?[^.]{0,28}\babajo\b/,
      /\bdesplaz(?:a|ar|ate|arte)[^.]{0,28}\babajo\b/,
      /\bhacia\s+abajo\b/,
      /\bbaja(?:r)?(?:\s+la\s+pantalla)?\b/
    ];
    const upPatterns = [
      /\bscroll\s*up\b/,
      /\bscroll(?:ea|ear)?[^.]{0,28}\barriba\b/,
      /\bdesplaz(?:a|ar|ate|arte)[^.]{0,28}\barriba\b/,
      /\bhacia\s+arriba\b/,
      /\bsube(?:r)?(?:\s+la\s+pantalla)?\b/
    ];

    const downIndex = firstMatchIndex(text, downPatterns);
    const upIndex = firstMatchIndex(text, upPatterns);
    const hasDown = downIndex >= 0;
    const hasUp = upIndex >= 0;

    if (!hasDown && !hasUp) return [];

    if (hasDown && hasUp) {
      return downIndex <= upIndex
        ? [
            { type: "scroll", direction: "down", amount: 640 },
            { type: "scroll", direction: "up", amount: 640 }
          ]
        : [
            { type: "scroll", direction: "up", amount: 640 },
            { type: "scroll", direction: "down", amount: 640 }
          ];
    }

    if (hasDown) {
      return [{ type: "scroll", direction: "down", amount: 640 }];
    }

    return [{ type: "scroll", direction: "up", amount: 640 }];
  }

  function buildAgentFinalPrompt(goal, history, logs, finishMessage, terminationReason) {
    const stepsText = (Array.isArray(history) ? history : [])
      .slice(-10)
      .map((item) => {
        const stepNumber = Number.isFinite(item.step) ? item.step : "?";
        const action = truncateText(item.actionSignature || item.action || "unknown", 160);
        const result = truncateText(item.result || "no result", 220);
        return `Step ${stepNumber}: ${action} -> ${result}`;
      })
      .join("\n");

    const logsText = (Array.isArray(logs) ? logs : [])
      .slice(-8)
      .map((line) => truncateText(line, 220))
      .join("\n");

    const finishText = truncateText(finishMessage || "", 500) || "No explicit finish message.";

    return [
      "You are writing the final user-facing response for a browser agent run.",
      "Respond in the same language as the user goal.",
      "Do not use markdown syntax like #, **, or code fences.",
      "Be concrete and concise, with this structure:",
      "Result: ...",
      "Evidence: ...",
      "Next step: ...",
      "If not fully completed, say it clearly and explain what is missing.",
      "",
      `[Termination reason] ${terminationReason || "unknown"}`,
      `[Model finish message] ${finishText}`,
      "",
      "[User goal]",
      truncateText(goal || "", 900) || "No goal.",
      "",
      "[Executed steps]",
      stepsText || "No executed steps.",
      "",
      "[Recent agent logs]",
      logsText || "No logs."
    ].join("\n");
  }

  async function finalizeAgentRun(goal, history, logs, finishMessage, terminationReason) {
    setAgentStatus("Agent: writing final answer...");
    setPanelContent("Agent finished actions. Preparing final answer...", {
      muted: true,
      chainOfThought: buildAgentChainFromHistory(logs)
    });

    const finalPrompt = buildAgentFinalPrompt(
      goal,
      history,
      logs,
      finishMessage,
      terminationReason
    );
    const finalPageContext = buildPageContext();

    try {
      return await requestChatAnswer(finalPrompt, finalPageContext, []);
    } catch (error) {
      const fallbackText =
        truncateText(finishMessage || "", 700) ||
        "Agent run completed without a final summary. Try refining the instruction.";
      return {
        text: fallbackText,
        chainOfThought: buildAgentChainFromHistory(logs)
      };
    }
  }

  async function captureAgentViewportSnapshot() {
    try {
      const fullDataUrl = await withTemporarilyHiddenToolboxUi(() => requestVisibleTabCapture());
      const source = await loadImageFromDataUrl(fullDataUrl);
      const resizeFactor = Math.min(
        1,
        AGENT_SNAPSHOT_MAX_SIDE_PX / Math.max(source.naturalWidth, source.naturalHeight)
      );
      const outWidth = Math.max(1, Math.round(source.naturalWidth * resizeFactor));
      const outHeight = Math.max(1, Math.round(source.naturalHeight * resizeFactor));

      const canvas = document.createElement("canvas");
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return null;
      }

      ctx.drawImage(source, 0, 0, outWidth, outHeight);
      const mimeType = "image/jpeg";
      const dataUrl = canvas.toDataURL(mimeType, AGENT_SNAPSHOT_QUALITY);
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
        return null;
      }

      return {
        mimeType,
        dataUrl,
        width: outWidth,
        height: outHeight
      };
    } catch (error) {
      return null;
    }
  }

  function buildAgentChainFromHistory(history) {
    if (!Array.isArray(history) || history.length === 0) return [];
    return history.slice(-4).map((item, index) => ({
      title: `Agent update ${index + 1}`,
      items: [item]
    }));
  }

  function setAgentModeEnabled(enabled) {
    state.agentModeEnabled = Boolean(enabled);

    const buttons = document.querySelectorAll('[data-toolbox-feature="agent_mode"]');
    buttons.forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.classList.toggle("sp-agent-mode-btn--active", state.agentModeEnabled);
    });

    const input = getInput();
    if (input) {
      input.placeholder = state.agentModeEnabled
        ? "Agent mode: describe the task step-by-step..."
        : "Ask anything…";
    }

    refreshPromptBarActionStates();
  }

  async function runAgentTask(goal) {
    const input = getInput();
    if (!input || state.pending || state.agentRunning) return;

    const requestId = ++state.requestId;
    state.pending = true;
    state.agentRunning = true;
    state.agentStopRequested = false;
    input.disabled = true;
    refreshPromptBarActionStates();

    if (!state.expanded) expandPanel();

    const logs = [];
    const history = [];
    const scriptedActions = buildScriptedScrollActions(goal);
    const goalKeywords = extractGoalKeywords(goal);
    let latestAgentScreenshot = null;
    let latestScreenshotStep = 0;
    let stallCount = 0;
    let lastActionSignature = "";
    let finishMessage = "";
    let terminationReason = "";
    if (scriptedActions.length > 0) {
      const labels = scriptedActions
        .map((action) => (action.direction === "up" ? "scroll up" : "scroll down"))
        .join(" -> ");
      trimAgentLogs(logs, `Scripted user actions: ${labels}.`);
    }
    setPanelContent("Agent mode started. Planning actions on this webpage...", {
      muted: true,
      chainOfThought: []
    });
    setAgentStatus("Agent: planning first step...");

    try {
      for (let step = 1; step <= AGENT_MAX_STEPS; step += 1) {
        if (state.agentStopRequested || requestId !== state.requestId) {
          throw new Error("Agent execution stopped.");
        }

        if (scriptedActions.length > 0) {
          const scriptedAction = scriptedActions.shift();
          if (!scriptedAction) continue;
          const actionSignature = toAgentActionSignature(scriptedAction);
          trimAgentLogs(
            logs,
            `Step ${step} plan: Executing explicit user instruction (${scriptedAction.direction}).`
          );
          setAgentStatus(
            `Agent step ${step}/${AGENT_MAX_STEPS}: scripted scroll ${scriptedAction.direction}`
          );
          const execution = await executeAgentAction(scriptedAction, [], goal);
          history.push({
            step,
            action: scriptedAction.type,
            actionSignature,
            result: execution.summary
          });
          trimAgentLogs(
            logs,
            execution.ok
              ? `Step ${step} executed: ${execution.summary}`
              : `Step ${step} warning: ${execution.summary}`
          );
          if (!execution.ok) {
            stallCount += 1;
          } else {
            stallCount = 0;
          }
          lastActionSignature = actionSignature;

          setPanelContent(logs.join("\n"), {
            muted: true,
            chainOfThought: buildAgentChainFromHistory(logs)
          });
          continue;
        }

        const pageContext = buildPageContext();
        const actionableElements = collectActionableElements(goal);
        const beforeFingerprint = buildAgentContextFingerprint(pageContext);
        const historyPayload = history.slice(-6).map((item) => ({
          step: item.step,
          action: item.actionSignature || item.action,
          result: item.result
        }));
        const remainingSteps = AGENT_MAX_STEPS - step;
        const forceFinish =
          stallCount >= AGENT_STALL_FORCE_FINISH_THRESHOLD || remainingSteps <= 1;
        const shouldCaptureSnapshot =
          step === 1 ||
          stallCount > 0 ||
          step - latestScreenshotStep >= AGENT_SNAPSHOT_MIN_STEP_INTERVAL;

        if (shouldCaptureSnapshot) {
          const snapshot = await captureAgentViewportSnapshot();
          if (snapshot) {
            latestAgentScreenshot = snapshot;
            latestScreenshotStep = step;
          }
        }

        const agentResponse = await requestAgentStep(
          goal,
          pageContext,
          actionableElements,
          historyPayload,
          {
            step,
            maxSteps: AGENT_MAX_STEPS,
            stallCount,
            forceFinish,
            goalKeywords,
            hasScreenshot: Boolean(latestAgentScreenshot)
          },
          latestAgentScreenshot
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
          finishMessage =
            typeof agentResponse.message === "string" && agentResponse.message.trim()
              ? agentResponse.message.trim()
              : "Task completed.";
          trimAgentLogs(logs, `Done: ${finishMessage}`);
          terminationReason = forceFinish ? "forced_finish" : "model_finish";
          break;
        }

        const actionSignature = toAgentActionSignature(action);
        const execution = await executeAgentAction(action, actionableElements, goal);
        const afterContext = buildPageContext();
        const afterFingerprint = buildAgentContextFingerprint(afterContext);
        const pageChanged = afterFingerprint !== beforeFingerprint;
        const repeatedAction = actionSignature === lastActionSignature;
        const noProgress = !execution.ok || (!pageChanged && repeatedAction);

        if (noProgress || (actionType === "wait" && !pageChanged)) {
          stallCount += 1;
        } else {
          stallCount = 0;
        }

        lastActionSignature = actionSignature;
        history.push({
          step,
          action: actionType,
          actionSignature,
          result: execution.summary
        });
        trimAgentLogs(
          logs,
          execution.ok
            ? `Step ${step} executed: ${execution.summary}`
            : `Step ${step} warning: ${execution.summary}`
        );
        if (stallCount >= AGENT_STALL_FORCE_FINISH_THRESHOLD) {
          trimAgentLogs(
            logs,
            `Step ${step} notice: Agent is stalling (${stallCount}). Forcing closure soon.`
          );
        }

        setPanelContent(logs.join("\n"), {
          muted: true,
          chainOfThought: buildAgentChainFromHistory(logs)
        });
      }

      if (!terminationReason) {
        terminationReason = "max_steps";
        finishMessage = "Agent reached max steps without explicit finish.";
        trimAgentLogs(logs, `Done: ${finishMessage}`);
      }

      if (state.agentStopRequested || requestId !== state.requestId) {
        throw new Error("Agent execution stopped.");
      }

      const finalResult = await finalizeAgentRun(
        goal,
        history,
        logs,
        finishMessage,
        terminationReason
      );
      if (state.agentStopRequested || requestId !== state.requestId) {
        throw new Error("Agent execution stopped.");
      }
      setPanelContent(finalResult.text, {
        chainOfThought: finalResult.chainOfThought
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Agent mode failed unexpectedly.";
      if (message === "Agent execution stopped.") {
        setPanelContent("Agent stopped.", { muted: true, chainOfThought: [] });
      } else {
        setPanelContent(`Error: ${message}`, { error: true, chainOfThought: [] });
      }
    } finally {
      removeAgentOverlay();
      state.agentRunning = false;
      state.pending = false;
      if (requestId === state.requestId) {
        input.disabled = false;
        refreshPromptBarActionStates();
        input.focus();
        input.select();
      } else {
        refreshPromptBarActionStates();
      }
    }
  }

  function requestVisibleTabCapture() {
    return new Promise((resolve, reject) => {
      sendRuntimeMessage({ type: CAPTURE_MESSAGE_TYPE }, (response, runtimeError) => {
        if (runtimeError) {
          if (isExtensionContextInvalidatedError(runtimeError)) {
            reject(new Error("Extension context invalidated."));
            return;
          }
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
    ensurePointerTracker();
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
    overlay.style.setProperty("cursor", "crosshair", "important");

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
    selection.style.setProperty("cursor", "crosshair", "important");

    const cursorVisual = document.createElement("div");
    cursorVisual.id = SCREENSHOT_CURSOR_VISUAL_ID;
    Object.assign(cursorVisual.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: "20px",
      height: "20px",
      borderRadius: "9999px",
      border: "2px solid rgba(125, 211, 252, 0.98)",
      background: "rgba(14, 116, 144, 0.22)",
      boxShadow: "0 0 0 8px rgba(56, 189, 248, 0.12)",
      transform: "translate(-9999px, -9999px)",
      pointerEvents: "none"
    });

    const cursorDot = document.createElement("div");
    Object.assign(cursorDot.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: "4px",
      height: "4px",
      borderRadius: "9999px",
      background: "rgba(224, 242, 254, 0.98)",
      transform: "translate(-50%, -50%)"
    });
    cursorVisual.appendChild(cursorDot);

    function updateCursorVisual(x, y) {
      const clampedX = clamp(Math.round(Number(x) || 0), 0, Math.max(0, window.innerWidth));
      const clampedY = clamp(Math.round(Number(y) || 0), 0, Math.max(0, window.innerHeight));
      cursorVisual.style.transform = `translate(${clampedX - 10}px, ${clampedY - 10}px)`;
    }

    overlay.appendChild(helpText);
    overlay.appendChild(selection);
    overlay.appendChild(cursorVisual);
    mountTarget.appendChild(overlay);
    state.screenCaptureInProgress = true;
    refreshPromptBarActionStates();

    updateCursorVisual(
      Number.isFinite(state.lastPointerX) ? state.lastPointerX : Math.round(window.innerWidth / 2),
      Number.isFinite(state.lastPointerY) ? state.lastPointerY : Math.round(window.innerHeight / 2)
    );

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
      rememberPointerPosition(event);
      updateCursorVisual(event.clientX, event.clientY);
      selecting = true;
      pointerId = event.pointerId;
      overlay.setPointerCapture(event.pointerId);
      startX = event.clientX;
      startY = event.clientY;
      currentRect = toRect(startX, startY, startX, startY);
      renderRect(currentRect);
    };

    const onPointerMove = (event) => {
      rememberPointerPosition(event);
      updateCursorVisual(event.clientX, event.clientY);
      if (!selecting || event.pointerId !== pointerId) return;
      event.preventDefault();
      currentRect = toRect(startX, startY, event.clientX, event.clientY);
      renderRect(currentRect);
    };

    const onPointerEnd = (event) => {
      if (!selecting || event.pointerId !== pointerId) return;
      event.preventDefault();
      rememberPointerPosition(event);
      updateCursorVisual(event.clientX, event.clientY);
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
      refreshPromptBarActionStates();
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
      #${BAR_CONTAINER_ID} .sp-shell {
        --sp-slate-950: hsl(222.2 84% 4.9%);
        --sp-slate-900: hsl(222.2 47.4% 11.2%);
        --sp-slate-800: hsl(215.4 31.8% 16.9%);
        --sp-slate-700: hsl(215.3 19.3% 34.5%);
        --sp-accent: hsl(24.6 95% 53.1%);
        --sp-accent-hover: hsl(21.8 90% 48%);
        --sp-text: hsl(210 40% 96%);
        --sp-text-dim: hsl(215 20.2% 65.1%);
        width: 100%;
        min-height: ${BAR_HEIGHT_PX}px;
        background: var(--sp-slate-950);
        border: 1px solid hsl(215.4 31.8% 16.9% / 0.9);
        border-radius: 18px;
        opacity: 0.96;
        box-shadow:
          0 12px 28px hsl(222.2 84% 4.9% / 0.55),
          0 3px 10px hsl(222.2 84% 4.9% / 0.38);
        overflow: hidden;
        font-family: Inter, "Segoe UI", system-ui, sans-serif;
        font-size: 13px;
        color: var(--sp-text);
        display: flex;
        flex-direction: column;
      }

      #${BAR_CONTAINER_ID} .sp-shell * {
        box-sizing: border-box;
      }

      #${BAR_CONTAINER_ID} .sp-bar {
        display: flex;
        align-items: center;
        gap: 9px;
        width: 100%;
        padding: 9px 10px;
      }

      #${BAR_CONTAINER_ID} .sp-logo {
        width: 24px;
        height: 24px;
        border-radius: 7px;
        object-fit: contain;
        display: block;
        flex-shrink: 0;
      }

      #${BAR_CONTAINER_ID} .sp-agent-mode-btn,
      #${BAR_CONTAINER_ID} .sp-image-btn {
        flex-shrink: 0;
        width: 30px;
        height: 30px;
        border: none;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background: transparent;
        color: var(--sp-text-dim);
        transition: background 0.11s ease, color 0.11s ease, box-shadow 0.11s ease;
        padding: 0;
        margin: 0;
        position: relative;
      }

      #${BAR_CONTAINER_ID} .sp-agent-mode-btn:hover:not(:disabled),
      #${BAR_CONTAINER_ID} .sp-image-btn:hover:not(:disabled) {
        background: hsl(215.4 31.8% 16.9% / 0.95);
        color: var(--sp-text);
      }

      #${BAR_CONTAINER_ID} .sp-agent-mode-btn:disabled,
      #${BAR_CONTAINER_ID} .sp-image-btn:disabled {
        color: rgba(255,255,255,0.22);
        cursor: not-allowed;
      }

      #${BAR_CONTAINER_ID} .sp-agent-mode-btn--active {
        background: hsl(24.6 95% 53.1% / 0.14);
        color: hsl(24.6 95% 62%);
        box-shadow: inset 0 0 0 1px hsl(24.6 95% 53.1% / 0.18);
      }

      #${BAR_CONTAINER_ID} .sp-input-row {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        background: hsl(222.2 47.4% 11.2% / 0.95);
        box-shadow: inset 0 0 0 1px hsl(215.4 31.8% 16.9% / 0.9);
        border-radius: 11px;
        transition: background 0.12s ease, box-shadow 0.12s ease;
      }

      #${BAR_CONTAINER_ID} .sp-input-row:focus-within {
        background: hsl(222.2 47.4% 12.6% / 0.98);
        box-shadow: inset 0 0 0 1px hsl(215.3 19.3% 34.5% / 0.55);
      }

      #${BAR_CONTAINER_ID} .sp-input {
        flex: 1;
        min-width: 0;
        background: transparent;
        color: var(--sp-text);
        border: none;
        outline: none;
        padding: 8px 10px;
        font-size: 13.5px;
        font-family: inherit;
        line-height: 1.5;
        display: block;
        margin: 0;
      }

      #${BAR_INPUT_ID}::placeholder {
        color: var(--sp-text-dim);
      }

      #${BAR_CONTAINER_ID} .sp-input:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      #${BAR_CONTAINER_ID} .sp-image-btn--active {
        background: hsl(24.6 95% 53.1% / 0.14);
        color: hsl(24.6 95% 62%);
      }

      #${BAR_CONTAINER_ID} .sp-image-badge {
        position: absolute;
        top: -3px;
        right: -2px;
        min-width: 15px;
        height: 15px;
        border-radius: 999px;
        padding: 0 4px;
        background: var(--sp-accent);
        color: #fff;
        font-size: 9px;
        line-height: 15px;
        font-weight: 700;
        text-align: center;
        box-shadow: 0 0 0 2px var(--sp-slate-950);
      }

      #${BAR_CONTAINER_ID} .sp-send-btn {
        flex-shrink: 0;
        width: 30px;
        height: 30px;
        margin-right: 3px;
        border: none;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background: var(--sp-accent);
        color: #fff;
        transition: background 0.11s ease, color 0.11s ease;
        padding: 0;
      }

      #${BAR_CONTAINER_ID} .sp-send-btn:hover:not(:disabled):not(.sp-send-off) {
        background: var(--sp-accent-hover);
      }

      #${BAR_CONTAINER_ID} .sp-send-off {
        background: hsl(24.6 95% 53.1% / 0.48) !important;
        color: rgba(255, 255, 255, 0.84) !important;
        cursor: not-allowed;
      }

      #${BAR_CONTAINER_ID} .sp-agent-mode-btn svg,
      #${BAR_CONTAINER_ID} .sp-image-btn svg,
      #${BAR_CONTAINER_ID} .sp-send-btn svg {
        pointer-events: none;
      }

      #${BAR_CONTAINER_ID} .sp-attachment-strip {
        scrollbar-width: thin;
      }

      #${BAR_CONTAINER_ID} .sp-attachment-strip::-webkit-scrollbar {
        height: 6px;
      }

      #${BAR_CONTAINER_ID} .sp-attachment-strip::-webkit-scrollbar-thumb {
        background: rgba(71, 85, 105, 0.8);
        border-radius: 999px;
      }

      #${BAR_CONTAINER_ID} .sp-attachment-strip::-webkit-scrollbar-track {
        background: transparent;
      }

      #${PANEL_ANSWER_ID} {
        white-space: normal !important;
        overflow-wrap: anywhere;
      }

      #${PANEL_ANSWER_ID} p {
        margin: 0 0 14px;
      }

      #${PANEL_ANSWER_ID} p:last-child {
        margin-bottom: 0;
      }

      #${PANEL_ANSWER_ID} h1,
      #${PANEL_ANSWER_ID} h2,
      #${PANEL_ANSWER_ID} h3,
      #${PANEL_ANSWER_ID} h4,
      #${PANEL_ANSWER_ID} h5,
      #${PANEL_ANSWER_ID} h6 {
        margin: 14px 0 10px;
        line-height: 1.25;
        font-weight: 700;
        color: rgba(248, 250, 252, 0.98);
      }

      #${PANEL_ANSWER_ID} h1:first-child,
      #${PANEL_ANSWER_ID} h2:first-child,
      #${PANEL_ANSWER_ID} h3:first-child,
      #${PANEL_ANSWER_ID} h4:first-child,
      #${PANEL_ANSWER_ID} h5:first-child,
      #${PANEL_ANSWER_ID} h6:first-child {
        margin-top: 0;
      }

      #${PANEL_ANSWER_ID} h1 { font-size: 1.3em; }
      #${PANEL_ANSWER_ID} h2 { font-size: 1.2em; }
      #${PANEL_ANSWER_ID} h3 { font-size: 1.1em; }
      #${PANEL_ANSWER_ID} h4 { font-size: 1.02em; }
      #${PANEL_ANSWER_ID} h5,
      #${PANEL_ANSWER_ID} h6 { font-size: 0.96em; }

      #${PANEL_ANSWER_ID} ul,
      #${PANEL_ANSWER_ID} ol {
        margin: 0 0 14px;
        padding-left: 22px;
      }

      #${PANEL_ANSWER_ID} li {
        margin: 0 0 7px;
      }

      #${PANEL_ANSWER_ID} li:last-child {
        margin-bottom: 0;
      }

      #${PANEL_ANSWER_ID} strong {
        color: rgba(248, 250, 252, 0.98);
        font-weight: 700;
      }

      #${BAR_CONTAINER_ID} .sp-thinking {
        display: block;
        min-height: 0;
        padding: 2px 0 0;
      }

      #${BAR_CONTAINER_ID} .sp-thinking-label {
        display: inline-block;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.01em;
        color: rgba(226, 232, 240, 0.36);
        background-image: linear-gradient(
          110deg,
          rgba(226, 232, 240, 0.28) 0%,
          rgba(226, 232, 240, 0.45) 30%,
          rgba(255, 255, 255, 0.98) 46%,
          rgba(226, 232, 240, 0.45) 62%,
          rgba(226, 232, 240, 0.28) 100%
        );
        background-size: 230% 100%;
        background-position: 140% 0;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: toolboxTextShimmer 1.8s linear infinite;
      }

      @keyframes toolboxTextShimmer {
        0% {
          background-position: 140% 0;
        }
        100% {
          background-position: -40% 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${BAR_CONTAINER_ID} .sp-thinking-label {
          animation: none;
          background-position: 50% 0;
        }
      }

      #${PANEL_ID} {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      #${PANEL_ID}::-webkit-scrollbar {
        width: 0;
        height: 0;
      }

      #${BAR_CONTAINER_ID} button:focus-visible,
      #${BAR_CONTAINER_ID} .sp-image-btn:focus-visible,
      #${BAR_CONTAINER_ID} .sp-send-btn:focus-visible {
        outline: 2px solid hsl(24.6 95% 53.1% / 0.55);
        outline-offset: 1px;
      }

      #${BAR_CONTAINER_ID} .sp-input:focus-visible {
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

  function appendInlineMarkdownLike(parent, text) {
    const source = typeof text === "string" ? text : "";
    if (!source) return;

    let index = 0;
    while (index < source.length) {
      const boldStart = source.indexOf("**", index);
      if (boldStart < 0) {
        parent.appendChild(document.createTextNode(source.slice(index)));
        break;
      }

      const boldEnd = source.indexOf("**", boldStart + 2);
      if (boldEnd < 0) {
        parent.appendChild(document.createTextNode(source.slice(index)));
        break;
      }

      if (boldStart > index) {
        parent.appendChild(document.createTextNode(source.slice(index, boldStart)));
      }

      const strong = document.createElement("strong");
      strong.textContent = source.slice(boldStart + 2, boldEnd);
      parent.appendChild(strong);
      index = boldEnd + 2;
    }
  }

  function renderAnswerMarkdownLike(container, text) {
    if (!(container instanceof HTMLElement)) return;
    const source = typeof text === "string" ? text : "";
    container.innerHTML = "";

    if (!source) return;

    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i += 1;
        continue;
      }

      const headingMatch = /^\s*(#{1,6})\s+(.+?)\s*$/.exec(line);
      if (headingMatch) {
        const level = Math.min(6, Math.max(1, headingMatch[1].length));
        const headingEl = document.createElement(`h${level}`);
        appendInlineMarkdownLike(headingEl, headingMatch[2]);
        container.appendChild(headingEl);
        i += 1;
        continue;
      }

      const unorderedMatch = /^\s*[-*]\s+(.+)$/.exec(line);
      const orderedMatch = /^\s*\d+[.)]\s+(.+)$/.exec(line);

      if (unorderedMatch || orderedMatch) {
        const isOrdered = Boolean(orderedMatch);
        const listEl = document.createElement(isOrdered ? "ol" : "ul");

        while (i < lines.length) {
          const current = lines[i];
          const currentMatch = isOrdered
            ? /^\s*\d+[.)]\s+(.+)$/.exec(current)
            : /^\s*[-*]\s+(.+)$/.exec(current);
          if (!currentMatch) break;

          const li = document.createElement("li");
          appendInlineMarkdownLike(li, currentMatch[1]);
          listEl.appendChild(li);
          i += 1;
        }

        container.appendChild(listEl);
        continue;
      }

      const paragraphLines = [];
      while (i < lines.length) {
        const current = lines[i];
        const currentTrimmed = current.trim();
        if (!currentTrimmed) break;
        if (/^\s*#{1,6}\s+.+$/.test(current)) break;
        if (/^\s*[-*]\s+.+$/.test(current) || /^\s*\d+[.)]\s+.+$/.test(current)) break;
        paragraphLines.push(current);
        i += 1;
      }

      const p = document.createElement("p");
      paragraphLines.forEach((paragraphLine, index) => {
        appendInlineMarkdownLike(p, paragraphLine);
        if (index < paragraphLines.length - 1) {
          p.appendChild(document.createElement("br"));
        }
      });
      container.appendChild(p);
    }
  }

  function computePanelMaxHeight() {
    const bar = getBar();
    const barBottom = bar ? parseFloat(bar.style.bottom) || state.barBottom : state.barBottom;
    const composerHeight = getComposerHeightPx();
    const availableAboveBar = Math.max(
      110,
      window.innerHeight - Math.max(0, barBottom) - composerHeight - 24
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

    const showThinking = muted && steps.length > 0;
    if (!showThinking) {
      chainWrap.style.display = "none";
      return;
    }

    chainWrap.style.display = "flex";

    const thinking = document.createElement("div");
    thinking.className = "sp-thinking";

    const label = document.createElement("span");
    label.className = "sp-thinking-label";
    label.textContent = "Thinking...";

    thinking.appendChild(label);
    chainWrap.appendChild(thinking);
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

    const hasThinkingSteps = normalizeChainOfThought(chainOfThought).length > 0;
    const showThinkingOnly = muted && hasThinkingSteps && !error;

    if (showThinkingOnly) {
      answer.style.display = "none";
    } else {
      answer.style.display = "block";
      renderAnswerMarkdownLike(answer, text);
      answer.style.opacity = muted ? "0.75" : "1";
      answer.style.color = error ? "#fca5a5" : INPUT_COLOR;
      answer.style.borderColor = error ? "rgba(252, 165, 165, 0.45)" : "rgba(255, 255, 255, 0.08)";
      answer.style.background = error ? "rgba(127, 29, 29, 0.26)" : "rgba(15, 23, 42, 0.35)";
    }

    renderChainOfThought(chainOfThought, { muted });

    if (state.expanded) requestAnimationFrame(resizePanelToContent);
  }

  function requestChatAnswer(prompt, pageContext, attachments = []) {
    return new Promise((resolve, reject) => {
      sendRuntimeMessage(
        { type: CHAT_MESSAGE_TYPE, prompt, pageContext, attachments },
        (response, runtimeError) => {
          if (runtimeError) {
            if (isExtensionContextInvalidatedError(runtimeError)) {
              reject(new Error("Extension context invalidated."));
              return;
            }
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
            const error = new Error(errorMessage);
            if (response && typeof response.errorCode === "string") {
              error.code = response.errorCode;
            }
            reject(error);
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
    refreshPromptBarActionStates();
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
      let finalError = error;

      if (
        finalError &&
        typeof finalError === "object" &&
        finalError.code === "EXTENSION_OPENAI_KEY_REQUIRED"
      ) {
        try {
          const saved = await promptAndSaveDirectOpenAiApiKey();
          if (saved) {
            setPanelContent("API key guardada. Reintentando en modo directo...", {
              muted: true,
              chainOfThought: []
            });
            const retryResult = await requestChatAnswer(prompt, pageContext, attachments);
            if (requestId !== state.requestId) return;
            setPanelContent(retryResult.text, { chainOfThought: retryResult.chainOfThought });
            if (hasImageAttachment) clearImageAttachment();
            return;
          }
        } catch (setupError) {
          finalError = setupError;
        }
      }

      if (requestId !== state.requestId) return;
      const message =
        finalError instanceof Error && finalError.message
          ? finalError.message
          : "No se pudo obtener respuesta.";
      setPanelContent(`Error: ${message}`, { error: true, chainOfThought: [] });
    } finally {
      if (requestId !== state.requestId) return;
      state.pending = false;
      input.disabled = false;
      refreshPromptBarActionStates();
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

    /* ── container (positioned draggable host) ── */
    const bar = document.createElement("div");
    bar.id = BAR_CONTAINER_ID;

    const startLeft = Math.max(0, (window.innerWidth - BAR_WIDTH_PX) / 2);
    state.barLeft = startLeft;
    state.barBottom = BAR_BOTTOM_PX;

    Object.assign(bar.style, {
      position: "fixed",
      bottom: `-${getBarDismissOffsetPx()}px`,  /* starts off-screen */
      left: `${startLeft}px`,
      width: `${BAR_WIDTH_PX}px`,
      minHeight: `${BAR_HEIGHT_PX}px`,
      borderRadius: `${BAR_RADIUS_PX}px`,
      background: "transparent",
      zIndex: "2147483647",
      cursor: "grab",
      userSelect: "none",
      touchAction: "none",
      transition: `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`,
      opacity: "0",
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      boxSizing: "border-box"
    });

    const shell = document.createElement("div");
    shell.id = BAR_SHELL_ID;
    shell.className = "sp-shell";
    Object.assign(shell.style, {
      width: "100%",
      position: "relative",
      zIndex: "1"
    });

    const shellBar = document.createElement("div");
    shellBar.className = "sp-bar";

    const logo = document.createElement("img");
    logo.className = "sp-logo";
    logo.src = ICON_SRC;
    logo.alt = "Toolbox";
    logo.draggable = false;

    const agentModeButton = document.createElement("button");
    agentModeButton.type = "button";
    agentModeButton.className = "sp-agent-mode-btn";
    agentModeButton.dataset.toolboxFeature = "agent_mode";
    agentModeButton.setAttribute("aria-label", "Toggle agent mode");
    agentModeButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="7" y="8" width="10" height="9" rx="2"></rect>
        <path d="M12 4v2"></path>
        <path d="M9.5 2.5h5"></path>
        <path d="M9 12h.01"></path>
        <path d="M15 12h.01"></path>
        <path d="M10 15c.7.5 1.3.75 2 .75s1.3-.25 2-.75"></path>
      </svg>
    `;
    agentModeButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    agentModeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state.pending || state.agentRunning) return;
      setAgentModeEnabled(!state.agentModeEnabled);
    });

    const attachmentStrip = document.createElement("div");
    attachmentStrip.id = BAR_ATTACHMENTS_ID;
    attachmentStrip.className = "sp-attachment-strip";
    Object.assign(attachmentStrip.style, {
      display: "none",
      alignItems: "center",
      gap: "8px",
      width: "100%",
      overflowX: "auto",
      overflowY: "hidden",
      padding: "8px 10px 0"
    });
    attachmentStrip.addEventListener("pointerdown", (event) => event.stopPropagation());

    const inputRow = document.createElement("div");
    inputRow.className = "sp-input-row";
    inputRow.addEventListener("pointerdown", (event) => event.stopPropagation());

    /* ── text input ── */
    const input = document.createElement("input");
    input.id = BAR_INPUT_ID;
    input.type = "text";
    input.className = "sp-input";
    input.placeholder = state.agentModeEnabled
      ? "Agent mode: describe the task step-by-step..."
      : "Ask anything…";
    input.autocomplete = "off";
    input.spellcheck = false;

    Object.assign(input.style, {
      caretColor: "hsl(24.6 95% 53.1%)",
      cursor: "text"
    });

    /* prevent drag when interacting with input */
    input.addEventListener("pointerdown", (e) => e.stopPropagation());
    input.addEventListener("input", () => {
      refreshPromptBarActionStates();
    });

    /* Enter → expand panel */
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitPrompt();
      }
    });

    const imageButton = document.createElement("button");
    imageButton.id = BAR_IMAGE_BUTTON_ID;
    imageButton.type = "button";
    imageButton.className = "sp-image-btn";
    imageButton.setAttribute("aria-label", "Attach screenshot crop");
    imageButton.title = "Attach screenshot crop";
    imageButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3"></path>
        <path d="M16 4h5v5"></path>
        <path d="M21 3l-8 8"></path>
        <path d="M7 14l2.4-2.4a1.5 1.5 0 0 1 2.1 0L15 15"></path>
        <path d="M13.5 13.5l1-1a1.5 1.5 0 0 1 2.1 0L19 15"></path>
      </svg>
    `;
    imageButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    imageButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state.pending || state.agentRunning || state.screenCaptureInProgress) return;
      startScreenCaptureSelection();
    });

    const sendButton = document.createElement("button");
    sendButton.id = BAR_SEND_BUTTON_ID;
    sendButton.type = "button";
    sendButton.className = "sp-send-btn";
    sendButton.setAttribute("aria-label", "Send prompt");
    sendButton.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;
    sendButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    sendButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      submitPrompt();
    });

    inputRow.appendChild(input);
    inputRow.appendChild(imageButton);
    inputRow.appendChild(sendButton);

    shellBar.appendChild(logo);
    shellBar.appendChild(agentModeButton);
    shellBar.appendChild(inputRow);
    shell.appendChild(attachmentStrip);
    shell.appendChild(shellBar);
    bar.appendChild(shell);

    /* ── results panel (hidden) ── */
    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    Object.assign(panel.style, {
      position: "absolute",
      bottom: `${BAR_HEIGHT_PX - 1}px`,
      left: "0",
      width: "100%",
      maxHeight: "0",
      overflowX: "hidden",
      overflowY: "auto",
      borderRadius: `${PANEL_RADIUS_PX}px ${PANEL_RADIUS_PX}px 0 0`,
      background: BG_COLOR,
      backdropFilter: BG_BLUR,
      WebkitBackdropFilter: BG_BLUR,
      border: "1px solid transparent",
      boxShadow: "0 -12px 28px rgba(0, 0, 0, 0.28)",
      transition: `max-height ${EXPAND_DURATION_MS}ms ${EASING}, opacity ${EXPAND_DURATION_MS}ms ease`,
      opacity: "0",
      boxSizing: "border-box",
      padding: "0 20px",
      color: INPUT_COLOR,
      fontSize: "14px",
      fontFamily: "inherit",
      lineHeight: "1.6",
      zIndex: "0"
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
      const composerHeight = getComposerHeightPx();
      const newBottom = Math.max(
        0,
        Math.min(originBottom - dy, window.innerHeight - composerHeight - 20)
      );

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
    setFeatureTrayOpen(false);
    setAgentModeEnabled(state.agentModeEnabled);
    renderAttachmentStrip();
    updatePanelAnchorOffset();
    syncPromptBarFrameStyles();
    bar.style.bottom = `-${getBarDismissOffsetPx()}px`;

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
        if (state.agentRunning) {
          state.agentStopRequested = true;
          setAgentStatus("Agent: stopping...");
        } else if (state.featureTrayOpen) {
          setFeatureTrayOpen(false);
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
      /* re-centre if needed */
      const maxLeft = Math.max(0, window.innerWidth - BAR_WIDTH_PX);
      if (state.barLeft > maxLeft) {
        state.barLeft = maxLeft;
        b.style.left = `${maxLeft}px`;
      }
      if (state.expanded) resizePanelToContent();
      updatePanelAnchorOffset();
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
    panel.style.borderColor = BORDER_COLOR;
    panel.style.opacity = "1";
    panel.style.padding = "0 20px";
    updatePanelAnchorOffset();
    syncPromptBarFrameStyles();
    requestAnimationFrame(resizePanelToContent);
  }

  function collapsePanel() {
    const panel = getPanel();
    if (!panel) return;

    state.expanded = false;
    panel.style.borderColor = "transparent";
    panel.style.maxHeight = "0";
    panel.style.opacity = "0";
    syncPromptBarFrameStyles();
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
    removeAgentOverlay();
    const input = getInput();
    if (input) input.disabled = false;
    refreshPromptBarActionStates();

    /* first collapse panel if open */
    if (state.expanded) collapsePanel();
    setFeatureTrayOpen(false);

    /* restore transition in case it was removed during drag */
    bar.style.transition = `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`;

    requestAnimationFrame(() => {
      if (gradient) gradient.style.opacity = "0";
      bar.style.bottom = `-${getBarDismissOffsetPx()}px`;
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
    state.featureTrayOpen = false;

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
    state.agentRunning = false;
    state.agentStopRequested = false;
  }

  /* ================================================================
   *  TOGGLE ENTRY POINT
   * ================================================================ */
  function activateToolbox() {
    state.enabled = true;
    ensureShortcutKeydownListener();
  }

  function deactivateToolbox() {
    state.enabled = false;
    finishScreenCaptureOverlay();
    state.agentStopRequested = true;
    removeAgentOverlay();
    setAgentModeEnabled(false);
    if (state.visible) {
      dismissBar({ removeFloating: true });
      return;
    }
    clearImageAttachment();
    removeFloatingUI();
  }

  function toggleToolbox() {
    if (state.enabled) {
      deactivateToolbox();
    } else {
      activateToolbox();
    }
  }

  function setToolboxVisibility(visible) {
    if (visible) {
      activateToolbox();
    } else {
      deactivateToolbox();
    }
  }

  function syncInitialToolboxVisibility() {
    sendRuntimeMessage({ type: QUERY_STATE_MESSAGE_TYPE }, (response, runtimeError) => {
      if (runtimeError) {
        return;
      }
      if (!response || response.ok !== true) {
        return;
      }
      if (response.active === true) {
        activateToolbox();
      }
    });
  }

  /* ── message listener ── */
  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message.type !== "string") return;
    if (message.type === TOGGLE_MESSAGE_TYPE) {
      toggleToolbox();
      return;
    }
    if (message.type === SET_VISIBILITY_MESSAGE_TYPE) {
      setToolboxVisibility(message.visible === true);
    }
  });

  ensureShortcutKeydownListener();
  syncInitialToolboxVisibility();
})();
