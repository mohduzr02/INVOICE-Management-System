import React, { useState, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { AppActionLog } from '../../types';
import {
  X,
  Activity,
  Search,
  Filter,
  Trash2,
  FileText,
  Users,
  CreditCard,
  FileSpreadsheet,
  Bell,
  Settings,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface ActionLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInvoice?: (invoiceId: string) => void;
}

export const ActionLogDrawer: React.FC<ActionLogDrawerProps> = ({
  isOpen,
  onClose,
  onSelectInvoice,
}) => {
  const { appActionLogs } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return appActionLogs.filter((log) => {
      const matchCat = categoryFilter === 'ALL' || log.category === categoryFilter;
      const matchSearch =
        !searchTerm.trim() ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.entityNumber && log.entityNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [appActionLogs, categoryFilter, searchTerm]);

  if (!isOpen) return null;

  const getCategoryIcon = (category: AppActionLog['category']) => {
    switch (category) {
      case 'INVOICE':
        return <FileText className="w-3.5 h-3.5 text-indigo-600" />;
      case 'CUSTOMER':
        return <Users className="w-3.5 h-3.5 text-blue-600" />;
      case 'PAYMENT':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-600" />;
      case 'EXPORT':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />;
      case 'REMINDER':
        return <Bell className="w-3.5 h-3.5 text-purple-600" />;
      case 'AUTOSAVE':
        return <Save className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getStatusBadge = (status?: AppActionLog['status']) => {
    switch (status) {
      case 'success':
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 font-semibold px-1.5 py-0.2 rounded">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            <span>Success</span>
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 font-semibold px-1.5 py-0.2 rounded">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
            <span>Warning</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] text-blue-700 bg-blue-100 font-semibold px-1.5 py-0.2 rounded">
            <Info className="w-2.5 h-2.5 text-blue-600" />
            <span>Info</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/30 border border-indigo-400/30 rounded-lg">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Live App Activity Stream</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Tracking every action taken across the suite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actions, invoices, customers..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {['ALL', 'INVOICE', 'REMINDER', 'EXPORT', 'AUTOSAVE', 'PAYMENT', 'CUSTOMER'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Action List Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-400 mx-auto flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No Recorded Actions Found</p>
              <p className="text-[11px] text-slate-500">
                Actions like creating invoices, adjusting totals, sending reminders, exporting Excel, or auto-saving drafts will be logged here live.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const formattedTime = new Date(log.timestamp).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-indigo-200 transition-all text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      {getCategoryIcon(log.category)}
                      <span>{log.action}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(log.status)}
                      <span className="text-[10px] text-slate-400 font-mono">{formattedTime}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-snug">
                    {log.details}
                  </p>

                  {log.entityNumber && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                      <span className="font-mono">Ref: {log.entityNumber}</span>
                      {log.entityId && onSelectInvoice && log.category === 'INVOICE' && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectInvoice(log.entityId!);
                            onClose();
                          }}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-0.5"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px]">
            {filteredLogs.length} actions displayed
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
          >
            Close Feed
          </button>
        </div>
      </div>
    </div>
  );
};
