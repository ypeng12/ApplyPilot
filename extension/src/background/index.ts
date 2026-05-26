// ApplyPilot Background Worker (Manifest V3 Service Worker)

console.log("[ApplyPilot AI] Service Worker running...");

// Enable opening sidepanel when clicking the extension action icon
chrome.runtime.onInstalled.addListener(() => {
  // @ts-ignore - chrome.sidePanel might not be defined in standard types but is present in Manifest V3
  if (chrome.sidePanel) {
    // @ts-ignore
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error: any) => console.error("[ApplyPilot] Failed to set side panel behavior:", error));
  }
});

// Listener for tab updates, allowing us to contextually enable actions or notify the panel
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log("[ApplyPilot] Tab updated:", tab.url);
    // You can send message to sidebar if needed about new page loads
    chrome.runtime.sendMessage({
      action: "TAB_CHANGED",
      url: tab.url,
      tabId
    }).catch(() => {
      // Sidebar might not be open yet, ignore this warning safely
    });
  }
});
