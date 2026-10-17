#!/usr/bin/env bash
# InvoicePro GST - Local Computer Launcher (macOS / Linux)

echo "==============================================================================="
echo "               InvoicePro GST - Indian GST Billing & Accounting"
echo "                       Running on Local Computer"
echo "==============================================================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    echo "Please download and install Node.js (v18+) from https://nodejs.org/"
    exit 1
fi

echo "[OK] Node.js version: $(node -v)"

if [ ! -d "node_modules" ]; then
    echo "[INFO] First time setup: Installing npm dependencies..."
    npm install
fi

echo "[INFO] Starting local development server on http://localhost:3000..."

# Open browser based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:3000" &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "http://localhost:3000" &
fi

npm run dev
