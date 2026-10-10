# DEFINE 4.0 — Team SayNoToPineapple

# Ghost HUD — The Silent AI Copilot for High-Stakes Negotiations

![Project Cover](./assets/cover.png)

## Team Information

- **Team Name**: SayNoToPineapple
- **Track**: General (PR 007: Conversational Decision-Support Assistant)

## Team Members

| Name | Role | GitHub | LinkedIn |
|------|------|--------|----------|
| Neeraj Rajeev | Full-Stack, Architecture & Engineering | [idklevi](https://github.com/idklevi) | [Profile](https://linkedin.com/in/idkneeraj) |
| Afna C | UI Design & Operations | [afnac](https://github.com/afnac) | [Profile](https://linkedin.com/in/afna-c) |

---

# Project Details

## Overview

**Ghost HUD** is a production-grade, real-time conversational decision-support assistant built for high-stakes negotiations, executive boardrooms, and live interviews.

It runs as a transparent, frameless, always-on-top overlay. Ghost listens to ambient conversation, scrubs PII locally in RAM, streams audio through a resilient WebSocket proxy, and flashes instant, psychology-backed counter-scripts the moment an objection lands.

> Deals die in 5-second pauses. Ghost ensures you never freeze.

## Problem Statement

- **What is the problem?**
  During intense business discussions, participants face heavy cognitive friction: they must listen intently, spot hidden subtext, and formulate the best counter-response under pressure.
- **Who is affected?**
  Sales professionals, founders, executive leaders, and project managers handling high-stakes customer calls or investor pitches.
- **Why is solving it important?**
  One weak answer or a 5-second pause can kill a deal or compromise profit margins.
- **What are the limitations of existing solutions?**
  Current tools are post-call note-takers that offer no live tactical value. Real-time alternatives clutter the screen with walls of text and compromise enterprise privacy by sending sensitive audio to unsafe third-party cloud endpoints.

## Solution & Architectural Choices

Ghost is a frictionless, dual-delivery cognitive companion.

1. **Dual-Delivery Architecture (Web + Native macOS)**
   *Why?* A hybrid model lets users open the app instantly in any browser (`localhost:5173`) or launch the packaged native macOS app (`.dmg` / `.app`) with native microphone entitlements and automated session markdown exports.

2. **Resilient Audio Proxy & Deepgram Integration**
   *Why Deepgram?* Its WebSocket speech-to-text pipeline gives ultra-low-latency streaming. To prevent data loss at startup, our custom Express/TypeScript proxy uses **early-chunk queuing** (holding early audio until Deepgram's upstream socket is fully open) along with automatic WebM MIME-type fallback.

3. **Local RAM Privacy Shield**
   *Why?* Enterprise security demands strong data safety. Transcripts are held in memory with PII scrubbed before any analysis, and the active shield status is always visible on the HUD.

4. **Offline Fallback (Google Gemini API)**
   *Why Gemini?* It powers the tactical counter-script engine. So the live demo never fails on network drops or API rate limits (429 errors), the proxy automatically switches to a local simulation mode when quotas are exhausted, and the screen never shows a broken error message.

---



---

# Technical Implementation

## Technologies Used

| Category | Technologies |
|----------|--------------|
| **Frontend** | React, Vite, Tailwind CSS, Inline-Script Renderer |
| **Backend** | Node.js, Express, TypeScript, Local WebSocket Proxy |
| **Desktop Wrapper** | Electron (`.dmg` / `.app` macOS distribution package) |
| **APIs / Services** | Deepgram WebSocket Speech-to-Text API, Google Gemini API |
| **DevOps / Tooling** | npm, systemd-boot / local process management |

## System Architecture

```text
[ Microphone Audio (Browser / macOS App) ]
                  │
                  ▼
      [ MediaRecorder / WebM Chunks ]
                  │
                  ▼  (WebSocket Stream)
        [ Express / TS Local Proxy ]
        (Early-Chunk Queuing & PII Scrubbing)
                  │
                  ▼
   [ Deepgram STT WebSocket Proxy ] ──► [ Google Gemini Counter-Script Engine ]
                  │
                  ▼
[ Frameless Always-on-Top Electron / Web HUD ]
```

## Key Features

- **Frameless Always-on-Top HUD:** Draggable, transparent overlay that sits over video calls without blocking your window.
- **Deepgram WebSocket Proxy:** Low-latency speech-to-text with early-chunk queuing and automatic fallback.
- **Local RAM Privacy Shield:** PII scrubbing in memory before analysis.
- **Global Panic Shortcut:** Press `ESC` to instantly hide or manage the overlay.
- **One-Tap Scenario Triggers:** Built-in simulation buttons for Budget Objection, Pushback, and Competitor counters, for reliable live demos.

---

# Setup Instructions

## Prerequisites

- Node.js (v18 or higher recommended)
- npm

## Installation & Running

### 1. Clone the Repository

```bash
git clone https://github.com/idklevi/ghost-hud.git
cd ghost-hud
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory and add your API keys:

```env
DEEPGRAM_API_KEY=your_deepgram_key_here
GEMINI_API_KEY=your_gemini_key_here
```

### 4. Run in Development Mode

Open two terminals.

**Terminal 1 — Backend & dev server:**

```bash
npm run dev
```

**Terminal 2 — Electron desktop client:**

```bash
npm run electron
```

### 5. Build for Production

To package the native macOS desktop app:

```bash
npm run build
```
