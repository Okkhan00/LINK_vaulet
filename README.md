# Link Vault

Private, offline-first link manager. No backend, no accounts, no analytics. Data stays on device (IndexedDB).
Package ID: `com.tabeer.linkvault`. React + TypeScript + Vite + Capacitor 7.

## Build the APK (no Android Studio needed)
1. Create a GitHub repo and push this project to `main`.
2. Open **Actions → Build Android APK** (runs on push, or click *Run workflow*).
3. When it finishes, open the run and download **link-vault-android-apk** under *Artifacts*. Unzip it and install `app-debug.apk`.

The workflow generates the `android/` project with `npx cap add android` if it isn't committed.

## Local development
`npm install` · `npm run dev` · `npm run build` · `npx cap sync android`

## Backup / restore
Settings → Export Backup shares `link-vault-backup-YYYY-MM-DD.json`. Import Backup validates the file, then asks Merge or Replace.
