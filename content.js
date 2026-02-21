(() => {
  const FLOATING_ICON_ID = "__toolbox_icon__";
  const TOGGLE_MESSAGE_TYPE = "TOGGLE_TOOLBOX_BUBBLE";
  const ICON_SRC = chrome.runtime.getURL("assets/icon.png");
  const ICON_SIZE_PX = 52;
  const SCREEN_MARGIN_PX = 16;
  const dragCleanupByElement = new WeakMap();

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function enableDrag(element) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const onMouseMove = (event) => {
      if (!isDragging) {
        return;
      }

      const maxX = Math.max(0, window.innerWidth - element.offsetWidth);
      const maxY = Math.max(0, window.innerHeight - element.offsetHeight);
      const nextX = clamp(event.clientX - offsetX, 0, maxX);
      const nextY = clamp(event.clientY - offsetY, 0, maxY);

      element.style.left = `${nextX}px`;
      element.style.top = `${nextY}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";
    };

    const stopDragging = () => {
      if (!isDragging) {
        return;
      }

      isDragging = false;
      element.style.cursor = "grab";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDragging);
    };

    const startDragging = (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();

      const rect = element.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      isDragging = true;
      element.style.cursor = "grabbing";
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", stopDragging);
    };

    const preventNativeDrag = (event) => {
      event.preventDefault();
    };

    element.addEventListener("mousedown", startDragging);
    element.addEventListener("dragstart", preventNativeDrag);

    return () => {
      stopDragging();
      element.removeEventListener("mousedown", startDragging);
      element.removeEventListener("dragstart", preventNativeDrag);
    };
  }

  function createFloatingIcon() {
    const icon = document.createElement("img");
    icon.id = FLOATING_ICON_ID;
    icon.src = ICON_SRC;
    icon.alt = "Toolbox";
    icon.draggable = false;

    Object.assign(icon.style, {
      position: "fixed",
      top: `${SCREEN_MARGIN_PX}px`,
      right: `${SCREEN_MARGIN_PX}px`,
      width: `${ICON_SIZE_PX}px`,
      height: `${ICON_SIZE_PX}px`,
      objectFit: "contain",
      cursor: "grab",
      userSelect: "none",
      WebkitUserDrag: "none",
      pointerEvents: "auto",
      zIndex: "2147483647"
    });

    const mountTarget = document.body || document.documentElement;
    if (!mountTarget) {
      return;
    }

    const dragCleanup = enableDrag(icon);
    dragCleanupByElement.set(icon, dragCleanup);
    mountTarget.appendChild(icon);
  }

  function toggleFloatingIcon() {
    const existing = document.getElementById(FLOATING_ICON_ID);
    if (existing) {
      const dragCleanup = dragCleanupByElement.get(existing);
      if (dragCleanup) {
        dragCleanup();
        dragCleanupByElement.delete(existing);
      }

      existing.remove();
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
