// =============================
// CRABOS v09 — PROPER BUILD
// =============================

(() => {

let mode = "teacher";
let activeInput = null;
let lastInput = "";
let lastHover = "";

// =============================
// PANEL
// =============================

function renderPanel(data) {
  document.getElementById("crab-panel")?.remove();

  const panel = document.createElement("div");
  panel.id = "crab-panel";

  Object.assign(panel.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "340px",
    maxHeight: "70vh",
    overflow: "auto",
    background: "#0b0b0b",
    color: "#fff",
    border: "2px solid #00ff88",
    borderRadius: "12px",
    zIndex: 999999,
    fontSize: "13px",
    fontFamily: "Arial",
    resize: "both"
  });

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;">
      <b>🦀 CrabOS v09</b>
      <span id="close">✖</span>
    </div>

    <hr>

    <b>Intent</b><br>${data.intent}<br><br>

    <b>Signals</b><br>${data.flags.join(", ") || "none"}<br><br>

    <b>Stable Read</b><br>${data.summary}<br><br>

    <b>Action</b><br>${data.action}<br><br>

    <b>Crab</b><br>${data.crab}<br><br>

    <div id="live-input"></div>

    <hr>

    <select id="mode">
      <option value="teacher">Teacher</option>
      <option value="recruiter">Recruiter</option>
      <option value="angry">Angry</option>
    </select>

    <button id="fill">⚡ Autofill</button>
  `;

  document.body.appendChild(panel);

  document.getElementById("close").onclick = () => panel.remove();

  document.getElementById("mode").onchange = e => mode = e.target.value;

  document.getElementById("fill").onclick = autoFill;
}


// =============================
// ADS CORE
// =============================

function align() {
  return document.body.innerText.slice(0, 2000);
}

function differentiate(text) {

  const t = text.toLowerCase();

  let intent = "general";
  let flags = [];

  if (t.includes("apply") || t.includes("job")) {
    intent = "job";
    flags.push("employment context");
  }

  if (t.includes("upload") || t.includes("submit")) {
    intent = "form";
    flags.push("form friction");
  }

  if (t.includes("buy") || t.includes("price")) {
    intent = "sales";
    flags.push("conversion pressure");
  }

  return { intent, flags };
}

function stabilise(intentObj) {

  let summary = "";
  let action = "";
  let crab = "";

  if (intentObj.intent === "job") {
    summary = "Job-related content detected.";
    action = "Clarify role + skills + location.";
    crab = "🦀 Job hunting mode activated.";
  }

  else if (intentObj.intent === "form") {
    summary = "Form interaction detected.";
    action = "Check required fields and formats.";
    crab = "🦀 Bureaucracy detected.";
  }

  else {
    summary = "General page.";
    action = "Focus on main goal.";
    crab = "🦀 Normal browsing.";
  }

  return { summary, action, crab };
}


// =============================
// LIVE INPUT REWRITE (CORE)
// =============================

function rewrite(text) {

  if (!text) return "";

  if (/i\s+wan(t)?\s+work|anything\s+can/.test(text.toLowerCase())) {
    return "Looking for entry-level roles in Singapore (admin, service, operations). Available immediately.";
  }

  if (text.length < 20) {
    return text + " (expand with details)";
  }

  return text;
}

function handleInput(el) {

  const value = el.value || el.innerText;

  if (value === lastInput) return;
  lastInput = value;

  const improved = rewrite(value);

  document.getElementById("live-input").innerHTML = `
    <b>Input</b><br>${value}<br><br>
    <b>Optimized</b><br>${improved}
  `;
}


// =============================
// INPUT LISTENER
// =============================

document.addEventListener("focusin", e => {
  if (isInput(e.target)) activeInput = e.target;
});

document.addEventListener("input", e => {
  if (!isInput(e.target)) return;

  activeInput = e.target;
  handleInput(e.target);
});

function isInput(el) {
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}


// =============================
// AUTO FILL
// =============================

function autoFill() {

  document.querySelectorAll("input, textarea").forEach(el => {

    const name = (el.name || el.placeholder || "").toLowerCase();

    if (name.includes("name")) el.value = "Giuliano";
    if (name.includes("email")) el.value = "test@email.com";
    if (name.includes("job")) el.value = "Entry-level admin role";
    if (name.includes("description")) el.value = "Motivated candidate open to learning.";

  });
}


// =============================
// CHATGPT INJECTION
// =============================

function injectChatGPT() {

  if (!location.hostname.includes("chatgpt")) return;

  const box = document.querySelector("textarea");

  if (!box) return;

  box.addEventListener("keydown", e => {

    if (e.key === "Enter" && !e.shiftKey) {
      box.value = rewrite(box.value);
    }

  });
}


// =============================
// HOVER ENGINE (STABLE)
// =============================

document.addEventListener("mousemove", e => {

  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el) return;

  const text = (el.innerText || "").trim();

  if (!text || text.length < 10) return;
  if (text === lastHover) return;

  lastHover = text;

});


// =============================
// INIT
// =============================

const state = stabilise(differentiate(align()));
renderPanel(state);
injectChatGPT();

})();
