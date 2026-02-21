(() => {
  const FLOATING_ICON_ID = "__toolbox_icon__";
  const NODE_ID_PREFIX = "__toolbox_node__";
  const TEMPLATE_POPUP_ID = "__toolbox_template_popup__";
  const TOGGLE_MESSAGE_TYPE = "TOGGLE_TOOLBOX_BUBBLE";
  const ICON_SRC = chrome.runtime.getURL("assets/icon.png");
  const ICON_SIZE_PX = 56;
  const NODE_SIZE_PX = 40;
  const NODE_DISTANCE_PX = 86;
  const SCREEN_MARGIN_PX = 16;
  const DRAG_THRESHOLD_PX = 6;
  const QUICK_CLICK_MS = 300;

  const state = {
    expanded: false,
    centerX: 0,
    centerY: 0,
    onResize: null,
    nodeMap: new Map(),
    popupCloseTimer: null
  };

  const directions = [
    { key: "top", dx: 0, dy: -NODE_DISTANCE_PX, label: "TOP" },
    { key: "left", dx: -NODE_DISTANCE_PX, dy: 0, label: "LEFT" },
    { key: "right", dx: NODE_DISTANCE_PX, dy: 0, label: "RIGHT" },
    { key: "bottom", dx: 0, dy: NODE_DISTANCE_PX, label: "BOTTOM" }
  ];

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getBubbleElement() {
    return document.getElementById(FLOATING_ICON_ID);
  }

  function getPopupElement() {
    return document.getElementById(TEMPLATE_POPUP_ID);
  }

  function getNodeElement(key) {
    return document.getElementById(`${NODE_ID_PREFIX}_${key}`);
  }

  function setBubblePosition(left, top) {
    const bubble = getBubbleElement();
    if (!bubble) {
      return;
    }

    const maxLeft = Math.max(0, window.innerWidth - ICON_SIZE_PX);
    const maxTop = Math.max(0, window.innerHeight - ICON_SIZE_PX);
    const nextLeft = clamp(left, 0, maxLeft);
    const nextTop = clamp(top, 0, maxTop);

    bubble.style.left = `${nextLeft}px`;
    bubble.style.top = `${nextTop}px`;
    state.centerX = nextLeft + ICON_SIZE_PX / 2;
    state.centerY = nextTop + ICON_SIZE_PX / 2;

    updateNodePositions();
  }

  function showTemplatePopup(directionLabel) {
    let popup = getPopupElement();
    if (!popup) {
      popup = document.createElement("div");
      popup.id = TEMPLATE_POPUP_ID;

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
      text.id = `${TEMPLATE_POPUP_ID}_text`;

      popup.appendChild(image);
      popup.appendChild(text);
      (document.body || document.documentElement).appendChild(popup);
    }

    const textElement = document.getElementById(`${TEMPLATE_POPUP_ID}_text`);
    if (textElement) {
      textElement.textContent = `Template image selected: ${directionLabel}`;
    }

    if (state.popupCloseTimer) {
      clearTimeout(state.popupCloseTimer);
    }

    state.popupCloseTimer = setTimeout(() => {
      const currentPopup = getPopupElement();
      if (currentPopup) {
        currentPopup.remove();
      }
      state.popupCloseTimer = null;
    }, 2200);
  }

  function updateNodePositions() {
    directions.forEach(({ key, dx, dy }) => {
      const node = state.nodeMap.get(key) || getNodeElement(key);
      if (!node) {
        return;
      }

      if (!state.expanded) {
        node.style.display = "none";
        return;
      }

      node.style.display = "flex";
      const nodeLeft = state.centerX + dx - NODE_SIZE_PX / 2;
      const nodeTop = state.centerY + dy - NODE_SIZE_PX / 2;
      node.style.left = `${nodeLeft}px`;
      node.style.top = `${nodeTop}px`;
    });
  }

  function toggleNeuronNodes() {
    state.expanded = !state.expanded;
    updateNodePositions();
  }

  function createNeuronNode({ key, label }) {
    const node = document.createElement("button");
    node.id = `${NODE_ID_PREFIX}_${key}`;
    node.type = "button";
    node.textContent = label;

    Object.assign(node.style, {
      position: "fixed",
      width: `${NODE_SIZE_PX}px`,
      height: `${NODE_SIZE_PX}px`,
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
      showTemplatePopup(label);
    });

    state.nodeMap.set(key, node);
    (document.body || document.documentElement).appendChild(node);
  }

  function createFloatingIcon() {
    const icon = document.createElement("img");
    icon.id = FLOATING_ICON_ID;
    icon.src = ICON_SRC;
    icon.alt = "Toolbox";
    icon.draggable = false;

    Object.assign(icon.style, {
      position: "fixed",
      top: "0px",
      left: "0px",
      width: `${ICON_SIZE_PX}px`,
      height: `${ICON_SIZE_PX}px`,
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
      if (event.button !== 0) {
        return;
      }

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
      if (event.pointerId !== activePointerId) {
        return;
      }

      const dx = event.clientX - pointerStartX;
      const dy = event.clientY - pointerStartY;
      const movedDistance = Math.hypot(dx, dy);

      if (movedDistance > DRAG_THRESHOLD_PX) {
        hasDragged = true;
      }

      if (!hasDragged) {
        return;
      }

      setBubblePosition(originLeft + dx, originTop + dy);
    });

    icon.addEventListener("pointerup", (event) => {
      if (event.pointerId !== activePointerId) {
        return;
      }

      icon.releasePointerCapture(event.pointerId);
      activePointerId = null;
      icon.style.cursor = "grab";

      const clickDuration = Date.now() - pointerDownAt;
      if (!hasDragged && clickDuration <= QUICK_CLICK_MS) {
        toggleNeuronNodes();
      }
    });

    icon.addEventListener("pointercancel", (event) => {
      if (event.pointerId !== activePointerId) {
        return;
      }

      activePointerId = null;
      icon.style.cursor = "grab";
    });

    const mountTarget = document.body || document.documentElement;
    if (!mountTarget) {
      return;
    }

    mountTarget.appendChild(icon);

    directions.forEach((direction) => {
      createNeuronNode(direction);
    });

    state.expanded = false;
    setBubblePosition(window.innerWidth - ICON_SIZE_PX - SCREEN_MARGIN_PX, SCREEN_MARGIN_PX);

    state.onResize = () => {
      const bubble = getBubbleElement();
      if (!bubble) {
        return;
      }

      const rect = bubble.getBoundingClientRect();
      setBubblePosition(rect.left, rect.top);
    };
    window.addEventListener("resize", state.onResize);
  }

  function removeFloatingUI() {
    const existingBubble = getBubbleElement();
    if (existingBubble) {
      existingBubble.remove();
    }

    directions.forEach(({ key }) => {
      const node = state.nodeMap.get(key) || getNodeElement(key);
      if (node) {
        node.remove();
      }
    });

    state.nodeMap.clear();
    state.expanded = false;

    const existingPopup = getPopupElement();
    if (existingPopup) {
      existingPopup.remove();
    }

    if (state.popupCloseTimer) {
      clearTimeout(state.popupCloseTimer);
      state.popupCloseTimer = null;
    }

    if (state.onResize) {
      window.removeEventListener("resize", state.onResize);
      state.onResize = null;
    }
  }

  function toggleFloatingIcon() {
    const existing = getBubbleElement();
    if (existing) {
      removeFloatingUI();
      return;
    }

    createFloatingIcon();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== TOGGLE_MESSAGE_TYPE) {
      return;
    }

    toggleFloatingIcon();
  });
})();
