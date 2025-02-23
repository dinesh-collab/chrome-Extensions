// Background.js - Optimized with error handling and debouncing
let refreshTimeout;

function debounceRefreshTabs() {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(() => {
    chrome.runtime.sendMessage({ action: 'refreshTabs' });
  }, 300);
}

// Consolidated tab event listeners
function handleTabEvents() {
  const tabEvents = [
    chrome.tabs.onUpdated,
    chrome.tabs.onCreated,
    chrome.tabs.onRemoved
  ];

  tabEvents.forEach(event => {
    event.addListener(() => {
      if (!chrome.runtime.lastError) {
        debounceRefreshTabs();
      }
    });
  });
}

// Side panel management
function handleSidePanel() {
  chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.setOptions({ 
      enabled: true,
      path: "sidepanel.html"
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error enabling side panel:', chrome.runtime.lastError);
        return;
      }
      
      chrome.sidePanel.open({ windowId: tab.windowId }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error opening side panel:', chrome.runtime.lastError);
          return;
        }
        // Send refresh message after panel is confirmed open
        chrome.runtime.sendMessage({ action: 'refreshTabs' });
      });
    });
  });
}

// Session management
function handleSessionStorage() {
  async function saveAllTabs() {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const session = tabs.map(tab => ({ url: tab.url, title: tab.title }));
      await chrome.storage.local.set({ savedSession: session });
      console.log('Session saved:', session);
    } catch (error) {
      console.error('Error saving tabs:', error);
    }
  }

  async function restoreSession() {
    try {
      const result = await chrome.storage.local.get(['savedSession']);
      const session = result.savedSession || [];
      for (const tab of session) {
        await chrome.tabs.create({ url: tab.url });
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'saveAllTabs') saveAllTabs();
    if (message.action === 'restoreSession') restoreSession();
  });
}
let panelState = { enabled: false };

chrome.action.onClicked.addListener(async (tab) => {
  try {
    panelState.enabled = !panelState.enabled;
    
    await chrome.sidePanel.setOptions({
      enabled: panelState.enabled,
      path: "sidepanel.html"
    });

    if (panelState.enabled) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      chrome.runtime.sendMessage({ action: 'refreshTabs' });
    }
  } catch (error) {
    console.error('Side panel error:', error);
    panelState.enabled = false;
  }
});

// Tab event listeners with debouncing
const debouncedRefresh = debounce(() => {
  chrome.runtime.sendMessage({ action: 'refreshTabs' });
}, 300);

chrome.tabs.onCreated.addListener(debouncedRefresh);
chrome.tabs.onUpdated.addListener(debouncedRefresh);
chrome.tabs.onRemoved.addListener(debouncedRefresh);

function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}

// Initialize all components
function initBackground() {
  handleTabEvents();
  handleSidePanel();
  handleSessionStorage();
}

initBackground();