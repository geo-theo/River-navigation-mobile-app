# RiverNav Prototype Startup Guide

This guide covers the common ways to run RiverNav Prototype from a Windows PC.

## 1. Open The Project Folder

Open PowerShell and run:

```powershell
cd C:\Users\theoj\Files\Github\River-navigation-mobile-app
```

Install dependencies if this is your first time running the app, or if dependencies changed:

```powershell
npm install
```

## 2. Run In A PC Browser

Use this for the quickest local preview on your computer.

```powershell
npm run web
```

Expo will print a local URL, usually:

```text
http://localhost:8081
```

Open that URL in your browser.

Notes:

- The web version uses the prototype web map preview.
- The native mobile version gives the best GPS and map experience.

## 3. Start Expo For Mobile Testing

Start the Expo development server:

```powershell
npm start
```

This opens the Expo dev tools in your terminal and prints a QR code.

## 4. Run On A Phone With Expo Go

1. Install Expo Go on your iPhone or Android phone.
2. Make sure your phone and PC are on the same Wi-Fi network.
3. In PowerShell, run:

```powershell
npm start
```

4. Scan the QR code:

- Android: scan with Expo Go.
- iPhone: scan with the Camera app or Expo Go.

5. Allow location permission when prompted.

## 5. Run On Android Emulator

Use this if Android Studio and an emulator are installed.

1. Start your Android emulator from Android Studio.
2. In PowerShell, run:

```powershell
npm run android
```

Expo will build and open the app in the emulator.

If the emulator is already open but Expo does not detect it, try:

```powershell
adb devices
```

You should see an emulator listed.

## 6. Run On iOS Simulator

This only works on macOS with Xcode installed.

```bash
npm run ios
```

On Windows, use Expo Go on a physical iPhone instead.

## 7. Verify The App

Run the full local verification check:

```powershell
npm run verify
```

This runs:

- TypeScript checking
- River route parser tests
- Route matching tests
- ETA tests

You can run only the tests with:

```powershell
npm test
```

You can run only TypeScript checking with:

```powershell
npm run typecheck
```

## 8. Build A Web Export

Use this to confirm the web bundle can be generated:

```powershell
npx expo export --platform web --output-dir dist
```

The `dist/` folder is ignored by git.

## 9. Common Fixes

If the browser URL does not load:

```powershell
npm run web
```

Then use the URL Expo prints.

If port `8081` is busy, Expo may offer another port. Accept it and open the new URL.

If dependencies seem broken:

```powershell
npm install
```

If Metro or Expo seems stuck, stop it with `Ctrl+C`, then restart:

```powershell
npm start
```

If phone testing cannot connect:

- Confirm the phone and PC are on the same Wi-Fi network.
- Try switching Expo from LAN mode to Tunnel mode if available.
- Temporarily allow Node/Expo through Windows Firewall if prompted.

## 10. Useful Scripts

```powershell
npm start       # Start Expo
npm run web     # Run browser preview
npm run android # Run Android emulator/device
npm run ios     # Run iOS simulator, macOS only
npm test        # Run tests
npm run verify  # Run typecheck and tests
```
