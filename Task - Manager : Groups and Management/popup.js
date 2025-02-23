document.addEventListener("DOMContentLoaded", () => {
    const restoreButton = document.getElementById("restoreTabs");
    restoreButton.addEventListener("click", () => {
        chrome.storage.sync.get("pinnedTabs", (data) => {
            let pinnedTabs = data.pinnedTabs || [];
            pinnedTabs.forEach((url) => {
                chrome.tabs.create({ url, pinned: true });
            });
        });
    });

    const darkModeToggle = document.getElementById("darkMode");
    darkModeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        chrome.storage.sync.set({ darkMode: document.body.classList.contains("dark-mode") });
    });
});