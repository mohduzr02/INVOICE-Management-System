import React, { useState, useRef } from 'react';
import {
  FolderDown,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Database,
  RefreshCw,
  Clock,
  Copy,
  Check,
  Layers,
  HardDrive,
  FileCheck,
  X,
  FileText,
  Users,
  Package,
  CreditCard,
  ShoppingBag,
  Receipt,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useBusiness, BackupValidationResult } from '../../context/BusinessContext';

export const DataBackupRestore: React.FC = () => {
  const {
    invoices,
    customers,
    products,
    purchases,
    payments,
    expenses,
    creditNotes,
    quotations,
    auditLogs,
    appActionLogs,
    reminderRecords,
    businesses,
    business,
    storageMode,
    lastBackupTimestamp,
    exportBackupJSON,
    importBackupJSON,
    validateBackupJSON,
  } = useBusiness();

  // State
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  // Pre-restore inspection modal state
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');
  const [parsedValidation, setParsedValidation] = useState<BackupValidationResult | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 6000);
  };

  // Format date nicely
  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return 'Never backed up';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Time difference helper
  const getTimeAgo = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return null;
    }
  };

  // Export handler
  const handleExport = () => {
    setIsExporting(true);
    try {
      const result = exportBackupJSON();
      showNotification(
        'success',
        `Backup downloaded: ${result.filename} (${result.stats.invoicesCount} Invoices, ${result.stats.customersCount} Customers, ${result.stats.productsCount} Products).`
      );
    } catch (err: any) {
      showNotification('error', `Export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy raw JSON to clipboard
  const handleCopyJSON = () => {
    try {
      const backupData = {
        version: '2.4',
        appName: 'Zavianoice',
        complianceStandard: 'CGST Act 2017 Sec 36/44 (Statutory 72-Month Books Retention)',
        exportedAt: new Date().toISOString(),
        business,
        businesses,
        customers,
        products,
        invoices,
        purchases,
        payments,
        expenses,
        creditNotes,
        quotations,
        auditLogs,
        appActionLogs,
      };
      navigator.clipboard.writeText(JSON.stringify(backupData, null, 2));
      setCopiedJSON(true);
      showNotification('success', 'Full database JSON copied to clipboard!');
      setTimeout(() => setCopiedJSON(false), 3000);
    } catch (e: any) {
      showNotification('error', 'Failed to copy to clipboard.');
    }
  };

  // Process chosen file for inspection
  const processFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      showNotification('error', 'Please upload a valid .json backup file.');
      return;
    }

    setUploadedFileName(file.name);
    setUploadedFileSize((file.size / 1024).toFixed(1) + ' KB');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const validation = validateBackupJSON(text);
        setParsedValidation(validation);
        setInspectModalOpen(true);
      } catch (err: any) {
        showNotification('error', `Error reading file: ${err?.message || 'Invalid format'}`);
      }
    };
    reader.onerror = () => {
      showNotification('error', 'Failed to read the selected file.');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Execute restore after user confirms mode in inspection modal
  const handleExecuteRestore = async () => {
    if (!parsedValidation?.raw) return;
    setIsRestoring(true);
    try {
      const res = await importBackupJSON(parsedValidation.raw, restoreMode);
      if (res.success) {
        setInspectModalOpen(false);
        showNotification(
          'success',
          res.message || 'Database restored successfully!'
        );
      } else {
        showNotification('error', res.message || 'Restore could not be completed.');
      }
    } catch (err: any) {
      showNotification('error', `Restore error: ${err?.message || 'Failed to restore'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const lastAgo = getTimeAgo(lastBackupTimestamp);

  return (
    <div className="space-y-6">
      {/* Toast Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium transition-all shadow-sm ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedbackMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : feedbackMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base">Data Backup & Restore Hub</h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" />
                    CGST Sec 36 Audit Compliant
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                    <HardDrive className="w-3 h-3 text-slate-500" />
                    {storageMode === 'firebase-spark' ? 'Firebase Spark Cloud' : 'Local Offline Storage'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Export complete accounting ledgers as universally portable JSON files. Ensure statutory compliance, backup prior to major fiscal year-ends, or migrate seamlessly across computers.
                </p>
              </div>
            </div>

            {/* Last Backup Badge */}
            <div className="sm:self-start shrink-0">
              <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-2xs flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Database Backup</p>
                  <p className="text-xs font-semibold text-slate-800">
                    {lastBackupTimestamp ? formatDateTime(lastBackupTimestamp) : 'Never backed up'}
                    {lastAgo && <span className="text-[10px] font-normal text-slate-500 ml-1.5">({lastAgo})</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Database Metrics Grid */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/40">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Current Database Inventory ({business.name})</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">All records included in export</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-slate-500">Invoices</span>
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="text-lg font-bold text-slate-900">{invoices.length}</p>
              <p className="text-[10px] text-slate-400">Sales tax bills</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-slate-500">Customers</span>
                <Users className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <p className="text-lg font-bold text-slate-900">{customers.length}</p>
              <p className="text-[10px] text-slate-400">Client parties</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-slate-500">Products</span>
                <Package className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-slate-900">{products.length}</p>
              <p className="text-[10px] text-slate-400">Goods & services</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-slate-500">Purchases</span>
                <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-lg font-bold text-slate-900">{purchases.length}</p>
              <p className="text-[10px] text-slate-400">Vendor inward bills</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-slate-500">Payments</span>
                <CreditCard className="w-3.5 h-3.5 text-violet-500" />
              </div>
              <p className="text-lg font-bold text-slate-900">{payments.length}</p>
              <p className="text-[10px] text-slate-400">Receipts & pay-outs</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-slate-500">Audit & Logs</span>
                <Receipt className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <p className="text-lg font-bold text-slate-900">{auditLogs.length + appActionLogs.length}</p>
              <p className="text-[10px] text-slate-400">Immutable history</p>
            </div>
          </div>
        </div>

        {/* Dual Actions: Export & Restore Panels */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* EXPORT SECTION */}
          <div className="flex flex-col justify-between p-5 rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/40 via-white to-white">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FolderDown className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Backup Data (Export JSON)</h4>
                  <p className="text-[11px] text-slate-500">Export entire business database to a local JSON file</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Generates an encrypted, timestamped <code>.json</code> archive containing your active businesses, tax rates, GSTIN registers, customer master list, inventory catalog, vouchers, payments, and audit logs.
              </p>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Format:</span>
                  <span className="font-mono text-slate-900 font-bold">JSON 2.4 (UTF-8)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Compliance:</span>
                  <span className="text-emerald-700 font-bold">CGST Sec 36/44 (72 Months)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Integrity:</span>
                  <span className="text-indigo-600 font-mono font-medium">Automatic CRC-32 Hash</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-emerald-100 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Preparing Backup...</span>
                  </>
                ) : (
                  <>
                    <FolderDown className="w-4 h-4" />
                    <span>Backup Data (Export .json)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyJSON}
                title="Copy entire database JSON to clipboard"
                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                {copiedJSON ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RESTORE SECTION */}
          <div className="flex flex-col justify-between p-5 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-white">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Restore Data (Import JSON)</h4>
                  <p className="text-[11px] text-slate-500">Import backup from local JSON file • Pre-validation inspection</p>
                </div>
              </div>

              {/* Drag and drop upload zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-400'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processFile(file);
                  }}
                />

                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Drag & Drop backup file here, or <span className="text-indigo-600 underline">browse</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Supports Zavianoice <code>.json</code> backups
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-indigo-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-indigo-500" />
                Pre-restore validation modal inspects all record counts
              </span>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Select File
              </button>
            </div>
          </div>
        </div>

        {/* Legal & Statutory Accordion Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={() => setFaqOpen(!faqOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Statutory Compliance & Data Portability Guarantee (Section 36/44 CGST Act)</span>
            </span>
            {faqOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {faqOpen && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                <strong>1. Why is JSON backup recommended?</strong> Unlike proprietary database exports, JSON is an open, human-readable standard. You can verify your entries using any text editor, import into Excel, or migrate to another machine without internet access.
              </p>
              <p>
                <strong>2. GST Audit Compliance (72 Months):</strong> Section 36 of the Central Goods and Services Tax Act 2017 mandates every registered person to keep and maintain true and correct accounts of production or manufacture of goods, inward and outward supply, stock of goods, input tax credit availed, and output tax payable for <strong>72 months (6 years)</strong> from the due date of furnishing of the annual return.
              </p>
              <p>
                <strong>3. Disaster Recovery & Zero Lock-In:</strong> You own 100% of your data. Regularly saving backup JSON copies to a secondary drive ensures uninterrupted continuity even during OS reinstallations or browser cache clears.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PRE-RESTORE INSPECTION & CONFIRMATION MODAL */}
      {inspectModalOpen && parsedValidation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  parsedValidation.valid ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {parsedValidation.valid ? <FileCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {parsedValidation.valid ? 'Inspect & Confirm Database Restore' : 'Invalid Backup File'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {uploadedFileName} ({uploadedFileSize})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {parsedValidation.valid ? (
                <>
                  {/* File Metadata Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Application</p>
                      <p className="font-semibold text-slate-800">{parsedValidation.metadata?.appName || 'Zavianoice'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Schema Version</p>
                      <p className="font-semibold text-slate-800">v{parsedValidation.metadata?.version || '1.0'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Integrity Checksum</p>
                      <p className="font-mono text-xs font-bold text-indigo-600">{parsedValidation.metadata?.checksum || 'CRC-OK'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Exported Timestamp</p>
                      <p className="font-medium text-slate-700">{formatDateTime(parsedValidation.metadata?.exportedAt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Origin Business</p>
                      <p className="font-medium text-slate-700 truncate">{parsedValidation.metadata?.activeBusinessName || 'Current Business'}</p>
                    </div>
                  </div>

                  {/* Itemized Records Breakdown */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                      Records Contained in File vs Current System
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Invoices:</span>
                        <div className="text-right">
                          <span className="font-bold text-indigo-600">{parsedValidation.stats?.invoicesCount ?? 0}</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-normal">(Now: {invoices.length})</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Customers:</span>
                        <div className="text-right">
                          <span className="font-bold text-blue-600">{parsedValidation.stats?.customersCount ?? 0}</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-normal">(Now: {customers.length})</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Products:</span>
                        <div className="text-right">
                          <span className="font-bold text-emerald-600">{parsedValidation.stats?.productsCount ?? 0}</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-normal">(Now: {products.length})</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Purchases:</span>
                        <div className="text-right">
                          <span className="font-bold text-amber-600">{parsedValidation.stats?.purchasesCount ?? 0}</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-normal">(Now: {purchases.length})</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Payments:</span>
                        <div className="text-right">
                          <span className="font-bold text-violet-600">{parsedValidation.stats?.paymentsCount ?? 0}</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-normal">(Now: {payments.length})</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Expenses:</span>
                        <div className="text-right">
                          <span className="font-bold text-rose-600">{parsedValidation.stats?.expensesCount ?? 0}</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-normal">(Now: {expenses.length})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mode Selection */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Select Restore Strategy
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setRestoreMode('merge')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          restoreMode === 'merge'
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="text-indigo-600 cursor-pointer"
                          />
                          <span>Merge & Update (Safe)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                          Keeps all current records. New invoices, customers, and products in the backup are added, and matching IDs are updated. No current data is erased.
                        </p>
                      </div>

                      <div
                        onClick={() => setRestoreMode('replace')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          restoreMode === 'replace'
                            ? 'border-rose-600 bg-rose-50/50 ring-1 ring-rose-500'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'replace'}
                            onChange={() => setRestoreMode('replace')}
                            className="text-rose-600 cursor-pointer"
                          />
                          <span className="text-rose-700">Full Clean Overwrite</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                          Completely replaces the current database with this exact snapshot. Use when recovering from a crash or transferring a clean business database.
                        </p>
                      </div>
                    </div>
                  </div>

                  {restoreMode === 'replace' && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Caution:</strong> Clean overwrite will replace all existing local database entries. Any invoices created since this backup was taken will be lost.
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>File Validation Error</span>
                  </p>
                  <p>{parsedValidation.error || 'The uploaded file does not adhere to Zavianoice database schema.'}</p>
                  <p className="text-slate-500 text-[11px]">
                    Please select a file exported through the Zavianoice "Export Full Database Backup" button.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {parsedValidation.valid && (
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring}
                  className={`flex items-center gap-1.5 px-4 py-2 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${
                    restoreMode === 'replace'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Restoring Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Confirm & Restore ({restoreMode === 'replace' ? 'Clean Overwrite' : 'Merge Data'})
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
