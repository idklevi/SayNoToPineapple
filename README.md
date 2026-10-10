<<<<<<< HEAD
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7e4dd929-56ac-4692-a255-0babed4dc8b3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` if you want live Gemini guidance. The HUD remains usable offline without it.
3. Launch the local server and floating Electron HUD together:
   `npm start`

`npm run dev` starts only the local Express/Vite server at `http://localhost:3000`; `npm run electron` starts only the HUD window.
=======
# DEFINE 4.0

The official project submission repository for **DEFINE 4.0 — The World's Realest Hackathon**.

---

# Conversational Decision-Support Assistant

<!-- Add your project cover image below -->

![Project Cover](./assets/cover.png)

## Team Information

- **Team Name**: SayNoToPineapple

- **Track**: General (PR 007: Conversational Decision-Support Assistant)


## Team Members

| Name | Role | GitHub | LinkedIn |
|------|------|--------|----------|
| Neeraj Rajeev | Role | [idklevi](https://github.com/idklevi) | [Profile](https://linkedin.com/in/idkneeraj) |
| Afna C| Role | [afnac](https://github.com/afnac) | [Profile](https://linkedin.com/in/afna-c) |

---

# Project Details

## Overview

Project PR 007 is a 100% free, real-time cognitive copilot that transforms live conversations into successful outcomes by flashing subtle, actionable strategy suggestions directly in your peripheral vision. It captures ambient conversation text using native browser hardware, processes it instantly against your custom-defined targets, and flags critical objections or tactical advice without distracting your attention from the speaker. The system bridges the critical gap between active listening, real-time tactical evaluation, and persuasive delivery during high-stakes corporate interactions.

## Problem Statement

- **What is the problem?** During intense business discussions, participants experience heavy cognitive friction because they must simultaneously listen intently, spot hidden conversational subtext, and formulate an optimal counter-response. This overwhelming mental load frequently leads to missed client objections, dropped negotiation leverage, and flawed real-time decision-making.

- **Who is affected?** This issue directly impacts sales professionals, customer support leads, freelance consultants, and project managers who regularly navigate high-stakes negotiations and client-facing alignment sessions.

- **Why is solving it important?** Resolving this issue prevents lost revenue from stalled deals, protects profit margins, and gives professionals the absolute confidence to pivot fluidly when facing tough client pushback.

- **What are the limitations of existing solutions?** Current AI options are almost exclusively retrospective note-takers or summary bots. They only deliver static insights *after* a meeting has concluded, offering zero value when trying to save a live, deteriorating negotiation. Furthermore, traditional real-time tools clutter screens with heavy, distracting text walls and route sensitive data through unsafe third-party cloud servers, violating strict enterprise privacy standards.

## Solution

Our proposed solution introduces an invisible, privacy-first cognitive assistant that acts as a real-time conversational navigation engine. 

The software operates through a fast, 100% free four-stage pipeline:
1. **Local Audio Capture:** The browser's native Web Speech API continuously translates spoken dialogue to text inside local system memory with zero runtime platform costs.
2. **In-Memory Masking:** Lightweight, client-side Regex PII filters scrub personal identifying datasets (such as phone formats or financial strings) directly in browser RAM before any network transport occurs, maintaining absolute data security.
3. **Objective Alignment Engine:** The anonymized text block flows through optimized serverless LLM calls (via OpenRouter and Meta Llama 3.1 8B Instruct), which dynamically compare the conversational trajectory against the user's explicit strategic target.
4. **Peripheral Visual Feedback:** Instead of forcing users to read distracting blocks of text, the frontend UI uses responsive CSS animations to flash subtle, high-contrast visual cues around the viewport borders, serving up critical tactical advice right in their side vision.

---

# Demo

### Demo Video

[Watch Project Demo](https://www.youtube.com/watch?v=VIDEO_ID)

> Replace `VIDEO_ID` with your YouTube video ID.

### Screenshots

<!-- Add screenshots of your project here -->

![Screenshot 1](./assets/screenshot-1.png)

![Screenshot 2](./assets/screenshot-2.png)

![Screenshot 3](./assets/screenshot-3.png)

---

# Live Project

[Visit Live Project](https://your-project-url.com/)

---

# Technical Implementation

## Technologies Used

| Category | Technologies |
|----------|--------------|
| **Frontend** | Technologies |
| **Backend** | Technologies |
| **Database** | Technologies |
| **APIs / Services** | Technologies |
| **AI / ML** | Technologies |
| **DevOps / Deployment** | Technologies |
| **Other Tools** | Technologies |

## System Architecture

<!-- Add your architecture diagram here -->

![System Architecture](./assets/architecture.png)

## Key Features

- Feature 1

- Feature 2

- Feature 3

- Feature 4

- Feature 5


---

# Setup Instructions

## Prerequisites

Make sure the following are installed before running the project:

- Requirement 1

- Requirement 2

- Requirement 3


## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
>>>>>>> 4d718514aed03c1d8a843ddc7d07f5708be8a934
