🦀 CrabOS – ADS Intent Layer Extension (v0.6)

The internet doesn’t just show content anymore. It gets interpreted.

CrabOS is a browser extension that adds a real-time intent layer on top of any webpage.
It reads visible text, UI elements, and user input to detect what a page is trying to do — and reflects that back to the user.

No LLM required. No API calls. Just structure, signals, and pattern logic.

🚀 What It Does

CrabOS observes the page like a quiet inspector and answers:

Is this a form, sales page, video hook, or navigation noise?
Is this text a real question, hype, or just UI fluff?
Is your input clear, weak, or machine-confusing?

Then it responds in real time through:

🧠 Intent Panel
Page-level diagnosis (intent, signals, action)
Stable interpretation of what the page is doing
🖱️ Hover Scanner
Hover over any text → instant interpretation
Detects:
navigation vs content
hype / drama framing
tutorial / explanation
form requirements
sales pressure
⌨️ Input Intent Scanner
Watches what you type into fields
Detects:
vague vs structured input
job search intent
prompt quality (ChatGPT mode)
Suggests cleaner, stronger versions
⚙️ Core Idea

CrabOS implements a lightweight version of the ADS framework:

Alignment → Differentiation → Stabilization
Alignment → Collect visible signals (text, labels, UI)
Differentiation → Classify intent patterns
Stabilization → Output a clear, usable interpretation

This creates a browser-level semantic filter without needing an AI model.

🎯 Why It Matters

Most users struggle with:

confusing forms
vague inputs
misleading headlines
unclear page intent

CrabOS acts as a co-thinking layer:

It doesn’t generate answers.
It improves how you read and interact.

🧪 Features in v0.6
Universal hover detection (DOM-based, not site-specific)
Navigation filtering (no more “everything is a question”)
Input intent detection (job search, prompts, forms)
ChatGPT-aware mode (prompt optimization surface)
Toggleable hover scanner (ON/OFF)
Real-time DOM interpretation
No external dependencies
🧰 Installation (Manual)
Download or clone this repo
Go to:
chrome://extensions
Enable Developer Mode
Click Load unpacked
Select the extension folder
🧭 Usage
Click the 🦀 icon → open Intent Panel
Hover over any text → get interpretation
Type into any input field → get intent feedback
Toggle hover scanning ON/OFF inside panel
🧠 Example

Typing:

i wan work anything can

Becomes:

“Looking for entry-level admin, service, or operations roles in Singapore. Open to training and available to start soon.”

🧩 Positioning

CrabOS is not:

a chatbot
a content generator
a replacement for AI

It is:

A semantic interface layer for the web

🔮 Future Direction
Multi-agent orchestration (OpenClaw-style)
Persistent user intent memory
Form auto-completion assistance
Integration with tools like canornot.co
Educational deployments (job coaching, digital literacy)
🦀 Philosophy

The web is noisy.
Users are uncertain.
Interfaces are unclear.

CrabOS introduces a simple idea:

Before acting, understand the intent.

👤 Author

Giuliano Comperato
NUS (former) • AI tooling • ADS framework

⚠️ Disclaimer

CrabOS analyzes visible content only.
It does not access private data, passwords, or hidden system processes.

- No ad blocking.
- No paywall bypassing.
- No playback tampering.
- Reads visible page text only.
