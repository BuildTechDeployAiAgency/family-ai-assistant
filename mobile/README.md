# Family AI — Expo app

Native iOS / Android / Web client built with Expo Router (SDK 56). Runs on
**mock data** (`src/data/fixtures.ts`) — no backend/auth yet. Supabase + the
`api/` proxy get wired in later (Phase 1/3).

## Run in Expo Go (now)

```bash
cd mobile
npx expo start          # prints a QR code
```

Scan the QR with the **Expo Go** app (iOS App Store / Play Store) on a phone on
the same Wi-Fi. App loads in ~30s.

> If `npm` errors with a Socket `429`, npm is aliased to `socket npm`. Use the
> real binary: `/opt/homebrew/opt/node@22/bin/npm install`. Running scripts
> (`npx expo start`) is unaffected.

Simulator shortcuts after `expo start`: press `i` (iOS sim), `a` (Android), `w` (web).

## Structure

```
src/app/
  _layout.tsx          root Stack (dark nav theme)
  (tabs)/_layout.tsx   bottom tabs: Documents / School / Actions
  (tabs)/index.tsx     Documents — expiry badges, renewal progress
  (tabs)/school.tsx    Inbox — family communications
  (tabs)/actions.tsx   AI-extracted action items (local complete toggle)
  document/[id].tsx    document detail + renewal plan steps
  email/[id].tsx       message + AI analysis (summary, actions, dates, draft reply)
src/data/fixtures.ts   mock family data (Hassan demo)
src/lib/helpers.ts     date/status/aggregation logic
src/components/ui.tsx   Card, Pill, Avatar, ProgressBar
src/constants/theme.ts  BTD brand palette (Brand.*)
```

## Path to TestFlight / App Store (later)

App is already configured for it: `ios.bundleIdentifier = com.buildtechdeploy.familyai`.

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile preview   # cloud build, no local Xcode
eas submit --platform ios                      # uploads to App Store Connect → TestFlight
```

Requires an Apple Developer account ($99/yr). EAS builds in the cloud, so no Mac
toolchain setup needed. TestFlight invites go out from App Store Connect.

## Next (when backend is ready)

- Add Supabase auth gate (deferred from GSD plan 02-01)
- Replace `src/data/fixtures.ts` reads with `api/` fetches
- Document scan → AI extraction (expo-camera + `/api/ai/*` proxy)
