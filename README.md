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
