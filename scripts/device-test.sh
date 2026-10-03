#!/usr/bin/env bash
# Real-device deep-link test suite for Bridge Link. Drives a USB-connected
# Android phone with adb and checks where each tap actually lands.
#
#   scripts/device-test.sh [path/to/app-release.apk]
#
# Covers: app installed (closed / background / on screen; Messages-style and
# Chrome taps; expired + unknown links) and app NOT installed (store mode →
# Google Play). Needs: adb, python3, the phone unlocked and online.
# Deferred-after-install needs a real Google Play install and is NOT covered here.
set -u
APK="${1:-android/app/build/outputs/apk/release/app-release.apk}"
E="${BRIDGE_ENGINE:-https://bridge-redirect-engine.onrender.com}"
P=com.bridgelink_as.app
pass=0; fail=0; results=()

texts() {  # visible texts of the current screen, one per line
  adb shell uiautomator dump /sdcard/bl-ui.xml >/dev/null 2>&1
  adb shell cat /sdcard/bl-ui.xml | python3 -c 'import re,sys,html; print("\n".join(html.unescape(t) for t in re.findall(r"text=\"([^\"]+)\"", sys.stdin.read())))'
}
top() { adb shell dumpsys activity activities | grep -m1 topResumedActivity | grep -oE "com[^ /]*/[^ ]*"; }
# Host+path of Chrome's most recently active tab (via Chrome's debugging socket).
chrome_page() {
  adb forward tcp:9227 localabstract:chrome_devtools_remote >/dev/null 2>&1
  curl -s -m 5 localhost:9227/json | python3 -c 'import json,sys
from urllib.parse import urlparse
t=[x for x in json.load(sys.stdin) if x.get("type")=="page"]
u=urlparse(t[0]["url"]) if t else None
print((u.netloc+u.path) if u else "")' 2>/dev/null
  adb forward --remove tcp:9227 >/dev/null 2>&1
}
expect_chrome_page() {  # name, expected host/path
  local t0=$SECONDS got=""
  # DevTools' first tab isn't always the visible one (many tabs open), so also
  # accept the address bar on screen showing the expected page.
  while (( SECONDS - t0 < 20 )); do
    got="$(top) $(chrome_page)"; [[ "$got" == *"com.android.chrome"*"$2"* ]] && break
    [[ "$(top)" == *"com.android.chrome"* ]] && texts | grep -qF "$2" && { got="com.android.chrome (address bar) $2"; break; }
    sleep 1
  done
  check "$1 [$(( SECONDS - t0 ))s]" "$2" "$got"
}
fresh() { echo "?t=$(date +%s%N)"; }
check() {  # name, expected-substring, actual
  if [[ "$3" == *"$2"* ]]; then pass=$((pass+1)); results+=("PASS  $1"); else fail=$((fail+1)); results+=("FAIL  $1  (expected '$2')"); fi
}
# Wait (up to 20 s) until the screen shows / the foreground app is the expected
# one, then record PASS with the time it took. No fixed sleeps: timing varies.
expect_text() {  # name, expected
  local t0=$SECONDS got=""
  while (( SECONDS - t0 < 20 )); do got="$(texts)"; [[ "$got" == *"$2"* ]] && break; sleep 1; done
  check "$1 [$(( SECONDS - t0 ))s]" "$2" "$got"
}
expect_top() {  # name, expected
  local t0=$SECONDS got=""
  while (( SECONDS - t0 < 20 )); do got="$(top)"; [[ "$got" == *"$2"* ]] && break; sleep 1; done
  check "$1 [$(( SECONDS - t0 ))s]" "$2" "$got"
}
direct() { adb shell am start -a android.intent.action.VIEW -d "$E/$1$(fresh)" >/dev/null 2>&1; }
# Each automated Chrome tap uses a fresh tab: Chrome throttles a tab that keeps
# launching apps without a user gesture (a real finger tap is not affected).
chrome() { adb shell am start -a android.intent.action.VIEW -d "$E/$1$(fresh)" -p com.android.chrome --ez create_new_tab true -e com.android.browser.application_id bridge.devicetest >/dev/null 2>&1; }
killapp() { adb shell am force-stop $P; sleep 1; }
launch() { adb shell monkey -p $P -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; sleep 4; }
home() { adb shell input keyevent KEYCODE_HOME; sleep 3; }

adb get-state >/dev/null 2>&1 || { echo "No Android device connected."; exit 2; }
# adb install can hang (e.g. another tool holding the connection): time-box it.
install_app() {
  local flag="${1:-}"
  ( adb install $flag "$APK" >/dev/null 2>&1 ) & local pid=$!
  ( sleep 120; kill $pid 2>/dev/null ) & local watchdog=$!
  wait $pid; local rc=$?; kill $watchdog 2>/dev/null; wait $watchdog 2>/dev/null
  [ $rc -eq 0 ] || { echo "Install failed or hung (exit $rc). Close screen-mirroring tools and retry."; exit 3; }
  adb shell pm set-app-links-user-selection --package $P --user 0 true "${E#https://}" >/dev/null 2>&1
}
curl -s -o /dev/null -m 90 "$E/healthz/deep"   # wake the engine first

echo "▶ App installed"
install_app -r
killapp; direct bl-product;   expect_text "Messages tap · app closed → Product #42 red"   "Product #42"
launch; home; direct bl-category; expect_text "Messages tap · background → Category shoes" "Category: shoes"
direct bl-invite;             expect_text "Messages tap · on screen → Invite ANU"        "invited by ANU"
killapp; chrome bl-promo;     expect_text "Chrome tap · app closed → coupon applied"     "DIWALI20"
home; chrome bl-unknown;      expect_text "Chrome tap · background → not recognised"     "Link not recognised"
direct bl-expired;            expect_text "Expired link → clear message"                 "expired"

echo "▶ App NOT installed"
adb uninstall $P >/dev/null; home
chrome bl-promo;              expect_top "Not installed · store mode → Google Play"      "com.android.vending"
home; chrome summer;          expect_chrome_page "Not installed · auto mode, app not on Play → website (not 'Item not found')" "example.com/sale"
install_app
home; chrome bl-product;      expect_top "Reinstalled → link opens the app again"        "$P"

echo; printf '%s\n' "${results[@]}"
echo; echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
