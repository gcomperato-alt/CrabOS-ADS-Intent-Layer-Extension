// =============================
// CRABOS v08 — ACTION ENGINE
// =============================

(() => {

  const PANEL_ID = "crabos-panel";
  let lastInput = "";
  let lastHover = "";
  let activeInput = null;

  // =============================
  // PANEL
  // =============================
  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    Object.assign(panel.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "300px",
      background: "black",
      color: "white",
      padding: "12px",
      borderRadius: "10px",
      zIndex: 999999,
      fontSize: "13px",
      fontFamily: "Arial"
    });

    panel.innerHTML = `
      <b>🦀 CrabOS v08</b><br><br>
      <div id="crab-mode">Mode: teacher</div><br>
      <div id="crab-text">Ready...</div><br>
      <button id="rewrite-btn">✏️ Rewrite</button>
      <button id="fill-btn">⚡ Autofill</button>
    `;

    document.body.appendChild(panel);

    document.getElementById("rewrite-btn").onclick = rewriteInput;
    document.getElementById("fill-btn").onclick = autoFill;
  }

  function updatePanel(text) {
    const el = document.getElementById("crab-text");
    if (el) el.innerHTML = text;
  }

  // =============================
  // CRAB PERSONALITIES
  // =============================

  let mode = "teacher";

  function crabSpeak(text) {
    if (mode === "angry") {
      return "🦀 This input is weak. Fix it properly.<br>" + text;
    }
    if (mode === "recruiter") {
      return "🦀 As recruiter: clarify role + value.<br>" + text;
    }
    return "🦀 " + text;
  }

  // =============================
  // DETECT INTENT
  // =============================

  function detect(text) {
    const t = text.toLowerCase();

    if (/i\s+wan(t)?\s+work|anything\s+can/.test(t))
      return "bad_job";

    if (/job|apply|resume/.test(t))
      return "job";

    if (/\?/.test(t))
      return "question";

    return "normal";
  }

  // =============================
  // REWRITE ENGINE (CORE FEATURE)
  // =============================

  function rewrite(text) {

    if (!text) return "";

    if (/i\s+wan(t)?\s+work|anything\s+can/.test(text.toLowerCase())) {
      return "Looking for entry-level roles in admin, service, or operations in Singapore. Open to training and available immediately.";
    }

    if (text.length < 20) {
      return text + " (please expand with more detail)";
    }

    if (text.includes("?")) {
      return "Provide a clear, direct answer to: " + text;
    }

    return text;
  }

  function rewriteInput() {
    if (!activeInput) return;

    const val = getValue(activeInput);
    const newText = rewrite(val);

    setValue(activeInput, newText);
    updatePanel(crabSpeak("Rewritten ✔"));
  }

  // =============================
  // AUTO FILL (JOBSTREET DEMO)
  // =============================

  function autoFill() {

    const fields = document.querySelectorAll("input, textarea");

    fields.forEach(f => {
      const name = (f.name || f.placeholder || "").toLowerCase();

      if (name.includes("name"))
        f.value = "Giuliano Comperato";

      if (name.includes("email"))
        f.value = "example@email.com";

      if (name.includes("job") || name.includes("position"))
        f.value = "Entry-level admin or service role";

      if (name.includes("description") || name.includes("about"))
        f.value = "Motivated candidate seeking entry-level opportunities in Singapore with willingness to learn.";
    });

    updatePanel("🦀 Autofill done ✔");
  }

  // =============================
  // INPUT TRACKING
  // =============================

  document.addEventListener("focusin", (e) => {
    if (isInput(e.target)) {
      activeInput = e.target;
    }
  });

  document.addEventListener("input", (e) => {

    if (!isInput(e.target)) return;

    activeInput = e.target;

    const val = getValue(e.target);

    if (val === lastInput) return;
    lastInput = val;

    const intent = detect(val);

    let msg = "";

    if (intent === "bad_job")
      msg = "Too vague. Click rewrite.";
    else if (intent === "job")
      msg = "Job detected. Add skills.";
    else
      msg = "Looks fine.";

    updatePanel(crabSpeak(msg));

  });

  function isInput(el) {
    return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
  }

  function getValue(el) {
    return el.value || el.innerText || "";
  }

  function setValue(el, val) {
    if ("value" in el) el.value = val;
    else el.innerText = val;
  }

  // =============================
  // CHATGPT PROMPT INJECTION
  // =============================

  function injectChatGPT() {

    if (!location.hostname.includes("chatgpt")) return;

    const box = document.querySelector("textarea");

    if (!box) return;

    box.addEventListener("keydown", (e) => {

      if (e.key === "Enter" && !e.shiftKey) {

        const val = box.value;

        const improved = rewrite(val);

        box.value = improved;

        updatePanel("🦀 Prompt optimized before send");
      }
    });
  }

  // =============================
  // HOVER ENGINE (STABLE CORE)
  // =============================

  document.addEventListener("mousemove", (e) => {

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;

    let text = (el.innerText || "").trim();

    if (!text || text.length < 5) return;
    if (text === lastHover) return;

    lastHover = text;

    const intent = detect(text);

    if (intent === "question") {
      updatePanel("🦀 This text is asking something.");
    }

  });

  // =============================
  // INIT
  // =============================

  createPanel();
  injectChatGPT();

})();
