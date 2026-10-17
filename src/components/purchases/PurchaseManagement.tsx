import React, { useState, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { Purchase, LineItem, INDIAN_STATES, GST_RATES, GST_COMMON_UNITS } from '../../types';
import { formatINR, calculateLineItem } from '../../services/gstEngine';
import { exportPurchaseRegisterToExcel } from '../../services/excelExporter';
import {
  ShoppingCart,
  Plus,
  Search,
  FileSpreadsheet,
  Trash2,
  X,
  CreditCard,
  CheckCircle,
} from 'lucide-react';

export const PurchaseManagement: React.FC = () => {
  const { purchases, suppliers, products, addPurchase, deletePurchase, business } = useBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [billNumber, setBillNumber] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [itcEligibility, setItcEligibility] = useState<'ELIGIBLE' | 'INELIGIBLE' | 'REVERSED'>('ELIGIBLE');

  const [items, setItems] = useState<LineItem[]>([
    {
      id: 'p_item_1',
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

  const [paidAmount, setPaidAmount] = useState(0);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const isInterState = selectedSupplier ? selectedSupplier.stateCode !== business.stateCode : false;

  const handleOpenAdd = () => {
    setBillNumber(`PB-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(3, '0')}`);
    setSupplierInvoiceNumber('');
    setSelectedSupplierId(suppliers[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setItcEligibility('ELIGIBLE');
    setItems([
      {
        id: `p_item_${Date.now()}`,
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
    setPaidAmount(0);
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
        target.unitPrice = prod.purchasePrice;
        target.gstRate = prod.taxRate;
      }
    }

    const supplierState = selectedSupplier?.stateCode || business.stateCode;
    const calc = calculateLineItem({
      quantity: target.quantity,
      unitPrice: target.unitPrice,
      discount: target.discount,
      discountType: target.discountType,
      gstRate: target.gstRate,
      supplierStateCode: supplierState,
      placeOfSupplyCode: business.stateCode, // recipient's state is place of supply for buyer
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
        id: `p_item_${Date.now()}_${prev.length + 1}`,
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

  const totalTaxable = items.reduce((acc, i) => acc + (i.taxableAmount || 0), 0);
  const totalCgst = items.reduce((acc, i) => acc + (i.cgstAmount || 0), 0);
  const totalSgst = items.reduce((acc, i) => acc + (i.sgstAmount || 0), 0);
  const totalIgst = items.reduce((acc, i) => acc + (i.igstAmount || 0), 0);
  const grandTotal = Math.round(items.reduce((acc, i) => acc + (i.totalAmount || 0), 0));
  const balanceDue = Math.max(0, grandTotal - paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) {
      alert('Please select a supplier');
      return;
    }

    await addPurchase({
      billNumber,
      supplierInvoiceNumber,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      supplierGstin: selectedSupplier.gstin,
      date,
      dueDate,
      placeOfSupply: business.state,
      placeOfSupplyCode: business.stateCode,
      isInterState,
      items,
      totalTaxable,
      cgstTotal: totalCgst,
      sgstTotal: totalSgst,
      igstTotal: totalIgst,
      cessTotal: 0,
      grandTotal,
      paidAmount,
      balanceDue,
      itcEligibility,
      status: balanceDue === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
    });

    setModalOpen(false);
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      p.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.supplierInvoiceNumber && p.supplierInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            <span>Purchase Bills & Input Tax Credit (ITC) Register</span>
          </h2>
          <p className="text-xs text-slate-500">
            Record inward supplies from vendors and maintain eligible ITC for GSTR-3B
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportPurchaseRegisterToExcel(filteredPurchases)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Bill #, Supplier name, or Invoice #..."
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
                <th className="py-2.5 px-3">Bill No.</th>
                <th className="py-2.5 px-3">Supplier Invoice #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 text-right">ITC Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Total (₹)</th>
                <th className="py-2.5 px-3 text-center">ITC Eligibility</th>
                <th className="py-2.5 px-3 text-center">Payment Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.map((p) => {
                const totalTax = (p.cgstTotal || 0) + (p.sgstTotal || 0) + (p.igstTotal || 0);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold font-mono text-slate-900">{p.billNumber}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{p.supplierInvoiceNumber || '-'}</td>
                    <td className="py-3 px-3 text-slate-600">{p.date}</td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">{p.supplierName}</p>
                      <p className="text-[11px] font-mono text-slate-400">{p.supplierGstin || 'URP'}</p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">₹ {p.totalTaxable.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                      ₹ {totalTax.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(p.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.itcEligibility === 'ELIGIBLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.itcEligibility === 'INELIGIBLE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.itcEligibility}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[11px] font-semibold text-slate-700">{p.status}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Delete purchase bill ${p.billNumber}?`)) {
                            deletePurchase(p.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Delete bill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Purchase Bill Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Record Inward Purchase Bill (ITC)</h3>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Our Bill Ref # *</label>
                  <input
                    type="text"
                    required
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier's Inv # *</label>
                  <input
                    type="text"
                    required
                    value={supplierInvoiceNumber}
                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                    placeholder="e.g. DELL/2026/099"
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.state})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bill Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ITC Eligibility</label>
                  <select
                    value={itcEligibility}
                    onChange={(e) => setItcEligibility(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ELIGIBLE">Eligible (Normal ITC)</option>
                    <option value="INELIGIBLE">Ineligible (Sec 17(5) Blocked)</option>
                    <option value="REVERSED">Reversed under Rule 42/43</option>
                  </select>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">Items Purchased</span>
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
                              value={it.name}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              placeholder="Item name"
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
                              list="purchase-gst-units"
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
                            ₹ {it.totalAmount.toFixed(2)}
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

              {/* Totals Summary */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <div className="space-x-4">
                    <span>Taxable: ₹ {totalTaxable.toFixed(2)}</span>
                    <span>CGST: ₹ {totalCgst.toFixed(2)}</span>
                    <span>SGST: ₹ {totalSgst.toFixed(2)}</span>
                    <span>IGST: ₹ {totalIgst.toFixed(2)}</span>
                  </div>
                  <span className="font-bold text-sm text-slate-900">Grand Total: {formatINR(grandTotal)}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Amount Paid to Vendor:</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={grandTotal}
                      value={paidAmount === 0 ? '' : paidAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPaidAmount(val === '' ? 0 : parseFloat(val) || 0);
                      }}
                      placeholder="0.00"
                      className="w-28 p-1 border border-slate-300 rounded font-mono text-xs text-right bg-white"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-slate-600">Balance Payable: </span>
                    <span className={`font-mono font-bold ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatINR(balanceDue)}
                    </span>
                  </div>
                </div>
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
                  Save Purchase Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* UQC Unit Autocomplete Datalist */}
      <datalist id="purchase-gst-units">
        {GST_COMMON_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </datalist>
    </div>
  );
};
