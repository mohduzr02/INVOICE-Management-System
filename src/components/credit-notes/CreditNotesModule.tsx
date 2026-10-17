import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { CreditDebitNote, LineItem } from '../../types';
import { formatINR } from '../../services/gstEngine';
import {
  Scale,
  Plus,
  Search,
  Trash2,
  X,
  FileText,
} from 'lucide-react';

export const CreditNotesModule: React.FC = () => {
  const { creditNotes, invoices, addCreditDebitNote, business } = useBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [noteType, setNoteType] = useState<'CREDIT_NOTE' | 'DEBIT_NOTE'>('CREDIT_NOTE');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');
  const [manualPartyName, setManualPartyName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Sales Return / Goods Deficiency');
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [gstRate, setGstRate] = useState(18);

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  const handleOpenAdd = () => {
    setSelectedInvoiceId(invoices[0]?.id || '');
    setManualInvoiceNumber('');
    setManualPartyName('');
    setDate(new Date().toISOString().split('T')[0]);
    setReason('Sales Return / Goods Deficiency');
    setTaxableAmount(0);
    setGstRate(18);
    setModalOpen(true);
  };

  const isInterState = selectedInvoice ? selectedInvoice.isInterState : false;
  const taxAmount = (taxableAmount * gstRate) / 100;
  const cgst = !isInterState ? taxAmount / 2 : 0;
  const sgst = !isInterState ? taxAmount / 2 : 0;
  const igst = isInterState ? taxAmount : 0;
  const grandTotal = Math.round(taxableAmount + taxAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invNumber = selectedInvoice ? selectedInvoice.invoiceNumber : manualInvoiceNumber || 'INV-ORIG';
    const pName = selectedInvoice ? selectedInvoice.customerName : manualPartyName || 'Customer';
    const pGstin = selectedInvoice ? selectedInvoice.customerGstin : '';
    const pId = selectedInvoice ? selectedInvoice.customerId : 'party_custom';

    await addCreditDebitNote({
      noteNumber: `${noteType === 'CREDIT_NOTE' ? 'CN' : 'DN'}-26-${Date.now().toString().slice(-5)}`,
      noteType,
      originalInvoiceId: selectedInvoice?.id || `orig_${Date.now()}`,
      originalInvoiceNumber: invNumber,
      originalInvoiceDate: selectedInvoice?.date || date,
      partyId: pId,
      partyName: pName,
      partyGstin: pGstin,
      date,
      reason,
      items: [
        {
          id: `cn_item_${Date.now()}`,
          name: `Adjustment: ${reason}`,
          hsnSac: selectedInvoice?.items[0]?.hsnSac || '998313',
          quantity: 1,
          unit: 'NOS',
          unitPrice: taxableAmount,
          discount: 0,
          discountType: 'PERCENT',
          taxableAmount,
          gstRate,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          cessAmount: 0,
          totalAmount: grandTotal,
        },
      ],
      totalTaxable: taxableAmount,
      cgstTotal: cgst,
      sgstTotal: sgst,
      igstTotal: igst,
      cessTotal: 0,
      grandTotal,
      status: 'ACTIVE',
    });

    setModalOpen(false);
  };

  const filteredNotes = creditNotes.filter(
    (n) =>
      n.noteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.originalInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            <span>Credit Notes & Debit Notes (GST Sec 34)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Issue adjustment documents against original tax invoices for returns, deficiency, or price changes
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Note</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Note #, Party name, or Original Invoice #..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Note Number</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Party Name</th>
                <th className="py-2.5 px-3">Against Invoice</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 text-right">GST (₹)</th>
                <th className="py-2.5 px-3 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No credit or debit notes found. Click "Create Note" to add one.
                  </td>
                </tr>
              ) : (
                filteredNotes.map((n) => {
                  const tax = (n.cgstTotal || 0) + (n.sgstTotal || 0) + (n.igstTotal || 0);

                  return (
                    <tr key={n.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold font-mono text-slate-900">{n.noteNumber}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            n.noteType === 'CREDIT_NOTE'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {n.noteType === 'CREDIT_NOTE' ? 'Credit Note' : 'Debit Note'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{n.date}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{n.partyName}</td>
                      <td className="py-3 px-3 font-mono text-indigo-700">{n.originalInvoiceNumber}</td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-[160px]">{n.reason}</td>
                      <td className="py-3 px-3 text-right font-mono">₹ {n.totalTaxable.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">₹ {tax.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatINR(n.grandTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Issue Credit / Debit Note</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Type *</label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="CREDIT_NOTE">Credit Note (Reduces liability/sales)</option>
                    <option value="DEBIT_NOTE">Debit Note (Increases liability)</option>
                  </select>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Original Tax Invoice *</label>
                {invoices.filter((i) => i.status !== 'CANCELLED').length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedInvoiceId}
                      onChange={(e) => setSelectedInvoiceId(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      <option value="">-- Or enter custom invoice details below --</option>
                      {invoices
                        .filter((i) => i.status !== 'CANCELLED')
                        .map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoiceNumber} - {inv.customerName} (₹{inv.grandTotal})
                          </option>
                        ))}
                    </select>
                    {!selectedInvoiceId && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={manualInvoiceNumber}
                          onChange={(e) => setManualInvoiceNumber(e.target.value)}
                          placeholder="Type Invoice # (e.g. INV/26-27/001)"
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 font-mono"
                        />
                        <input
                          type="text"
                          value={manualPartyName}
                          onChange={(e) => setManualPartyName(e.target.value)}
                          placeholder="Type Customer / Party Name"
                          className="w-full text-xs border border-slate-300 rounded-lg p-2"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={manualInvoiceNumber}
                      onChange={(e) => setManualInvoiceNumber(e.target.value)}
                      placeholder="Invoice # (e.g. INV/26-27/001)"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 font-mono"
                    />
                    <input
                      type="text"
                      required
                      value={manualPartyName}
                      onChange={(e) => setManualPartyName(e.target.value)}
                      placeholder="Customer / Party Name"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Taxable (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={taxableAmount === 0 ? '' : taxableAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTaxableAmount(val === '' ? 0 : parseFloat(val) || 0);
                    }}
                    placeholder="0.00"
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Slab Rate</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={18}>18% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={5}>5% GST</option>
                    <option value={28}>28% GST</option>
                    <option value={0}>0% GST</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Adjustment (Type or Select)</label>
                <input
                  type="text"
                  list="credit-note-reasons"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Sales Return, Rate Difference, Quantity Shortage"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
                <datalist id="credit-note-reasons">
                  <option value="01-Sales Return" />
                  <option value="02-Post Sale Discount" />
                  <option value="03-Deficiency in Services" />
                  <option value="04-Correction in Invoice" />
                  <option value="05-Change in POS" />
                  <option value="Goods Damaged in Transit" />
                  <option value="Quantity Difference" />
                  <option value="Rate Revision" />
                </datalist>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between">
                <span className="text-slate-600">Total Adjustment with GST:</span>
                <span className="font-bold font-mono text-indigo-700">{formatINR(grandTotal)}</span>
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
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
