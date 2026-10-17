import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { Quotation, LineItem, GST_RATES, GST_COMMON_UNITS } from '../../types';
import { formatINR, calculateLineItem, calculateInvoiceTotals } from '../../services/gstEngine';
import { generateQuotationPDF } from '../../services/pdfGenerator';
import {
  FileCheck2,
  Plus,
  Search,
  ArrowRight,
  Trash2,
  X,
  CheckCircle,
  FileDown,
  Printer,
} from 'lucide-react';

interface QuotationsModuleProps {
  onConvertToInvoice: (quote: Quotation) => void;
}

export const QuotationsModule: React.FC<QuotationsModuleProps> = ({ onConvertToInvoice }) => {
  const { quotations, customers, products, saveQuotation, deleteQuotation, business } = useBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [quoteNumber, setQuoteNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [items, setItems] = useState<LineItem[]>([
    {
      id: 'q_item_1',
      name: '',
      hsnSac: '',
      quantity: 1,
      unit: 'NOS',
      unitPrice: 0,
      discount: 0,
      discountType: 'PERCENT',
      taxableAmount: 0,
      gstRate: 18,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      cessAmount: 0,
      totalAmount: 0,
    },
  ]);
  const [notes, setNotes] = useState('Quote valid for 30 calendar days.');

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleOpenAdd = () => {
    setQuoteNumber(`EST-26-${String(quotations.length + 1).padStart(3, '0')}`);
    setSelectedCustomerId(customers[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setValidUntil(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setItems([
      {
        id: `q_item_${Date.now()}`,
        name: '',
        hsnSac: '',
        quantity: 1,
        unit: 'NOS',
        unitPrice: 0,
        discount: 0,
        discountType: 'PERCENT',
        taxableAmount: 0,
        gstRate: 18,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        cessAmount: 0,
        totalAmount: 0,
      },
    ]);
    setNotes('Quote valid for 30 calendar days.');
    setModalOpen(true);
  };

  const handleItemChange = (index: number, field: keyof LineItem, val: any) => {
    const list = [...items];
    const target = { ...list[index], [field]: val };

    if (field === 'productId') {
      const prod = products.find((p) => p.id === val);
      if (prod) {
        target.name = prod.name;
        target.hsnSac = prod.hsnSac;
        target.unit = prod.unit;
        target.unitPrice = prod.sellingPrice;
        target.gstRate = prod.taxRate;
      }
    }

    const calc = calculateLineItem({
      quantity: target.quantity,
      unitPrice: target.unitPrice,
      discount: target.discount,
      discountType: target.discountType,
      gstRate: target.gstRate,
      supplierStateCode: business.stateCode,
      placeOfSupplyCode: selectedCustomer?.stateCode || business.stateCode,
    });

    target.taxableAmount = calc.taxableAmount;
    target.cgstAmount = calc.cgstAmount;
    target.sgstAmount = calc.sgstAmount;
    target.igstAmount = calc.igstAmount;
    target.totalAmount = calc.totalAmount;

    list[index] = target;
    setItems(list);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `q_item_${Date.now()}_${prev.length + 1}`,
        name: '',
        hsnSac: '',
        quantity: 1,
        unit: 'NOS',
        unitPrice: 0,
        discount: 0,
        discountType: 'PERCENT',
        taxableAmount: 0,
        gstRate: 18,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        cessAmount: 0,
        totalAmount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totals = calculateInvoiceTotals(items);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    await saveQuotation({
      quoteNumber,
      status: 'SENT',
      date,
      validUntil,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      placeOfSupply: selectedCustomer.state,
      items,
      totalTaxable: totals.totalTaxable,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      grandTotal: totals.grandTotal,
      notes,
    });

    setModalOpen(false);
  };

  const filteredQuotes = quotations.filter(
    (q) =>
      q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-600" />
            <span>Quotations & Cost Estimates</span>
          </h2>
          <p className="text-xs text-slate-500">
            Create commercial estimates and convert them into tax invoices upon client approval
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
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
            placeholder="Search quotation by number or customer..."
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
                <th className="py-2.5 px-3">Estimate #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Valid Until</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 text-right">Total Amount (₹)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No quotations found. Click "New Quotation" to create an estimate.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold font-mono text-slate-900">{q.quoteNumber}</td>
                    <td className="py-3 px-3 text-slate-600">{q.date}</td>
                    <td className="py-3 px-3 text-slate-600">{q.validUntil}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{q.customerName}</td>
                    <td className="py-3 px-3 text-right font-mono">₹ {q.totalTaxable.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(q.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => generateQuotationPDF(q, business, 'download')}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors cursor-pointer"
                          title="Download Quote PDF"
                        >
                          <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => generateQuotationPDF(q, business, 'print')}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors cursor-pointer"
                          title="Print Quote"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <button
                          onClick={() => onConvertToInvoice(q)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-colors cursor-pointer"
                          title="Convert this quote into a Tax Invoice"
                        >
                          <span>Convert to Invoice</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Create New Quotation / Estimate</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quote #</label>
                  <input
                    type="text"
                    required
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">Items / Services</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-2 min-w-[180px]">Item Description</th>
                        <th className="p-2 w-20">HSN</th>
                        <th className="p-2 w-16">Qty</th>
                        <th className="p-2 w-20">Unit</th>
                        <th className="p-2 w-24">Rate (₹)</th>
                        <th className="p-2 w-24">Disc (%/₹)</th>
                        <th className="p-2 w-20">GST %</th>
                        <th className="p-2 w-24 text-right">Total (₹)</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              placeholder="Item name"
                              value={it.name}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              className="w-full p-1 border border-slate-300 rounded text-xs"
                            />
                            {products.length > 0 && (
                              <select
                                value={it.productId || ''}
                                onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                                className="w-full text-[10px] text-slate-500 mt-1"
                              >
                                <option value="">Map to catalogue product...</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={it.hsnSac}
                              onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                              placeholder="HSN"
                              className="w-full p-1 border border-slate-300 rounded font-mono text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.quantity === 0 ? '' : it.quantity}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleItemChange(idx, 'quantity', val === '' ? 0 : parseFloat(val) || 0);
                              }}
                              placeholder="0"
                              className="w-full p-1 border border-slate-300 rounded font-mono text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              list="quotation-gst-units"
                              value={it.unit || ''}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value.toUpperCase())}
                              placeholder="NOS"
                              className="w-full p-1 border border-slate-300 rounded font-mono uppercase text-xs font-semibold text-center"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={it.unitPrice === 0 ? '' : it.unitPrice}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleItemChange(idx, 'unitPrice', val === '' ? 0 : parseFloat(val) || 0);
                              }}
                              placeholder="0.00"
                              className="w-full p-1 border border-slate-300 rounded font-mono text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max={it.discountType === 'PERCENT' ? 100 : undefined}
                                value={it.discount === 0 ? '' : it.discount}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleItemChange(idx, 'discount', val === '' ? 0 : parseFloat(val) || 0);
                                }}
                                placeholder="0"
                                className="w-full p-1 border border-slate-300 rounded font-mono text-xs"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleItemChange(
                                    idx,
                                    'discountType',
                                    it.discountType === 'PERCENT' ? 'AMOUNT' : 'PERCENT'
                                  )
                                }
                                title="Toggle % or ₹"
                                className={`px-1 py-0.5 text-[10px] font-bold rounded border cursor-pointer shrink-0 ${
                                  it.discountType === 'PERCENT'
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {it.discountType === 'PERCENT' ? '%' : '₹'}
                              </button>
                            </div>
                          </td>
                          <td className="p-2">
                            <select
                              value={it.gstRate}
                              onChange={(e) => handleItemChange(idx, 'gstRate', parseFloat(e.target.value) || 0)}
                              className="w-full p-1 border border-slate-300 rounded text-xs"
                            >
                              {GST_RATES.map((r) => (
                                <option key={r} value={r}>
                                  {r}%
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            ₹{it.totalAmount.toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              disabled={items.length <= 1}
                              className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between font-bold text-xs">
                <span>Total Quote Value (incl. GST):</span>
                <span className="font-mono text-indigo-700">{formatINR(totals.grandTotal)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
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
                  Save Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UQC Unit Autocomplete Datalist */}
      <datalist id="quotation-gst-units">
        {GST_COMMON_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </datalist>
    </div>
  );
};
