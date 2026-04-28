(() => {
  const CRABOS_ID = "crabos-panel";
  const CRABOS_MINI_ID = "crabos-mini";
  const CRABOS_HOVER_ID = "crabos-hover";
  const MARK_CLASS = "crabos-scan-mark";

  let lastRunUrl = "";
  let debounceTimer = null;
  let hoverTimer = null;
  let lastHoverText = "";
  let lastMarkedElement = null;
  let hoverEnabled = true;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "CRABOS_ANALYSE") return;

    if (msg.mode === "hide") {
      removePanel();
      removeHoverCard();
      renderMiniCrab();
      return;
    }

    if (msg.mode === "toggleHover") {
      hoverEnabled = !hoverEnabled;
      removeHoverCard();
      return;
    }

    runCrab(msg.mode || "explain", true);
  });

  function clean(text, max = 1200) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, max);
  }

  function textOf(selector, root = document) {
    const el = root.querySelector(selector);
    return el ? clean(el.innerText || el.textContent || "") : "";
  }

  function align() {
    const title = textOf("h1") || textOf("#title h1") || document.title || textOf("title");

    const metaDescription =
      document.querySelector('meta[name="description"]')?.content ||
      document.querySelector('meta[property="og:description"]')?.content ||
      "";

    const url = location.href;
    const host = location.hostname.replace(/^www\./, "");

    const buttons = [...document.querySelectorAll("button, input[type='submit'], a")]
      .map(el => clean(el.innerText || el.value || el.getAttribute("aria-label") || el.getAttribute("title") || "", 160))
      .filter(Boolean)
      .slice(0, 60);

    const labels = [...document.querySelectorAll("label, legend, [aria-label]")]
      .map(el => clean(el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "", 160))
      .filter(Boolean)
      .slice(0, 60);

    const forms = [...document.querySelectorAll("input, select, textarea")]
      .map(el => ({
        type: el.tagName.toLowerCase(),
        name: clean(el.name || el.id || el.placeholder || el.getAttribute("aria-label") || "", 120),
        required: !!el.required || el.getAttribute("aria-required") === "true"
      }))
      .filter(x => x.name || x.required)
      .slice(0, 80);

    const visibleText = getVisiblePageText();
    const pageShape = detectPageShape(visibleText, buttons, labels, forms, host);
    return { title, metaDescription, url, host, buttons, labels, forms, visibleText, pageShape };
  }

  function getVisiblePageText() {
    const selectors = [
      "main", "article", "[role='main']",
      "#content", "#main", "#container", "#page",
      ".content", ".main", ".article", ".articles", ".news", ".review",
      ".entry", ".post", ".box", ".teaser", ".card",
      "section", "body"
    ];

    const chunks = [];
    const seen = new Set();

    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => {
        if (!(el instanceof Element)) return;
        if (!isVisibleBlock(el)) return;
        const text = clean(el.innerText || el.textContent || "", 1800);
        if (text.length < 80) return;
        const key = text.slice(0, 180);
        if (seen.has(key)) return;
        seen.add(key);
        chunks.push(text);
      });
    }

    const linkMap = [...document.querySelectorAll("a")]
      .map(a => clean([a.innerText, a.getAttribute("title"), a.getAttribute("aria-label")].filter(Boolean).join(" "), 140))
      .filter(t => t && t.length > 2)
      .slice(0, 120)
      .join(" | ");

    if (linkMap.length > 80) chunks.push("VISIBLE LINKS: " + linkMap);

    const body = clean(document.body?.innerText || "", 3500);
    if (body.length > 80) chunks.push(body);

    return [...new Set(chunks)].join("\n\n").slice(0, 7000);
  }

  function isVisibleBlock(el) {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const box = el.getBoundingClientRect();
    return box.width > 60 && box.height > 30;
  }

  function detectPageShape(text, buttons, labels, forms, host) {
    const hay = [text, buttons.join(" "), labels.join(" ")].join(" ").toLowerCase();

    const germanMusicWords = [
      "kritik", "rezension", "album", "albums", "song", "songs", "band", "bands",
      "künstler", "kuenstler", "konzert", "konzerte", "charts", "meilenstein",
      "laut.de", "besser wird metal", "neueste kommentare", "artist a-z", "liedtext"
    ];

    const localSiteWords = ["can or not", "singlish", "cothink", "sg mode", "crab remembers", "better input"];

    return {
      isGermanLikely: /\b(der|die|das|und|mit|nicht|kritik|rezension|künstler|für|über)\b/i.test(text),
      isGermanMusicPage: host.includes("laut.de") || countHits(hay, germanMusicWords) >= 3,
      isLocalCrabPage: host.includes("canornot") || countHits(hay, localSiteWords) >= 2,
      oldWebBoxy: document.querySelectorAll("table, .box, #content, #container, .teaser").length >= 4
    };
  }

  function differentiate(s, mode) {
    const hay = [
      s.title,
      s.metaDescription,
      s.buttons.join(" "),
      s.labels.join(" "),
      s.visibleText
    ].join(" ").toLowerCase();

    const dramaWords = [
      "shocking", "dead", "die", "destroy", "secret", "exposed", "insane",
      "you won't believe", "urgent", "warning", "collapse", "save humanity",
      "sterben", "retten", "unglaublich", "geheim", "schock", "katastrophe",
      "alles war gelogen", "neue beweise", "disaster", "confusing", "skandal",
      "brutal", "unfassbar"
    ];

    const formWords = [
      "upload", "submit", "save and proceed", "certification", "expiry",
      "required", "attachment", "select an option", "application", "register",
      "verify", "verification", "pdf", "jpeg", "permitted file size",
      "certificate number", "completion date", "expiry date", "login", "sign in"
    ];

    const salesWords = [
      "buy now", "limited time", "exclusive offer", "discount", "subscribe",
      "trial", "upgrade", "checkout", "cart", "pricing", "sale", "deal"
    ];

    const dramaScore = countHits(hay, dramaWords);
    const formScore = countHits(hay, formWords) + s.forms.length;
    const salesScore = countHits(hay, salesWords);

    let intent = "general information page";
    const isYoutube = /youtube\.com|youtu\.be/.test(s.host);

    if (isYoutube) intent = "video recommendation page";
    if (s.pageShape?.isGermanMusicPage) intent = "music / review / artist discovery page";
    if (s.pageShape?.isLocalCrabPage) intent = "AI prompt/local-language tool page";
    if (formScore >= 4) intent = "form or registration workflow";
    if (salesScore >= 2) intent = "sales or conversion page";
    if (dramaScore >= 2 && isYoutube) intent = "dramatic video hook";

    const flags = [];
    if (dramaScore >= 2) flags.push("high drama framing");
    if (formScore >= 4) flags.push("bureaucratic form friction");
    if (s.forms.some(f => f.required)) flags.push("required fields detected");
    if (/upload|attachment|pdf|jpeg|jpg|png|file size/.test(hay)) flags.push("file upload requirement");
    if (/expiry|expiration|completion date|certification number|certificate number/.test(hay)) flags.push("certificate metadata needed");
    if (salesScore >= 2) flags.push("conversion pressure");
    if (isYoutube && s.title) flags.push("video title detected");
    if (s.pageShape?.isGermanLikely) flags.push("German text detected");
    if (s.pageShape?.isGermanMusicPage) flags.push("old-web music/review layout");
    if (s.pageShape?.oldWebBoxy) flags.push("boxy legacy page structure");
    if (s.pageShape?.isLocalCrabPage) flags.push("local AI tool / prompt assistant");

    return { mode, intent, flags, dramaScore, formScore, salesScore, isYoutube, pageShape: s.pageShape };
  }

  function countHits(text, words) {
    return words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
  }

  function stabilise(s, d, mode) {
    let summary = "";
    let action = "";
    let crab = "";

    if (d.intent === "dramatic video hook") {
      summary = "This looks like a video using emotional framing to pull attention.";
      action = "Check the actual topic before buying the drama. Look for evidence, examples, or a concrete explanation.";
      crab = "Title shouting until the thumbnail also need microphone. Content may still be useful, but packaging very fireworks.";
    } else if (d.intent === "video recommendation page") {
      summary = "This looks like a YouTube/video page. I can read title and visible page signals, but not the actual video content.";
      action = "Use title and description as clues. If the title sounds dramatic, verify the real topic before committing attention.";
      crab = "Video page detected. I sniff title, channel, and visible text. No magic brain-sucking from the video itself, lah.";
    } else if (d.intent === "music / review / artist discovery page") {
      summary = "This appears to be a German music journalism or discovery page: reviews, artist/news blocks, album listings, charts, or concert navigation.";
      action = "Use it for criticism and context. Check whether a block is news, review, lyrics, chart, or comments before treating it as factual info.";
      crab = "Old-web German music bazaar detected. Many tiny boxes, but the rhythm is readable now.";
    } else if (d.intent === "AI prompt/local-language tool page") {
      summary = "This looks like a local AI prompt assistant: it reformulates input, adds Singlish/local flavor, and nudges the user toward clearer AI-ready text.";
      action = "Type a rough question or messy thought, send it, then copy the improved output into ChatGPT or another AI tool.";
      crab = "Crab sees crab. Tiny mirror universe opened. Not full self-awareness yet, but enough to wave one claw.";
    } else if (d.intent === "form or registration workflow") {
      summary = "This page is trying to collect structured proof, probably certificates, dates, IDs, or attachments.";
      action = "Fill required fields first, check file size/type, then save draft before final submission.";
      crab = "Form goblin detected. Never mind, we tame it field by field.";
    } else if (d.intent === "sales or conversion page") {
      summary = "This page appears designed to move you toward purchase, signup, or upgrade.";
      action = "Pause before payment. Check pricing, renewal, cancellation, and whether the offer is actually needed.";
      crab = "Wallet radar blinking. Read small print before the button eats your money.";
    } else {
      summary = "This page contains general information or navigation.";
      action = "Identify the main task: read, search, submit, watch, or buy. Then ignore decorative noise.";
      crab = "Internet page doing internet page things. I extract the useful bones.";
    }

    if (mode === "roast") crab = roastify(d, crab);

    if (mode === "form") {
      summary = "This looks like a workflow. I am focusing on what the page wants from you.";
      action = formAction(s, d);
      crab = "Official portal speaks in dropdowns. I translate to human.";
    }

    if (mode === "nonsense") action = nonsenseAction(d);

    return { title: s.title || s.host, host: s.host, intent: d.intent, flags: d.flags, summary, action, crab, url: s.url };
  }

  function roastify(d, fallback) {
    if (d.flags.includes("high drama framing")) return "Wah, headline training for Olympic overreaction. Content may still be useful, but the packaging is wearing fireworks.";
    if (d.flags.includes("bureaucratic form friction")) return "This form has the energy of five departments sharing one braincell through dropdown menus.";
    if (d.flags.includes("conversion pressure")) return "The page is smiling very nicely while reaching for your card.";
    return fallback;
  }

  function formAction(s, d) {
    const required = s.forms.filter(f => f.required).map(f => f.name || f.type).slice(0, 8);
    const bits = [];
    if (required.length) bits.push("Required fields spotted: " + required.join(", ") + ".");
    if (d.flags.includes("file upload requirement")) bits.push("Upload likely needs accepted file type and size limit.");
    if (d.flags.includes("certificate metadata needed")) bits.push("Prepare certificate name, issuing body, number, completion date, and expiry date.");
    bits.push("Use Save Draft before final submit if available.");
    return bits.join(" ");
  }

  function nonsenseAction(d) {
    if (d.flags.length === 0) return "No obvious nonsense flags. Page may be ordinary, just visually noisy.";
    return "Detected: " + d.flags.join(", ") + ". Treat these as attention/friction signals, not automatic proof of bad intent.";
  }

  function installUniversalHover() {
    if (document.documentElement.dataset.crabosUniversalHover === "yes") return;
    document.documentElement.dataset.crabosUniversalHover = "yes";

    document.addEventListener("mousemove", onUniversalMouseMove, true);
    document.addEventListener("scroll", () => removeHoverCard(), true);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") removeHoverCard();
    }, true);
  }

  function onUniversalMouseMove(event) {
    if (!hoverEnabled) return;

    clearTimeout(hoverTimer);

    hoverTimer = setTimeout(() => {
      const probe = document.elementFromPoint(event.clientX, event.clientY);
      if (!probe) return;
      if (probe.closest?.(`#${CRABOS_ID}, #${CRABOS_MINI_ID}, #${CRABOS_HOVER_ID}`)) return;

      const target = findMeaningfulHoverTarget(probe);
      if (!target) {
        removeHoverCard();
        return;
      }

      const payload = extractMeaningfulText(target);
      if (!payload || payload.text.length < 3) {
        removeHoverCard();
        return;
      }

      window.crabosHoverTarget = {
        text: payload.text,
        tag: payload.element?.tagName || target.tagName,
        url: location.href
      };

      updateCrabPanelForHover(payload.text, payload.element || target);

      if (payload.text === lastHoverText && document.getElementById(CRABOS_HOVER_ID)) {
        positionHover(document.getElementById(CRABOS_HOVER_ID), event.clientX, event.clientY);
        return;
      }

      lastHoverText = payload.text;
      markElement(payload.element);
      showHoverCard(payload.text, event.clientX, event.clientY, payload.kind);
    }, 250);
  }

  function findMeaningfulHoverTarget(node) {
    if (!(node instanceof Element)) return null;

    return node.closest(
      "a, button, label, summary, h1, h2, h3, h4, h5, h6, article, section, li, p, blockquote, figcaption, td, th, [role='button'], [role='link'], [aria-label], [title], div, span"
    );
  }

  function extractMeaningfulText(el) {
    if (!(el instanceof Element)) return null;

    const candidates = [];

    for (const attr of ["aria-label", "title", "alt", "placeholder"]) {
      const value = clean(el.getAttribute(attr) || "", 240);
      if (value) candidates.push({ text: value, element: el, kind: attr });
    }

    const ownText = clean(el.innerText || el.textContent || "", 360);
    if (ownText) candidates.push({ text: ownText, element: el, kind: el.tagName.toLowerCase() });

    let cur = el.parentElement;
    let depth = 0;
    while (cur && depth < 4) {
      const txt = clean(cur.innerText || cur.textContent || "", 420);
      if (txt && txt.length >= 18 && txt.length <= 420) {
        candidates.push({ text: txt, element: cur, kind: "nearby card/text block" });
      }
      cur = cur.parentElement;
      depth++;
    }

    const filtered = candidates
      .map(c => ({ ...c, text: normalizeHoverText(c.text) }))
      .filter(c => c.text.length >= 12)
      .filter(c => !isMostlyNavigation(c.text))
      .sort((a, b) => scoreHoverText(b.text) - scoreHoverText(a.text));

    return filtered[0] || null;
  }

  function normalizeHoverText(text) {
    return clean(text, 420)
      .replace(/^\s*(•|\||-|–|—)\s*/g, "")
      .replace(/\s+(views|aufrufe)\s*/gi, " $1 ")
      .trim();
  }

  function isMostlyNavigation(text) {
    const lower = text.toLowerCase();
    const navWords = ["home", "login", "news", "songs", "genres", "search", "finden", "abo", "subscribe", "share", "like"];
    if (text.length < 28 && navWords.some(w => lower === w || lower.includes(w))) return true;
    if (/^(j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|#)$/i.test(text.trim())) return true;
    return false;
  }

  function scoreHoverText(text) {
  let score = Math.min(text.length, 260);
  if (/[?!]/.test(text)) score += 25;
  if (/\b(how|why|what|guide|review|kritik|news|album|song|video|course|upload|certification|deadline|price|buy)\b/i.test(text) && !/\bpreview\b/i.test(text)) score += 30;
  if (/\b(shocking|secret|exposed|urgent|warning|sterben|retten|gelogen|beweise|katastrophe|skandal|confusing)\b/i.test(text)) score += 45;
  if (text.length > 360) score -= 80;
  return score;
}

  function analyseHoverText(text, kind) {
    const t = clean(text, 420);
    const lower = t.toLowerCase();

    const drama = [
      "shocking", "destroy", "dead", "die", "secret", "exposed", "insane",
      "warning", "collapse", "disaster", "confusing", "everything changed",
      "sterben", "retten", "gelogen", "beweise", "schock", "katastrophe",
      "fake", "scam", "skandal", "unfassbar", "brutal"
    ];

    const tutorial = [
      "how to", "guide", "tutorial", "explained", "solution", "walkthrough",
      "open", "fix", "learn", "introduction", "basics", "course", "anleitung",
      "erklärt", "lösung"
    ];

    const form = [
      "upload", "attachment", "required", "select an option", "expiry date",
      "completion date", "certification number", "save and proceed", "submit",
      "login", "register"
    ];

    const sales = [
      "buy", "discount", "limited", "subscribe", "trial", "upgrade", "checkout",
      "price", "deal", "angebot"
    ];

    const question = /\?|why|what|how|wie|warum|was|wieso/.test(lower);
    const dramaHits = drama.filter(w => lower.includes(w));
    const tutorialHits = tutorial.filter(w => lower.includes(w));
    const formHits = form.filter(w => lower.includes(w));
    const salesHits = sales.filter(w => lower.includes(w));

    let intent = "meaningful text";
    let read = "This looks like a normal text block, title, or link.";
    let action = "Read it in context. If it asks for action, check what happens next before clicking.";
    let crab = "I found text under your cursor. Not every sentence is a trap, lah.";

    if (tutorialHits.length) {
      intent = "tutorial / explainer";
      read = "This seems to promise instruction, explanation, or a walkthrough.";
      action = "Useful if it quickly gives concrete steps or examples.";
      crab = "This one may have toolbox energy.";
    }

    if (question) {
      intent = "curiosity hook";
      read = "This text uses a question to pull attention.";
      action = "Decide what answer you expect before clicking. If it dodges the answer, escape.";
      crab = "Question-mark fishing rod detected.";
    }

    if (dramaHits.length) {
      intent = "drama / hype risk";
      read = "This text uses strong emotional or alarm language.";
      action = "Treat it as attention packaging until it shows evidence or specifics.";
      crab = "Wah, this phrase wearing siren costume.";
    }

    if (formHits.length) {
      intent = "form / workflow demand";
      read = "This text likely belongs to a form, login, upload, or official workflow.";
      action = "Look for required fields, accepted formats, dates, and save/submit buttons.";
      crab = "Portal goblin whispering requirements. We list them before it bites.";
    }

    if (salesHits.length) {
      intent = "sales / conversion pressure";
      read = "This text may be pushing purchase, signup, subscription, or upgrade.";
      action = "Check price, renewal, cancellation, and whether you actually need it.";
      crab = "Wallet antenna up.";
    }

    if (!/\bpreview\b/i.test(lower) && /\b(kritik|album|song|band|konzert|review|rezension)\b/i.test(lower)) {
      intent = "music / review item";
      read = "This appears to be music journalism, a review, artist page, or album listing.";
      action = "Click if you want criticism/context. Ignore if you only need the song fast.";
      crab = "German music-page flea market detected. At least the text has rhythm.";
    }

    if (/\b(ai|chatgpt|openai|llm)\b/i.test(lower)) {
      read += " This appears to involve AI tools or prompts.";
      action += " Check whether it shows real examples or only big claims.";
    }

    return { text: t, kind, intent, read, action, crab };
  }

  function updateCrabPanelForHover(text, el) {
    const box = document.querySelector("#crabos-hover-read");
    if (!box) return;

    const t = clean(text, 420);
    const lower = t.toLowerCase();
    let comment = "Crab sees text. Not bad lah.";

    if (lower.includes("apply now")) {
      comment = "🦀 Application button detected. Check job fit before anyhow clicking.";
    } else if (lower.includes("no matching search results")) {
      comment = "🦀 Search too vague or filters too tight. Try clearer job title, skill, or role.";
    } else if (lower.includes("i want work") || lower.includes("i wan work") || lower.includes("anything can")) {
      comment = "🦀 Intent too messy. Try: 'Looking for entry-level admin, service, or operations roles in Singapore.'";
    } else if (lower.includes("sign in") || lower.includes("log in") || lower.includes("login")) {
      comment = "🦀 Login gate. Normal platform behavior, but still a small friction wall.";
    } else if (/salary|pay|wage|hourly|monthly|sgd|\$/.test(lower)) {
      comment = "🦀 Money signal detected. Check salary range, CPF, working hours, and whether it is basic or gross pay.";
    } else if (/urgent|immediate|walk[- ]?in|hiring now|join immediately/.test(lower)) {
      comment = "🦀 Urgency detected. Could be real, could be bait. Verify company, role, and contract terms.";
    } else if (/jobstreet|apply|resume|cv|cover letter|interview|candidate/.test(lower)) {
      comment = "🦀 Job-search text detected. Translate vague desire into role, skill, location, and availability.";
    }

    box.innerHTML = `
      <b>Hover Read</b><br>
      <span>${escapeHtml(t.slice(0, 220))}</span><br><br>
      <b>Crab Says</b><br>
      ${comment}
    `;
  }

  let lastInputText = "";
  let lastInputEl = null;
  let inputPollTimer = null;
  let inputDebounceTimer = null;

  function installInputIntentScanner() {
    if (document.documentElement.dataset.crabosInputIntent === "yes") return;
    document.documentElement.dataset.crabosInputIntent = "yes";

    const scanSoon = (event, delay = 80) => {
      clearTimeout(inputDebounceTimer);
      inputDebounceTimer = setTimeout(() => scanInputEvent(event), delay);
    };

    document.addEventListener("focusin", (event) => scanSoon(event, 40), true);
    document.addEventListener("input", (event) => scanSoon(event, 90), true);
    document.addEventListener("beforeinput", (event) => scanSoon(event, 140), true);
    document.addEventListener("keyup", (event) => scanSoon(event, 120), true);
    document.addEventListener("change", (event) => scanSoon(event, 80), true);
    document.addEventListener("paste", (event) => scanSoon(event, 180), true);
    document.addEventListener("selectionchange", () => scanActiveInput(), true);

    inputPollTimer = setInterval(scanActiveInput, 650);
  }

  function scanInputEvent(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const candidate = path.find(isEditableInput) || event.target || document.activeElement;
    scanEditableCandidate(candidate);
  }

  function scanActiveInput() {
    scanEditableCandidate(getDeepActiveElement());
  }

  function getDeepActiveElement(root = document) {
    let active = root.activeElement;
    while (active && active.shadowRoot && active.shadowRoot.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return active;
  }

  function scanEditableCandidate(candidate) {
    const el = findEditableInput(candidate);
    if (!el) return;

    const value = getEditableValue(el);
    const label = getInputLabel(el);

    markElement(el);
    updateCrabPanelForInput(el, value, label);

    lastInputEl = el;
    lastInputText = value;
  }

  function findEditableInput(node) {
    if (!(node instanceof Element)) return null;
    if (node.closest?.(`#${CRABOS_ID}, #${CRABOS_MINI_ID}, #${CRABOS_HOVER_ID}`)) return null;

    if (isEditableInput(node)) return node;

    const near = node.closest?.(
      "textarea, input, select, [contenteditable='true'], [contenteditable=''], [role='textbox'], [role='searchbox'], .ProseMirror, .DraftEditor-editorContainer, [data-slate-editor='true']"
    );
    if (near && isEditableInput(near)) return near;

    const inside = node.querySelector?.(
      "textarea, input, select, [contenteditable='true'], [contenteditable=''], [role='textbox'], [role='searchbox'], .ProseMirror, [data-slate-editor='true']"
    );
    if (inside && isEditableInput(inside)) return inside;

    return null;
  }

  function isEditableInput(el) {
    if (!(el instanceof Element)) return false;
    if (el.closest?.(`#${CRABOS_ID}, #${CRABOS_MINI_ID}, #${CRABOS_HOVER_ID}`)) return false;

    const tag = el.tagName?.toLowerCase();
    const type = (el.getAttribute("type") || "").toLowerCase();
    const role = (el.getAttribute("role") || "").toLowerCase();
    const editable = el.getAttribute("contenteditable");

    if (tag === "textarea" || tag === "select") return true;
    if (tag === "input") return !["button", "submit", "reset", "checkbox", "radio", "file", "image", "hidden"].includes(type);
    if (el.isContentEditable || editable === "true" || editable === "") return true;
    if (role === "textbox" || role === "searchbox") return true;
    if (el.matches?.(".ProseMirror, .DraftEditor-editorContainer, [data-slate-editor='true']")) return true;

    return false;
  }

  function getEditableValue(el) {
    if (!(el instanceof Element)) return "";

    const type = (el.getAttribute("type") || "").toLowerCase();

    if (type === "password" || /password|passcode|otp|token|secret/i.test(getInputLabel(el))) {
      return "";
    }

    if ("value" in el && typeof el.value === "string") return clean(el.value, 700);

    const text = clean(el.innerText || el.textContent || "", 700);
    if (text) return text;

    const selection = window.getSelection?.();
    const selectedText = selection?.toString?.() || "";
    if (selectedText && el.contains(selection?.anchorNode)) return clean(selectedText, 700);

    return "";
  }

  function updateCrabPanelForInput(el, providedValue = null, providedLabel = null) {
    const box = document.querySelector("#crabos-hover-read");
    if (!box) return;

    const value = providedValue ?? getEditableValue(el);
    const label = providedLabel ?? getInputLabel(el);
    const analysis = analyseInputIntent(value, label, el);

    const safePreview = analysis.secret
      ? "<i>hidden secure field</i>"
      : (value ? escapeHtml(value.slice(0, 240)) : "<i>no typed text visible yet</i>");

    box.innerHTML = `
      <b>Input Intent</b><br>
      <span>${escapeHtml(label || "active input field")}</span><br><br>
      <b>Typed</b><br>
      <span>${safePreview}</span><br><br>
      <b>Detected</b><br>
      ${escapeHtml(analysis.intent)}<br><br>
      <b>Crab Says</b><br>
      ${analysis.comment}
      ${analysis.suggestion ? `<br><br><b>Cleaner version</b><br><span>${escapeHtml(analysis.suggestion)}</span>` : ""}
    `;
  }

  function getInputLabel(el) {
    if (!(el instanceof Element)) return "";

    const id = el.getAttribute("id");
    const labelled = el.getAttribute("aria-labelledby");
    const aria = el.getAttribute("aria-label");
    const placeholder = el.getAttribute("placeholder");
    const name = el.getAttribute("name");
    let label = "";

    if (id && window.CSS && CSS.escape) {
      label = clean(document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText || "", 160);
    }

    if (!label && labelled) {
      label = labelled
        .split(/\s+/)
        .map(x => clean(document.getElementById(x)?.innerText || "", 80))
        .filter(Boolean)
        .join(" ");
    }

    if (!label) {
      const wrapper = el.closest?.("label, [aria-label], [data-testid], [class]");
      const wrapperText = clean(wrapper?.innerText || wrapper?.getAttribute?.("aria-label") || "", 160);
      const rawValue = ("value" in el && typeof el.value === "string")
        ? clean(el.value, 160)
        : clean(el.innerText || el.textContent || "", 160);

      if (wrapperText && wrapperText.length < 140 && wrapperText !== rawValue) {
        label = wrapperText;
      }
    }

    return clean(label || aria || placeholder || name || el.getAttribute("data-testid") || el.tagName, 180);
  }

  function analyseInputIntent(value, label, el) {
    const type = (el.getAttribute?.("type") || "").toLowerCase();
    const isSecret = type === "password" || /password|passcode|otp|token|secret/i.test(label || "");
    const lower = [value, label, type, el.getAttribute?.("role") || ""].join(" ").toLowerCase();

    let intent = "empty or neutral input";
    let comment = "🦀 Field detected. Type clearly and I will judge the intention, not your soul.";
    let suggestion = "";

    if (isSecret) {
      return {
        intent: "secure field",
        comment: "🦀 Password/secret field. I do not read or display secrets. Good crab behaviour.",
        suggestion: "",
        secret: true
      };
    }

    if (!value && /search|keyword|job title|role|position/.test(lower)) {
      intent = "job/search query field";
      comment = "🦀 Search field. Use role + skill + location, not one lonely word wandering in the rain.";
      suggestion = "admin assistant Singapore entry level";
    } else if (!value && /message|comment|description|summary|profile|about|cover letter|resume|cv/.test(lower)) {
      intent = "writing field";
      comment = "🦀 Writing box detected. Give it goal + context + constraint, then the crab can polish it.";
    }

    if (/email/.test(lower)) {
      intent = "email field";
      comment = "🦀 Email field. Use the account you can actually access for verification links.";
    }

    if (value) {
      intent = "typed user intent";
      comment = "🦀 I can read this typed input. Make it specific: role, goal, location, constraint, next action.";
    }

    if (/i\s+wan(t)?\s+work|i\s+want\s+work|anything\s+can|any job|can live|need job|wan work/.test(lower)) {
      intent = "messy jobseeker intent";
      comment = "🦀 JobStreet magic moment. This is understandable human stress, but weak machine input.";
      suggestion = "Looking for entry-level admin, service, or operations roles in Singapore. I can start soon and am open to training.";
    } else if (/part[ -]?time|full[ -]?time|intern|trainee|entry[ -]?level|admin|service|operations|customer|retail|warehouse|driver|cleaner|security/.test(lower) && value) {
      intent = "job-search intent";
      comment = "🦀 Better. Add industry, location, schedule, salary expectation, or experience level if possible.";
      suggestion = refineJobInput(value);
    } else if (/cover letter|resume|cv|profile|about me|summary|linkedin/.test(lower)) {
      intent = "career profile writing";
      comment = "🦀 Career text field. Lead with role fit, evidence, and availability. No fog machine.";
      if (value.length > 20) suggestion = refineCareerInput(value);
    } else if (/why|what|how|can i|should i|\?/.test(lower) && value) {
      intent = "question typed into field";
      comment = "🦀 Question detected. Make the expected output explicit: answer, rewrite, plan, compare, or checklist.";
    }

    return { intent, comment, suggestion, secret: false };
  }

  function refineJobInput(value) {
    const v = clean(value, 220);
    if (!v) return "";
    if (/looking for|seeking|interested in/i.test(v)) return v;
    return `Looking for ${v}. Prefer Singapore-based roles with clear duties, training where needed, and a straightforward application process.`;
  }

  function refineCareerInput(value) {
    const v = clean(value, 240);
    return `Please rewrite this into a clear job-search profile summary with role fit, relevant experience, strengths, and availability: ${v}`;
  }

  function markElement(el) {
    if (lastMarkedElement && lastMarkedElement !== el) {
      lastMarkedElement.classList.remove(MARK_CLASS);
    }
    lastMarkedElement = el;
    el.classList.add(MARK_CLASS);
  }

  function removeMark() {
    if (lastMarkedElement) {
      lastMarkedElement.classList.remove(MARK_CLASS);
      lastMarkedElement = null;
    }
  }

  function showHoverCard(text, x, y, kind = "text") {
    document.getElementById(CRABOS_HOVER_ID)?.remove();

    const a = analyseHoverText(text, kind);
    const card = document.createElement("div");
    card.id = CRABOS_HOVER_ID;
    card.innerHTML = `
      <div class="crabos-hover-title">🦀 Universal hover read</div>
      <div><span class="crabos-hover-label">Intent:</span> ${escapeHtml(a.intent)}</div>
      <div style="margin-top:6px;"><span class="crabos-hover-label">Read:</span> ${escapeHtml(a.read)}</div>
      <div style="margin-top:6px;"><span class="crabos-hover-label">Action:</span> ${escapeHtml(a.action)}</div>
      <div style="margin-top:6px;"><span class="crabos-hover-label">Crab:</span> ${escapeHtml(a.crab)}</div>
      <div style="margin-top:6px;color:#aaa;font-size:11px;">Source: ${escapeHtml(a.kind)} · ${escapeHtml(a.text.slice(0, 110))}${a.text.length > 110 ? "…" : ""}</div>
    `;

    document.documentElement.appendChild(card);
    positionHover(card, x, y);
  }

  function removeHoverCard() {
    document.getElementById(CRABOS_HOVER_ID)?.remove();
    removeMark();
    lastHoverText = "";
  }

  function positionHover(card, x, y) {
    if (!card) return;

    const pad = 14;
    let left = x + 18;
    let top = y + 18;

    const rect = card.getBoundingClientRect();
    if (left + rect.width > window.innerWidth - pad) left = x - rect.width - 18;
    if (top + rect.height > window.innerHeight - pad) top = y - rect.height - 18;

    card.style.left = Math.max(pad, left) + "px";
    card.style.top = Math.max(pad, top) + "px";
  }

  function runCrab(mode = "explain", force = false) {
    if (!document.body) return;

    const nowUrl = location.href;
    if (!force && nowUrl === lastRunUrl && document.getElementById(CRABOS_ID)) return;
    lastRunUrl = nowUrl;

    const snapshot = align();
    const diagnosis = differentiate(snapshot, mode);
    const output = stabilise(snapshot, diagnosis, mode);

    if (force || diagnosis.isYoutube || mode !== "explain" || diagnosis.flags.length > 0) {
      renderPanel(output);
    } else {
      renderMiniCrab();
    }
  }

  function scheduleRun(mode = "explain", delay = 900, force = false) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runCrab(mode, force), delay);
  }

  function removePanel() {
    document.getElementById(CRABOS_ID)?.remove();
  }

  function renderPanel(o) {
    document.getElementById(CRABOS_MINI_ID)?.remove();
    document.getElementById(CRABOS_ID)?.remove();

    const panel = document.createElement("div");
    panel.id = CRABOS_ID;

    panel.innerHTML = `
      <div class="crabos-head">
        <span>🦀 CrabOS Intent Layer</span>
        <button class="crabos-close" title="Close">×</button>
      </div>
      <div class="crabos-body">
        <div class="crabos-section">
          <div class="crabos-label">Page</div>
          <div>${escapeHtml(o.title)}</div>
          <div style="color:#aaa;font-size:12px;">${escapeHtml(o.host)}</div>
        </div>

        <div class="crabos-section"><div class="crabos-label">Intent</div><div>${escapeHtml(o.intent)}</div></div>

        <div class="crabos-section">
          <div class="crabos-label">Signals</div>
          <div>${o.flags.length ? o.flags.map(f => `<span class="crabos-chip">${escapeHtml(f)}</span>`).join("") : "<span class='crabos-chip'>no major flags</span>"}</div>
        </div>

        <div class="crabos-section"><div class="crabos-label">Stable Read</div><div>${escapeHtml(o.summary)}</div></div>
        <div class="crabos-section"><div class="crabos-label">Action</div><div>${escapeHtml(o.action)}</div></div>
        <div class="crabos-section"><div class="crabos-label">Crab Commentary</div><div>${escapeHtml(o.crab)}</div></div>

        <div class="crabos-section">
          <div id="crabos-hover-read">
            <b>Hover Read</b><br>
            Hover over page text and CrabOS will inspect it. Click or type in an input field and CrabOS will read the intention.
          </div>
        </div>
      </div>
      <div class="crabos-footer">Universal hover scanner + input intent scanner active. Reads visible text only. No ad blocking or platform tampering.</div>
    `;

    document.documentElement.appendChild(panel);

    panel.querySelector(".crabos-close").addEventListener("click", () => {
      panel.remove();
      renderMiniCrab();
    });
  }

  function renderMiniCrab() {
    if (document.getElementById(CRABOS_MINI_ID) || document.getElementById(CRABOS_ID)) return;

    const btn = document.createElement("button");
    btn.id = CRABOS_MINI_ID;
    btn.title = "CrabOS: analyse this page";
    btn.textContent = "🦀";
    btn.addEventListener("click", () => runCrab("explain", true));
    document.documentElement.appendChild(btn);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  installUniversalHover();
  installInputIntentScanner();

  if (location.hostname.includes("youtube.com")) {
    scheduleRun("explain", 2200, true);

    window.addEventListener("yt-navigate-finish", () => {
      scheduleRun("explain", 1200, true);
    });

    window.addEventListener("popstate", () => {
      scheduleRun("explain", 1200, true);
    });
  } else {
    setTimeout(renderMiniCrab, 1200);
  }
})();

