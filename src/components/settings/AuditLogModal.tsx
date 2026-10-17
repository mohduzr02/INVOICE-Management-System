import React from 'react';
import { useBusiness } from '../../context/BusinessContext';
import {
  History,
  Download,
  RotateCcw,
  ShieldCheck,
  FileCode,
  Calendar,
  User,
} from 'lucide-react';

export const AuditLogModal: React.FC = () => {
  const {
    auditLogs,
    clearAllSampleData,
    clearAllData,
    business,
    customers,
    suppliers,
    products,
    invoices,
    purchases,
    payments,
    expenses,
    creditNotes,
    quotations,
  } = useBusiness();
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);

  // Export full JSON database backup
  const handleExportJsonBackup = () => {
    const backupData = {
      backupTimestamp: new Date().toISOString(),
      business,
      customers,
      suppliers,
      products,
      invoices,
      purchases,
      payments,
      expenses,
      creditNotes,
      quotations,
      auditLogs,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `InvoicePro_Backup_${(business.name || 'Business').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
          <button
            onClick={handleExportJsonBackup}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Full Backup</span>
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
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
          {actionNotice}
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
