import React, { useState, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { Invoice, InvoiceStatus, InvoiceType, INDIAN_STATES } from '../../types';
import { formatINR } from '../../services/gstEngine';
import { generateInvoicePDF, generateConsolidatedInvoicesPDF } from '../../services/pdfGenerator';
import { exportSalesRegisterToExcel } from '../../services/excelExporter';
import {
  Search,
  Filter,
  FileDown,
  Printer,
  Copy,
  Trash2,
  Ban,
  PlusCircle,
  Eye,
  FileText,
  CreditCard,
  X,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Calendar,
  Building2,
  MapPin,
  IndianRupee,
  Layers,
  ArrowUpDown,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';

interface InvoiceRegisterProps {
  onNewInvoice: () => void;
  onEditInvoice: (invoiceId: string) => void;
  onPreviewInvoice: (invoice: Invoice) => void;
}

type TimePreset =
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'FY_26_27'
  | 'CUSTOM';

type AmountPreset = 'ALL' | 'UNDER_10K' | '10K_50K' | '50K_1L' | 'ABOVE_1L' | 'CUSTOM';

type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'number_desc'
  | 'number_asc'
  | 'customer_asc';

function getDateRangeForPreset(preset: TimePreset): { from: string; to: string } {
  const now = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];

  switch (preset) {
    case 'TODAY': {
      const today = formatYMD(now);
      return { from: today, to: today };
    }
    case 'YESTERDAY': {
      const yest = new Date(now.getTime() - 86400000);
      const str = formatYMD(yest);
      return { from: str, to: str };
    }
    case 'THIS_WEEK': {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      return { from: formatYMD(sevenDaysAgo), to: formatYMD(now) };
    }
    case 'THIS_MONTH': {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      return { from: `${year}-${month}-01`, to: `${year}-${month}-${String(lastDay).padStart(2, '0')}` };
    }
    case 'LAST_MONTH': {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prevDate.getFullYear();
      const month = String(prevDate.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, prevDate.getMonth() + 1, 0).getDate();
      return { from: `${year}-${month}-01`, to: `${year}-${month}-${String(lastDay).padStart(2, '0')}` };
    }
    case 'THIS_QUARTER': {
      const month = now.getMonth(); // 0-11
      const year = now.getFullYear();
      let startM = 0;
      let endM = 2;
      if (month >= 3 && month <= 5) {
        startM = 3;
        endM = 5; // Q1 Apr-Jun
      } else if (month >= 6 && month <= 8) {
        startM = 6;
        endM = 8; // Q2 Jul-Sep
      } else if (month >= 9 && month <= 11) {
        startM = 9;
        endM = 11; // Q3 Oct-Dec
      } else {
        startM = 0;
        endM = 2; // Q4 Jan-Mar
      }
      const lastDay = new Date(year, endM + 1, 0).getDate();
      return {
        from: `${year}-${String(startM + 1).padStart(2, '0')}-01`,
        to: `${year}-${String(endM + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      };
    }
    case 'FY_26_27': {
      return { from: '2026-04-01', to: '2027-03-31' };
    }
    default:
      return { from: '', to: '' };
  }
}

export const InvoiceRegister: React.FC<InvoiceRegisterProps> = ({
  onNewInvoice,
  onEditInvoice,
  onPreviewInvoice,
}) => {
  const { business, businesses, invoices, cancelInvoice, deleteInvoice, recordPayment, saveInvoice } = useBusiness();

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Time Filter
  const [timePreset, setTimePreset] = useState<TimePreset>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 2. Company Filter
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');

  // 3. State & Supply Type Filter
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [supplyTypeFilter, setSupplyTypeFilter] = useState<'ALL' | 'INTRA' | 'INTER'>('ALL');

  // 4. Amount Filter
  const [amountPreset, setAmountPreset] = useState<AmountPreset>('ALL');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  // 5. Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 6. Invoice Type Filter
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // 7. Customer Filter
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');

  // 8. Reverse Charge Filter
  const [reverseChargeFilter, setReverseChargeFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');

  // 9. Sorting
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  // Drawer expansion state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Bulk Selection State for Consolidated Export
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [bulkCopyType, setBulkCopyType] = useState<'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'>('ORIGINAL');
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [bulkExportSuccess, setBulkExportSuccess] = useState<string | null>(null);

  // Payment Recording Modal
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    mode: 'BANK_TRANSFER' as const,
    referenceNo: '',
    notes: '',
  });

  // Cancellation Modal
  const [cancelModalInvoice, setCancelModalInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Handle Preset Time Change
  const handleTimePresetChange = (preset: TimePreset) => {
    setTimePreset(preset);
    if (preset !== 'CUSTOM' && preset !== 'ALL') {
      const range = getDateRangeForPreset(preset);
      setDateFrom(range.from);
      setDateTo(range.to);
    } else if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
    }
  };

  // Distinct Customers for customer dropdown
  const uniqueCustomerNames = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.customerName) set.add(inv.customerName);
    });
    return Array.from(set).sort();
  }, [invoices]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (timePreset !== 'ALL' || dateFrom || dateTo) count++;
    if (companyFilter !== 'ALL') count++;
    if (stateFilter !== 'ALL') count++;
    if (supplyTypeFilter !== 'ALL') count++;
    if (amountPreset !== 'ALL' || minAmount || maxAmount) count++;
    if (statusFilter !== 'ALL') count++;
    if (typeFilter !== 'ALL') count++;
    if (customerFilter !== 'ALL') count++;
    if (reverseChargeFilter !== 'ALL') count++;
    return count;
  }, [
    searchTerm,
    timePreset,
    dateFrom,
    dateTo,
    companyFilter,
    stateFilter,
    supplyTypeFilter,
    amountPreset,
    minAmount,
    maxAmount,
    statusFilter,
    typeFilter,
    customerFilter,
    reverseChargeFilter,
  ]);

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setTimePreset('ALL');
    setDateFrom('');
    setDateTo('');
    setCompanyFilter('ALL');
    setStateFilter('ALL');
    setSupplyTypeFilter('ALL');
    setAmountPreset('ALL');
    setMinAmount('');
    setMaxAmount('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setCustomerFilter('ALL');
    setReverseChargeFilter('ALL');
    setSortBy('date_desc');
  };

  // Filter and Sort Pipeline
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        // 1. Text Search across invoice #, customer name, GSTIN, items, HSN
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const numMatch = (inv.invoiceNumber || '').toLowerCase().includes(q);
          const custMatch = (inv.customerName || '').toLowerCase().includes(q);
          const gstinMatch = (inv.customerGstin || '').toLowerCase().includes(q);
          const itemsMatch = (inv.items || []).some(
            (it) => (it.name || '').toLowerCase().includes(q) || (it.hsnSac || '').toLowerCase().includes(q)
          );
          if (!numMatch && !custMatch && !gstinMatch && !itemsMatch) return false;
        }

        // 2. Company Filter
        if (companyFilter !== 'ALL') {
          // If invoice has a businessId, must match; if legacy invoice has none, match default company
          const invBizId = inv.businessId || business.id;
          if (invBizId !== companyFilter) return false;
        }

        // 3. Time Filter
        if (dateFrom && inv.date < dateFrom) return false;
        if (dateTo && inv.date > dateTo) return false;

        // 4. State / Place of Supply
        if (stateFilter !== 'ALL') {
          const matchCode = inv.placeOfSupplyCode === stateFilter;
          const matchName = inv.placeOfSupply.toLowerCase() === stateFilter.toLowerCase();
          if (!matchCode && !matchName) return false;
        }

        // 5. Supply Type (Intra vs Inter)
        if (supplyTypeFilter === 'INTRA' && inv.isInterState) return false;
        if (supplyTypeFilter === 'INTER' && !inv.isInterState) return false;

        // 6. Amount Filter
        if (amountPreset === 'UNDER_10K' && inv.grandTotal >= 10000) return false;
        if (amountPreset === '10K_50K' && (inv.grandTotal < 10000 || inv.grandTotal > 50000)) return false;
        if (amountPreset === '50K_1L' && (inv.grandTotal < 50000 || inv.grandTotal > 100000)) return false;
        if (amountPreset === 'ABOVE_1L' && inv.grandTotal <= 100000) return false;
        if (minAmount !== '' && inv.grandTotal < parseFloat(minAmount)) return false;
        if (maxAmount !== '' && inv.grandTotal > parseFloat(maxAmount)) return false;

        // 7. Status Filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'PAID') {
            if (inv.status !== 'PAID' && inv.balanceDue > 0) return false;
          } else if (statusFilter === 'PARTIALLY_PAID') {
            if (inv.paidAmount <= 0 || inv.balanceDue <= 0 || inv.status === 'CANCELLED') return false;
          } else if (statusFilter === 'UNPAID') {
            if (inv.paidAmount > 0 || inv.status === 'CANCELLED') return false;
          } else {
            if (inv.status !== statusFilter) return false;
          }
        }

        // 8. Invoice Type Filter
        if (typeFilter !== 'ALL' && inv.invoiceType !== typeFilter) return false;

        // 9. Customer Filter
        if (customerFilter !== 'ALL' && inv.customerName !== customerFilter) return false;

        // 10. Reverse Charge Filter
        if (reverseChargeFilter === 'YES' && !inv.reverseCharge) return false;
        if (reverseChargeFilter === 'NO' && inv.reverseCharge) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date_asc':
            return a.date.localeCompare(b.date);
          case 'amount_desc':
            return b.grandTotal - a.grandTotal;
          case 'amount_asc':
            return a.grandTotal - b.grandTotal;
          case 'number_desc':
            return b.invoiceNumber.localeCompare(a.invoiceNumber);
          case 'number_asc':
            return a.invoiceNumber.localeCompare(b.invoiceNumber);
          case 'customer_asc':
            return a.customerName.localeCompare(b.customerName);
          case 'date_desc':
          default:
            return b.date.localeCompare(a.date);
        }
      });
  }, [
    invoices,
    searchTerm,
    companyFilter,
    business.id,
    dateFrom,
    dateTo,
    stateFilter,
    supplyTypeFilter,
    amountPreset,
    minAmount,
    maxAmount,
    statusFilter,
    typeFilter,
    customerFilter,
    reverseChargeFilter,
    sortBy,
  ]);

  // Aggregate sums of filtered results
  const summary = useMemo(() => {
    const active = filteredInvoices.filter((i) => i.status !== 'CANCELLED');
    return {
      count: active.length,
      totalTaxable: active.reduce((acc, i) => acc + (i.totalTaxable || 0), 0),
      totalGst: active.reduce(
        (acc, i) => acc + (i.cgstTotal || 0) + (i.sgstTotal || 0) + (i.igstTotal || 0) + (i.cessTotal || 0),
        0
      ),
      grandTotal: active.reduce((acc, i) => acc + (i.grandTotal || 0), 0),
      balanceDue: active.reduce((acc, i) => acc + (i.balanceDue || 0), 0),
    };
  }, [filteredInvoices]);

  // Multiple Selection & Bulk PDF Helpers
  const isAllSelected = useMemo(() => {
    return filteredInvoices.length > 0 && filteredInvoices.every((inv) => selectedInvoiceIds.includes(inv.id));
  }, [filteredInvoices, selectedInvoiceIds]);

  const isPartiallySelected = useMemo(() => {
    const selectedCount = filteredInvoices.filter((inv) => selectedInvoiceIds.includes(inv.id)).length;
    return selectedCount > 0 && selectedCount < filteredInvoices.length;
  }, [filteredInvoices, selectedInvoiceIds]);

  const selectedInvoices = useMemo(() => {
    return invoices.filter((i) => selectedInvoiceIds.includes(i.id));
  }, [invoices, selectedInvoiceIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
  }, [selectedInvoices]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredInvoices.map((i) => i.id));
      setSelectedInvoiceIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredInvoices.map((i) => i.id);
      setSelectedInvoiceIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleSelectInvoice = (id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedInvoiceIds([]);
  };

  const handleBulkExportPDF = async (targetInvoices: Invoice[], action: 'download' | 'print' = 'download') => {
    if (targetInvoices.length === 0) return;
    setIsBulkExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      generateConsolidatedInvoicesPDF(targetInvoices, business, businesses, action, bulkCopyType);
      setBulkExportSuccess(
        `${action === 'download' ? 'Downloaded' : 'Printed'} consolidated PDF of ${targetInvoices.length} invoice${targetInvoices.length > 1 ? 's' : ''}`
      );
      setTimeout(() => setBulkExportSuccess(null), 4000);
    } catch (err: any) {
      console.error('Bulk export error:', err);
    } finally {
      setIsBulkExporting(false);
    }
  };

  // Duplicate Invoice
  const handleDuplicate = async (invoice: Invoice) => {
    const nextNum = business.nextInvoiceNumber || 101;
    const prefix = business.invoicePrefix || 'INV/26-27/';
    const newNumber = `${prefix}${nextNum}`;

    const duplicatePayload = {
      ...invoice,
      invoiceNumber: newNumber,
      status: 'DRAFT' as InvoiceStatus,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      paidAmount: 0,
      balanceDue: invoice.grandTotal,
    };

    const created = await saveInvoice(duplicatePayload);
    onEditInvoice(created.id);
  };

  // Submit Payment
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;

    await recordPayment({
      paymentNumber: `REC-${Date.now().toString().slice(-6)}`,
      type: 'RECEIPT',
      partyId: paymentInvoice.customerId,
      partyName: paymentInvoice.customerName,
      partyType: 'CUSTOMER',
      date: paymentForm.date,
      amount: Number(paymentForm.amount),
      mode: paymentForm.mode,
      referenceNo: paymentForm.referenceNo,
      invoiceId: paymentInvoice.id,
      invoiceNumber: paymentInvoice.invoiceNumber,
      notes: paymentForm.notes,
    });

    setPaymentInvoice(null);
  };

  // Submit Cancel
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalInvoice) return;
    await cancelInvoice(cancelModalInvoice.id, cancelReason);
    setCancelModalInvoice(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-4">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">GST Sales Invoice Register</h2>
          <p className="text-xs text-slate-500">
            Multi-criteria filtering by time, company, state, amount, and payment status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Consolidated PDF Export Button */}
          <button
            onClick={() => {
              if (selectedInvoiceIds.length > 0) {
                handleBulkExportPDF(selectedInvoices, 'download');
              } else if (filteredInvoices.length > 0) {
                handleBulkExportPDF(filteredInvoices, 'download');
              }
            }}
            disabled={isBulkExporting || filteredInvoices.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            title={
              selectedInvoiceIds.length > 0
                ? `Export ${selectedInvoiceIds.length} selected invoices as a single consolidated PDF`
                : `Export all ${filteredInvoices.length} filtered invoices as a single consolidated PDF`
            }
          >
            {isBulkExporting ? (
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 text-indigo-600" />
            )}
            <span>
              {selectedInvoiceIds.length > 0
                ? `Consolidated PDF (${selectedInvoiceIds.length} Selected)`
                : `Consolidated PDF (${filteredInvoices.length})`}
            </span>
          </button>

          <button
            onClick={() => exportSalesRegisterToExcel(filteredInvoices)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            title="Download filtered records as Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel ({filteredInvoices.length})</span>
          </button>

          <button
            onClick={onNewInvoice}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards of Filtered Invoices */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Filtered Invoices</span>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{summary.count}</p>
          <span className="text-[10px] text-slate-400">Total matched active records</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Taxable Value</span>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{formatINR(summary.totalTaxable)}</p>
          <span className="text-[10px] text-slate-400">Base sales turnover</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total GST Output</span>
          <p className="text-lg font-bold text-indigo-700 mt-0.5">{formatINR(summary.totalGst)}</p>
          <span className="text-[10px] text-slate-400">CGST + SGST + IGST</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Pending Receivables</span>
          <p className="text-lg font-bold text-amber-700 mt-0.5">{formatINR(summary.balanceDue)}</p>
          <span className="text-[10px] text-slate-400">Uncollected balance</span>
        </div>
      </div>

      {/* MULTI-TYPE FILTER CONTROLS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Quick Filter Bar */}
        <div className="p-3.5 flex flex-wrap items-center gap-2.5">
          {/* 1. Global in-table search input */}
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice #, customer, GSTIN, item..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Time Filter Preset */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <select
              value={timePreset}
              onChange={(e) => handleTimePresetChange(e.target.value as TimePreset)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">Last 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="FY_26_27">FY 2026-27</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>
          </div>

          {/* 3. Company Filter (Multi-Company) */}
          {businesses.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[160px] truncate"
              >
                <option value="ALL">All Companies ({businesses.length})</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 4. Payment Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid (Settled)</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid (Full Due)</option>
            <option value="FINALIZED">Finalized</option>
            <option value="DRAFT">Drafts</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* 5. Sort By */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
              <option value="number_desc">Invoice #: Z to A</option>
              <option value="number_asc">Invoice #: A to Z</option>
              <option value="customer_asc">Customer: A to Z</option>
            </select>
          </div>

          {/* Toggle Advanced Filters Drawer */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              showAdvancedFilters || activeFilterCount > 0
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>More Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
            {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          {/* Reset All Filters button */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="bg-slate-50/80 border-t border-slate-200 p-4 space-y-3.5 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
              {/* State / Place of Supply */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>State / Place of Supply</span>
                </label>
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  <option value="ALL">All Indian States & UTs</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supply Type: Inter-State vs Intra-State */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>GST Supply Type</span>
                </label>
                <select
                  value={supplyTypeFilter}
                  onChange={(e) => setSupplyTypeFilter(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  <option value="ALL">All Supply Types</option>
                  <option value="INTRA">Intra-State (CGST + SGST)</option>
                  <option value="INTER">Inter-State (IGST)</option>
                </select>
              </div>

              {/* Amount Range Filter */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Amount Range</span>
                </label>
                <select
                  value={amountPreset}
                  onChange={(e) => setAmountPreset(e.target.value as AmountPreset)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  <option value="ALL">Any Amount</option>
                  <option value="UNDER_10K">Under ₹10,000</option>
                  <option value="10K_50K">₹10,000 to ₹50,000</option>
                  <option value="50K_1L">₹50,000 to ₹1,00,000</option>
                  <option value="ABOVE_1L">Above ₹1,00,000</option>
                  <option value="CUSTOM">Custom Min / Max</option>
                </select>
              </div>

              {/* Invoice Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Invoice Document Type</span>
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  <option value="ALL">All Document Types</option>
                  <option value="TAX_INVOICE">Tax Invoice</option>
                  <option value="BILL_OF_SUPPLY">Bill of Supply</option>
                  <option value="EXPORT_INVOICE">Export Invoice</option>
                </select>
              </div>
            </div>

            {/* Second row of Advanced Filters: Custom Dates & Custom Amounts & Customer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs pt-1 border-t border-slate-200/70">
              {/* Date From & To */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">From Date:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setTimePreset('CUSTOM');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">To Date:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setTimePreset('CUSTOM');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Min & Max Amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Min Amount (₹):</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Min ₹"
                  value={minAmount}
                  onChange={(e) => {
                    setMinAmount(e.target.value);
                    setAmountPreset('CUSTOM');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Amount (₹):</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Max ₹"
                  value={maxAmount}
                  onChange={(e) => {
                    setMaxAmount(e.target.value);
                    setAmountPreset('CUSTOM');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Third row: Customer & Reverse Charge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs pt-1 border-t border-slate-200/70">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer / Buyer:</label>
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500 text-xs truncate"
                >
                  <option value="ALL">All Customers</option>
                  {uniqueCustomerNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reverse Charge:</label>
                <select
                  value={reverseChargeFilter}
                  onChange={(e) => setReverseChargeFilter(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  <option value="ALL">All Supplies</option>
                  <option value="YES">Reverse Charge Applicable (RCM)</option>
                  <option value="NO">Normal Forward Charge</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips Pill Bar */}
        {activeFilterCount > 0 && (
          <div className="px-3.5 py-2 bg-slate-100/60 border-t border-slate-200 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mr-1">
              Active Filters:
            </span>

            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-white border border-slate-300 text-slate-800 px-2 py-0.5 rounded-full font-medium">
                <span>Search: "{searchTerm}"</span>
                <button type="button" onClick={() => setSearchTerm('')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(timePreset !== 'ALL' || dateFrom || dateTo) && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-medium">
                <Calendar className="w-3 h-3" />
                <span>
                  Time:{' '}
                  {timePreset !== 'CUSTOM'
                    ? timePreset.replace('_', ' ')
                    : `${dateFrom || 'Start'} to ${dateTo || 'End'}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTimePreset('ALL');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {companyFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                <Building2 className="w-3 h-3" />
                <span>Company: {businesses.find((b) => b.id === companyFilter)?.name || companyFilter}</span>
                <button type="button" onClick={() => setCompanyFilter('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {stateFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                <MapPin className="w-3 h-3" />
                <span>State: {INDIAN_STATES.find((s) => s.code === stateFilter)?.name || stateFilter}</span>
                <button type="button" onClick={() => setStateFilter('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {supplyTypeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 bg-cyan-50 border border-cyan-200 text-cyan-800 px-2 py-0.5 rounded-full font-medium">
                <span>Supply: {supplyTypeFilter === 'INTRA' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}</span>
                <button type="button" onClick={() => setSupplyTypeFilter('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(amountPreset !== 'ALL' || minAmount || maxAmount) && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                <IndianRupee className="w-3 h-3" />
                <span>
                  Amount:{' '}
                  {amountPreset === 'UNDER_10K'
                    ? '< ₹10,000'
                    : amountPreset === '10K_50K'
                    ? '₹10k - ₹50k'
                    : amountPreset === '50K_1L'
                    ? '₹50k - ₹1L'
                    : amountPreset === 'ABOVE_1L'
                    ? '> ₹1L'
                    : `₹${minAmount || '0'} - ₹${maxAmount || 'Any'}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAmountPreset('ALL');
                    setMinAmount('');
                    setMaxAmount('');
                  }}
                  className="hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                <span>Status: {statusFilter}</span>
                <button type="button" onClick={() => setStatusFilter('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {typeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-medium">
                <span>Type: {typeFilter.replace('_', ' ')}</span>
                <button type="button" onClick={() => setTypeFilter('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {customerFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 rounded-full font-medium">
                <span>Customer: {customerFilter}</span>
                <button type="button" onClick={() => setCustomerFilter('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {reverseChargeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-800 px-2 py-0.5 rounded-full font-medium">
                <span>RCM: {reverseChargeFilter}</span>
                <button type="button" onClick={() => setReverseChargeFilter('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-[11px] text-rose-600 hover:underline font-semibold ml-auto cursor-pointer"
            >
              Clear All ({activeFilterCount})
            </button>
          </div>
        )}
      </div>

      {/* Bulk Action Notification Toast */}
      {bulkExportSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bulkExportSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setBulkExportSuccess(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating / Sticky Bulk Action Banner */}
      {selectedInvoiceIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-3.5 sm:p-4 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30 shrink-0">
              {selectedInvoiceIds.length}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                <span>{selectedInvoiceIds.length} Invoices Selected</span>
                <span className="text-slate-500">·</span>
                <span className="text-emerald-400 font-mono">Total Value: {formatINR(selectedTotalAmount)}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Download or print all selected invoices as a single consolidated multi-page PDF
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Copy Type Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-400 text-[11px]">Copy:</span>
              <select
                value={bulkCopyType}
                onChange={(e) => setBulkCopyType(e.target.value as any)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
              >
                <option value="ORIGINAL" className="bg-slate-900 text-white">Original (Recipient)</option>
                <option value="DUPLICATE" className="bg-slate-900 text-white">Duplicate (Transporter)</option>
                <option value="TRIPLICATE" className="bg-slate-900 text-white">Triplicate (Supplier)</option>
              </select>
            </div>

            {/* Download Consolidated PDF */}
            <button
              type="button"
              disabled={isBulkExporting}
              onClick={() => handleBulkExportPDF(selectedInvoices, 'download')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              title="Download all selected invoices as a single consolidated PDF"
            >
              {isBulkExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Download Consolidated PDF ({selectedInvoiceIds.length})</span>
                </>
              )}
            </button>

            {/* Print Consolidated */}
            <button
              type="button"
              disabled={isBulkExporting}
              onClick={() => handleBulkExportPDF(selectedInvoices, 'print')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Print all selected invoices in one batch"
            >
              <Printer className="w-4 h-4" />
              <span>Print Batch</span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all filtered invoices"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPartiallySelected;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">Invoice No.</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer / Recipient</th>
                <th className="py-2.5 px-3">Place of Supply</th>
                <th className="py-2.5 px-3">GST Type</th>
                <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 text-right">Tax Total (₹)</th>
                <th className="py-2.5 px-3 text-right">Grand Total (₹)</th>
                <th className="py-2.5 px-3 text-right">Balance Due (₹)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-sm">No invoices found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        No invoice records match the selected filters. Try broadening your date range, amount, or clearing filters.
                      </p>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllFilters}
                          className="mt-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const totalTax =
                    (inv.cgstTotal || 0) + (inv.sgstTotal || 0) + (inv.igstTotal || 0) + (inv.cessTotal || 0);
                  const isSelected = selectedInvoiceIds.includes(inv.id);

                  return (
                    <tr
                      key={inv.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select invoice ${inv.invoiceNumber}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelectInvoice(inv.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 font-mono">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{inv.date}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800 truncate max-w-[180px]">{inv.customerName}</p>
                        <p className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]">
                          {inv.customerGstin ? `GSTIN: ${inv.customerGstin}` : 'Unregistered (URP)'}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span className="text-[11px] truncate max-w-[120px] block" title={`${inv.placeOfSupply} (${inv.placeOfSupplyCode})`}>
                          {inv.placeOfSupply} ({inv.placeOfSupplyCode})
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            inv.isInterState ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {inv.isInterState ? 'IGST' : 'CGST+SGST'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        ₹ {inv.totalTaxable.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        ₹ {totalTax.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatINR(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        <span className={inv.balanceDue > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700'}>
                          {formatINR(inv.balanceDue)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'FINALIZED'
                              ? 'bg-blue-100 text-blue-800'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-100 text-amber-800'
                              : inv.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800 line-through'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Preview modal */}
                          <button
                            onClick={() => onPreviewInvoice(inv)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Preview Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => generateInvoicePDF(inv, business, 'download')}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Print */}
                          <button
                            onClick={() => generateInvoicePDF(inv, business, 'print')}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Print"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit / Draft */}
                          {inv.status === 'DRAFT' && (
                            <button
                              onClick={() => onEditInvoice(inv.id)}
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              title="Edit Draft"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Record Payment */}
                          {inv.status !== 'CANCELLED' && inv.balanceDue > 0 && (
                            <button
                              onClick={() => {
                                setPaymentInvoice(inv);
                                setPaymentForm({
                                   amount: inv.balanceDue,
                                  date: new Date().toISOString().split('T')[0],
                                  mode: 'BANK_TRANSFER',
                                  referenceNo: '',
                                  notes: '',
                                });
                              }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                              title="Record Payment Receipt"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(inv)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Duplicate as new draft"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Cancel Invoice */}
                          {inv.status !== 'CANCELLED' && inv.status !== 'DRAFT' && (
                            <button
                              onClick={() => setCancelModalInvoice(inv)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Cancel Invoice"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Draft */}
                          {inv.status === 'DRAFT' && (
                            <button
                              onClick={() => deleteInvoice(inv.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {paymentInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Record Receipt against {paymentInvoice.invoiceNumber}</span>
              </h3>
              <button
                type="button"
                onClick={() => setPaymentInvoice(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={paymentInvoice.balanceDue}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full text-sm font-bold border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-500">
                  Total Outstanding Balance: {formatINR(paymentInvoice.balanceDue)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mode</label>
                  <select
                    value={paymentForm.mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value as any })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / UTR / Cheque #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR12345678"
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Invoice Modal */}
      {cancelModalInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>Cancel Invoice {cancelModalInvoice.invoiceNumber}</span>
              </h3>
              <button
                type="button"
                onClick={() => setCancelModalInvoice(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Under GST rules, cancelled invoice numbers cannot be deleted or re-used. They will be reported as cancelled in Table 13 of GSTR-1.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Cancellation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data entry error, order cancelled by buyer"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalInvoice(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
