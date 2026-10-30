import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import {
  Building2,
  CloudCheck,
  CloudOff,
  LogIn,
  LogOut,
  PlusCircle,
  FileText,
  ShieldCheck,
  Menu,
  Laptop,
  Sparkles,
  ChevronDown,
  Check,
  Plus,
  Activity,
} from 'lucide-react';
import { GlobalSearchBar } from '../common/GlobalSearchBar';
import { CompanyModal } from '../common/CompanyModal';
import { GoogleSignInButton } from '../common/GoogleSignInButton';
import { ActionLogDrawer } from '../common/ActionLogDrawer';

interface HeaderProps {
  onNewInvoice: () => void;
  toggleSidebar: () => void;
  onOpenRunLocal?: () => void;
  onSelectInvoice?: (invoiceId: string, action?: 'preview' | 'edit') => void;
  onSelectCustomer?: (customerId: string, action?: 'ledger' | 'details') => void;
  onSelectProduct?: (productId?: string) => void;
  onOpenAI?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewInvoice,
  toggleSidebar,
  onOpenRunLocal,
  onSelectInvoice = () => {},
  onSelectCustomer = () => {},
  onSelectProduct = () => {},
  onOpenAI,
}) => {
  const { user, isWorkspaceConnected, signInWithGoogle, connectWorkspace, logOut } = useAuth();
  const { business, businesses, activeBusinessId, switchBusiness, storageMode, cloudSyncStatus, appActionLogs, latestAppAction } = useBusiness();
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-[#F8F7F4] border-b border-[rgba(17,17,19,0.12)] px-2 sm:px-3 lg:px-6 flex items-center justify-between sticky top-0 z-30 gap-1.5 sm:gap-2.5 w-full max-w-full overflow-hidden shrink-0">
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 sm:p-2 rounded text-[#111113]/70 hover:text-[#111113] hover:bg-black/[0.05] transition-colors cursor-pointer shrink-0"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded bg-[#111113] text-[#F8F7F4] flex items-center justify-center font-bold text-xs shrink-0 tracking-tight">
            ZV
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-[#111113] tracking-tight leading-none text-base sm:text-lg whitespace-nowrap">
              Zavianoice
            </h1>
            <div className="label mt-0.5">GST Billing System</div>
          </div>
        </div>

        {/* Business Selector / Company Switcher Dropdown */}
        <div className="relative hidden md:flex items-center gap-1.5 pl-2 sm:pl-3 border-l border-[rgba(17,17,19,0.12)] ml-1 sm:ml-2 shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
            className="flex items-center gap-1.5 sm:gap-2 text-xs bg-white hover:bg-[#F1EFEA] text-[#111113] px-2.5 sm:px-3 py-1.5 rounded border border-[rgba(17,17,19,0.12)] transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Click to switch or add company"
          >
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="Logo" className="w-4 h-4 object-contain rounded shrink-0" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-[#4f46e5] shrink-0" />
            )}
            <span className="font-semibold truncate max-w-[85px] sm:max-w-[110px] 2xl:max-w-[140px]">{business.name}</span>
            <span className="text-[#111113]/20 hidden 2xl:inline">|</span>
            <span className="font-mono-code text-[#111113]/60 text-[11px] hidden 2xl:inline">
              {business.gstin ? business.gstin.substring(0, 10) + '...' : 'No GSTIN'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#111113]/50 transition-transform shrink-0 ${companyDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {companyDropdownOpen && (
            <div className="absolute top-full left-3 mt-1.5 w-64 bg-white rounded shadow-xl border border-[rgba(17,17,19,0.12)] py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-[rgba(17,17,19,0.08)] flex items-center justify-between">
                <span className="label">Entities ({businesses.length})</span>
                <span className="text-[10px] text-[#4f46e5] font-semibold">Switch</span>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {businesses.map((biz) => {
                  const isCur = biz.id === activeBusinessId;
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        setCompanyDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                        isCur ? 'bg-indigo-50/60 font-semibold text-indigo-900' : 'text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          {biz.logoUrl ? (
                            <img src={biz.logoUrl} alt="" className="w-3.5 h-3.5 object-contain rounded" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span className="truncate">{biz.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {biz.gstin || 'Unregistered'} • {biz.stateCode}
                        </p>
                      </div>
                      {isCur && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="p-1.5 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setCompanyDropdownOpen(false);
                    setIsAddCompanyOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Company</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenRunLocal}
            className="hidden lg:flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded font-mono-code border border-[rgba(17,17,19,0.12)] bg-white hover:bg-[#F1EFEA] text-[#111113]/80 transition-colors cursor-pointer shrink-0"
            title={`Storage Mode: ${storageMode === 'local' ? 'Local Storage (Private)' : 'Firebase Cloud'}. Click to manage.`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${storageMode === 'local' ? 'bg-[#4f46e5]' : 'bg-[#111113]'}`}></span>
            <span className="hidden xl:inline">{storageMode === 'local' ? 'Local' : 'Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <GlobalSearchBar
        onSelectInvoice={onSelectInvoice}
        onSelectCustomer={onSelectCustomer}
        onSelectProduct={onSelectProduct}
      />

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Ask AI quick button */}
        {onOpenAI && (
          <button
            onClick={onOpenAI}
            className="flex items-center gap-1.5 bg-white hover:bg-[#F1EFEA] text-[#111113] text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded border border-[rgba(17,17,19,0.12)] transition-colors cursor-pointer shrink-0"
            title="Ask TaxPro AI (Gemini Assistant)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#4f46e5] shrink-0" />
            <span className="hidden xl:inline">AI Advisor</span>
          </button>
        )}

        {/* Run Local on Computer button */}
        {onOpenRunLocal && (
          <button
            onClick={onOpenRunLocal}
            className="hidden 2xl:flex items-center gap-1.5 bg-white hover:bg-[#F1EFEA] text-[#111113] text-xs font-medium px-2.5 py-1.5 rounded border border-[rgba(17,17,19,0.12)] transition-colors cursor-pointer shrink-0"
            title="Install as Windows Desktop App or run on localhost"
          >
            <Laptop className="w-3.5 h-3.5 text-[#111113]/70 shrink-0" />
            <span>Run Local</span>
          </button>
        )}

        {/* Live App Action Log Ticker / Drawer Button */}
        <button
          type="button"
          onClick={() => setIsActionDrawerOpen(true)}
          className="relative flex items-center gap-1.5 bg-white hover:bg-[#F1EFEA] text-[#111113] text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded border border-[rgba(17,17,19,0.12)] transition-colors cursor-pointer shrink-0"
          title="Live Activity Feed: View every action taken"
        >
          <Activity className="w-3.5 h-3.5 text-[#4f46e5] shrink-0" />
          <span className="hidden xl:inline">Feed</span>
          {appActionLogs.length > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[9px] font-mono-code bg-[#111113] text-white rounded">
              {appActionLogs.length > 99 ? '99+' : appActionLogs.length}
            </span>
          )}
          {latestAppAction && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#4f46e5] rounded-full animate-ping"></span>
          )}
        </button>

        {/* Quick New Invoice Action */}
        <button
          onClick={onNewInvoice}
          className="btn-primary-v1 text-xs py-1.5 px-2.5 sm:px-3 rounded shrink-0 whitespace-nowrap shadow-xs flex items-center gap-1.5"
          title="Create New Invoice (Alt+N)"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Create Invoice</span>
          <span className="sm:hidden">New</span>
        </button>

        {/* User Auth Info & Google Workspace Status */}
        {user ? (
          <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-[rgba(17,17,19,0.12)] shrink-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-xs shrink-0">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="hidden 2xl:block text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-slate-800 leading-tight truncate max-w-[100px]">
                  {user.displayName || 'Tax Admin'}
                </p>
                {isWorkspaceConnected ? (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200"
                    title="Google Drive, Docs & Sheets connected and active"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Workspace</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => connectWorkspace()}
                    className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors"
                    title="Click to authorize Google Workspace (Drive, Docs, Sheets)"
                  >
                    + Connect
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{user.email}</p>
            </div>
            <button
              onClick={() => logOut()}
              className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        ) : (
          <div className="shrink-0">
            <GoogleSignInButton
              onClick={() => signInWithGoogle()}
              label="Sign in"
              className="text-xs py-1.5 px-2.5 sm:px-3 shrink-0 whitespace-nowrap"
            />
          </div>
        )}
      </div>

      <CompanyModal
        isOpen={isAddCompanyOpen}
        onClose={() => setIsAddCompanyOpen(false)}
      />

      <ActionLogDrawer
        isOpen={isActionDrawerOpen}
        onClose={() => setIsActionDrawerOpen(false)}
        onSelectInvoice={onSelectInvoice}
      />
    </header>
  );
};
