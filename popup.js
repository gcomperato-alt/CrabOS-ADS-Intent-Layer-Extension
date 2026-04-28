function sendCrab(mode) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "CRABOS_ANALYSE", mode });
  });
}

document.getElementById("explain").addEventListener("click", () => sendCrab("explain"));
document.getElementById("roast").addEventListener("click", () => sendCrab("roast"));
document.getElementById("form").addEventListener("click", () => sendCrab("form"));
document.getElementById("nonsense").addEventListener("click", () => sendCrab("nonsense"));
document.getElementById("hover").addEventListener("click", () => sendCrab("toggleHover"));
document.getElementById("hide").addEventListener("click", () => sendCrab("hide"));
