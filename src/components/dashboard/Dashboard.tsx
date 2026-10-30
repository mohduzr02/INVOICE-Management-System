import React from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatINR } from '../../services/gstEngine';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
  CreditCard,
  Building,
  PlusCircle,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  ArrowRight,
  Receipt,
  HardDrive,
  Download,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';
import { FinancialTrendsSection } from './FinancialTrendsSection';

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenInvoice: (invoiceId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenInvoice }) => {
  const {
    business,
    invoices,
    purchases,
    customers,
    suppliers,
    products,
    expenses,
    hasSampleData,
    clearAllSampleData,
    lastBackupTimestamp,
    exportBackupJSON,
  } = useBusiness();

  const [backupSuccessNotice, setBackupSuccessNotice] = React.useState<string | null>(null);

  const handleQuickBackup = () => {
    try {
      const res = exportBackupJSON();
      setBackupSuccessNotice(`Database backup exported: ${res.filename}`);
      setTimeout(() => setBackupSuccessNotice(null), 4000);
    } catch (err: any) {
      alert(`Backup failed: ${err?.message || 'Error'}`);
    }
  };

  // Real data calculations
  const activeInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
  const totalSales = activeInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
  const totalTaxableSales = activeInvoices.reduce((acc, i) => acc + (i.totalTaxable || 0), 0);
  const totalOutputGst = activeInvoices.reduce(
    (acc, i) => acc + (i.cgstTotal || 0) + (i.sgstTotal || 0) + (i.igstTotal || 0) + (i.cessTotal || 0),
    0
  );

  const totalPurchases = purchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
  const eligibleItcPurchases = purchases.filter((p) => p.itcEligibility === 'ELIGIBLE');
  const totalInputTaxCredit = eligibleItcPurchases.reduce(
    (acc, p) => acc + (p.cgstTotal || 0) + (p.sgstTotal || 0) + (p.igstTotal || 0) + (p.cessTotal || 0),
    0
  );

  const netGstLiability = Math.max(0, totalOutputGst - totalInputTaxCredit);

  // Total receivables & payables
  const totalReceivables = activeInvoices.reduce((acc, i) => acc + (i.balanceDue || 0), 0);
  const totalPayables = purchases.reduce((acc, p) => acc + (p.balanceDue || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  // Low stock products alert
  const lowStockProducts = products.filter(
    (p) => p.type === 'goods' && p.currentStock <= p.minStockAlert
  );

  // Overdue invoices (due date earlier than today and balance due > 0)
  const today = new Date().toISOString().split('T')[0];
  const overdueInvoices = activeInvoices.filter(
    (i) => i.balanceDue > 0 && i.dueDate && i.dueDate < today
  );

  return (
    <div className="space-y-6">
      {/* Sample Demo Data Alert Banner */}
      {hasSampleData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Sample demo data detected:</strong> The application contains mock products or demo entries.
            </span>
          </div>
          <button
            onClick={() => clearAllSampleData()}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Remove All Sample / Demo Data
          </button>
        </div>
      )}

      {/* Header Section - Variation 1 */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[rgba(17,17,19,0.12)]">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111113] m-0" style={{ letterSpacing: '-0.03em' }}>
            Overview
          </h1>
          <p className="text-sm text-[#111113]/60 mt-1">
            Managing your Indian GST compliance.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#111113]/60">
            <span className="font-semibold text-[#111113]">{business.name}</span>
            <span>·</span>
            <span className="font-mono-code text-[11px]">
              GSTIN: {business.gstin || 'NOT CONFIGURED'}
            </span>
            <span>·</span>
            <span>State: {business.state} ({business.stateCode})</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('invoice-generator')}
            className="btn-primary-v1 text-xs shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="btn-secondary-v1 text-xs"
          >
            <span>Record Purchase</span>
          </button>
          <button
            onClick={() => onNavigate('gstr1')}
            className="btn-secondary-v1 text-xs"
          >
            <span>GSTR-1</span>
          </button>
          <button
            onClick={() => onNavigate('backup-data')}
            className="btn-secondary-v1 text-xs flex items-center gap-1.5"
            title="Export or Restore Complete Database"
          >
            <HardDrive className="w-3.5 h-3.5 text-[#4f46e5]" />
            <span>Backup & Restore</span>
          </button>
        </div>
      </header>

      {/* Quick Backup Feedback Banner */}
      {backupSuccessNotice && (
        <div className="card-v1 p-3 bg-emerald-50/80 border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{backupSuccessNotice}</span>
          </div>
          <button
            onClick={() => setBackupSuccessNotice(null)}
            className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Data Safety & Portability Card */}
      <div className="card-v1 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#111113] text-[#F8F7F4] flex items-center justify-center font-bold shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-[#111113] flex items-center gap-2">
              <span>Data Safety & Portability Hub</span>
              <span className="label text-[9px] text-[#4f46e5] border border-[rgba(17,17,19,0.12)] px-1.5 py-0.5 rounded">CGST Sec 36/44</span>
            </div>
            <p className="text-[11px] text-[#111113]/60 mt-0.5">
              {lastBackupTimestamp ? `Last backed up: ${new Date(lastBackupTimestamp).toLocaleString('en-IN')}` : 'No local backup recorded yet.'} • Export to JSON or restore anytime to guarantee full data protection.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleQuickBackup}
            className="btn-primary-v1 text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Export full business database to a local JSON file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup Data</span>
          </button>
          <button
            onClick={() => onNavigate('backup-data')}
            className="btn-secondary-v1 text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
            title="Import and restore from a JSON backup file"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore Data</span>
          </button>
        </div>
      </div>

      {/* Primary 4-Metric Grid - Variation 1 Card */}
      <section className="card-v1 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <div className="label">Total Sales</div>
          <div className="text-2xl sm:text-3xl font-bold mt-2 text-[#111113] tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            {formatINR(totalSales)}
          </div>
          <div className="text-[11px] font-mono-code text-[#111113]/60 mt-1.5 flex items-center justify-between">
            <span>Taxable: {formatINR(totalTaxableSales)}</span>
            <span className="font-semibold text-[#111113]">{activeInvoices.length} Invoices</span>
          </div>
        </div>

        <div>
          <div className="label">Output GST</div>
          <div className="text-2xl sm:text-3xl font-bold mt-2 text-[#111113] tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            {formatINR(totalOutputGst)}
          </div>
          <div className="text-[11px] font-mono-code text-[#111113]/60 mt-1.5 flex items-center justify-between">
            <span>Collected on Sales</span>
            <span className="text-[#111113]/80">Outward Tax</span>
          </div>
        </div>

        <div>
          <div className="label">Input Tax (ITC)</div>
          <div className="text-2xl sm:text-3xl font-bold mt-2 text-[#111113] tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            {formatINR(totalInputTaxCredit)}
          </div>
          <div className="text-[11px] font-mono-code text-[#111113]/60 mt-1.5 flex items-center justify-between">
            <span>Purchases: {formatINR(totalPurchases)}</span>
            <span className="text-[#111113]/80">{purchases.length} Bills</span>
          </div>
        </div>

        <div>
          <div className="label">Net Payable</div>
          <div className="text-2xl sm:text-3xl font-bold mt-2 text-[#4f46e5] tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            {formatINR(netGstLiability)}
          </div>
          <div className="text-[11px] font-mono-code text-[#111113]/60 mt-1.5 flex items-center justify-between">
            <span>After ITC Adjustment</span>
            <span className="text-[#4f46e5] font-semibold">GSTR-3B T6.1</span>
          </div>
        </div>
      </section>

      {/* Secondary Financial Cards (Receivables, Payables, Expenses) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Receivables */}
        <div className="card-v1 p-4.5 flex items-center justify-between">
          <div>
            <div className="label">Receivables</div>
            <div className="text-xl font-bold text-[#111113] mt-1 tracking-tight">{formatINR(totalReceivables)}</div>
            <p className="text-[11px] text-[#111113]/55 mt-0.5">{customers.length} registered customers</p>
          </div>
          <button
            onClick={() => onNavigate('invoice-register')}
            className="text-xs font-semibold text-[#4f46e5] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Payables */}
        <div className="card-v1 p-4.5 flex items-center justify-between">
          <div>
            <div className="label">Payables</div>
            <div className="text-xl font-bold text-[#111113] mt-1 tracking-tight">{formatINR(totalPayables)}</div>
            <p className="text-[11px] text-[#111113]/55 mt-0.5">{suppliers.length} active suppliers</p>
          </div>
          <button
            onClick={() => onNavigate('purchases')}
            className="text-xs font-semibold text-[#4f46e5] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Total Expenses */}
        <div className="card-v1 p-4.5 flex items-center justify-between">
          <div>
            <div className="label">Operating Expenses</div>
            <div className="text-xl font-bold text-[#111113] mt-1 tracking-tight">{formatINR(totalExpenses)}</div>
            <p className="text-[11px] text-[#111113]/55 mt-0.5">{expenses.length} categorized entries</p>
          </div>
          <button
            onClick={() => onNavigate('expenses')}
            className="text-xs font-semibold text-[#4f46e5] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Critical Alerts Row: Low Stock & Overdue Invoices */}
      {(lowStockProducts.length > 0 || overdueInvoices.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockProducts.length > 0 && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Low Stock Inventory Alerts ({lowStockProducts.length} items below reorder limit)</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-rose-100 text-xs"
                  >
                    <span className="font-medium text-slate-800 truncate max-w-[200px]">{p.name}</span>
                    <span className="font-semibold text-rose-600">
                      {p.currentStock} {p.unit} remaining (Min: {p.minStockAlert})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {overdueInvoices.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Overdue Invoices ({overdueInvoices.length} invoices past due date)</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {overdueInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => onOpenInvoice(inv.id)}
                    className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-amber-100 text-xs cursor-pointer hover:bg-amber-50"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{inv.invoiceNumber}</span>
                      <span className="text-slate-500 ml-2">({inv.customerName})</span>
                    </div>
                    <span className="font-bold text-amber-700">Due: {formatINR(inv.balanceDue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section: Monthly Profit and Revenue Trends Line Chart */}
      <FinancialTrendsSection />

      {/* Recent Transactions Section - Variation 1 */}
      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div className="label">Recent Transactions</div>
          <button
            onClick={() => onNavigate('invoice-register')}
            className="text-xs font-semibold text-[#4f46e5] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Full Register</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="card-v1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[rgba(17,17,19,0.12)] bg-white text-[#111113]">
                  <th className="py-3 px-4 label font-medium">Invoice #</th>
                  <th className="py-3 px-4 label font-medium">Date</th>
                  <th className="py-3 px-4 label font-medium">Customer</th>
                  <th className="py-3 px-4 label font-medium">Place of Supply</th>
                  <th className="py-3 px-4 label font-medium">Taxable</th>
                  <th className="py-3 px-4 label font-medium">Total</th>
                  <th className="py-3 px-4 label font-medium">Status</th>
                  <th className="py-3 px-4 label font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(17,17,19,0.06)] bg-white">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#111113]/50">
                      <p className="font-medium text-sm text-[#111113]">No records found.</p>
                      <p className="text-xs mt-1 text-[#111113]/40">
                        Click "Create Invoice" to issue your first GST invoice.
                      </p>
                    </td>
                  </tr>
                ) : (
                  invoices.slice(0, 5).map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F8F7F4]/80 transition-colors">
                      <td className="py-3 px-4 font-mono-code font-bold text-[#111113]">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-[#111113]/70 font-mono-code text-[11px]">{inv.date}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#111113] truncate max-w-[180px]">{inv.customerName}</p>
                        <p className="text-[10px] font-mono-code text-[#111113]/40">{inv.customerGstin || 'URP'}</p>
                      </td>
                      <td className="py-3 px-4 text-[#111113]/70">
                        {inv.placeOfSupply} ({inv.placeOfSupplyCode})
                      </td>
                      <td className="py-3 px-4 font-mono-code">{formatINR(inv.totalTaxable)}</td>
                      <td className="py-3 px-4 font-bold text-[#111113] font-mono-code">{formatINR(inv.grandTotal)}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 font-mono-code text-[11px]">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-600'
                                : inv.status === 'FINALIZED'
                                ? 'bg-[#111113]'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-[#4f46e5]'
                                : inv.status === 'CANCELLED'
                                ? 'bg-rose-500'
                                : 'bg-stone-400'
                            }`}
                          />
                          <span className="text-[#111113] font-medium">{inv.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onOpenInvoice(inv.id)}
                          className="text-[#4f46e5] hover:underline font-semibold text-xs cursor-pointer transition-colors"
                        >
                          View & PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
