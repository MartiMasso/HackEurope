const TOGGLE_MESSAGE_TYPE = "TOGGLE_TOOLBOX_BUBBLE";

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
