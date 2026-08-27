<p align="center">
  <img src="assets/logo.png" width="200" alt="Stash Photos Logo" />
</p>

<h1 align="center">Stash Photos</h1>

<p align="center">
  <strong>Tag & organize your Google Photos — inspired by <a href="https://github.com/stashapp/stash">Stash</a></strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#setup">Setup</a> •
  <a href="#install-apk">Install APK</a> •
  <a href="#development">Development</a> •
  <a href="#architecture">Architecture</a>
</p>

---

## About

Stash Photos is a Progressive Web App (PWA) and Android app that connects to your **Google Photos** library and gives you a powerful **tagging and organization** system — all stored locally on your device.

Think of it as the organization power of [Stash](https://github.com/stashapp/stash), but for your personal Google Photos.

## Features

### 🏷️ Tagging & Organization
- Create **color-coded tags** with custom names
- Organize tags into **categories** for hierarchical grouping
- **Multi-tag** any photo — assign multiple tags per image
- See **tag counts** — how many photos have each tag
- **Filter your gallery** by one or more tags simultaneously

### 📸 Google Photos Integration
- **Read-only** access to your Google Photos library via the official API
- **Infinite scroll** gallery with lazy-loaded thumbnails
- **Browse albums** from your Google Photos account
- **Full-size viewing** with photo metadata (date, camera, dimensions)
- **Video playback** support

### ⭐ Photo Management
- **5-star ratings** per photo
- **Personal notes** attached to any photo
- **EXIF-style metadata** display (creation date, camera make/model, resolution)
- **Quick link** to open any photo directly in Google Photos

### 📱 Cross-Platform
- **PWA** — install on any device from Chrome/Safari (Add to Home Screen)
- **Android APK** — native app wrapper via Capacitor
- **Dark theme** optimized for OLED screens
- **Responsive** — works on phones, tablets, and desktops

### 🔒 Privacy-First
- All tags, ratings, and notes stored **locally in IndexedDB**
- No data sent anywhere except Google Photos API for fetching your library
- **Export/Import** your tag data as JSON backup
- No accounts, no servers, no tracking

## Screenshots

<p align="center">
  <img src="assets/screenshot-gallery.png" width="250" alt="Gallery View" />
  <img src="assets/screenshot-tags.png" width="250" alt="Tag Management" />
  <img src="assets/screenshot-detail.png" width="250" alt="Photo Detail" />
</p>

<p align="center">
  <em>Gallery with tag overlays • Tag manager with categories • Photo detail with tagging panel</em>
</p>

## Setup

### Prerequisites

You need a **Google Cloud OAuth 2.0 Client ID** to connect to Google Photos:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. **Create a new project** (or select an existing one)
3. Enable the [**Photos Library API**](https://console.cloud.google.com/apis/library/photoslibrary.googleapis.com)
4. Configure the **OAuth consent screen** (External / Test mode works for personal use)
5. Create credentials → **OAuth 2.0 Client ID** → Web application
6. Under **Authorized JavaScript origins**, add your app's URL:
   - Local dev: `http://localhost:5173`
   - Production: your deployed URL
7. Copy the **Client ID**

### Web App (PWA)

```bash
# Clone the repo
git clone https://github.com/backip210-pixel/google_stash.git
cd google_stash

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

### First Launch
1. Open the app → Click **Configure Client ID**
2. Paste your OAuth 2.0 Client ID
3. Click **Sign in with Google**
4. Grant Photos Library access
5. Start tagging! 🎉

## Install APK

### Option A: Download Pre-built APK
Download the latest `StashPhotos-v1.0-debug.apk` from the [GitHub Releases](../../releases) page or the repo root.

### Option B: Build Locally
```bash
# Requires JDK 21+ and Android SDK
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Installing on Android
1. Transfer the APK to your phone
2. Enable **Install from Unknown Sources** (Settings → Security)
3. Tap the APK to install
4. Open the app and configure your Google Cloud Client ID

## Development

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Database | IndexedDB via Dexie.js |
| Auth | Google Identity Services (OAuth 2.0) |
| Photos API | Google Photos Library REST API |
| Icons | Lucide React |
| Android Wrapper | Capacitor 7 |

### Project Structure

```
google_stash/
├── src/
│   ├── App.tsx              # Main app + routing
│   ├── auth/
│   │   └── googleAuth.ts    # Google OAuth 2.0 (implicit flow)
│   ├── api/
│   │   └── photosApi.ts     # Google Photos Library API client
│   ├── db/
│   │   └── database.ts      # IndexedDB schema (tags, ratings, notes)
│   ├── components/
│   │   ├── Header.tsx        # Navigation, search, tag filter bar
│   │   ├── Gallery.tsx       # Photo grid with infinite scroll
│   │   ├── PhotoDetail.tsx   # Full photo view + tagging sidebar
│   │   ├── TagManager.tsx    # Tag/category CRUD, stats dashboard
│   │   ├── AlbumsView.tsx    # Google Photos album browser
│   │   └── Settings.tsx      # Client ID config, data export/import
│   └── types/
│       └── index.ts          # TypeScript definitions
├── android/                  # Capacitor Android project
├── .github/workflows/        # CI: auto-build APK on release
├── assets/                   # Logo, screenshots
├── public/
│   ├── manifest.json         # PWA manifest
│   └── icon-*.png            # App icons
└── capacitor.config.ts       # Capacitor configuration
```

### Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npx cap sync         # Sync web build to Android
npx cap open android # Open in Android Studio
```

## Architecture

```
┌─────────────┐     OAuth 2.0      ┌──────────────────┐
│   Google     │ ◄────────────────► │   Google Photos   │
│   Sign-In    │                    │   Library API     │
└──────┬───────┘                    └────────┬─────────┘
       │                                     │
       ▼                                     ▼
┌─────────────────────────────────────────────────────┐
│                 Stash Photos App                      │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Auth     │  │  Gallery  │  │  Tag Manager     │  │
│  │  Module   │  │  View     │  │  (create/edit)   │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │         IndexedDB (Dexie.js)                  │    │
│  │  • Tags        • Photo-Tag associations       │    │
│  │  • Categories  • Ratings & Notes              │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │         Capacitor (Android)                   │    │
│  │  WebView wrapper → native APK                 │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Known Limitations

- **Read-only**: The Google Photos API doesn't allow writing tags/labels back to photos
- **Library API scope**: The `mediaItems.list` endpoint may only return items created by your app depending on API version. If your library appears empty, the Picker API integration (planned) will solve this
- **Local-only data**: Tags/ratings/notes live in your browser's IndexedDB — clearing browser data deletes them (use Export Data as backup)
- **OAuth scope**: Uses `photoslibrary.readonly` — cannot upload or modify photos

## Roadmap

- [ ] Google Photos Picker API integration for batch photo selection
- [ ] Smart tag suggestions based on photo metadata & EXIF data
- [ ] Bulk tagging (select multiple photos → apply tags at once)
- [ ] Tag-based virtual albums/collections
- [ ] Release-signed APK builds via GitHub Actions
- [ ] Photo duplicate detection
- [ ] Import/export tag data as JSON
- [ ] Multi-language support
- [ ] Auto-sync tags to photo descriptions (when API allows)

## License

MIT

---

<p align="center">
  Built with ❤️ using React, Capacitor & Google Photos API
</p>
