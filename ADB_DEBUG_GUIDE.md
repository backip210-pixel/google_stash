# ADB Debugging Guide for Stash Photos

This guide helps you debug photo loading issues using Android Debug Bridge (ADB).

## What is ADB?

ADB (Android Debug Bridge) is a command-line tool that lets you communicate with your Android device. It can show you real-time logs from your apps.

## Step 1: Enable USB Debugging on Your Phone

1. Go to **Settings** → **About phone**
2. Tap **Build number** 7 times (you'll see "You are now a developer!")
3. Go back to **Settings** → **Developer options**
4. Enable **USB debugging**

## Step 2: Install ADB on Your Computer

### Windows
1. Download from: https://developer.android.com/tools/adb
2. Extract the zip file
3. Add the folder to your PATH environment variable

### macOS
```bash
brew install android-platform-tools
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install adb
```

## Step 3: Connect Your Phone

1. Connect your phone to your computer via USB
2. On your phone, accept the "Allow USB debugging?" prompt
3. Verify connection:
   ```bash
   adb devices
   ```
   You should see your device listed

## Step 4: View App Logs

### Option A: Filter for Stash Photos logs (recommended)
```bash
adb logcat | grep -i "stash\|photos\|auth\|api"
```

### Option B: View all logs
```bash
adb logcat
```

### Option C: Save logs to a file
```bash
adb logcat > stash-logs.txt
```
Then open `stash-logs.txt` and search for "Stash" or "Photos"

## Step 5: Look for These Log Patterns

The app logs with specific prefixes to make debugging easier:

| Prefix | What it shows |
|--------|---------------|
| `[App]` | App initialization, media loading |
| `[PhotosAPI]` | API calls, responses, errors |
| `[Main]` | StatusBar configuration |
| `[Test API]` | API test button results |

## Step 6: Common Errors and Solutions

### Error: "No access token"
**What it means:** The OAuth sign-in completed but the token wasn't saved.

**Solution:**
1. Sign out of the app
2. Sign in again
3. Check if the token appears in logs

### Error: "403 Forbidden"
**What it means:** Google rejected the API request due to permissions.

**Solution:**
1. Go to Google Cloud Console
2. Verify Photos Library API is enabled
3. Check OAuth consent screen has your email as test user
4. Verify scopes include `photoslibrary.readonly`

### Error: "404 Not Found"
**What it means:** Wrong API endpoint or the resource doesn't exist.

**Solution:**
1. Check if you have any photos in Google Photos
2. Verify the API base URL is correct

### Error: "CORS" or "Network error"
**What it means:** Browser security blocking the request (web version only).

**Solution:**
1. This shouldn't happen in the APK
2. For web version, check browser console (F12)

### No errors but no photos
**What it means:** API returned empty results.

**Possible causes:**
1. Your Google Photos library is empty
2. API scope is too restrictive
3. Rate limiting from Google

**Solution:**
1. Check if you have photos in Google Photos
2. Try the "Test Google Photos API" button in Settings
3. Wait a few minutes and try again (rate limiting)

## Step 7: Using the API Test Button

1. Open the app
2. Go to **Settings** tab
3. Scroll to **"API Connection Test"**
4. Click **"Test Google Photos API"**
5. Check the result:
   - ✅ Green = Success, shows item count
   - ❌ Red = Error, shows error message

## Quick Commands Reference

```bash
# Check connected devices
adb devices

# View logs filtered for Stash Photos
adb logcat | grep -i "stash"

# Clear log buffer then view
adb logcat -c && adb logcat | grep -i "stash\|photos\|api"

# View only errors
adb logcat *:E

# Save logs to file
adb logcat -d > logs.txt

# Disconnect
adb disconnect
```

## Still Having Issues?

If you've tried everything and photos still don't load:

1. Run this command and save the output:
   ```bash
   adb logcat -d > stash-debug-logs.txt
   ```

2. Share the `stash-debug-logs.txt` file for further analysis

3. Also share:
   - Your Google Cloud Console OAuth Client ID type (Web application?)
   - Authorized JavaScript origins
   - Authorized redirect URIs
   - Whether you're using the APK or web version
