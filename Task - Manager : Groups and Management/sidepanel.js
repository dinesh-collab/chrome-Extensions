// Fetch all tabs and render them in the side panel
function renderTabs() { 
    chrome.tabs.query({}, (tabs) => {
      const groupList = document.getElementById('group-list');
      const noTabsMessage = document.getElementById('no-tabs-message');
  
      if (tabs.length === 0) {
        noTabsMessage.style.display = 'block';
        groupList.style.display = 'none';
        return;
      }
  
      noTabsMessage.style.display = 'none';
      groupList.style.display = 'block';
  
      // Group tabs by domain
      const groups = {};
      tabs.forEach((tab) => {
        const url = new URL(tab.url);
        const domain = url.hostname;
  
        if (!groups[domain]) {
          groups[domain] = [];
        }
        groups[domain].push(tab);
      });
  
      // Render groups
      groupList.innerHTML = '';
      for (const [domain, tabs] of Object.entries(groups)) {
        const groupItem = document.createElement('div');
        groupItem.className = 'group-item';
  
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';
        groupHeader.textContent = domain;
        groupHeader.addEventListener('click', () => {
          groupItem.classList.toggle('collapsed');
        });
  
        const tabList = document.createElement('div');
        tabList.className = 'tab-list';
  
        tabs.forEach((tab) => {
          const tabItem = document.createElement('div');
          tabItem.className = 'tab-item';
          tabItem.textContent = tab.title;
          tabItem.addEventListener('click', () => {
            chrome.tabs.update(tab.id, { active: true });
          });
          tabList.appendChild(tabItem);
        });
  
        groupItem.appendChild(groupHeader);
        groupItem.appendChild(tabList);
        groupList.appendChild(groupItem);
      }
    });
  }
  
  // Search functionality
  document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const tabItems = document.querySelectorAll('.tab-item');
  
    tabItems.forEach((tabItem) => {
      const title = tabItem.textContent.toLowerCase();
      if (title.includes(query)) {
        tabItem.style.display = 'block';
      } else {
        tabItem.style.display = 'none';
      }
    });
  });

  // Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'refreshTabs') {
      renderTabs(); // Refresh the tab list
    }
  });
  
  // Initial render
  renderTabs();
  
  console.log("Background script loaded");
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log("Tab updated:", tabId, changeInfo);
  });