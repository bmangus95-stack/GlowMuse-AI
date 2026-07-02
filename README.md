<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5138615a-2849-429f-8ad9-eeb044a85283

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Pinterest Studio: connecting a Pinterest account

Pinterest Studio's "Connect Pinterest" button uses OAuth so you don't have to
manually generate and paste an access token. To enable it:

1. Create an app at https://developers.pinterest.com/apps/
2. Add your deployed app's URL (e.g. `https://yourapp.vercel.app/`) as an authorized redirect URI
3. Set `PINTEREST_CLIENT_ID` and `PINTEREST_CLIENT_SECRET` — see [.env.example](.env.example) for details on which one is safe to expose to the browser and which must stay server-side (e.g. in your Vercel project's environment variables)

Local dev over `http://localhost` won't work with Pinterest's OAuth redirect
requirements, so the token-exchange serverless function (`api/pinterest-oauth.ts`)
is meant to run on a deployed host (Vercel). Without OAuth configured, Pinterest
Studio still accepts a manually pasted access token as a fallback.
