# Capacitor Build Guide

## Overview

Your XRPL Wallet app is now fully configured for Capacitor! The app can be built as standalone native Android and iOS applications.

## What's Been Done

1. ✅ Installed Capacitor core packages (@capacitor/core, @capacitor/cli, @capacitor/android, @capacitor/ios)
2. ✅ Created `capacitor.config.ts` with app configuration
3. ✅ Added platform detection utility (`client/src/lib/platform.ts`)
4. ✅ Modified XRPL client to bypass CORS proxy on native apps (direct JSON-RPC requests)
5. ✅ Installed native barcode scanning plugin (@capacitor-mlkit/barcode-scanning)
6. ✅ Created Android and iOS project folders

## Key Features

### Standalone Operation
- Native apps make **direct requests** to XRPL nodes (no backend proxy needed)
- All data is stored in browser/native storage (no database dependency)
- The APK/IPA works completely offline from your Replit backend

### Platform Detection
The app automatically detects if it's running as:
- Web browser (uses CORS proxy for JSON-RPC)
- Native Android/iOS (bypasses proxy, makes direct requests)

## Building the Android APK

### Prerequisites
1. Install Java Development Kit (JDK 17 or higher)
2. Install Android Studio
3. Set ANDROID_HOME environment variable

### Steps
1. **Build the web assets:**
   ```bash
   npm run build
   ```

2. **Sync with Capacitor:**
   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

4. **Build the APK in Android Studio:**
   - Go to Build → Build Bundle(s) / APK(s) → Build APK(s)
   - The APK will be in `android/app/build/outputs/apk/debug/app-debug.apk`

### Command Line Build (Alternative)
```bash
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Building for iOS

### Prerequisites
- macOS with Xcode installed
- Apple Developer account (free account works for testing)

### Steps
1. **Build the web assets:**
   ```bash
   npm run build
   ```

2. **Sync with Capacitor:**
   ```bash
   npx cap sync ios
   ```

3. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```

4. **Build in Xcode:**
   - Select your device or simulator
   - Click the Play button to build and run
   - For distribution: Product → Archive

## Testing the App

### Sideloading on Android
1. Enable "Developer Mode" on your Android device
2. Enable "Install from Unknown Sources"
3. Transfer the APK to your device
4. Tap the APK file to install
5. The app will work completely standalone!

### Testing on iOS
1. Connect your iPhone to your Mac
2. Select it as the build target in Xcode
3. Click Run
4. For free Apple accounts: App expires after 7 days

## Development Workflow

1. **Develop features:** Work in Replit, test in the web browser
2. **Build for mobile:** Run `npm run build && npx cap sync`
3. **Test on device:** Sideload the APK or use Xcode
4. **Iterate:** Make changes, rebuild, and test

## Helpful Commands

```bash
# Sync web assets to native projects
npx cap sync

# Sync specific platform
npx cap sync android
npx cap sync ios

# Open in IDE
npx cap open android
npx cap open ios

# Update Capacitor
npm install @capacitor/core@latest @capacitor/cli@latest
npx cap sync
```

## App Configuration

The app is configured in `capacitor.config.ts`:
- **App ID:** com.xrpl.wallet
- **App Name:** XRPL Wallet
- **Web Directory:** dist/public

You can customize these settings before building.

## Next Steps

1. Test the web version thoroughly on Replit
2. Download the project to your local machine
3. Install Java and Android Studio
4. Build the Android APK
5. Sideload and test on your device!

## Notes

- The native app will make direct connections to XRPL nodes
- No backend server is needed for the mobile apps
- All QR scanning works through device camera
- User data is stored in native storage (persists across app restarts)
