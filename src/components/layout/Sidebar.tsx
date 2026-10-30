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
  HardDrive,
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
  | 'backup-data'
  | 'settings'
  | 'audit-trail'
  | 'google-workspace';

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
      title: 'GOOGLE WORKSPACE',
      items: [
        { id: 'google-workspace' as NavTab, label: 'Drive, Docs & Sheets', icon: FileSpreadsheet, highlight: true },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'backup-data' as NavTab, label: 'Backup & Restore Data', icon: HardDrive, highlight: true },
        { id: 'settings' as NavTab, label: 'Business & GST Settings', icon: Settings },
        { id: 'audit-trail' as NavTab, label: 'Audit Trail', icon: History },
      ],
    },
  ];

  const { business } = useBusiness();

  return (
    <aside
      className={`bg-[#F8F7F4] border-r border-[rgba(17,17,19,0.12)] text-[#111113] flex flex-col shrink-0 transition-all duration-300 select-none z-20 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      {!collapsed ? (
        <div className="p-4 sm:p-5 border-b border-[rgba(17,17,19,0.12)]">
          <div className="font-bold text-xl text-[#111113] tracking-tight leading-none">Zavianoice</div>
          <div className="label mt-1">GST Billing System</div>
        </div>
      ) : (
        <div className="p-3.5 border-b border-[rgba(17,17,19,0.12)] flex justify-center">
          <span className="font-bold text-base text-[#111113]">ZV</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-thin">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <h3 className="px-3 label">
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all cursor-pointer rounded text-left ${
                      isActive
                        ? 'bg-white text-[#111113] font-semibold border border-[rgba(17,17,19,0.12)] shadow-2xs'
                        : item.highlight
                        ? 'text-[#4f46e5] hover:bg-[#F1EFEA] hover:text-[#111113] font-medium'
                        : 'text-[#111113]/70 hover:bg-[#F1EFEA] hover:text-[#111113] font-normal'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-opacity ${
                        isActive
                          ? 'text-[#4f46e5]'
                          : item.highlight
                          ? 'text-[#4f46e5]'
                          : 'text-[#111113]/50'
                      }`}
                    />
                    {!collapsed && (
                      <span className="truncate">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Account block matching Variation 1 */}
      {!collapsed && (
        <div className="p-4 border-t border-[rgba(17,17,19,0.12)] bg-[#F8F7F4]">
          <div className="flex items-center justify-between">
            <div className="label">Account</div>
            <button
              type="button"
              onClick={() => onSelectTab('settings')}
              className="text-[10px] font-medium text-[#4f46e5] hover:underline cursor-pointer"
            >
              Settings
            </button>
          </div>
          <div className="mt-1 font-semibold text-xs text-[#111113] truncate">{business.name}</div>
          <div className="text-[10px] font-mono-code text-[#111113]/50 truncate mt-0.5">
            {business.gstin || 'Unregistered'}
          </div>
        </div>
      )}
    </aside>
  );
};
