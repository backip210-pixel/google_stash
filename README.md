# Stash Photos Native

A React Native app for tagging photos and generating hashes for **ThePornDB** auto-tagger integration.

## Features

### Photo Tagging
- Browse device photo library
- Multi-select photos for batch operations
- Add custom tags with color coding
- Rename files with tags: `2024-01-15_Beach_Sunset_Family.jpg`
- Tags written to filename for Google Photos search

### ThePornDB Hash Generation
- Generate **SHA256** hashes for photo matching
- Generate **OSHash** for video file matching
- Export hashes to JSON for TPDB scraper
- Batch processing with progress indicator

### Adaptive Icons
- Works with all Android launcher shapes (circular, rounded square, square)
- Dark theme optimized for OLED screens

## Installation

### Prerequisites
- Node.js 18+
- npm
- Expo CLI: `npm install -g eas-cli`
- Android device or emulator

### Setup
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on Android
npx expo start --android
```

## Building APK

### Using EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project (first time only)
eas build:configure

# Build APK
eas build --platform android --profile preview
```

### Using GitHub Actions
1. Fork this repository
2. Go to Settings → Secrets → Actions
3. Add `EXPO_TOKEN` secret (get from `eas whoami`)
4. Push to main branch - APK will build automatically

## Usage

### Tagging Photos
1. Open app and grant photo library permissions
2. Long-press photos to enter selection mode
3. Tap additional photos to select
4. Tap **Tag** button in header
5. Create new tags or select existing ones
6. Tap **Apply Tags** to rename files

### Generating Hashes for ThePornDB
1. Select photos/videos (long-press to start selection)
2. Tap **Hash** button in header
3. Tap **Generate Hashes**
4. Wait for processing to complete
5. Tap **Export JSON** to save hash file
6. Use the JSON file with your TPDB scraper

### Hash File Format
```json
[
  {
    "sha256": "abc123...",
    "osHash": "def456...",
    "size": 1234567,
    "filename": "IMG_1234.jpg"
  }
]
```

## ThePornDB Integration

The generated hash file can be used with scrapers like:
- **Stash** - Import hashes for automatic scene matching
- **Jellyfin Plugin.ThePornDB** - Hash-based matching
- **Custom scripts** - Use the JSON directly with TPDB API

### Example: Stash Import
1. Export hashes from this app
2. In Stash, go to Settings → Metadata Providers
3. Add your TPDB API key
4. Use the hash file for batch tagging

## Project Structure

```
stash-photos-native/
├── App.tsx                    # Main app component
├── src/
│   ├── services/
│   │   ├── photoService.ts    # Photo library access
│   │   ├── fileService.ts     # File operations & renaming
│   │   └── hashService.ts     # Hash generation (SHA256, OSHash)
│   └── types/
│       └── index.ts           # TypeScript types
├── assets/
│   └── icons/                 # Adaptive icon XML files
├── app.json                   # Expo config
├── eas.json                   # EAS Build config
└── package.json
```

## Adaptive Icons

The app uses Android adaptive icons with separate foreground and background layers:
- **Background**: Dark navy (#0d1117)
- **Foreground**: Camera icon in blue (#58a6ff)

This ensures the icon looks correct on all launcher shapes.

## Development

### Running Tests
```bash
npx tsc --noEmit    # Type checking
```

### Code Style
- TypeScript strict mode
- React Native best practices
- Expo managed workflow

## Troubleshooting

### Photos not showing
- Check app permissions in Android settings
- Ensure photos are on device (not cloud-only)

### Hash generation fails
- Ensure files are accessible
- Check available storage space
- Large files may take longer

### APK build fails
- Clear Expo cache: `npx expo start --clear`
- Delete node_modules and reinstall
- Check EAS CLI version: `eas --version`

## License

MIT

## Contributing

PRs welcome! Please read the contributing guidelines first.
