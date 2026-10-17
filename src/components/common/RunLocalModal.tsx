import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Download,
  Terminal,
  Copy,
  Check,
  X,
  HardDrive,
  Laptop,
  CheckCircle,
  FolderDown,
  Upload,
  Cloud,
  RefreshCw,
  AlertCircle,
  Database,
  ArrowUpDown,
} from 'lucide-react';
import { useBusiness, StorageMode } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';

interface RunLocalModalProps {
  onClose: () => void;
}

export const RunLocalModal: React.FC<RunLocalModalProps> = ({ onClose }) => {
  const {
    storageMode,
    setStorageMode,
    cloudSyncStatus,
    cloudSyncError,
    syncLocalToCloud,
    syncCloudToLocal,
    exportBackupJSON,
    importBackupJSON,
  } = useBusiness();
  const { user } = useAuth();

  const [copiedCmd, setCopiedCmd] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstallPwa(false);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'To install as a Windows Desktop App:\n1. Look at the right side of your browser URL bar for the "Install" or "App available" icon.\n2. Or click the browser 3 dots menu -> "Apps" -> "Install InvoicePro GST".'
      );
    }
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText('npm install && npm run dev');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const handleDownloadBatchScript = () => {
    const batContent = `@echo off
title InvoicePro GST - Local Desktop Edition
color 0b
echo ===============================================================================
echo                InvoicePro GST - Indian GST Billing & Accounting
echo                        Running on Local Computer
echo ===============================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (v18+) from: https://nodejs.org/
    pause
    exit /b 1
)

if not exist node_modules (
    echo [INFO] First time setup: Installing npm dependencies...
    call npm install
)

start "" http://localhost:3000
npm run dev
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'run-local-windows.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadShScript = () => {
    const shContent = `#!/usr/bin/env bash
echo "==============================================================================="
echo "               InvoicePro GST - Running Locally on Your Computer"
echo "==============================================================================="
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed. Please install from https://nodejs.org/"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[INFO] First time setup: Installing dependencies..."
    npm install
fi

if command -v open >/dev/null 2>&1; then
    open "http://localhost:3000" &
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:3000" &
fi

npm run dev
`;
    const blob = new Blob([shContent], { type: 'application/x-sh' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'run-local-linux-mac.sh';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await importBackupJSON(text);
        if (res.success) {
          setImportMessage({ type: 'success', text: res.message });
        } else {
          setImportMessage({ type: 'error', text: res.message });
        }
      } catch (err: any) {
        setImportMessage({ type: 'error', text: err.message || 'Failed to read file' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualSync = async (direction: 'up' | 'down') => {
    setSyncingNow(true);
    setImportMessage(null);
    if (direction === 'up') {
      const ok = await syncLocalToCloud();
      setImportMessage(
        ok
          ? { type: 'success', text: 'All local records uploaded to Firebase Spark Free Cloud!' }
          : { type: 'error', text: 'Could not upload to cloud. Ensure you are signed in and online.' }
      );
    } else {
      const ok = await syncCloudToLocal();
      setImportMessage(
        ok
          ? { type: 'success', text: 'Pulled latest records from Firebase Spark Free Cloud into local storage!' }
          : { type: 'error', text: 'Could not pull from cloud.' }
      );
    }
    setSyncingNow(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Run Locally & Manage Storage</h3>
              <p className="text-xs text-slate-400">Local Storage (100% Offline) or Firebase Spark Free Plan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700 overflow-y-auto">
          {importMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                importMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {importMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{importMessage.text}</span>
            </div>
          )}

          {/* Storage Engine Switcher Box */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-xs">Active Storage Engine</h4>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                  storageMode === 'local'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {storageMode === 'local' ? (
                  <>
                    <HardDrive className="w-3 h-3" />
                    <span>Local Storage (Offline)</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3" />
                    <span>Firebase Spark Free</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              Choose how your billing data is stored. You can switch between completely private Local Storage or Firebase's 100% Free Spark Tier anytime:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStorageMode('local')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  storageMode === 'local'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Local Computer Storage</span>
                  </span>
                  {storageMode === 'local' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  100% Offline & Private. Saved directly on your computer. Zero cloud setup or internet required.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStorageMode('firebase-spark')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  storageMode === 'firebase-spark'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-blue-600" />
                    <span>Firebase Spark Free Cloud</span>
                  </span>
                  {storageMode === 'firebase-spark' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Free cloud sync across computers via Google Sign-In. Automatically falls back to Local Storage if offline!
                </p>
              </button>
            </div>

            {/* Cloud Sync Actions if logged in */}
            {user && (
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span>Cloud Status:</span>
                  <span className="font-semibold text-slate-700 capitalize">{cloudSyncStatus}</span>
                  {cloudSyncError && <span className="text-amber-600">({cloudSyncError})</span>}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={syncingNow}
                    onClick={() => handleManualSync('up')}
                    className="flex items-center gap-1 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 text-indigo-600 ${syncingNow ? 'animate-spin' : ''}`} />
                    <span>Push Local to Cloud</span>
                  </button>
                  <button
                    type="button"
                    disabled={syncingNow}
                    onClick={() => handleManualSync('down')}
                    className="flex items-center gap-1 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowUpDown className="w-3 h-3 text-emerald-600" />
                    <span>Pull Cloud to Local</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section: How to Run Locally */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-slate-900 text-xs">Run on Local Computer via Node.js (Localhost:3000)</h4>
            </div>
            <p className="text-slate-600 text-[11px]">
              Extract or clone the project on your machine, then run in your terminal:
            </p>

            <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-[11px] flex items-center justify-between border border-slate-800">
              <code>npm install &amp;&amp; npm run dev</code>
              <button
                onClick={handleCopyCmd}
                className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded transition-colors cursor-pointer"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleDownloadBatchScript}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer text-xs shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Download Windows Launcher (.bat)</span>
              </button>

              <button
                onClick={handleDownloadShScript}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer text-xs shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-purple-600" />
                <span>Download Mac/Linux Launcher (.sh)</span>
              </button>
            </div>
          </div>

          {/* Section: Desktop App (PWA) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-xs">Install as Windows / Mac Desktop Application</h4>
              </div>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded">
                Recommended
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Installs InvoicePro GST as a standalone desktop window on your computer. Adds a shortcut to your <strong>Windows Taskbar</strong> and <strong>Desktop</strong>.
            </p>
            <button
              onClick={handleInstallPwa}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-lg shadow-sm transition-all cursor-pointer text-xs"
            >
              <Monitor className="w-4 h-4" />
              <span>Install Desktop App on this PC</span>
            </button>
          </div>

          {/* Section: Backup Export & Import */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2.5">
            <div className="flex items-center gap-2">
              <FolderDown className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-slate-900 text-xs">Local Data Backup & Restore</h4>
            </div>
            <p className="text-slate-600 text-[11px]">
              Export your full database snapshot to move to another computer, or restore a previously saved JSON backup file.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={exportBackupJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer text-xs"
              >
                <FolderDown className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Local Backup (.json)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer text-xs"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Import Backup (.json)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
