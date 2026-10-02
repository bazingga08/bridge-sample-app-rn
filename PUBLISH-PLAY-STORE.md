# Publishing "Bridge Link" to Google Play (Internal Testing) — step by step

Goal: get the signed app onto a real **Play Store install** so Android's App
Links verifier checks our `assetlinks.json` for real, and so the **Install
Referrer** (deterministic deferred deep link) carries `bridge_link=lnk_…`.

You do steps marked 🧑. I (Claude) do steps marked 🤖.

---

## What's already done 🤖
- App renamed **Bridge Link**, package **`com.bridgelink_as.app`** (permanent).
- Deep-link debug dashboard built; Install Referrer module wired.
- Signed release bundle built and ready to upload:
  **`android/app/build/outputs/bundle/release/app-release.aab`**
- `assetlinks.json` currently lists the **debug** cert. After upload I add the
  **Play App Signing** cert too (step 6) so Play-installed builds verify.

---

## Step 1 🧑 — Create a Google Play Developer account ($25, one-time)
1. Go to <https://play.google.com/console/signup>
2. Sign in with the Google account you want to own the app.
3. Choose account type **"Yourself"** (personal) — fastest. Pay the $25.
4. Identity verification can be instant or take up to ~48h. You can still
   create the app and upload while it finishes.

## Step 2 🧑 — Create the app
Play Console → **Create app**:
- App name: **Bridge Link**
- Default language: English
- App or game: **App**
- Free or paid: **Free**
- Tick the declarations → **Create app**.

## Step 3 🧑 — Set up Internal Testing (fastest track, no review wait)
Left menu → **Testing → Internal testing** → **Create new release**.

When it asks about **Play App Signing**: **accept / keep it enabled** (default).
Google will manage the real signing key; our keystore is just the *upload* key.

## Step 4 🧑 — Upload the AAB
On the release page → **Upload** → choose the file:
```
~/Desktop/work/bridge/samples/AcmeBridge/android/app/build/outputs/bundle/release/app-release.aab
```
Add a release name (e.g. `1.0 (1)`) and any note → **Next** → **Save**.

> If it complains the app isn't fully set up, fill the few required dashboard
> items (app category, privacy policy URL, content rating, data safety). For an
> internal test these are quick; I can draft the privacy-policy text if needed.

## Step 5 🧑 — Add yourself as a tester & get the link
Internal testing → **Testers** tab → create an email list with your Google
account → **Save**. Copy the **"Join on the web"** opt-in link and open it on
your **phone**, then **Download it on Google Play**.

## Step 6 🤖 — I make Play-installed builds verify
The Play-signed app has a **different SHA-256** than our debug key. You give me:

> Play Console → **Test and release → Setup → App signing** →
> copy the **"App signing key certificate" SHA-256 fingerprint**

Paste it here. I add it to the `assetlinks.json` array (alongside the debug
one), so both your local debug build *and* the Play build verify.

## Step 7 🤖+🧑 — Verify end to end on the Play build
Once installed from Play:
- I check `adb shell pm get-app-links com.bridgelink_as.app` → expect
  `bridge-redirect-engine.onrender.com: verified` (auto, no manual approval).
- Tap a Bridge link from Notes/chat → **Bridge Link** opens directly (§① green).
- **Deferred test:** uninstall, tap a Bridge link → it sends you to the Play
  page → install → open → §② shows `bridge_link=lnk_…` from the Install
  Referrer, and §④ `/v1/match` resolves the deferred link. 🎯

---

## Rebuilding the AAB later
```sh
cd ~/Desktop/work/bridge/samples/AcmeBridge
# bump android/app/build.gradle versionCode (2, 3, …) for each new upload
cd android && ./gradlew bundleRelease
```
Signing is automatic (reads `android/keystore.properties`).

## Keep these safe (gitignored, never commit) 🧑
- `android/app/bridgelink-upload.keystore` — the upload key
- `android/keystore.properties` — its passwords

If you lose the upload key you can reset it via Play Console (because Play App
Signing holds the real key), but back it up anyway.
