// Adjust side panel width based on content
function adjustSidePanelWidth() {
  const sidePanel = document.getElementById('side-panel');
  const groupList = document.getElementById('group-list');
  const maxWidth = '100%'; // Maximum width for the side panel
  const minWidth = '100%'; // Minimum width for the side panel

  // Calculate the required width based on content
  const requiredWidth = Math.min(maxWidth, Math.max(minWidth, groupList.scrollWidth + 30)); // Add padding

  // Set the side panel width
  sidePanel.style.width = `${requiredWidth}px`;
}

// Helper function to validate URLs
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function createTabItem(tab, isPinned) {
  const tabItem = document.createElement('div');
  tabItem.className = `tab-item ${isPinned ? 'pinned' : ''}`;
  tabItem.dataset.domain = new URL(tab.url).hostname;
  tabItem.dataset.tabId = tab.id;

  // Favicon element
  const favicon = document.createElement('img');
  favicon.className = 'tab-favicon';
  favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}`;
  favicon.alt = 'Favicon';
  
  // Title element with truncation
  const title = document.createElement('span');
  title.className = 'tab-title';
  title.textContent = tab.title || 'New Tab';
  title.title = tab.title;  // Show full title on hover
  
  // Access counter badge
  const accessBadge = document.createElement('span');
  accessBadge.className = 'access-badge';
  accessBadge.textContent = tabAccessCounts[tab.id] || 0;

  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';

  // Pin/Unpin button
  const pinButton = document.createElement('button');
  pinButton.className = `icon-button ${isPinned ? 'pinned' : ''}`;
  pinButton.innerHTML = isPinned ? '📌' : '📍';
  pinButton.title = isPinned ? 'Unpin tab' : 'Pin tab';

  // Close button
  const closeButton = document.createElement('button');
  closeButton.className = 'icon-button close-button';
  closeButton.innerHTML = '×';
  closeButton.title = 'Close tab';

  // Assemble elements
  buttonContainer.append(pinButton, closeButton);
  tabItem.append(favicon, title, accessBadge, buttonContainer);

  // Event handlers
  title.addEventListener('click', async () => {
    try {
      await chrome.tabs.update(tab.id, { active: true });
      tabAccessCounts[tab.id] = (tabAccessCounts[tab.id] || 0) + 1;
      accessBadge.textContent = tabAccessCounts[tab.id];
      await chrome.storage.local.set({ tabAccessCounts });
    } catch (error) {
      console.error('Tab activation failed:', error);
    }
  });

  pinButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      if (isPinned) {
        await unpinTab(tab);
      } else {
        await pinTab(tab);
      }
      renderTabs();
    } catch (error) {
      console.error('Pinning operation failed:', error);
    }
  });

  closeButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await chrome.tabs.remove(tab.id);
      renderTabs();
    } catch (error) {
      console.error('Tab closure failed:', error);
    }
  });

  return tabItem;
}

// Helper functions
async function pinTab(tab) {
  const { pinnedTabs = [] } = await chrome.storage.local.get('pinnedTabs');
  if (!pinnedTabs.includes(tab.url)) {
    await chrome.storage.local.set({
      pinnedTabs: [...pinnedTabs, tab.url]
    });
  }
}

async function unpinTab(tab) {
  const { pinnedTabs = [] } = await chrome.storage.local.get('pinnedTabs');
  await chrome.storage.local.set({
    pinnedTabs: pinnedTabs.filter(url => url !== tab.url)
  });
}



// Search functionality
document.getElementById('search-input').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const groupItems = document.querySelectorAll('.group-item');

  groupItems.forEach((groupItem) => {
    const groupHeader = groupItem.querySelector('.group-header');
    const tabItems = groupItem.querySelectorAll('.tab-item');
    let hasVisibleTabs = false;

    tabItems.forEach((tabItem) => {
      const title = tabItem.querySelector('span').textContent.toLowerCase();
      const domain = tabItem.dataset.domain.toLowerCase();

      if (title.includes(query) || domain.includes(query)) {
        tabItem.style.display = 'flex'; // Show matching tabs
        hasVisibleTabs = true;
      } else {
        tabItem.style.display = 'none'; // Hide non-matching tabs
      }
    });

    // Show or hide the group header based on whether it has visible tabs
    if (hasVisibleTabs) {
      groupHeader.style.display = 'flex'; // Show group header
      groupItem.style.display = 'block'; // Show group item
    } else {
      groupHeader.style.display = 'none'; // Hide group header
      groupItem.style.display = 'none'; // Hide group item
    }
  });
});

// Track tab access counts
let tabAccessCounts = {};

// Fetch all tabs and render them in the side panel
// Fetch all tabs and render them in the side panel
function renderTabs() {
  chrome.tabs.query({}, (tabs) => {
    const groupList = document.getElementById('group-list');
    groupList.innerHTML = ''; // Clear existing list

    // Group tabs by domain
    const groups = {};
    tabs.forEach((tab) => {
      try {
        if (tab.url && isValidUrl(tab.url)) {
          const url = new URL(tab.url);
          const domain = url.hostname;

          if (!groups[domain]) {
            groups[domain] = [];
          }
          groups[domain].push(tab);
        }
      } catch (error) {
        console.error(`Invalid URL: ${tab.url}`, error);
      }
    });

    // Render pinned tabs first
    chrome.storage.local.get(['pinnedTabs'], (result) => {
      const pinnedTabs = result.pinnedTabs || [];
      if (pinnedTabs.length > 0) {
        const pinnedGroup = document.createElement('div');
        pinnedGroup.className = 'group-item';

        const pinnedHeader = document.createElement('div');
        pinnedHeader.className = 'group-header';
        pinnedHeader.textContent = 'Pinned Tabs for Frequent Access';
        pinnedGroup.appendChild(pinnedHeader);

        const pinnedList = document.createElement('div');
        pinnedList.className = 'tab-list';

        pinnedTabs.forEach((tabUrl) => {
          const tab = tabs.find((t) => t.url === tabUrl);
          if (tab) {
            const tabItem = createTabItem(tab, true); // Create pinned tab item
            pinnedList.appendChild(tabItem);
          }
        });

        pinnedGroup.appendChild(pinnedList);
        groupList.appendChild(pinnedGroup);
      }

      // Render other groups
      for (const [domain, tabs] of Object.entries(groups)) {
        const unpinnedTabs = tabs.filter((tab) => !pinnedTabs.includes(tab.url));
        if (unpinnedTabs.length > 0) {
          const groupItem = document.createElement('div');
          groupItem.className = 'group-item collapsed'; // Auto-collapse inactive groups

          const groupHeader = document.createElement('div');
          groupHeader.className = 'group-header';

          // Add favicon to the group header
          const favicon = document.createElement('img');
          favicon.src = `https://www.google.com/s2/favicons?domain=${domain}`;
          favicon.style.width = '16px';
          favicon.style.height = '16px';
          favicon.style.marginRight = '8px';
          groupHeader.appendChild(favicon);

          // Add domain name and tab count
          const domainText = document.createElement('span');
          domainText.textContent = `${domain} (${tabs.length})`; // Display domain and tab count
          groupHeader.appendChild(domainText);

          groupHeader.addEventListener('click', () => {
            groupItem.classList.toggle('collapsed');
          });

          const tabList = document.createElement('div');
          tabList.className = 'tab-list';

          // Sort tabs by access count (most accessed first)
          unpinnedTabs.sort((a, b) => (tabAccessCounts[b.id] || 0) - (tabAccessCounts[a.id] || 0));

          unpinnedTabs.forEach((tab) => {
            const tabItem = createTabItem(tab, false); // Create unpinned tab item
            tabList.appendChild(tabItem);
          });

          groupItem.appendChild(groupHeader);
          groupItem.appendChild(tabList);
          groupList.appendChild(groupItem);
        }
      }
    });

    adjustSidePanelWidth(); // Adjust side panel width after rendering
  });
}
// Pin a tab
function pinTab(tab) {
  chrome.storage.local.get(['pinnedTabs'], (result) => {
    const pinnedTabs = result.pinnedTabs || [];
    if (!pinnedTabs.includes(tab.url)) { // Use tab URL instead of tab ID
      pinnedTabs.push(tab.url);
      chrome.storage.local.set({ pinnedTabs }, () => {
        console.log('Tab pinned:', tab.url);
        renderTabs(); // Refresh the tab list
      });
    }
  });
}

