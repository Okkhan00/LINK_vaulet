# 🔐 Link Vault

### Private • Offline-First • Fast • Secure

**Link Vault** is a modern personal link manager built to help you save, organize, search, and manage your important website links in one private place.

Your data stays **on your device**. There is no backend, no account system, and no analytics.

> **Your links. Your device. Your privacy.**

---

## 📱 Android APK

### Download the latest Android APK

**[⬇️ Download Link Vault APK](https://github.com/Okkhan00/LINK_vaulet/releases/latest)**

The APK is built automatically using **GitHub Actions**.

No Android Studio is required.

> If the latest Release does not contain an APK yet, open the repository's **Actions** tab and download the `link-vault-android-apk` artifact from the latest successful build.

---

## ✨ Features

### 🔗 Link Management

* Save website links quickly
* Add custom titles and notes
* Organize links with categories
* Add tags for easy filtering
* Edit saved links anytime
* Delete unwanted links

### 🔎 Smart Search

* Search by title
* Search by URL
* Search notes
* Search categories and tags
* Quickly find saved websites

### 🗂️ Organization

* Categories
* Tags
* Favorites
* Recently opened websites
* Smart filtering
* Clean and simple dashboard

### 🗑️ Trash

Deleted links are moved to Trash instead of being immediately removed.

You can:

* Restore deleted links
* Permanently delete links
* Empty Trash

### 🔒 Privacy & Security

* Offline-first architecture
* No backend server
* No user accounts
* No analytics
* No tracking
* Data stored locally on the device
* PIN lock support
* Automatic app lock
* Privacy-focused design

### 📤 Android Share

Save links directly from other Android applications using the Android Share menu.

For example:

**Browser → Share → Link Vault → Save**

This makes saving links quick without manually copying and pasting URLs.

### 💾 Backup & Restore

Create a complete local backup of your saved links.

**Settings → Export Backup**

The backup is saved as:

`link-vault-backup-YYYY-MM-DD.json`

You can later import the backup and choose:

* **Merge** existing and imported links
* **Replace** existing data with the backup

This allows you to keep your data portable without requiring a cloud account.

---

## 🧠 Smart Features

Link Vault is designed around everyday link management.

Useful features include:

* Recently opened websites
* Favorites
* Smart search
* Smart organization
* Quick actions
* Website icons/favicons
* Share-to-save
* Trash and restore
* Local backup and restore
* Automatic locking

---

## 🔐 PIN Lock

Protect your saved links with a personal PIN.

Link Vault can automatically lock after a period of inactivity, helping prevent someone else from accessing your saved links when you leave the app open.

---

## 🏠 Offline-First

Link Vault does not require an internet connection for your saved data.

Your links are stored locally using:

**IndexedDB**

The application does not require:

* A cloud database
* A user account
* A backend API
* A subscription
* Analytics services

Your saved information remains on your device unless you choose to export or share it.

---

## 🛠️ Technology

Link Vault is built with modern web and mobile technologies.

| Technology     | Purpose                |
| -------------- | ---------------------- |
| React          | User interface         |
| TypeScript     | Application logic      |
| Vite           | Frontend build system  |
| Capacitor 7    | Android native wrapper |
| IndexedDB      | Local data storage     |
| GitHub Actions | Automated APK builds   |

### Android Package ID

```text
com.tabeer.linkvault
```

---

## 📦 Project Structure

```text
LINK_vaulet/
│
├── .github/
│   └── workflows/
│       └── build-apk.yml
│
├── scripts/
│   └── patch-android.py
│
├── src/
│
├── public/
│
├── package.json
├── package-lock.json
├── capacitor.config.ts
├── vite.config.ts
└── README.md
```

The Android project can be generated automatically during the GitHub Actions build when the `android/` directory is not committed.

---

# 🚀 Build Android APK

You do **not** need Android Studio.

### Step 1

Push the project to GitHub on the `main` branch.

### Step 2

Open:

**GitHub → Actions → Build Android APK**

### Step 3

The workflow automatically:

1. Installs Node.js
2. Installs npm dependencies
3. Builds the React application
4. Sets up Java
5. Sets up the Android SDK
6. Creates the Capacitor Android project if required
7. Applies the native Android configuration
8. Runs Capacitor sync
9. Builds the debug APK
10. Uploads the APK as a GitHub Actions artifact

### Step 4

After a successful build:

**Actions → Build Android APK → Latest successful run → Artifacts**

Download:

```text
link-vault-android-apk
```

Extract the ZIP and install:

```text
app-debug.apk
```

---

# 💻 Local Development

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

### Build production version

```bash
npm run build
```

### Sync Capacitor

```bash
npx cap sync android
```

---

# 💾 Backup & Restore

### Export

Go to:

**Settings → Export Backup**

A JSON backup file will be created:

```text
link-vault-backup-YYYY-MM-DD.json
```

### Import

Go to:

**Settings → Import Backup**

Link Vault validates the backup before importing it.

You can choose:

```text
Merge
```

or

```text
Replace
```

---

# 🛡️ Privacy

Link Vault is designed with a privacy-first architecture.

### Link Vault does not require:

* ❌ User accounts
* ❌ Login
* ❌ Cloud database
* ❌ Backend server
* ❌ Analytics
* ❌ Advertising SDKs

### Your data:

* ✅ Stored locally
* ✅ Available offline
* ✅ Exportable
* ✅ Restorable from backup
* ✅ Under your control

---

# 📲 Android Permissions

Link Vault only uses Android capabilities required for its features.

The Android Share Target allows other applications to send links directly to Link Vault.

No unnecessary account or cloud permissions are required.

---

# 🔄 Automatic Builds

GitHub Actions automatically builds the Android APK when changes are pushed to:

```text
main
```

or:

```text
master
```

You can also manually start a build from:

**Actions → Build Android APK → Run workflow**

---

# 🏷️ Release APK

Stable APK releases can be published through GitHub Releases.

**Latest Release:**

**[Download Link Vault APK](https://github.com/Okkhan00/LINK_vaulet/releases/latest)**

---

# 👨‍💻 Developer

**AZI CREATION**

**Link Vault**

Built with React, TypeScript, Vite and Capacitor.

---

## ⭐ Support the Project

If you find Link Vault useful:

⭐ Star the repository
🐛 Report bugs
💡 Suggest improvements
🔧 Contribute improvements

---


---

### Link Vault

**Private links. Stored locally. Always available.**
