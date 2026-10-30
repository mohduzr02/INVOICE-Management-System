import React, { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet, FileText, ChevronDown, Download } from 'lucide-react';

export interface TableExportDropdownProps {
  onExportExcel: () => void;
  onExportCSV: () => void;
  count?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'right';
  variant?: 'emerald' | 'slate' | 'indigo';
}

export const TableExportDropdown: React.FC<TableExportDropdownProps> = ({
  onExportExcel,
  onExportCSV,
  count,
  label = 'Export',
  disabled = false,
  className = '',
  align = 'right',
  variant = 'emerald',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const variantStyles = {
    emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 focus:ring-emerald-400',
    slate: 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 focus:ring-slate-400',
    indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 focus:ring-indigo-400',
  }[variant];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs focus:outline-hidden focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles}`}
        title={`Export current table data as Excel or CSV${count !== undefined ? ` (${count} items)` : ''}`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>
          {label}
          {count !== undefined ? ` (${count})` : ''}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-60 rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150`}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Choose Export Format
            </p>
            {count !== undefined && (
              <p className="text-[11px] text-slate-600 font-medium">
                {count} {count === 1 ? 'record' : 'records'} will be downloaded
              </p>
            )}
          </div>

          {/* Excel Option */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onExportExcel();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs rounded-lg hover:bg-emerald-50/80 transition-colors group cursor-pointer"
            role="menuitem"
          >
            <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 group-hover:text-emerald-900 leading-tight">
                Excel Spreadsheet
              </p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                Formatted workbook (.xlsx)
              </p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-100/60 text-emerald-800">
              .xlsx
            </span>
          </button>

          {/* CSV Option */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onExportCSV();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs rounded-lg hover:bg-blue-50/80 transition-colors group cursor-pointer mt-0.5"
            role="menuitem"
          >
            <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 group-hover:text-blue-900 leading-tight">
                CSV Data File
              </p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                Standard comma-separated (.csv)
              </p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-100/60 text-blue-800">
              .csv
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
