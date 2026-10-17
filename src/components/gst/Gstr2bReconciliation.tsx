import React, { useState, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { Gstr2BRecord, ReconciliationResult, Purchase } from '../../types';
import { formatINR } from '../../services/gstEngine';
import { parseGstr2BFile } from '../../services/excelExporter';
import { reconcileGstr2B } from '../../services/reconciliation';
import {
  Scale,
  Upload,
  FileCheck,
  AlertTriangle,
  FileX,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

export const Gstr2bReconciliation: React.FC = () => {
  const { purchases } = useBusiness();

  const [portalRecords, setPortalRecords] = useState<Gstr2BRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'matched' | 'taxMismatch' | 'booksOnly' | 'portalOnly'>('matched');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load sample 2B data for immediate testing
  const handleLoadSample2B = () => {
    const sample2B: Gstr2BRecord[] = [
      {
        gstinSupplier: '29AABCD1122K1Z9',
        tradeNameSupplier: 'Dell Technologies India Pvt Ltd',
        invoiceNumber: 'DELL-INV-88910',
        invoiceType: 'Regular',
        invoiceDate: '2026-10-01',
        invoiceValue: 226560,
        placeOfSupply: '27',
        taxableValue: 192000,
        integratedTax: 34560,
        centralTax: 0,
        stateTax: 0,
        cess: 0,
        itcAvailable: 'Y',
      },
      {
        gstinSupplier: '27AAOFQ3344J1Z2',
        tradeNameSupplier: 'QuickLink Cable & Networking Co',
        invoiceNumber: 'QL-OCT-044',
        invoiceType: 'Regular',
        invoiceDate: '2026-10-04',
        invoiceValue: 61360,
        placeOfSupply: '27',
        taxableValue: 52000,
        integratedTax: 0,
        centralTax: 4680,
        stateTax: 4680,
        cess: 0,
        itcAvailable: 'Y',
      },
      {
        gstinSupplier: '27AAACG9988H1Z5',
        tradeNameSupplier: 'Unrecorded Vendor Supplies Ltd',
        invoiceNumber: 'UNREC-9012',
        invoiceType: 'Regular',
        invoiceDate: '2026-10-06',
        invoiceValue: 29500,
        placeOfSupply: '27',
        taxableValue: 25000,
        integratedTax: 0,
        centralTax: 2250,
        stateTax: 2250,
        cess: 0,
        itcAvailable: 'Y',
      },
    ];

    setPortalRecords(sample2B);
    setStatusMessage(`Loaded ${sample2B.length} sample GSTR-2B portal records.`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const records = await parseGstr2BFile(file);
      setPortalRecords(records);
      setStatusMessage(`Successfully imported ${records.length} records from ${file.name}`);
    } catch (err: any) {
      alert('Error parsing GSTR-2B file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const reconciliation: ReconciliationResult = useMemo(() => {
    return reconcileGstr2B(purchases, portalRecords);
  }, [purchases, portalRecords]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            <span>GSTR-2B vs Purchase Register (ITC) Reconciliation</span>
          </h2>
          <p className="text-xs text-slate-500">
            Reconcile your purchase books with auto-drafted ITC statement (GSTR-2B) to protect tax credit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Upload GSTR-2B (JSON / Excel)</span>
            <input
              type="file"
              accept=".json,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleLoadSample2B}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-indigo-600" />
            <span>Load Portal Sample</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Reconciliation Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Matched */}
        <div
          onClick={() => setActiveTab('matched')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'matched'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase">Exact Matched</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-700 mt-1">{reconciliation.matched.length}</p>
          <span className="text-[10px] text-slate-400">Claim 100% ITC safely</span>
        </div>

        {/* Tax Mismatch */}
        <div
          onClick={() => setActiveTab('taxMismatch')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'taxMismatch'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase">Tax Amount Diff</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-700 mt-1">{reconciliation.taxMismatch.length}</p>
          <span className="text-[10px] text-slate-400">Discrepancy in invoice / tax</span>
        </div>

        {/* Books Only (Missing in 2B) */}
        <div
          onClick={() => setActiveTab('booksOnly')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'booksOnly'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase">In Books Only</span>
            <FileX className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-700 mt-1">{reconciliation.booksOnly.length}</p>
          <span className="text-[10px] text-slate-400">Supplier hasn't filed GSTR-1</span>
        </div>

        {/* Portal Only (Missing in Books) */}
        <div
          onClick={() => setActiveTab('portalOnly')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'portalOnly'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/20'
              : 'bg-white border-slate-200 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase">In Portal (2B) Only</span>
            <HelpCircle className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-purple-700 mt-1">{reconciliation.portalOnly.length}</p>
          <span className="text-[10px] text-slate-400">Bill missing from our books</span>
        </div>
      </div>

      {/* Reconciliation Table Results */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
          {activeTab === 'matched' && `Matched Records (${reconciliation.matched.length})`}
          {activeTab === 'taxMismatch' && `Tax Discrepancies (${reconciliation.taxMismatch.length})`}
          {activeTab === 'booksOnly' && `Bills in Books Only - Missing on Portal (${reconciliation.booksOnly.length})`}
          {activeTab === 'portalOnly' && `Invoices on Portal Only - Missing in Purchase Register (${reconciliation.portalOnly.length})`}
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'matched' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3">Supplier GSTIN</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                  <th className="py-2.5 px-3 text-right">ITC Tax (₹)</th>
                  <th className="py-2.5 px-3 text-right">Invoice Value (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reconciliation.matched.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No matched records yet. Load or upload a GSTR-2B file.
                    </td>
                  </tr>
                ) : (
                  reconciliation.matched.map((m, idx) => {
                    const tax = (m.book.cgstTotal || 0) + (m.book.sgstTotal || 0) + (m.book.igstTotal || 0);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-semibold">{m.portal.gstinSupplier}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{m.book.supplierName}</td>
                        <td className="py-2.5 px-3 font-mono text-indigo-700">{m.book.supplierInvoiceNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">{m.book.date}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹ {m.book.totalTaxable.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                          ₹ {tax.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {formatINR(m.book.grandTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Verified
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'taxMismatch' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3 text-right">Books Tax (₹)</th>
                  <th className="py-2.5 px-3 text-right">Portal 2B Tax (₹)</th>
                  <th className="py-2.5 px-3 text-right text-rose-600">Difference (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reconciliation.taxMismatch.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No tax amount mismatches found.
                    </td>
                  </tr>
                ) : (
                  reconciliation.taxMismatch.map((tm, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold">{tm.book.supplierName}</td>
                      <td className="py-2.5 px-3 font-mono">{tm.book.supplierInvoiceNumber}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {((tm.book.cgstTotal || 0) + (tm.book.sgstTotal || 0) + (tm.book.igstTotal || 0)).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {((tm.portal.centralTax || 0) + (tm.portal.stateTax || 0) + (tm.portal.integratedTax || 0)).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                        ₹ {tm.difference.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'booksOnly' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3">Bill No.</th>
                  <th className="py-2.5 px-3">Supplier Invoice #</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3 text-center">Action Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reconciliation.booksOnly.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      All purchase bills matched with GSTR-2B.
                    </td>
                  </tr>
                ) : (
                  reconciliation.booksOnly.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2.5 px-3 font-mono font-semibold">{b.billNumber}</td>
                      <td className="py-2.5 px-3 font-mono">{b.supplierInvoiceNumber}</td>
                      <td className="py-2.5 px-3">{b.supplierName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{b.date}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹ {b.totalTaxable.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{formatINR(b.grandTotal)}</td>
                      <td className="py-2.5 px-3 text-center text-amber-700 font-semibold">
                        Follow up with vendor to file GSTR-1
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'portalOnly' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3">Supplier GSTIN</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                  <th className="py-2.5 px-3 text-right">Invoice Value (₹)</th>
                  <th className="py-2.5 px-3 text-center">Action Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reconciliation.portalOnly.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No portal-only invoices found.
                    </td>
                  </tr>
                ) : (
                  reconciliation.portalOnly.map((p, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-mono font-semibold">{p.gstinSupplier}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{p.tradeNameSupplier}</td>
                      <td className="py-2.5 px-3 font-mono text-purple-700">{p.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.invoiceDate}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹ {p.taxableValue.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">₹ {p.invoiceValue.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center text-purple-700 font-semibold">
                        Record bill in Purchase Register to claim ITC
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
