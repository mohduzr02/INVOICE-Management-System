import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { Expense } from '../../types';
import { formatINR } from '../../services/gstEngine';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  X,
  CreditCard,
  Building,
} from 'lucide-react';

export const ExpenseManagement: React.FC = () => {
  const { expenses, addExpense, deleteExpense } = useBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    category: 'RENT',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    taxDeductible: true,
    gstRate: 18,
    vendorName: '',
    vendorGstin: '',
    paymentMode: 'BANK_TRANSFER',
    notes: '',
  });

  const handleOpenAdd = () => {
    setFormData({
      category: 'RENT',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      taxDeductible: true,
      gstRate: 18,
      vendorName: '',
      vendorGstin: '',
      paymentMode: 'BANK_TRANSFER',
      notes: '',
    });
    setModalOpen(true);
  };

  const taxAmount = (formData.amount * formData.gstRate) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addExpense({
      expenseNumber: `EXP-26-${Date.now().toString().slice(-5)}`,
      category: formData.category,
      date: formData.date,
      amount: Number(formData.amount),
      taxDeductible: formData.taxDeductible,
      gstRate: Number(formData.gstRate),
      taxAmount,
      vendorName: formData.vendorName,
      vendorGstin: formData.vendorGstin,
      paymentMode: formData.paymentMode,
      notes: formData.notes,
    });
    setModalOpen(false);
  };

  const filteredExpenses = expenses.filter(
    (e) =>
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.vendorName && e.vendorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalTaxDeductible = expenses
    .filter((e) => e.taxDeductible)
    .reduce((acc, e) => acc + (e.taxAmount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <span>Operating Expenses Tracker</span>
          </h2>
          <p className="text-xs text-slate-500">
            Categorized overhead expenses and tax-deductible expense reporting
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Expenses</span>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{formatINR(totalExpenseAmount)}</p>
          <span className="text-[10px] text-slate-400">{expenses.length} overhead transactions</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Input Tax Claimable on Expenses</span>
          <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatINR(totalTaxDeductible)}</p>
          <span className="text-[10px] text-slate-400">GST paid on office overheads</span>
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
            placeholder="Search by category, vendor, or notes..."
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
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Vendor / Payee</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-slate-600">{e.date}</td>
                  <td className="py-3 px-3">
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-800">{e.vendorName || '-'}</p>
                    {e.vendorGstin && <p className="text-[10px] font-mono text-slate-400">{e.vendorGstin}</p>}
                  </td>
                  <td className="py-3 px-3 text-slate-600">{e.paymentMode}</td>
                  <td className="py-3 px-3 text-slate-600 truncate max-w-[200px]">{e.notes || '-'}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">₹ {e.taxAmount.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {formatINR(e.amount)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm('Delete this expense?')) deleteExpense(e.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Record Business Expense</h3>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category (Type or Pick) *</label>
                  <input
                    type="text"
                    list="expense-categories-list"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
                    placeholder="e.g. UTILITIES, RENT, OFFICE SUPPLIES"
                    className="w-full text-xs font-semibold uppercase border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                  <datalist id="expense-categories-list">
                    <option value="COMMERCIAL RENT" />
                    <option value="ELECTRICITY & INTERNET" />
                    <option value="PAYROLL & SALARY" />
                    <option value="OFFICE SUPPLIES & STATIONERY" />
                    <option value="MARKETING & ADS" />
                    <option value="LOGISTICS & COURIER" />
                    <option value="EQUIPMENT MAINTENANCE" />
                    <option value="PROFESSIONAL & LEGAL FEES" />
                    <option value="SOFTWARE SUBSCRIPTIONS" />
                    <option value="TRAVEL & FUEL" />
                    <option value="MISCELLANEOUS" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={formData.amount === 0 ? '' : formData.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, amount: val === '' ? 0 : parseFloat(val) || 0 });
                    }}
                    placeholder="0.00"
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={18}>18% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={5}>5% GST</option>
                    <option value={28}>28% GST</option>
                    <option value={0}>0% (Exempt)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Payee</label>
                  <input
                    type="text"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    placeholder="Vendor / Payee name"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <input
                    type="text"
                    list="expense-payment-modes"
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    placeholder="BANK_TRANSFER / UPI / CASH"
                    className="w-full text-xs uppercase border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                  <datalist id="expense-payment-modes">
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Narration / Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. October electricity bill"
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
