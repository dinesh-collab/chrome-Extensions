// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      // Notify the side panel to refresh the tab list
      chrome.runtime.sendMessage({ action: 'refreshTabs' });
    }
  });
  
  // Listen for tab creation
  chrome.tabs.onCreated.addListener(() => {
    chrome.runtime.sendMessage({ action: 'refreshTabs' });
  });
  
  // Listen for tab removal
  chrome.tabs.onRemoved.addListener(() => {
    chrome.runtime.sendMessage({ action: 'refreshTabs' });
  });