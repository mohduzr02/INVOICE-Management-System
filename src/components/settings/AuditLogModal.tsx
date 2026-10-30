import React, { useRef, useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import {
  History,
  Download,
  RotateCcw,
  ShieldCheck,
  FileCode,
  Calendar,
  User,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const AuditLogModal: React.FC = () => {
  const {
    auditLogs,
    clearAllSampleData,
    business,
    exportBackupJSON,
    importBackupJSON,
    validateBackupJSON,
  } = useBusiness();
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export full JSON database backup
  const handleExportJsonBackup = () => {
    try {
      const res = exportBackupJSON();
      setActionNotice(`Backup successfully exported: ${res.filename} (${res.stats.invoicesCount} invoices, ${res.stats.customersCount} customers).`);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setErrorMessage(`Export failed: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  // Restore database from selected JSON backup file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setErrorMessage('Please upload a valid .json database backup file.');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const validation = validateBackupJSON(text);
        if (!validation.valid || !validation.raw) {
          setErrorMessage(validation.error || 'The uploaded file is not a valid Zavianoice backup.');
          setTimeout(() => setErrorMessage(null), 5000);
          return;
        }

        const confirmMsg = `Restore database from "${file.name}"?\n\nRecords found:\n• ${validation.stats?.invoicesCount || 0} Invoices\n• ${validation.stats?.customersCount || 0} Customers\n• ${validation.stats?.productsCount || 0} Products\n\nClick OK to merge and restore into your business database.`;
        if (window.confirm(confirmMsg)) {
          const res = await importBackupJSON(validation.raw, 'merge');
          if (res.success) {
            setActionNotice(res.message || 'Database restored successfully!');
            setTimeout(() => setActionNotice(null), 5000);
          } else {
            setErrorMessage(res.message || 'Restore could not be completed.');
            setTimeout(() => setErrorMessage(null), 5000);
          }
        }
      } catch (err: any) {
        setErrorMessage(`Failed to read file: ${err?.message || 'Error'}`);
        setTimeout(() => setErrorMessage(null), 5000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearSampleData = async () => {
    await clearAllSampleData();
    setActionNotice('All unnecessary sample and demo data removed.');
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>Audit Trail & Complete Business Data Backup</span>
          </h2>
          <p className="text-xs text-slate-500">
            Immutable log of all financial modifications, invoice generation events, and database backup exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={handleExportJsonBackup}
            className="btn-primary-v1 text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Export full business database to a local JSON file"
          >
            <Download className="w-4 h-4" />
            <span>Backup Data</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary-v1 text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer"
            title="Import and restore from a JSON backup file"
          >
            <Upload className="w-4 h-4 text-[#4f46e5]" />
            <span>Restore Data</span>
          </button>
          <button
            onClick={handleClearSampleData}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Clear Demo Data</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Security & Accounting Event Logs ({auditLogs.length} events logged)</span>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold z-10">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity Type</th>
                <th className="py-2.5 px-3">Entity ID</th>
                <th className="py-2.5 px-3">Details / Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No recent audit activity recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          log.action === 'CREATE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action === 'UPDATE'
                            ? 'bg-blue-100 text-blue-800'
                            : log.action === 'CANCEL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{log.entityType}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{log.entityId}</td>
                    <td className="py-2.5 px-3 text-slate-700">{log.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
