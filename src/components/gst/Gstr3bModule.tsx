import React from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatINR } from '../../services/gstEngine';
import {
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  CheckCircle,
  TrendingUp,
  CreditCard,
} from 'lucide-react';

export const Gstr3bModule: React.FC = () => {
  const { invoices, purchases, business } = useBusiness();

  const activeInvoices = invoices.filter((i) => i.status !== 'CANCELLED');

  // Table 3.1 Outward Taxable
  const t31Taxable = activeInvoices.reduce((acc, i) => acc + (i.totalTaxable || 0), 0);
  const t31Igst = activeInvoices.reduce((acc, i) => acc + (i.igstTotal || 0), 0);
  const t31Cgst = activeInvoices.reduce((acc, i) => acc + (i.cgstTotal || 0), 0);
  const t31Sgst = activeInvoices.reduce((acc, i) => acc + (i.sgstTotal || 0), 0);
  const t31Cess = activeInvoices.reduce((acc, i) => acc + (i.cessTotal || 0), 0);

  // Table 4 Eligible ITC
  const eligiblePurchases = purchases.filter((p) => p.itcEligibility === 'ELIGIBLE');
  const t4Igst = eligiblePurchases.reduce((acc, p) => acc + (p.igstTotal || 0), 0);
  const t4Cgst = eligiblePurchases.reduce((acc, p) => acc + (p.cgstTotal || 0), 0);
  const t4Sgst = eligiblePurchases.reduce((acc, p) => acc + (p.sgstTotal || 0), 0);
  const t4Cess = eligiblePurchases.reduce((acc, p) => acc + (p.cessTotal || 0), 0);

  // Table 4(B) ITC Reversals
  const reversedPurchases = purchases.filter((p) => p.itcEligibility === 'REVERSED');
  const revIgst = reversedPurchases.reduce((acc, p) => acc + (p.igstTotal || 0), 0);
  const revCgst = reversedPurchases.reduce((acc, p) => acc + (p.cgstTotal || 0), 0);
  const revSgst = reversedPurchases.reduce((acc, p) => acc + (p.sgstTotal || 0), 0);

  // Net ITC
  const netItcIgst = Math.max(0, t4Igst - revIgst);
  const netItcCgst = Math.max(0, t4Cgst - revCgst);
  const netItcSgst = Math.max(0, t4Sgst - revSgst);

  // Table 6.1 Tax Payable in Cash
  const cashIgst = Math.max(0, t31Igst - netItcIgst);
  const cashCgst = Math.max(0, t31Cgst - netItcCgst);
  const cashSgst = Math.max(0, t31Sgst - netItcSgst);
  const cashCess = t31Cess;
  const totalCashPayable = cashIgst + cashCgst + cashSgst + cashCess;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>GSTR-3B Monthly Tax Return Worksheet</span>
          </h2>
          <p className="text-xs text-slate-500">
            Summary computation of outward tax liabilities, eligible input tax credit (ITC), and net cash tax payable
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Worksheet</span>
        </button>
      </div>

      {/* Cash Liability Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            Table 6.1 - Final Tax Payable in Cash
          </span>
          <div className="text-2xl md:text-3xl font-extrabold mt-1 text-white">
            {formatINR(totalCashPayable)}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            After offsetting eligible ITC against output tax liability as per GST Set-off rules
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs bg-slate-800/60 p-3 rounded-lg border border-slate-700">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Output GST:</span>
            <span className="font-bold font-mono text-rose-300">
              {formatINR(t31Igst + t31Cgst + t31Sgst + t31Cess)}
            </span>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Net ITC Claimed:</span>
            <span className="font-bold font-mono text-emerald-300">
              {formatINR(netItcIgst + netItcCgst + netItcSgst + t4Cess)}
            </span>
          </div>
        </div>
      </div>

      {/* Table 3.1 Outward Supplies */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-xs text-slate-900">
            3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-3">Nature of Supplies</th>
                <th className="py-2.5 px-3 text-right">Total Taxable Value (₹)</th>
                <th className="py-2.5 px-3 text-right">Integrated Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Central Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">State / UT Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Cess (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr>
                <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                  (a) Outward taxable supplies (other than zero rated, nil, exempt)
                </td>
                <td className="py-2.5 px-3 text-right">{t31Taxable.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right">{t31Igst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right">{t31Cgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right">{t31Sgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right">{t31Cess.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-600">(b) Outward taxable supplies (zero rated)</td>
                <td className="py-2.5 px-3 text-right">0.00</td>
                <td className="py-2.5 px-3 text-right">0.00</td>
                <td className="py-2.5 px-3 text-right">-</td>
                <td className="py-2.5 px-3 text-right">-</td>
                <td className="py-2.5 px-3 text-right">0.00</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-600">(c) Other outward supplies (Nil, Exempt)</td>
                <td className="py-2.5 px-3 text-right">0.00</td>
                <td className="py-2.5 px-3 text-right">-</td>
                <td className="py-2.5 px-3 text-right">-</td>
                <td className="py-2.5 px-3 text-right">-</td>
                <td className="py-2.5 px-3 text-right">-</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-600">(d) Inward supplies liable to reverse charge</td>
                <td className="py-2.5 px-3 text-right">0.00</td>
                <td className="py-2.5 px-3 text-right">0.00</td>
                <td className="py-2.5 px-3 text-right">0.00</td>
                <td className="py-2.5 px-3 text-right">0.00</td>
                <td className="py-2.5 px-3 text-right">0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 4 Eligible ITC */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-xs text-slate-900">
            4. Eligible Input Tax Credit (ITC) Available & Reversed
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-3">Details</th>
                <th className="py-2.5 px-3 text-right">Integrated Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Central Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">State / UT Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Cess (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr className="bg-slate-50/50">
                <td className="py-2 px-3 font-sans font-bold text-slate-800" colSpan={5}>
                  (A) ITC Available (whether in full or part)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-700 pl-6">(5) All other ITC (Purchases)</td>
                <td className="py-2.5 px-3 text-right">{t4Igst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right">{t4Cgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right">{t4Sgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right">{t4Cess.toFixed(2)}</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-2 px-3 font-sans font-bold text-slate-800" colSpan={5}>
                  (B) ITC Reversed
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-700 pl-6">(1) As per rules 38, 42 and 43</td>
                <td className="py-2.5 px-3 text-right text-rose-600">{revIgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-rose-600">{revCgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-rose-600">{revSgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-rose-600">0.00</td>
              </tr>
              <tr className="bg-indigo-50/50 font-bold">
                <td className="py-2.5 px-3 font-sans text-indigo-900">(C) Net ITC Available (A) - (B)</td>
                <td className="py-2.5 px-3 text-right text-indigo-700">{netItcIgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-indigo-700">{netItcCgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-indigo-700">{netItcSgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-indigo-700">{t4Cess.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 6.1 Payment of Tax */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-xs text-slate-900">
            6.1 Payment of Tax (Cash & Credit Ledger Offset)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Tax Payable (₹)</th>
                <th className="py-2.5 px-3 text-right">Paid Through ITC (₹)</th>
                <th className="py-2.5 px-3 text-right">Tax Paid in Cash (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr>
                <td className="py-2.5 px-3 font-sans font-medium text-slate-800">Integrated Tax (IGST)</td>
                <td className="py-2.5 px-3 text-right">{t31Igst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-emerald-700">{Math.min(t31Igst, netItcIgst).toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{cashIgst.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-medium text-slate-800">Central Tax (CGST)</td>
                <td className="py-2.5 px-3 text-right">{t31Cgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-emerald-700">{Math.min(t31Cgst, netItcCgst).toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{cashCgst.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-medium text-slate-800">State / UT Tax (SGST)</td>
                <td className="py-2.5 px-3 text-right">{t31Sgst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-emerald-700">{Math.min(t31Sgst, netItcSgst).toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{cashSgst.toFixed(2)}</td>
              </tr>
              <tr className="bg-slate-50 font-bold font-sans">
                <td className="py-2.5 px-3 text-slate-900">Total Tax Liability</td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {(t31Igst + t31Cgst + t31Sgst + t31Cess).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                  {(Math.min(t31Igst, netItcIgst) + Math.min(t31Cgst, netItcCgst) + Math.min(t31Sgst, netItcSgst)).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-indigo-700">
                  {totalCashPayable.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
