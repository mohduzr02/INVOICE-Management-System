import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { Payment } from '../../types';
import { formatINR } from '../../services/gstEngine';
import {
  DollarSign,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  CreditCard,
} from 'lucide-react';

export const PaymentManagement: React.FC = () => {
  const { payments, customers, suppliers, recordPayment, invoices } = useBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEIPT' | 'PAYMENT'>('ALL');

  // Form State
  const [type, setType] = useState<'RECEIPT' | 'PAYMENT'>('RECEIPT');
  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [manualPartyName, setManualPartyName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [mode, setMode] = useState<'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE'>('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [notes, setNotes] = useState('');

  const partyList = partyType === 'CUSTOMER' ? customers : suppliers;

  const handleOpenAdd = (defaultType: 'RECEIPT' | 'PAYMENT') => {
    setType(defaultType);
    setPartyType(defaultType === 'RECEIPT' ? 'CUSTOMER' : 'SUPPLIER');
    setSelectedPartyId(defaultType === 'RECEIPT' ? (customers[0]?.id || '') : (suppliers[0]?.id || ''));
    setManualPartyName('');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount(0);
    setMode('BANK_TRANSFER');
    setReferenceNo('');
    setInvoiceId('');
    setNotes('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const party = partyList.find((p) => p.id === selectedPartyId);
    const pName = party ? party.name : manualPartyName.trim();
    if (!pName) return;

    const matchedInvoice = invoiceId ? invoices.find((i) => i.id === invoiceId) : undefined;

    await recordPayment({
      paymentNumber: `${type === 'RECEIPT' ? 'REC' : 'PAY'}-${Date.now().toString().slice(-6)}`,
      type,
      partyId: party ? party.id : `party_${Date.now()}`,
      partyName: pName,
      partyType,
      date,
      amount: Number(amount),
      mode,
      referenceNo,
      invoiceId: matchedInvoice?.id,
      invoiceNumber: matchedInvoice?.invoiceNumber,
      notes,
    });

    setModalOpen(false);
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.referenceNo && p.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <span>Payments & Receipts Registry</span>
          </h2>
          <p className="text-xs text-slate-500">
            Track bank remittances, UPI receipts, cash transactions, and voucher allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdd('RECEIPT')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Record Receipt (Customer)</span>
          </button>
          <button
            onClick={() => handleOpenAdd('PAYMENT')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Record Payment (Vendor)</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search voucher #, party name, transaction ref..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Vouchers</option>
            <option value="RECEIPT">Receipts Only (Inward)</option>
            <option value="PAYMENT">Payments Only (Outward)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Voucher #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Party Name</th>
                <th className="py-2.5 px-3">Payment Mode</th>
                <th className="py-2.5 px-3">Ref / Transaction #</th>
                <th className="py-2.5 px-3">Invoice Linked</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold font-mono text-slate-900">{p.paymentNumber}</td>
                  <td className="py-3 px-3 text-slate-600">{p.date}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                        p.type === 'RECEIPT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.type === 'RECEIPT' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {p.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{p.partyName}</td>
                  <td className="py-3 px-3 text-slate-600">{p.mode}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{p.referenceNo || '-'}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{p.invoiceNumber || '-'}</td>
                  <td
                    className={`py-3 px-3 text-right font-mono font-bold text-sm ${
                      p.type === 'RECEIPT' ? 'text-emerald-700' : 'text-slate-900'
                    }`}
                  >
                    {formatINR(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                Record {type === 'RECEIPT' ? 'Customer Receipt' : 'Vendor Payment'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Party (Select or Type) *</label>
                {partyList.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedPartyId}
                      onChange={(e) => setSelectedPartyId(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Choose from saved parties or type below --</option>
                      {partyList.map((party) => (
                        <option key={party.id} value={party.id}>
                          {party.name} (Balance: ₹{party.currentBalance})
                        </option>
                      ))}
                    </select>
                    {!selectedPartyId && (
                      <input
                        type="text"
                        required
                        value={manualPartyName}
                        onChange={(e) => setManualPartyName(e.target.value)}
                        placeholder={`Type ${partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'} Name...`}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    value={manualPartyName}
                    onChange={(e) => setManualPartyName(e.target.value)}
                    placeholder={`Type ${partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'} Name...`}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={amount === 0 ? '' : amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAmount(val === '' ? 0 : parseFloat(val) || 0);
                    }}
                    placeholder="0.00"
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ref / UTR #</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="UTR / Cheque #"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {type === 'RECEIPT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Link to Invoice (Optional)</label>
                  <select
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- No specific invoice / On Account --</option>
                    {invoices
                      .filter((i) => i.balanceDue > 0 && i.status !== 'CANCELLED')
                      .map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} - {inv.customerName} (Due: ₹{inv.balanceDue})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Voucher narration..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Save Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
