# Stash Photos - TPDB Hash Generator

A simple web app to generate SHA256 and OSHash hashes for photos and videos, compatible with ThePornDB auto-tagger.

## ✨ Features

- 📁 **Drag & drop** or select files from your device
- 🔐 **SHA256 hash** generation for all files
-  **OSHash generation** for video files (MP4, AVI, MKV, MOV, etc.)
- 💾 **Export to JSON** file for ThePornDB scraper
- 📋 **Copy to clipboard** for quick sharing
- 🌐 **Works in any browser** - no installation needed
- 📱 **Mobile-friendly** - works on phones and tablets

## 🚀 Live Demo

Visit: **https://backip210-pixel.github.io/stash-photos/**

## 📖 How to Use

1. **Open the app** in your browser
2. **Select photos/videos** - drag & drop or click "Choose Files"
3. **Click "Generate Hashes"** - wait for processing
4. **Download JSON** - save the hash file
5. **Use with ThePornDB** - import into Stash or your scraper

##  Technical Details

### Hash Types Generated

#### SHA256
- Standard cryptographic hash
- Works for all file types
- Used by most scrapers for matching

#### OSHash (Video files only)
- Based on file size + first/last 64KB
- Similar to ThePornDB's OSHash format
- Helps identify video files

### JSON Output Format

```json
[
  {
    "sha256": "abc123...",
    "osHash": "def456...",
    "size": 1234567,
    "filename": "video.mp4"
  }
]
```

## 🛠️ Development

This is a **static web app** - no build process needed!

### Files
- `index.html` - Main page
- `styles.css` - Styling
- `app.js` - Application logic

### Local Testing

Just open `index.html` in your browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

Or use a local server:

```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve
```

Then visit: http://localhost:8000

##  Deployment

The app auto-deploys to GitHub Pages on every push to `main`.

### Manual Deployment

1. Go to your repository settings
2. Enable GitHub Pages
3. Set source to `main` branch
4. The app will be live at: `https://[username].github.io/[repo]/`

## 🤝 Contributing

Pull requests welcome! This is a simple project, so contributions are easy.

## 📝 License

MIT License - feel free to use and modify as needed.

## 🔗 Related Projects

- [ThePornDB](https://theporndb.net) - Movie and scene database
- [Stash](https://github.com/stashapp/stash) - Media organizer
- [Jellyfin Plugin.ThePornDB](https://github.com/ThePornDatabase/Jellyfin.Plugin.ThePornDB) - Jellyfin integration

---

**Made with ❤️ for the data hoarding community**
