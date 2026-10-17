import React, { useState, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatINR } from '../../services/gstEngine';
import { exportGSTR1ToExcel } from '../../services/excelExporter';
import {
  PieChart,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  FileText,
  Layers,
} from 'lucide-react';

export const Gstr1Module: React.FC = () => {
  const { invoices, creditNotes, business } = useBusiness();
  const [activeTab, setActiveTab] = useState<'b2b' | 'b2cl' | 'b2cs' | 'cdnr' | 'hsn' | 'docs'>('b2b');

  const activeInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
  const cancelledInvoices = invoices.filter((i) => i.status === 'CANCELLED');

  // Table 4: B2B Invoices (Customers with 15 digit GSTIN)
  const b2bInvoices = useMemo(() => {
    return activeInvoices.filter(
      (inv) => inv.customerGstin && inv.customerGstin.trim().length === 15
    );
  }, [activeInvoices]);

  // Table 5: B2CL (Inter-state unregistered with Invoice Value > 2,50,000)
  const b2clInvoices = useMemo(() => {
    return activeInvoices.filter(
      (inv) =>
        (!inv.customerGstin || inv.customerGstin.trim().length !== 15) &&
        inv.isInterState &&
        inv.grandTotal > 250000
    );
  }, [activeInvoices]);

  // Table 7: B2CS (All other unregistered outward supplies)
  const b2csInvoices = useMemo(() => {
    return activeInvoices.filter(
      (inv) =>
        (!inv.customerGstin || inv.customerGstin.trim().length !== 15) &&
        !(inv.isInterState && inv.grandTotal > 250000)
    );
  }, [activeInvoices]);

  // Table 9B: CDNR (Credit / Debit notes)
  const cdnrNotes = creditNotes.filter((n) => n.status === 'ACTIVE');

  // Table 12: HSN Summary
  const hsnSummary = useMemo(() => {
    const map: { [hsn: string]: { description: string; uqc: string; totalQty: number; totalVal: number; taxableVal: number; igst: number; cgst: number; sgst: number; cess: number } } = {};

    activeInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const code = item.hsnSac || 'OTHER';
        if (!map[code]) {
          map[code] = {
            description: item.name,
            uqc: item.unit || 'NOS',
            totalQty: 0,
            totalVal: 0,
            taxableVal: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            cess: 0,
          };
        }
        map[code].totalQty += item.quantity;
        map[code].totalVal += item.totalAmount;
        map[code].taxableVal += item.taxableAmount;
        map[code].igst += item.igstAmount;
        map[code].cgst += item.cgstAmount;
        map[code].sgst += item.sgstAmount;
        map[code].cess += item.cessAmount;
      });
    });

    return Object.entries(map).map(([hsn, data]) => ({ hsn, ...data }));
  }, [activeInvoices]);

  // Totals for B2B
  const b2bTaxable = b2bInvoices.reduce((acc, i) => acc + i.totalTaxable, 0);
  const b2bTotalTax = b2bInvoices.reduce(
    (acc, i) => acc + i.cgstTotal + i.sgstTotal + i.igstTotal + i.cessTotal,
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            <span>GSTR-1 Preparation & Working Papers</span>
          </h2>
          <p className="text-xs text-slate-500">
            Statement of Outward Supplies partitioned into official GSTN filing tables
          </p>
        </div>

        <button
          onClick={() => exportGSTR1ToExcel(invoices)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Download GSTR-1 Excel (Multi-Sheet)</span>
        </button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">4A - B2B Invoices</span>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{b2bInvoices.length}</p>
          <span className="text-[10px] text-slate-400">Taxable: {formatINR(b2bTaxable)}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">5 - B2C Large</span>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{b2clInvoices.length}</p>
          <span className="text-[10px] text-slate-400">Inter-state &gt; ₹2.5L</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">7 - B2C Small</span>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{b2csInvoices.length}</p>
          <span className="text-[10px] text-slate-400">Retail consumer sales</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">12 - HSN Entries</span>
          <p className="text-lg font-bold text-indigo-700 mt-0.5">{hsnSummary.length}</p>
          <span className="text-[10px] text-slate-400">Tariff line summaries</span>
        </div>
      </div>

      {/* Table Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50">
          <button
            onClick={() => setActiveTab('b2b')}
            className={`py-2.5 px-4 text-xs font-semibold whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'b2b'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            4A - B2B Invoices ({b2bInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('b2cl')}
            className={`py-2.5 px-4 text-xs font-semibold whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'b2cl'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            5 - B2C Large ({b2clInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('b2cs')}
            className={`py-2.5 px-4 text-xs font-semibold whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'b2cs'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            7 - B2C Small ({b2csInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('cdnr')}
            className={`py-2.5 px-4 text-xs font-semibold whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'cdnr'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            9B - CDNR / Notes ({cdnrNotes.length})
          </button>
          <button
            onClick={() => setActiveTab('hsn')}
            className={`py-2.5 px-4 text-xs font-semibold whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'hsn'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            12 - HSN Summary ({hsnSummary.length})
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`py-2.5 px-4 text-xs font-semibold whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'docs'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            13 - Documents Issued
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'b2b' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <th className="py-2 px-3">Recipient GSTIN</th>
                    <th className="py-2 px-3">Receiver Name</th>
                    <th className="py-2 px-3">Invoice #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Place of Supply</th>
                    <th className="py-2 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2 px-3 text-right">Total GST (₹)</th>
                    <th className="py-2 px-3 text-right">Invoice Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {b2bInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{inv.customerGstin}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{inv.customerName}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-700">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-600">{inv.date}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {inv.placeOfSupplyCode}-{inv.placeOfSupply}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">₹ {inv.totalTaxable.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ₹ {(inv.cgstTotal + inv.sgstTotal + inv.igstTotal + inv.cessTotal).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹ {inv.grandTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'b2cl' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <th className="py-2 px-3">Invoice #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Place of Supply</th>
                    <th className="py-2 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2 px-3 text-right">IGST (₹)</th>
                    <th className="py-2 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {b2clInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No B2C Large invoices (inter-state unregistered &gt; ₹2.5 Lakhs)
                      </td>
                    </tr>
                  ) : (
                    b2clInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-2.5 px-3 font-mono">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3">{inv.date}</td>
                        <td className="py-2.5 px-3">{inv.placeOfSupply}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹ {inv.totalTaxable.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹ {inv.igstTotal.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">₹ {inv.grandTotal.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'b2cs' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <th className="py-2 px-3">Invoice #</th>
                    <th className="py-2 px-3">Customer</th>
                    <th className="py-2 px-3">Place of Supply</th>
                    <th className="py-2 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2 px-3 text-right">CGST+SGST (₹)</th>
                    <th className="py-2 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {b2csInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2.5 px-3 font-mono">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3">{inv.customerName}</td>
                      <td className="py-2.5 px-3">{inv.placeOfSupply}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹ {inv.totalTaxable.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹ {(inv.cgstTotal + inv.sgstTotal).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">₹ {inv.grandTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'hsn' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <th className="py-2 px-3">HSN Code</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">UQC</th>
                    <th className="py-2 px-3 text-center">Total Qty</th>
                    <th className="py-2 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2 px-3 text-right">IGST (₹)</th>
                    <th className="py-2 px-3 text-right">CGST (₹)</th>
                    <th className="py-2 px-3 text-right">SGST (₹)</th>
                    <th className="py-2 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hsnSummary.map((h) => (
                    <tr key={h.hsn}>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{h.hsn}</td>
                      <td className="py-2.5 px-3 text-slate-700">{h.description}</td>
                      <td className="py-2.5 px-3 font-mono">{h.uqc}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{h.totalQty}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹ {h.taxableVal.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹ {h.igst.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹ {h.cgst.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹ {h.sgst.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">₹ {h.totalVal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'cdnr' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <th className="py-2 px-3">Note Number</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Recipient Name</th>
                    <th className="py-2 px-3">Against Invoice</th>
                    <th className="py-2 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2 px-3 text-right">Total Note (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cdnrNotes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No Credit or Debit Notes issued this period.
                      </td>
                    </tr>
                  ) : (
                    cdnrNotes.map((n) => (
                      <tr key={n.id}>
                        <td className="py-2.5 px-3 font-mono font-semibold">{n.noteNumber}</td>
                        <td className="py-2.5 px-3">{n.noteType}</td>
                        <td className="py-2.5 px-3">{n.partyName}</td>
                        <td className="py-2.5 px-3 font-mono">{n.originalInvoiceNumber}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹ {n.totalTaxable.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">₹ {n.grandTotal.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-900">Table 13: Summary of Documents Issued</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Nature of Document</th>
                      <th className="py-2.5 px-3">From Serial No.</th>
                      <th className="py-2.5 px-3">To Serial No.</th>
                      <th className="py-2.5 px-3 text-center">Total Number</th>
                      <th className="py-2.5 px-3 text-center">Cancelled</th>
                      <th className="py-2.5 px-3 text-center">Net Issued</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2.5 px-3 font-medium">Invoices for Outward Supply</td>
                      <td className="py-2.5 px-3 font-mono">{invoices[invoices.length - 1]?.invoiceNumber || '-'}</td>
                      <td className="py-2.5 px-3 font-mono">{invoices[0]?.invoiceNumber || '-'}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{invoices.length}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-rose-600">{cancelledInvoices.length}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                        {activeInvoices.length}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">Credit Notes / Debit Notes</td>
                      <td className="py-2.5 px-3 font-mono">{creditNotes[creditNotes.length - 1]?.noteNumber || '-'}</td>
                      <td className="py-2.5 px-3 font-mono">{creditNotes[0]?.noteNumber || '-'}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{creditNotes.length}</td>
                      <td className="py-2.5 px-3 text-center font-mono">0</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                        {creditNotes.length}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
