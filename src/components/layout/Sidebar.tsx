import React from 'react';
import { useBusiness } from '../../context/BusinessContext';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  FileCheck2,
  Users,
  Truck,
  Package,
  Receipt,
  ShoppingCart,
  DollarSign,
  Scale,
  BookOpen,
  PieChart,
  FileSpreadsheet,
  Settings,
  History,
  HelpCircle,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'invoice-generator'
  | 'invoice-register'
  | 'quotations'
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'purchases'
  | 'expenses'
  | 'payments'
  | 'credit-notes'
  | 'ledgers'
  | 'gstr1'
  | 'gstr3b'
  | 'gstr2b'
  | 'settings'
  | 'audit-trail';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, collapsed }) => {
  const sections = [
    {
      title: 'CORE',
      items: [
        { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'SALES & INVOICING',
      items: [
        { id: 'invoice-generator' as NavTab, label: 'Create Invoice', icon: FilePlus, highlight: true },
        { id: 'invoice-register' as NavTab, label: 'Invoice Register', icon: FileText },
        { id: 'quotations' as NavTab, label: 'Quotations / Estimates', icon: FileCheck2 },
      ],
    },
    {
      title: 'CONTACTS & CATALOG',
      items: [
        { id: 'customers' as NavTab, label: 'Customers', icon: Users },
        { id: 'suppliers' as NavTab, label: 'Suppliers', icon: Truck },
        { id: 'products' as NavTab, label: 'Products & Inventory', icon: Package },
      ],
    },
    {
      title: 'PURCHASES & EXPENSES',
      items: [
        { id: 'purchases' as NavTab, label: 'Purchase Bills (ITC)', icon: ShoppingCart },
        { id: 'expenses' as NavTab, label: 'Expenses', icon: Receipt },
      ],
    },
    {
      title: 'VOUCHERS & LEDGERS',
      items: [
        { id: 'payments' as NavTab, label: 'Payments & Receipts', icon: DollarSign },
        { id: 'credit-notes' as NavTab, label: 'Credit & Debit Notes', icon: Scale },
        { id: 'ledgers' as NavTab, label: 'Account Ledgers', icon: BookOpen },
      ],
    },
    {
      title: 'GST REPORTING & COMPLIANCE',
      items: [
        { id: 'gstr1' as NavTab, label: 'GSTR-1 Return Prep', icon: PieChart },
        { id: 'gstr3b' as NavTab, label: 'GSTR-3B Summary', icon: FileSpreadsheet },
        { id: 'gstr2b' as NavTab, label: 'GSTR-2B Reconciliation', icon: Scale },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'settings' as NavTab, label: 'Business & GST Settings', icon: Settings },
        { id: 'audit-trail' as NavTab, label: 'Audit Trail & Backup', icon: History },
      ],
    },
  ];

  const { business } = useBusiness();

  return (
    <aside
      className={`bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 select-none z-20 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <h3 className="px-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                {section.title}
              </h3>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : item.highlight
                        ? 'text-indigo-400 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Active Company Badge in Sidebar */}
      {!collapsed && (
        <div className="p-2.5 mx-2 mb-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="" className="w-6 h-6 object-contain rounded bg-white p-0.5 shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded bg-indigo-600/30 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                {business.name?.substring(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{business.name}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{business.gstin || 'Unregistered'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline shrink-0 cursor-pointer"
          >
            Manage
          </button>
        </div>
      )}

      {/* Footer helper note */}
      {!collapsed && (
        <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Indian GST Rule Compliant</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">FY 26-27</span>
        </div>
      )}
    </aside>
  );
};
