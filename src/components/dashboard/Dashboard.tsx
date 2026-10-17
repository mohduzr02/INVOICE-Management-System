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
  ArrowUpRight,
  ShieldAlert,
  ArrowRight,
  Receipt,
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
  } = useBusiness();

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

      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              GSTIN: {business.gstin || 'NOT CONFIGURED'}
            </span>
            <span className="text-xs text-slate-400">State: {business.state} ({business.stateCode})</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">{business.name}</h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1">
            Real-time billing, tax liability, input tax credit, and inventory control.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('invoice-generator')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Tax Invoice</span>
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-2.5 rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <span>Record Purchase</span>
          </button>
          <button
            onClick={() => onNavigate('gstr1')}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-2.5 rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>GSTR-1 Report</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatINR(totalSales)}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Taxable: {formatINR(totalTaxableSales)}</span>
            <span className="text-emerald-700 font-semibold">{activeInvoices.length} Invoices</span>
          </div>
        </div>

        {/* GST Output Liability */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Output GST Liability</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatINR(totalOutputGst)}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Collected on Sales</span>
            <span className="text-rose-600 font-medium">To be paid</span>
          </div>
        </div>

        {/* Eligible ITC */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Input Tax Credit (ITC)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatINR(totalInputTaxCredit)}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Purchases: {formatINR(totalPurchases)}</span>
            <span className="text-indigo-600 font-medium">{purchases.length} Bills</span>
          </div>
        </div>

        {/* Net GST Payable */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net GST Cash Payable</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-900">{formatINR(netGstLiability)}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>After ITC Adjustment</span>
            <span className="text-amber-700 font-semibold">GSTR-3B T6.1</span>
          </div>
        </div>
      </div>

      {/* Secondary Financial Cards (Receivables, Payables, Expenses) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Receivables */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Receivables (Due from Customers)</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{formatINR(totalReceivables)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Total {customers.length} registered customers</p>
          </div>
          <button
            onClick={() => onNavigate('invoice-register')}
            className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Payables */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Payables (Due to Suppliers)</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{formatINR(totalPayables)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Total {suppliers.length} active suppliers</p>
          </div>
          <button
            onClick={() => onNavigate('purchases')}
            className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Operating Expenses</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{formatINR(totalExpenses)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{expenses.length} categorized entries</p>
          </div>
          <button
            onClick={() => onNavigate('expenses')}
            className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
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

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent GST Invoices</h3>
            <p className="text-xs text-slate-500">Live sales register and payment tracking</p>
          </div>
          <button
            onClick={() => onNavigate('invoice-register')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Full Invoice Register</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Place of Supply</th>
                <th className="py-2.5 px-4">Taxable</th>
                <th className="py-2.5 px-4">Total Amount</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <p className="font-semibold text-slate-700 text-xs">No GST invoices created yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Your sales register is completely clean. Click "Create Tax Invoice" to record your first sale.
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-600">{inv.date}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800 truncate max-w-[180px]">{inv.customerName}</p>
                      <p className="text-[11px] font-mono text-slate-400">{inv.customerGstin || 'URP'}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {inv.placeOfSupply} ({inv.placeOfSupplyCode})
                    </td>
                    <td className="py-3 px-4 font-mono">{formatINR(inv.totalTaxable)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">{formatINR(inv.grandTotal)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'FINALIZED'
                            ? 'bg-blue-100 text-blue-800'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : inv.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onOpenInvoice(inv.id)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs cursor-pointer"
                      >
                        Open & PDF
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
  );
};
