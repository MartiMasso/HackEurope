(() => {
  /* ================================================================
   *  IDENTIFIERS
   * ================================================================ */
  const BAR_CONTAINER_ID = "__toolbox_bar_container__";
  const BAR_INPUT_ID = "__toolbox_bar_input__";
  const PANEL_ID = "__toolbox_panel__";
  const TEMPLATE_POPUP_ID = "__toolbox_template_popup__";
  const TOGGLE_MESSAGE_TYPE = "TOGGLE_TOOLBOX_BUBBLE";
  const ICON_SRC = chrome.runtime.getURL("assets/icon.png");

  /* ================================================================
   *  DIMENSION & STYLE CONSTANTS
   * ================================================================ */
  const BAR_WIDTH_PX = 520;
  const BAR_HEIGHT_PX = 54;
  const BAR_RADIUS_PX = 27;
  const BAR_BOTTOM_PX = 18;
  const PANEL_MAX_HEIGHT_PX = 400;
  const PANEL_RADIUS_PX = 18;
  const DRAG_THRESHOLD_PX = 5;

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
    barBottom: BAR_BOTTOM_PX,
    barLeft: 0,        // will be centred on create
    onResize: null,
    onKeydown: null
  };

  /* ── helpers ── */
  function getEl(id) {
    return document.getElementById(id);
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

  /* ================================================================
   *  CREATE BAR
   * ================================================================ */
  function createBar() {
    injectPlaceholderStyle();

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
        if (!state.expanded) {
          expandPanel();
        }
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
      if (!state.expanded) expandPanel();
    });
    sendHint.addEventListener("pointerenter", () => {
      sendHint.style.background = "rgba(99, 102, 241, 0.45)";
    });
    sendHint.addEventListener("pointerleave", () => {
      sendHint.style.background = "rgba(99, 102, 241, 0.25)";
    });

    bar.appendChild(icon);
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
      overflow: "hidden",
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
    Object.assign(panelInner.style, {
      padding: "20px 0",
      opacity: "0.5",
      textAlign: "center"
    });
    panelInner.textContent = "Results will appear here…";
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

      if (!hasDragged && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        hasDragged = true;
      }
      if (!hasDragged) return;

      const newLeft = Math.max(0, Math.min(originLeft + dx, window.innerWidth - BAR_WIDTH_PX));
      const newBottom = Math.max(0, Math.min(originBottom - dy, window.innerHeight - BAR_HEIGHT_PX - 20));

      bar.style.left = `${newLeft}px`;
      bar.style.bottom = `${newBottom}px`;
      state.barLeft = newLeft;
      state.barBottom = newBottom;
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

    /* slide in */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
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
    panel.style.maxHeight = `${PANEL_MAX_HEIGHT_PX}px`;
    panel.style.opacity = "1";
    panel.style.padding = "0 20px";
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
  function dismissBar() {
    const bar = getBar();
    if (!bar) return;

    /* first collapse panel if open */
    if (state.expanded) collapsePanel();

    /* restore transition in case it was removed during drag */
    bar.style.transition = `bottom ${SLIDE_DURATION_MS}ms ${EASING}, opacity ${SLIDE_DURATION_MS}ms ease`;

    requestAnimationFrame(() => {
      bar.style.bottom = `-${BAR_HEIGHT_PX + 20}px`;
      bar.style.opacity = "0";
    });

    setTimeout(() => {
      removeBarUI();
    }, SLIDE_DURATION_MS + 50);
  }

  /* ================================================================
   *  FULL CLEANUP
   * ================================================================ */
  function removeBarUI() {
    const bar = getBar();
    if (bar) bar.remove();

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
  }

  /* ================================================================
   *  TOGGLE ENTRY POINT
   * ================================================================ */
  function toggleBar() {
    if (state.visible) {
      dismissBar();
    } else {
      createBar();
    }
  }

  /* ── message listener (unchanged contract) ── */
  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== TOGGLE_MESSAGE_TYPE) return;
    toggleBar();
  });
})();
