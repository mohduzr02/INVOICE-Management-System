# InvoicePro GST — Run Locally on Your Computer

InvoicePro GST is designed to run seamlessly **locally on your computer** using **Local Storage (100% offline & private)** or **Firebase Spark Free (cloud sync)**.

---

## 🚀 Quick Start (Running on Your Local Machine)

### Prerequisites
1. **Node.js** (v18.0.0 or higher) — [Download from nodejs.org](https://nodejs.org/)
2. Terminal (PowerShell / Command Prompt on Windows, Terminal on macOS/Linux)

---

### Option 1: One-Click Launch Script
- **Windows**: Double-click `run-local-windows.bat`
- **macOS / Linux**: Run `./run-local-linux-mac.sh` (make executable with `chmod +x run-local-linux-mac.sh`)

These scripts will automatically check Node.js, run `npm install` on first launch, start the local server, and open `http://localhost:3000` in your default browser.

---

### Option 2: Standard Terminal Commands
1. Clone or extract the application files into a local folder on your computer.
2. Open a terminal in that folder and run:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 💾 Storage Options: Local Storage vs Firebase Spark Free

InvoicePro GST supports two storage engines that you can switch between at any time:

### 1. 💻 Local Computer Storage (Default & 100% Offline)
- **Zero Cloud Setup Required**: Works straight out of the box without any Firebase account, API keys, or internet connection.
- **Privacy First**: All your business data, GST invoices, customer contacts, products, and ledgers remain stored safely inside your computer's browser storage.
- **Instant Speed**: Zero network latency for invoice generation and PDF exports.
- **Data Backups**: You can export a full `.json` database backup at any time from **Settings -> Data & Storage** or the **Run Local** modal, and restore it anytime.

### 2. ☁️ Firebase Spark Free Tier (Cloud Sync & Backup)
- Uses Firebase's **Spark Plan (100% Free)**:
  - Generous free allowances: 50,000 reads/day, 20,000 writes/day, 1 GB storage.
  - Sign in with Google to sync your invoices across your office laptop and desktop.
  - If you hit Spark quota or go offline, the app **automatically and safely falls back to Local Storage** with zero data loss!

---

## 📦 Install as a Desktop Application (PWA)
When running on `http://localhost:3000` in Google Chrome or Microsoft Edge:
1. Click the **Install InvoicePro GST** icon in your browser URL address bar (or menu `...` -> **Apps** -> **Install InvoicePro GST**).
2. The application will install as a standalone desktop window on your Windows/Mac desktop with its own icon and taskbar shortcut!