// Unpin a tab
function unpinTab(tab) {
  chrome.storage.local.get(['pinnedTabs'], (result) => {
    const pinnedTabs = result.pinnedTabs || [];
    const updatedPinnedTabs = pinnedTabs.filter((tabUrl) => tabUrl !== tab.url); // Use tab URL instead of tab ID
    chrome.storage.local.set({ pinnedTabs: updatedPinnedTabs }, () => {
      console.log('Tab unpinned:', tab.url);
      renderTabs(); // Refresh the tab list
    });
  });
}
// Restore pinned tabs
document.getElementById('restore-pinned').addEventListener('click', () => {
  chrome.storage.local.get(['pinnedTabs'], (result) => {
    const pinnedTabs = result.pinnedTabs || [];
    pinnedTabs.forEach((tabId) => {
      chrome.tabs.get(tabId, (tab) => {
        if (tab) {
          chrome.tabs.update(tabId, { pinned: true });
        }
      });
    });
  });
});

// Dark mode toggle
document.getElementById('toggle-dark-mode').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  chrome.storage.local.set({ darkMode: document.body.classList.contains('dark-mode') });
});

// Apply dark mode state
chrome.storage.local.get(['darkMode'], (result) => {
  if (result.darkMode) {
    document.body.classList.add('dark-mode');
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'refreshTabs') {
    renderTabs(); // Refresh the tab list
  }
});

