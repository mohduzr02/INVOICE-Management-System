import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { Customer, INDIAN_STATES } from '../../types';
import { formatINR } from '../../services/gstEngine';
import { validateGSTIN } from '../../utils/gstinValidator';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
} from 'lucide-react';

interface CustomerManagementProps {
  onViewLedger?: (customerId: string) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({ onViewLedger }) => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, business } = useBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    phone: '',
    email: '',
    billingAddress: '',
    shippingAddress: '',
    stateCode: business.stateCode || '27',
    pan: '',
    isComposition: false,
    openingBalance: 0,
    creditLimit: 0,
  });

  const [gstinFeedback, setGstinFeedback] = useState<{ isValid: boolean; message: string } | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      gstin: '',
      phone: '',
      email: '',
      billingAddress: '',
      shippingAddress: '',
      stateCode: business.stateCode || '27',
      pan: '',
      isComposition: false,
      openingBalance: 0,
      creditLimit: 0,
    });
    setGstinFeedback(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      gstin: customer.gstin || '',
      phone: customer.phone || '',
      email: customer.email || '',
      billingAddress: customer.billingAddress || '',
      shippingAddress: customer.shippingAddress || '',
      stateCode: customer.stateCode || '27',
      pan: customer.pan || '',
      isComposition: !!customer.isComposition,
      openingBalance: customer.openingBalance || 0,
      creditLimit: customer.creditLimit || 0,
    });
    setGstinFeedback(null);
    setModalOpen(true);
  };

  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase();
    const stateCodeFromGst = upper.length >= 2 ? upper.substring(0, 2) : '';
    const hasMatchingState = INDIAN_STATES.some((s) => s.code === stateCodeFromGst);

    let updatedStateCode = formData.stateCode;
    let extractedPan = formData.pan;

    if (upper.length === 15) {
      const result = validateGSTIN(upper);
      if (result.isValid) {
        setGstinFeedback({ isValid: true, message: `Valid GSTIN: ${result.stateName}` });
        if (hasMatchingState) updatedStateCode = result.stateCode!;
        if (result.pan) extractedPan = result.pan;
      } else {
        setGstinFeedback({ isValid: false, message: result.error || 'Invalid GSTIN' });
      }
    } else {
      setGstinFeedback(null);
    }

    setFormData({
      ...formData,
      gstin: upper,
      stateCode: updatedStateCode,
      pan: extractedPan,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stateObj = INDIAN_STATES.find((s) => s.code === formData.stateCode);
    const stateName = stateObj ? stateObj.name : 'Unknown';

    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, {
        name: formData.name,
        gstin: formData.gstin,
        phone: formData.phone,
        email: formData.email,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress,
        state: stateName,
        stateCode: formData.stateCode,
        pan: formData.pan,
        isComposition: formData.isComposition,
        creditLimit: Number(formData.creditLimit) || 0,
      });
    } else {
      await addCustomer({
        name: formData.name,
        gstin: formData.gstin,
        phone: formData.phone,
        email: formData.email,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress,
        state: stateName,
        stateCode: formData.stateCode,
        pan: formData.pan,
        isComposition: formData.isComposition,
        openingBalance: Number(formData.openingBalance) || 0,
        currentBalance: Number(formData.openingBalance) || 0,
        creditLimit: Number(formData.creditLimit) || 0,
      });
    }

    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Customer Master & GST Registry</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage buyer profiles, GSTIN validation, and outstanding balances
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer by name, GSTIN, phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Customer Cards Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-200 transition-all space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{cust.name}</h3>
                <span className="inline-block mt-0.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {cust.gstin ? `GSTIN: ${cust.gstin}` : 'Unregistered (URP)'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(cust)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"
                  title="Edit Customer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete customer ${cust.name}?`)) {
                      deleteCustomer(cust.id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                  title="Delete Customer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px]">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">
                  {cust.state} (Code: {cust.stateCode})
                </span>
              </div>
              {cust.phone && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{cust.phone}</span>
                </div>
              )}
              {cust.email && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{cust.email}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Outstanding Due:</span>
                <p className={`font-bold font-mono ${cust.currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {formatINR(cust.currentBalance || 0)}
                </p>
              </div>

              {onViewLedger && (
                <button
                  onClick={() => onViewLedger(cust.id)}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs cursor-pointer"
                >
                  Statement & Ledger →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer / Entity Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Reliance Retail Ltd"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  15-digit GSTIN (Optional for Unregistered)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="27AABCA1234F1Z8"
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
                {gstinFeedback && (
                  <p
                    className={`text-[11px] mt-1 font-medium flex items-center gap-1 ${
                      gstinFeedback.isValid ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {gstinFeedback.isValid ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    <span>{gstinFeedback.message}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State / UT & GST Code *
                  </label>
                  <select
                    value={formData.stateCode}
                    onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PAN Number <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="Optional (ABCDE1234F)"
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91..."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="accounts@..."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  placeholder="Address..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {!editingCustomer && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.openingBalance === 0 ? '' : formData.openingBalance}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, openingBalance: val === '' ? 0 : parseFloat(val) || 0 });
                      }}
                      placeholder="0.00"
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.creditLimit === 0 ? '' : (formData.creditLimit || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, creditLimit: val === '' ? 0 : parseFloat(val) || 0 });
                      }}
                      placeholder="Optional credit ceiling"
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

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
                  {editingCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
