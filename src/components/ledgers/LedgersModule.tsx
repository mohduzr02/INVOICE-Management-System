import React, { useState, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { LedgerEntry } from '../../types';
import { formatINR } from '../../services/gstEngine';
import { exportLedgerToExcel } from '../../services/excelExporter';
import { BookOpen, FileSpreadsheet, Search, UserCheck } from 'lucide-react';

interface LedgersModuleProps {
  initialPartyId?: string | null;
}

export const LedgersModule: React.FC<LedgersModuleProps> = ({ initialPartyId }) => {
  const { customers, suppliers, invoices, purchases, payments, creditNotes } = useBusiness();

  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [selectedPartyId, setSelectedPartyId] = useState<string>(() => {
    if (initialPartyId) return initialPartyId;
    return customers[0]?.id || '';
  });

  const partyList = partyType === 'CUSTOMER' ? customers : suppliers;
  const currentParty = partyList.find((p) => p.id === selectedPartyId);

  // Compute ledger entries
  const ledgerEntries = useMemo((): LedgerEntry[] => {
    if (!currentParty) return [];

    const rawEntries: Array<{
      date: string;
      voucherType: LedgerEntry['voucherType'];
      voucherNo: string;
      particulars: string;
      debit: number;
      credit: number;
    }> = [];

    // Opening balance
    if (currentParty.openingBalance && currentParty.openingBalance > 0) {
      rawEntries.push({
        date: currentParty.createdAt || '2026-04-01',
        voucherType: partyType === 'CUSTOMER' ? 'INVOICE' : 'PURCHASE_BILL',
        voucherNo: 'OP-BAL',
        particulars: 'Opening Balance b/f',
        debit: partyType === 'CUSTOMER' ? currentParty.openingBalance : 0,
        credit: partyType === 'SUPPLIER' ? currentParty.openingBalance : 0,
      });
    }

    if (partyType === 'CUSTOMER') {
      // Invoices (Debit)
      invoices
        .filter((i) => i.customerId === currentParty.id && i.status !== 'CANCELLED')
        .forEach((inv) => {
          rawEntries.push({
            date: inv.date,
            voucherType: 'INVOICE',
            voucherNo: inv.invoiceNumber,
            particulars: `Tax Invoice Sales (${inv.items.map((it) => it.name).join(', ')})`,
            debit: inv.grandTotal,
            credit: 0,
          });
        });

      // Payments received (Credit)
      payments
        .filter((p) => p.partyId === currentParty.id && p.type === 'RECEIPT')
        .forEach((pay) => {
          rawEntries.push({
            date: pay.date,
            voucherType: 'PAYMENT_RECEIPT',
            voucherNo: pay.paymentNumber,
            particulars: `Receipt via ${pay.mode} ${pay.referenceNo ? `(${pay.referenceNo})` : ''}`,
            debit: 0,
            credit: pay.amount,
          });
        });

      // Credit notes (Credit - reduces receivable)
      creditNotes
        .filter((cn) => cn.partyId === currentParty.id && cn.noteType === 'CREDIT_NOTE')
        .forEach((cn) => {
          rawEntries.push({
            date: cn.date,
            voucherType: 'CREDIT_NOTE',
            voucherNo: cn.noteNumber,
            particulars: `Credit Note against ${cn.originalInvoiceNumber} (${cn.reason})`,
            debit: 0,
            credit: cn.grandTotal,
          });
        });
    } else {
      // Supplier: Purchases (Credit)
      purchases
        .filter((p) => p.supplierId === currentParty.id)
        .forEach((pb) => {
          rawEntries.push({
            date: pb.date,
            voucherType: 'PURCHASE_BILL',
            voucherNo: pb.billNumber,
            particulars: `Purchase Bill ${pb.supplierInvoiceNumber ? `(Inv: ${pb.supplierInvoiceNumber})` : ''}`,
            debit: 0,
            credit: pb.grandTotal,
          });
        });

      // Payments made (Debit)
      payments
        .filter((p) => p.partyId === currentParty.id && p.type === 'PAYMENT')
        .forEach((pay) => {
          rawEntries.push({
            date: pay.date,
            voucherType: 'VENDOR_PAYMENT',
            voucherNo: pay.paymentNumber,
            particulars: `Vendor Payment via ${pay.mode} ${pay.referenceNo ? `(${pay.referenceNo})` : ''}`,
            debit: pay.amount,
            credit: 0,
          });
        });
    }

    // Sort chronologically
    rawEntries.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running balance
    let runningBalance = 0;
    return rawEntries.map((item, index) => {
      if (partyType === 'CUSTOMER') {
        runningBalance += item.debit - item.credit;
      } else {
        runningBalance += item.credit - item.debit;
      }

      return {
        id: `ledger_${index}`,
        ...item,
        balance: runningBalance,
      };
    });
  }, [currentParty, partyType, invoices, purchases, payments, creditNotes]);

  const totalDebit = ledgerEntries.reduce((acc, e) => acc + (e.debit || 0), 0);
  const totalCredit = ledgerEntries.reduce((acc, e) => acc + (e.credit || 0), 0);
  const finalBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Party Accounts Ledger & Statements</span>
          </h2>
          <p className="text-xs text-slate-500">
            Statement of accounts with debits, credits, and live running balance
          </p>
        </div>

        {currentParty && (
          <button
            onClick={() => exportLedgerToExcel(currentParty.name, ledgerEntries)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Statement to Excel</span>
          </button>
        )}
      </div>

      {/* Party Selector Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Ledger Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPartyType('CUSTOMER');
                setSelectedPartyId(customers[0]?.id || '');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                partyType === 'CUSTOMER'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Customer Ledger
            </button>
            <button
              onClick={() => {
                setPartyType('SUPPLIER');
                setSelectedPartyId(suppliers[0]?.id || '');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                partyType === 'SUPPLIER'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Supplier Ledger
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Select Account / Party *</label>
          <select
            value={selectedPartyId}
            onChange={(e) => setSelectedPartyId(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
          >
            {partyList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.gstin ? `(${p.gstin})` : ''} - State: {p.state}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Account Overview Card */}
      {currentParty && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{currentParty.name}</h3>
              <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {currentParty.gstin || 'URP'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              State: {currentParty.state} (Code: {currentParty.stateCode}) | Phone: {currentParty.phone || 'N/A'}
            </p>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6 text-xs">
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-semibold">Total Debited:</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(totalDebit)}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-semibold">Total Credited:</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(totalCredit)}</span>
            </div>
            <div className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
              <span className="text-indigo-900 block uppercase text-[10px] font-bold">
                {partyType === 'CUSTOMER' ? 'Outstanding Receivable:' : 'Outstanding Payable:'}
              </span>
              <span className="font-mono font-bold text-indigo-700 text-sm">
                {formatINR(finalBalance)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Voucher Type</th>
                <th className="py-2.5 px-3">Voucher No.</th>
                <th className="py-2.5 px-3 min-w-[240px]">Particulars</th>
                <th className="py-2.5 px-3 text-right">Debit (Dr) ₹</th>
                <th className="py-2.5 px-3 text-right">Credit (Cr) ₹</th>
                <th className="py-2.5 px-3 text-right">Balance ₹</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    No transactions recorded for this account.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 font-sans">{row.date}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {row.voucherType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.voucherNo}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-sans">{row.particulars}</td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      {row.debit > 0 ? row.debit.toFixed(2) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      {row.credit > 0 ? row.credit.toFixed(2) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                      {row.balance.toFixed(2)} {row.balance >= 0 ? 'Dr' : 'Cr'}
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
