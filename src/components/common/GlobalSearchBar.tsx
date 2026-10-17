import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { Invoice, Customer, Product } from '../../types';
import { formatINR } from '../../services/gstEngine';
import {
  Search,
  FileText,
  Users,
  Package,
  X,
  ArrowRight,
  Eye,
  Edit,
  BookOpen,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Hash,
} from 'lucide-react';

export type SearchCategory = 'all' | 'invoices' | 'customers' | 'products';

export interface GlobalSearchBarProps {
  onSelectInvoice: (invoiceId: string, action?: 'preview' | 'edit') => void;
  onSelectCustomer: (customerId: string, action?: 'ledger' | 'details') => void;
  onSelectProduct: (productId?: string) => void;
}

type SearchItem =
  | { type: 'invoice'; data: Invoice; id: string }
  | { type: 'customer'; data: Customer; id: string }
  | { type: 'product'; data: Product; id: string };

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  onSelectInvoice,
  onSelectCustomer,
  onSelectProduct,
}) => {
  const { invoices, customers, products } = useBusiness();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Global Keyboard shortcuts: '/' or 'Ctrl+K' / 'Cmd+K' to focus
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable;

      if ((e.key === '/' && !isInput) || ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K'))) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered lists based on query
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      // Return recent items when no query
      const recentInvoices: Invoice[] = [...invoices].slice(0, 3);
      const recentCustomers: Customer[] = [...customers].slice(0, 3);
      const recentProducts: Product[] = [...products].slice(0, 2);

      return {
        invoices: recentInvoices,
        customers: recentCustomers,
        products: recentProducts,
        isRecent: true,
      };
    }

    const matchedInvoices = invoices.filter((inv) => {
      const invNum = (inv.invoiceNumber || '').toLowerCase();
      const custName = (inv.customerName || '').toLowerCase();
      const gstin = (inv.customerGstin || '').toLowerCase();
      const id = (inv.id || '').toLowerCase();
      const totalStr = String(inv.grandTotal || '');
      const itemsMatch = (inv.items || []).some(
        (it) => it.description?.toLowerCase().includes(q) || it.hsnSac?.toLowerCase().includes(q)
      );

      return (
        invNum.includes(q) ||
        custName.includes(q) ||
        gstin.includes(q) ||
        id.includes(q) ||
        totalStr.includes(q) ||
        itemsMatch
      );
    });

    const matchedCustomers = customers.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const gstin = (c.gstin || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const id = (c.id || '').toLowerCase();
      const state = (c.state || '').toLowerCase();

      return (
        name.includes(q) ||
        gstin.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        id.includes(q) ||
        state.includes(q)
      );
    });

    const matchedProducts = products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const hsn = (p.hsnSac || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const unit = (p.unit || '').toLowerCase();

      return (
        name.includes(q) ||
        hsn.includes(q) ||
        id.includes(q) ||
        desc.includes(q) ||
        unit.includes(q)
      );
    });

    return {
      invoices: matchedInvoices,
      customers: matchedCustomers,
      products: matchedProducts,
      isRecent: false,
    };
  }, [query, invoices, customers, products]);

  // Filtered by selected category tab
  const displayedInvoices =
    activeCategory === 'all' || activeCategory === 'invoices' ? searchResults.invoices : [];
  const displayedCustomers =
    activeCategory === 'all' || activeCategory === 'customers' ? searchResults.customers : [];
  const displayedProducts =
    activeCategory === 'all' || activeCategory === 'products' ? searchResults.products : [];

  // Flattened array for keyboard navigation
  const flatItems: SearchItem[] = useMemo(() => {
    const list: SearchItem[] = [];
    displayedInvoices.forEach((inv) => list.push({ type: 'invoice', data: inv, id: inv.id }));
    displayedCustomers.forEach((cust) => list.push({ type: 'customer', data: cust, id: cust.id }));
    displayedProducts.forEach((prod) => list.push({ type: 'product', data: prod, id: prod.id }));
    return list;
  }, [displayedInvoices, displayedCustomers, displayedProducts]);

  // Reset selected index on query/category change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query, activeCategory]);

  // Handle keyboard navigation within the input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
        const item = flatItems[selectedIndex];
        executeItemSelection(item);
      } else if (flatItems.length > 0) {
        // Select first result if nothing is specifically highlighted
        executeItemSelection(flatItems[0]);
      }
    } else if (e.key === 'Tab') {
      // Cycle tabs
      if (e.shiftKey) {
        e.preventDefault();
        cycleCategory('prev');
      } else {
        e.preventDefault();
        cycleCategory('next');
      }
    }
  };

  const cycleCategory = (dir: 'next' | 'prev') => {
    const cats: SearchCategory[] = ['all', 'invoices', 'customers', 'products'];
    const idx = cats.indexOf(activeCategory);
    if (dir === 'next') {
      setActiveCategory(cats[(idx + 1) % cats.length]);
    } else {
      setActiveCategory(cats[(idx - 1 + cats.length) % cats.length]);
    }
  };

  const executeItemSelection = (item: SearchItem) => {
    if (item.type === 'invoice') {
      onSelectInvoice(item.id, 'preview');
    } else if (item.type === 'customer') {
      onSelectCustomer(item.id, 'ledger');
    } else if (item.type === 'product') {
      onSelectProduct(item.id);
    }
    setIsOpen(false);
  };

  const totalMatches =
    searchResults.invoices.length + searchResults.customers.length + searchResults.products.length;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm sm:max-w-md md:max-w-lg mx-1 sm:mx-3">
      {/* Search Bar Input */}
      <div className="relative group">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-indigo-600 transition-colors" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search invoices, customers, products by ID or name..."
          className="w-full bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder-slate-400 pl-9 pr-14 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-2xs outline-hidden"
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer hover:bg-slate-200 transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <kbd className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs font-mono font-medium">
              Ctrl+K
            </kbd>
          </div>
        )}
      </div>

      {/* Popover Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-[75vh] overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Category Filter Chips Bar */}
          <div className="px-3 pt-2.5 pb-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                All {searchResults.isRecent ? '' : `(${totalMatches})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('invoices')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  activeCategory === 'invoices'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Invoices ({searchResults.invoices.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('customers')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  activeCategory === 'customers'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Customers ({searchResults.customers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('products')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  activeCategory === 'products'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Package className="w-3 h-3" />
                <span>Products ({searchResults.products.length})</span>
              </button>
            </div>

            {searchResults.isRecent && (
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" />
                <span>Recent</span>
              </span>
            )}
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 text-xs">
            {totalMatches === 0 ? (
              <div className="py-10 text-center px-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Search className="w-5 h-5" />
                </div>
                <p className="text-slate-700 font-semibold text-sm">No results found</p>
                <p className="text-slate-400 text-xs mt-1">
                  We couldn't find any invoices, customers, or products matching "{query}".
                </p>
                <p className="text-[11px] text-indigo-600 mt-2 font-medium">
                  Try searching by Invoice Number (e.g. INV), Customer Name, GSTIN, or HSN code.
                </p>
              </div>
            ) : (
              <>
                {/* Invoices Group */}
                {displayedInvoices.length > 0 && (
                  <div className="py-2 first:pt-1">
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Invoices</span>
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {displayedInvoices.length} {displayedInvoices.length === 1 ? 'record' : 'records'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {displayedInvoices.map((inv) => {
                        const itemIdx = flatItems.findIndex((it) => it.id === inv.id);
                        const isFocused = selectedIndex === itemIdx;

                        return (
                          <div
                            key={inv.id}
                            onClick={() => {
                              onSelectInvoice(inv.id, 'preview');
                              setIsOpen(false);
                            }}
                            className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between group transition-all border ${
                              isFocused
                                ? 'bg-indigo-50/70 border-indigo-200 shadow-2xs'
                                : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 font-mono text-xs flex items-center gap-1">
                                  <Hash className="w-3 h-3 text-slate-400" />
                                  {inv.invoiceNumber}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    inv.status === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : inv.status === 'FINALIZED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {inv.status}
                                </span>
                                {inv.id && (
                                  <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                                    ID: {inv.id.slice(0, 8)}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 truncate mt-0.5">
                                <span className="font-medium text-slate-800">{inv.customerName}</span>
                                {inv.customerGstin && (
                                  <span className="text-slate-400 font-mono"> • {inv.customerGstin}</span>
                                )}
                                <span className="text-slate-400"> • {inv.date}</span>
                              </p>
                            </div>

                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div>
                                <span className="font-bold text-slate-900 font-mono text-xs block">
                                  {formatINR(inv.grandTotal)}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {inv.items?.length || 0} {inv.items?.length === 1 ? 'item' : 'items'}
                                </span>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 ml-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectInvoice(inv.id, 'preview');
                                    setIsOpen(false);
                                  }}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                                  title="Quick Preview PDF"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectInvoice(inv.id, 'edit');
                                    setIsOpen(false);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                  title="Edit Invoice"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Customers Group */}
                {displayedCustomers.length > 0 && (
                  <div className="py-2">
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <Users className="w-3.5 h-3.5" />
                        <span>Customers</span>
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {displayedCustomers.length} {displayedCustomers.length === 1 ? 'record' : 'records'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {displayedCustomers.map((cust) => {
                        const itemIdx = flatItems.findIndex((it) => it.id === cust.id);
                        const isFocused = selectedIndex === itemIdx;

                        return (
                          <div
                            key={cust.id}
                            onClick={() => {
                              onSelectCustomer(cust.id, 'ledger');
                              setIsOpen(false);
                            }}
                            className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between group transition-all border ${
                              isFocused
                                ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs'
                                : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 text-xs">
                                  {cust.name}
                                </span>
                                {cust.gstin ? (
                                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                    {cust.gstin}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-400 italic">Unregistered</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {cust.phone && <span>Ph: {cust.phone} • </span>}
                                {cust.state && <span>{cust.state} • </span>}
                                <span className="font-mono text-slate-400">ID: {cust.id}</span>
                              </p>
                            </div>

                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div>
                                <span
                                  className={`font-bold font-mono text-xs block ${
                                    (cust.currentBalance || 0) > 0
                                      ? 'text-amber-700'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {formatINR(cust.currentBalance || 0)}
                                </span>
                                <span className="text-[10px] text-slate-400 block">Balance Due</span>
                              </div>

                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 ml-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectCustomer(cust.id, 'ledger');
                                    setIsOpen(false);
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
                                  title="View Customer Ledger"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectCustomer(cust.id, 'details');
                                    setIsOpen(false);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                  title="Manage Customer"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Products Group */}
                {displayedProducts.length > 0 && (
                  <div className="py-2">
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-purple-700">
                        <Package className="w-3.5 h-3.5" />
                        <span>Products & Services</span>
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {displayedProducts.length} {displayedProducts.length === 1 ? 'record' : 'records'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {displayedProducts.map((prod) => {
                        const itemIdx = flatItems.findIndex((it) => it.id === prod.id);
                        const isFocused = selectedIndex === itemIdx;

                        return (
                          <div
                            key={prod.id}
                            onClick={() => {
                              onSelectProduct(prod.id);
                              setIsOpen(false);
                            }}
                            className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between group transition-all border ${
                              isFocused
                                ? 'bg-purple-50/70 border-purple-200 shadow-2xs'
                                : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 text-xs truncate">
                                  {prod.name}
                                </span>
                                <span className="text-[9px] font-semibold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                                  {prod.taxRate}% GST
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                <span className="font-mono text-slate-600">HSN: {prod.hsnSac}</span>
                                {prod.unit && <span className="text-slate-400"> • Unit: {prod.unit}</span>}
                                <span className="text-slate-400 font-mono"> • ID: {prod.id}</span>
                              </p>
                            </div>

                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div>
                                <span className="font-bold text-slate-900 font-mono text-xs block">
                                  {formatINR(prod.sellingPrice)}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {prod.type === 'goods' ? `${prod.currentStock || 0} in stock` : 'Service'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 ml-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectProduct(prod.id);
                                    setIsOpen(false);
                                  }}
                                  className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 transition-colors"
                                  title="View in Products Catalog"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Helpful Navigation Footer */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono text-[10px] shadow-2xs">
                  ↑
                </kbd>
                <kbd className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono text-[10px] shadow-2xs">
                  ↓
                </kbd>
                <span className="text-slate-400">navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px] shadow-2xs">
                  ↵
                </kbd>
                <span className="text-slate-400">select</span>
              </span>
              <span className="flex items-center gap-1 hidden sm:inline-flex">
                <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px] shadow-2xs">
                  Tab
                </kbd>
                <span className="text-slate-400">switch category</span>
              </span>
            </div>

            <div className="flex items-center gap-1">
              <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px] shadow-2xs">
                ESC
              </kbd>
              <span className="text-slate-400">close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
