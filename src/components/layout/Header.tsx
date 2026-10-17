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
} from 'lucide-react';
import { GlobalSearchBar } from '../common/GlobalSearchBar';
import { CompanyModal } from '../common/CompanyModal';

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
  const { user, signInWithGoogle, logOut } = useAuth();
  const { business, businesses, activeBusinessId, switchBusiness, storageMode, cloudSyncStatus } = useBusiness();
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
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
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 shadow-xs gap-2 sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-sm">
            IP
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 tracking-tight leading-none text-base">InvoicePro GST</h1>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                India GST v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Accounting & GST Suite</p>
          </div>
        </div>

        {/* Business Selector / Company Switcher Dropdown */}
        <div className="relative hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 ml-2" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
            className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-2xs"
            title="Click to switch or add company"
          >
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="Logo" className="w-4 h-4 object-contain rounded shrink-0" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            )}
            <span className="font-semibold truncate max-w-[130px]">{business.name}</span>
            <span className="text-slate-400">|</span>
            <span className="font-mono text-slate-600 text-[11px]">{business.gstin ? business.gstin.substring(0, 10) + '...' : 'No GSTIN'}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${companyDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {companyDropdownOpen && (
            <div className="absolute top-full left-3 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Your Companies ({businesses.length})</span>
                <span className="text-[10px] text-indigo-600 font-semibold">1-Click Switch</span>
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
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium border transition-colors cursor-pointer ${
              storageMode === 'local'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
            }`}
            title="Click to manage Local Storage or Firebase Spark Free Cloud settings"
          >
            {storageMode === 'local' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Local Storage</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                <span>Firebase Cloud</span>
              </>
            )}
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
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 text-xs font-semibold px-2.5 py-2 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
            title="Ask TaxPro AI (Gemini Assistant)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Ask AI</span>
          </button>
        )}

        {/* Run Local on Computer button */}
        {onOpenRunLocal && (
          <button
            onClick={onOpenRunLocal}
            className="hidden lg:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-2.5 py-2 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Install as Windows Desktop App or run on localhost"
          >
            <Laptop className="w-3.5 h-3.5 text-indigo-600" />
            <span>Run Local</span>
          </button>
        )}

        {/* Quick New Invoice Action */}
        <button
          onClick={onNewInvoice}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Invoice</span>
        </button>

        {/* User Auth Info */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-xs">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-medium text-slate-800 leading-tight truncate max-w-[120px]">
                {user.displayName || 'Tax Admin'}
              </p>
              <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{user.email}</p>
            </div>
            <button
              onClick={() => logOut()}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <LogIn className="w-4 h-4 text-indigo-600" />
            <span>Sign In with Google</span>
          </button>
        )}
      </div>

      <CompanyModal
        isOpen={isAddCompanyOpen}
        onClose={() => setIsAddCompanyOpen(false)}
      />
    </header>
  );
};