// Load access counts and pinned tabs from storage
chrome.storage.local.get(['tabAccessCounts', 'pinnedTabs'], (result) => {
  tabAccessCounts = result.tabAccessCounts || {};
  renderTabs();
});

// Save tab as bookmark
function saveTabAsBookmark(tab, tags = [], notes = '') {
  chrome.storage.local.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || [];
    bookmarks.push({ url: tab.url, title: tab.title, tags, notes });
    chrome.storage.local.set({ bookmarks }, () => {
      console.log('Tab saved as bookmark:', tab);
    });
  });
}

// Add tags and notes to a bookmark
function addTagsAndNotes(bookmarkId, tags, notes) {
  chrome.storage.local.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || [];
    const bookmark = bookmarks.find((b) => b.id === bookmarkId);
    if (bookmark) {
      bookmark.tags = tags;
      bookmark.notes = notes;
      chrome.storage.local.set({ bookmarks }, () => {
        console.log('Bookmark updated:', bookmark);
      });
    }
  });
}

// Create a new workspace
function createWorkspace(name) {
  chrome.storage.local.get(['workspaces'], (result) => {
    const workspaces = result.workspaces || [];
    workspaces.push({ name, tabs: [] });
    chrome.storage.local.set({ workspaces }, () => {
      console.log('Workspace created:', name);
    });
  });
}

// Switch to a workspace
function switchWorkspace(workspaceId) {
  chrome.storage.local.get(['workspaces'], (result) => {
    const workspaces = result.workspaces || [];
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      workspace.tabs.forEach((tab) => {
        chrome.tabs.create({ url: tab.url });
      });
    }
  });
}

// Export bookmarks as JSON
function exportBookmarks() {
  chrome.storage.local.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || [];
    const data = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookmarks.json';
    a.click();
  });
}

// Import bookmarks from JSON
function importBookmarks(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const bookmarks = JSON.parse(event.target.result);
    chrome.storage.local.set({ bookmarks }, () => {
      console.log('Bookmarks imported:', bookmarks);
    });
  };
  reader.readAsText(file);
}
function updateTabAccessCount(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error('Tab no longer exists:', tabId);
      return;
    }
    tabAccessCounts[tabId] = (tabAccessCounts[tabId] || 0) + 1;
    chrome.storage.local.set({ tabAccessCounts });
  });
}

// Example usage in createTabItem
tabTitle.addEventListener('click', () => {
  updateTabAccessCount(tab.id);
  chrome.tabs.update(tab.id, { active: true });
});

function openSidePanel() {
  chrome.windows.getCurrent((window) => {
    if (chrome.runtime.lastError) {
      console.error('Window no longer exists');
      return;
    }
    chrome.sidePanel.setOptions({ enabled: true });
    chrome.sidePanel.open({ windowId: window.id });
  });
}

