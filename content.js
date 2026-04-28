// =============================
// CRABOS FULL ENGINE v07 (REBUILT)
// =============================

(() => {

  const CRABOS_ID = "crabos-panel";
  const CRABOS_HOVER_ID = "crabos-hover";

  let hoverTimer = null;
  let lastHoverText = "";
  let lastMarkedElement = null;

  let inputTimer = null;
  let lastInputText = "";


  // =============================
  // PANEL
  // =============================

  function createPanel() {
    if (document.getElementById(CRABOS_ID)) return;

    const panel = document.createElement("div");
    panel.id = CRABOS_ID;

    panel.style.position = "fixed";
    panel.style.bottom = "20px";
    panel.style.right = "20px";
    panel.style.width = "280px";
    panel.style.padding = "12px";
    panel.style.background = "black";
    panel.style.color = "white";
    panel.style.fontSize = "13px";
    panel.style.borderRadius = "10px";
    panel.style.zIndex = "999999";
    panel.style.fontFamily = "Arial";

    panel.innerHTML = `
      <b>🦀 CrabOS</b><br><br>
      <div id="crab-content">Ready...</div>
    `;

    document.body.appendChild(panel);
  }


  function updatePanel(text) {
    const el = document.getElementById("crab-content");
    if (el) el.innerHTML = text;
  }


  // =============================
  // INTENT DETECTION
  // =============================

  function detectIntent(text) {
    const t = text.toLowerCase();

    if (/i\s+wan(t)?\s+work|anything\s+can|any job/.test(t))
      return "job_mess";

    if (/\bapply\b|\bjob\b|\bresume\b/.test(t))
      return "job";

    if (/\?|what|how|why/.test(t))
      return "question";

    if (text.length < 20)
      return "fragment";

    return "normal";
  }


  function respond(intent, text) {

    switch(intent) {

      case "job_mess":
        return `🦀 Too vague. Try:<br>
        "Looking for entry-level admin or service roles in Singapore."`;

      case "job":
        return "🦀 Job detected. Add role + skills + location.";

      case "question":
        return "🦀 Question detected. Be more precise.";

      case "fragment":
        return "🦀 Too short. Add more context.";

      default:
        return "🦀 Looks fine, but could be clearer.";
    }
  }


  // =============================
  // UNIVERSAL HOVER ENGINE
  // =============================

  document.addEventListener("mousemove", (e) => {

    clearTimeout(hoverTimer);

    hoverTimer = setTimeout(() => {

      const el = document.elementFromPoint(e.clientX, e.clientY);

      if (!el) return;

      if (el.closest(`#${CRABOS_ID}`)) return;

      let text = (el.innerText || el.textContent || "").trim();

      if (!text || text.length < 3) return;

      if (text === lastHoverText) return;
      lastHoverText = text;

      if (text.length > 120)
        text = text.substring(0, 120) + "...";

      const intent = detectIntent(text);

      updatePanel(respond(intent, text));

      mark(el);

    }, 200);

  });


  function mark(el) {
    if (lastMarkedElement && lastMarkedElement !== el)
      lastMarkedElement.style.outline = "";

    lastMarkedElement = el;
    el.style.outline = "2px solid red";
  }


  // =============================
  // INPUT SCANNER (THE REAL MAGIC)
  // =============================

  document.addEventListener("input", (e) => {

    clearTimeout(inputTimer);

    inputTimer = setTimeout(() => {

      const el = e.target;

      if (!isInput(el)) return;

      const value = el.value || el.innerText || "";

      if (value === lastInputText) return;
      lastInputText = value;

      const intent = detectIntent(value);

      updatePanel(respond(intent, value));

    }, 150);

  });


  function isInput(el) {
    if (!el) return false;

    const tag = el.tagName?.toLowerCase();

    return (
      tag === "input" ||
      tag === "textarea" ||
      el.isContentEditable
    );
  }


  // =============================
  // START
  // =============================

  createPanel();

})();
