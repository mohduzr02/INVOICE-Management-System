#!/usr/bin/env bash
# ===============================================================================
#                InvoicePro GST - Indian GST Billing & Accounting
#                      Running Locally on Your Computer (macOS / Linux)
# ===============================================================================

echo "==============================================================================="
echo "               InvoicePro GST - Running Locally on Your Computer"
echo "==============================================================================="
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    echo "Please download and install Node.js (v18+) from: https://nodejs.org/"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] npm is not installed or not in PATH."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[INFO] First time setup: Installing dependencies..."
    npm install
fi

echo ""
echo "[INFO] Starting InvoicePro GST local server on http://localhost:3000 ..."

# Attempt to open browser
if command -v open >/dev/null 2>&1; then
    open "http://localhost:3000" &
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:3000" &
fi

npm run dev
