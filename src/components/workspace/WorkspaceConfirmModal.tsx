import React from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface WorkspaceConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemCount?: number;
  itemsList?: string[];
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const WorkspaceConfirmModal: React.FC<WorkspaceConfirmModalProps> = ({
  isOpen,
  title,
  description,
  itemCount,
  itemsList,
  confirmLabel = 'Confirm Action',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmVariant === 'danger'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                {confirmVariant === 'danger' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Google Workspace Authorization</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4">
            <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

            {itemCount !== undefined && itemCount > 0 && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="font-semibold text-slate-700">
                  Target items affected: <span className="font-mono text-indigo-600">{itemCount}</span>
                </div>
                {itemsList && itemsList.length > 0 && (
                  <ul className="mt-1.5 space-y-1 max-h-28 overflow-y-auto font-mono text-[11px] text-slate-600">
                    {itemsList.map((item, idx) => (
                      <li key={idx} className="truncate">• {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                confirmVariant === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isLoading && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              )}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
