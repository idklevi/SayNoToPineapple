# FocusPulse AI 🎙️⚡
### Project PR 007 | DEFINE 4.0 Hackathon

> **Real-Time Low-Latency Audio Intelligence & Negotiation Copilot**
> Built for sales negotiations, job interviews, customer support, and team planning.

---

## 🌟 Overview

**FocusPulse AI** is a zero-install browser HUD designed to listen to live conversations, detect negotiation dynamics (objections vs. leverage points), scrub sensitive PII in real time, and surface concise tactical nudges. During an active session, the dashboard collapses into a floating micro-HUD; session analytics and a Markdown report are available when the session ends.

It features **Interactive Real-World Scenarios** and **Quick Tests** that work 100% offline without needing a microphone or API key for seamless evaluation.

---

## 📁 Project Structure

```
FocusPulse-AI/
├── index.html       # Single-page app; calls same-origin provider proxies
├── main.js          # Electron floating HUD wrapper (frameless, translucent, pinned)
├── package.json     # Node scripts & Electron devDependency
├── README.md        # Documentation, architecture specs, and user guide
├── run_server.py    # Local HTTP/WebSocket proxy; keeps provider credentials server-side
├── .env             # Local Gemini and Deepgram secrets (ignored by Git)
├── .env.example     # Environment variable template
├── requirements.txt # Python server dependencies
└── launch.bat       # Double-click Windows launcher (starts localhost server)
```

---

## ⚡ Quick Start

### 1. Local Server (Required for Provider APIs)
1. Create an isolated Python environment and install server dependencies:
   ```bash
   python3 -m venv .venv
   .venv/bin/python -m pip install -r requirements.txt
    ```
2. Put your real credentials in the ignored `.env` file:
   ```env
   DEEPGRAM_API_KEY=your_actual_deepgram_key
   GEMINI_API_KEY=your_actual_gemini_key
   ```
3. Start the app with `.venv/bin/python run_server.py` (or double-click `launch.bat` on Windows).

The app opens at `http://localhost:8080/index.html`. Provider keys are kept securely on the local proxy server.

### 2. Launch Everything with One Command (Python Server + Floating HUD)
Start both the backend proxy server and the floating HUD overlay simultaneously:
```bash
npm start
```
*(Uses `concurrently` to run `.venv/bin/python run_server.py` and `electron .` together).*

---

## 🎭 Interactive Real-World Scenarios (Zero-Setup / Offline)

Click any scenario card on the dashboard to test instant peripheral intelligence:

1. **Sales Negotiation**: `"Your competitor offers the same features for a lower price."`
   - *Classification*: `STATUS:OBJECTION` &middot; *Nudge*: **"Differentiate value"**
2. **Job Interview**: `"You don't have much industry experience."`
   - *Classification*: `STATUS:OBJECTION` &middot; *Nudge*: **"Highlight practical projects"**
3. **Customer Support**: `"I've contacted support three times, and nobody has solved my problem."`
   - *Classification*: `STATUS:OBJECTION` &middot; *Nudge*: **"Acknowledge frustration"**
4. **Team Meeting**: `"We probably can't finish this by Friday."`
   - *Classification*: `STATUS:OBJECTION` &middot; *Nudge*: **"Identify blockers"**
5. **Business Partnership**: `"We can provide the technical team if you handle implementation."`
   - *Classification*: `STATUS:LEVERAGE` &middot; *Nudge*: **"Define responsibilities"**

---

## ⚡ Quick Tests

Includes 12 instant clickable cards covering budget objections, competitor comparisons, discount requests, buying signals, decision-makers, contract approvals, timeline delays, missing specs, customer friction, team commitments, unclear roles, and next steps.

---

## 🛠️ Architectural Layers

### 1. State Architecture (`AppState`)
- Holds listening state, active objective, transcript history, and monotonic request IDs (preventing stale async overwrites). Provider keys remain server-side and are not stored in browser state.

### 2. Context-Aware AI Intelligence
- Analyzes the meeting objective, latest utterance, and a short sliding window of recent conversation turns.
- Gemini evaluates each finalized speech block against the objective and recent dialogue, returning objection/leverage status and advisor guidance.

### 3. Real-Time Audio & Privacy
- The local server reads `DEEPGRAM_API_KEY` and proxies the browser microphone WebSocket to Deepgram; when it is not configured, supported browsers can use browser speech recognition.
- Gemini requests are proxied server-side using `GEMINI_API_KEY`; provider credentials never enter page JavaScript.
- Transcript text and the meeting objective are regex-scrubbed for card numbers, emails, and phone numbers before Gemini dispatch.
- Microphone access requires user permission and a secure context (localhost or HTTPS).

### 4. Peripheral Strategic HUD
- `hud-alert-objection` (pulsing red border) & `hud-alert-leverage` (pulsing emerald border).
- Distinct `[DEMO]` vs `[LIVE]` tagging, badge cues, and tactical rationale explanations.
- Focus Mode hides the transcript and setup panels during active conversations; Stop and New Session actions open the wrap-up modal.
- Session report includes duration, statement/signal counts, tactical takeaways, and the transcript, with a one-click Markdown export.

---

## 🛡️ Hackathon Submission Details
- **Event**: DEFINE 4.0
- **Project ID**: PR 007
- **Submission Type**: Single-Page Self-Contained Application
