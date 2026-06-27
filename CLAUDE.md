# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GlowMuse AI is a luxury skincare UGC (User Generated Content) image generator. Users upload a reference photo, configure brand parameters, and the app uses Google's Gemini AI to produce hyper-realistic skincare brand visuals along with AI-generated Instagram/TikTok ad copy.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # Type-check only (tsc --noEmit — there are no tests)
npm run preview      # Preview production build
```

**Required before running:** Create `.env.local` with `GEMINI_API_KEY=<your_key>`. The key is injected at build time by `vite.config.ts` as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.

## Architecture

This is a flat, monolithic React 19 + TypeScript + Vite SPA. There is no routing.

```
index.tsx           → mounts App.tsx (entry point)
App.tsx             → entire application UI and state logic
components/
  ImageUploader.tsx → drag-and-drop file picker (sole external component)
services/
  gemini.ts         → Gemini API calls (image + ad copy generation)
  storage.ts        → IndexedDB persistence layer
types.ts            → TwinConfig, GeneratedImage, UserPreset interfaces + enums
constants.ts        → all dropdown option arrays and built-in SKINCARE_PRESETS
```

`App.tsx` also defines three presentational sub-components inline: `TabBtn`, `SelectGroup`, and `Slider`. These are intentionally co-located and should remain in the same file.

## Core Data Flow

1. User uploads a reference image → stored as raw base64 string (no data-URI prefix) in `base64Image` state
2. User fills `TwinConfig` across four tabs: Concept, Brand, Ritual, Appearance
3. `handleGenerate` calls `generateTwinImage(base64Image, mimeType, config)` in `services/gemini.ts`:
   - `buildPrompt(config)` constructs a structured text prompt from the config fields
   - Sends reference image + prompt to `gemini-3-pro-image-preview` for image generation
   - Sends a separate caption request to `gemini-3-flash-preview` for ad copy
   - Returns `{ url: string, adCopy: string }` — `url` is a `data:image/png;base64,...` string
4. The resulting `GeneratedImage` is persisted to IndexedDB via `services/storage.ts`

## Persistence (IndexedDB)

`services/storage.ts` manages an IndexedDB database named `TwinEffectDB` (version 2) with two object stores:
- `images` — stores `GeneratedImage` records (id, url as base64 data URI, adCopy, timestamp, config, isFavorite)
- `presets` — stores `UserPreset` records (user-saved `TwinConfig` snapshots)

The DB version is currently `2`. Bumping `DB_VERSION` in `storage.ts` triggers `onupgradeneeded` and should include migration logic for existing stores.

## Styling

Tailwind CSS is loaded via CDN script in `index.html` (not via npm), with an inline `tailwind.config` block. Do not attempt to use a PostCSS pipeline or `tailwind.config.js` file — the entire Tailwind config lives inside the `<script>` tag in `index.html`.

Custom color tokens defined there:
- `brand` — purple scale (primary actions, accents)
- `sand` / `skin` — warm neutrals for the light theme
- `dark` — near-black scale for dark mode backgrounds
- `light` — warm off-white scale for light mode backgrounds

Fonts: `Inter` (sans) and `Cinzel` (serif) from Google Fonts. Dark mode is toggled by adding/removing the `dark` class on `<body>`.

## Dual Runtime Environments

The app is designed to run both as a standard Vite dev server and inside Google AI Studio (aistudio.google.com). `index.html` contains an importmap pointing to `aistudiocdn.com` for `react`, `react-dom`, `@google/genai`, and `jszip` — this allows the app to be served directly from the HTML file without a build step in the AI Studio host.

When running inside AI Studio, `window.aistudio` is available with `hasSelectedApiKey()` and `openSelectKey()` methods. `App.tsx` checks for this object on startup to manage API key flow; outside AI Studio, `hasApiKey` is set to `true` immediately and the key is read from the environment variable.

## Key Conventions

- `TwinConfig` is the central data model. All generation parameters flow through it. Skincare-specific fields (`brandName`, `bottleType`, `glowIntensity`, etc.) are first-class fields, not nested — keep them flat.
- Generated images are stored as full base64 data URIs in IndexedDB. There is no server-side storage or CDN; everything is client-local.
- `constants.ts` is the single source of truth for all dropdown options. When adding new select options, add the array there and import it in `App.tsx`.
- The `buildPrompt` function in `services/gemini.ts` constructs a structured prompt from `TwinConfig`. It uses labeled sections (`ROLE:`, `IDENTITY:`, `SETTING:`, etc.) that the model treats as high-weight directives — preserve this format when extending it.
- Batch export of favorited images uses `jszip` to produce a `.zip` containing PNG files and paired `.txt` ad copy files.
