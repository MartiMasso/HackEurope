(() => {
  const BUBBLE_ID = "__toolbox_bubble__";
  const TOGGLE_MESSAGE_TYPE = "TOGGLE_TOOLBOX_BUBBLE";

  function createBubble() {
    const bubble = document.createElement("div");
    bubble.id = BUBBLE_ID;
    bubble.textContent = "TB";

    Object.assign(bubble.style, {
      position: "fixed",
      right: "20px",
      bottom: "20px",
      width: "52px",
      height: "52px",
      borderRadius: "9999px",
      background: "#1f2937",
      color: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "14px",
      fontWeight: "700",
      fontFamily: "Arial, sans-serif",
      letterSpacing: "0.4px",
      lineHeight: "1",
      userSelect: "none",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
      zIndex: "2147483647"
    });

    document.body.appendChild(bubble);
  }

  function toggleBubble() {
    const existing = document.getElementById(BUBBLE_ID);
    if (existing) {
      existing.remove();
      return;
    }

    createBubble();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== TOGGLE_MESSAGE_TYPE) {
      return;
    }

    toggleBubble();
  });
})();
