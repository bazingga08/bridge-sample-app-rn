# Acme — Bridge React Native (CLI) sample

A bare React Native app you fully control (real `AndroidManifest.xml`,
`Info.plist`, entitlements) to test Bridge end-to-end — including native
**App Links (Android)** + **Universal Links (iOS)** verified via Bridge's
`/.well-known/assetlinks.json` and `apple-app-site-association`.

Pre-wired for the host **bridge-redirect-engine.onrender.com**:
- `android/app/src/main/AndroidManifest.xml` — `autoVerify` intent-filter (https host) + `acmebridge://` scheme
- `ios/AcmeBridge/AcmeBridge.entitlements` — `applinks:` Associated Domain
- `App.tsx` — shows the opening link (proves direct open) + deferred `/v1/match` + events

## Setup
```sh
npm install
```

## ▶️ Android — the real App-Links test (no paid account)
1. Run on a connected device/emulator (debug build):
   ```sh
   npx react-native run-android
   ```
2. Get the build's signing **SHA-256**:
   ```sh
   cd android && ./gradlew signingReport
   # copy the SHA-256 under "Variant: debug" (Config: debug)
   ```
3. **Send me that SHA-256** → I add it to the Bridge app config so
   `https://bridge-redirect-engine.onrender.com/.well-known/assetlinks.json`
   lists `com.acmebridge`/your package + the fingerprint (currently 404 — by design, no SHA yet).
4. Re-verify the link association on the device:
   ```sh
   adb shell pm verify-app-links --re-verify com.acmebridge
   adb shell pm get-app-links com.acmebridge   # should show the host as "verified"
   ```
5. **Tap a Bridge link** on the phone (e.g. from a chat) → Acme opens directly →
   the green "Opened via link" banner shows. ✅ App Links verified.

> The package id is whatever `applicationId` is in `android/app/build.gradle`
> (default `com.acmebridge`). Tell me the exact one with the SHA.

## 🍎 iOS — Universal Links (needs Apple Developer account)
1. Open `ios/AcmeBridge.xcworkspace` in Xcode → target → **Signing & Capabilities**
   → **+ Capability → Associated Domains** (this wires the `.entitlements` file).
2. Set your Team in Signing. Send me your **Team ID + bundle id** → I put them in
   the Bridge app config so `apple-app-site-association` is valid.
3. Build to a real device (free 7-day provisioning works for a quick test, or TestFlight).
4. Tap a Bridge link → Acme opens directly.

## What proves what
| Test | Proves |
|---|---|
| `run-android` + tap link (after SHA) | **Android App Links** via assetlinks.json |
| iOS signed build + tap link | **Universal Links** via apple-app-site-association |
| "Check for a deferred link" button | deferred `/v1/match` round-trip |
| signup / purchase buttons | conversion events → dashboard funnel |
