# Stash Photos Native

A React Native app for tagging and organizing your photos **before** uploading them to Google Photos.

## Why This Approach?

Instead of trying to work around Google Photos API limitations, this app:
1. **Reads** photos from your device
2. **Tags** them with custom keywords (writes to filename)
3. **Renames** files: `2024-01-15_Beach_Sunset_Family.jpg`
4. **You upload** to Google Photos normally
5. **Google Photos** can now search by your tags!

## Features

### Photo Browser
- Browse your device photos in a grid
- Multi-select photos for batch tagging
- See existing tags (extracted from filenames)

### Tag Management
- Create custom tags with colors
- Organize tags by category (People, Places, Events, etc.)
- Long-press to delete tags

### Smart File Renaming
- Format: `YYYY-MM-DD_Tag1_Tag2_OriginalName.jpg`
- Preserves original filename
- Google Photos can search by these tags

### Metadata Writing
- Writes IPTC/EXIF keywords to photo files
- Tags persist even if filename is changed
- Google Photos reads this metadata for search

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`

### Setup
```bash
cd stash-photos-native
npm install
```

### Development
```bash
# Start Expo dev server
npm start

# Run on Android device/emulator
npm run android

# Run on iOS simulator
npm run ios
```

### Build APK
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build Android APK
eas build --platform android --profile preview
```

## How It Works

### 1. Photo Selection
- App requests access to your photo library
- Displays photos in a grid
- Tap to select multiple photos

### 2. Tagging
- Open tag editor
- Select existing tags or create new ones
- Tags are color-coded for easy identification

### 3. File Processing
- Photos are copied to app storage
- Filenames are updated with tags
- EXIF/IPTC metadata is written
- Processed photos are saved back to library

### 4. Upload to Google Photos
- Open Google Photos
- Upload the tagged photos
- Google Photos indexes the metadata
- Search works natively!

## Tag Format

Filenames are formatted as:
```
YYYY-MM-DD_Tag1_Tag2_..._OriginalName.jpg
```

Example:
- Original: `IMG_12345.jpg`
- Tagged: `2024-01-15_Beach_Sunset_Family_IMG_12345.jpg`

Google Photos can search for "Beach", "Sunset", or "Family" and find this photo.

## Metadata Standards

The app writes tags in multiple formats for maximum compatibility:

### IPTC Keywords
- Standard for photo metadata
- Supported by most photo apps
- Google Photos reads these

### EXIF UserComment
- Embedded in photo file
- Preserved through most operations
- Searchable by Google Photos

### XMP Metadata
- Adobe's extensible format
- Very flexible
- Future-proof

## Project Structure

```
stash-photos-native/
├── App.tsx                 # Main app component
├── src/
│   ├── components/         # React components
│   ├── services/           # Business logic
│   │   ├── photoService.ts # Photo library access
│   │   ├── metadataService.ts # EXIF/IPTC writing
│   │   └── fileService.ts  # File operations
│   ├── types/              # TypeScript types
│   └── utils/              # Helper functions
├── app.json               # Expo config
├── eas.json               # EAS Build config
├── package.json
└── tsconfig.json
```

## Roadmap

### MVP (Current)
- ✅ Photo browsing
- ✅ Multi-select
- ✅ Tag creation
- ✅ File renaming
- ✅ Basic metadata writing

### v1.1
- [ ] AI-assisted tagging (object detection)
- [ ] Bulk operations (apply tags to entire album)
- [ ] Tag suggestions based on location/date
- [ ] Export/import tag library

### v1.2
- [ ] Auto-sync with Google Photos
- [ ] Cloud backup of tag database
- [ ] Collaborative tagging
- [ ] Tag templates

## Troubleshooting

### Photos not showing up
- Check app permissions
- Make sure photos are on device (not cloud-only)
- Restart app

### Tags not appearing in Google Photos
- Wait a few minutes after upload
- Try searching by exact tag name
- Check if metadata was written (use a metadata viewer app)

### App crashes on large selections
- Limit selections to 50 photos at a time
- Close other apps to free memory

## License

MIT

## Contributing

PRs welcome! Please read the contributing guidelines first.
