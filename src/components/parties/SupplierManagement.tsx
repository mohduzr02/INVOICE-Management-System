import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { Supplier, INDIAN_STATES } from '../../types';
import { formatINR } from '../../services/gstEngine';
import { validateGSTIN } from '../../utils/gstinValidator';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

interface SupplierManagementProps {
  onViewLedger?: (supplierId: string) => void;
}

export const SupplierManagement: React.FC<SupplierManagementProps> = ({ onViewLedger }) => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, business } = useBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    stateCode: business.stateCode || '27',
    pan: '',
    openingBalance: 0,
  });

  const [gstinFeedback, setGstinFeedback] = useState<{ isValid: boolean; message: string } | null>(null);

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.gstin && s.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      gstin: '',
      phone: '',
      email: '',
      address: '',
      stateCode: business.stateCode || '27',
      pan: '',
      openingBalance: 0,
    });
    setGstinFeedback(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      gstin: supplier.gstin || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      stateCode: supplier.stateCode || '27',
      pan: supplier.pan || '',
      openingBalance: supplier.openingBalance || 0,
    });
    setGstinFeedback(null);
    setModalOpen(true);
  };

  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase();
    let updatedStateCode = formData.stateCode;
    let extractedPan = formData.pan;

    if (upper.length === 15) {
      const result = validateGSTIN(upper);
      if (result.isValid) {
        setGstinFeedback({ isValid: true, message: `Valid GSTIN: ${result.stateName}` });
        if (INDIAN_STATES.some((s) => s.code === result.stateCode)) {
          updatedStateCode = result.stateCode!;
        }
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

    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, {
        name: formData.name,
        gstin: formData.gstin,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        state: stateName,
        stateCode: formData.stateCode,
        pan: formData.pan,
      });
    } else {
      await addSupplier({
        name: formData.name,
        gstin: formData.gstin,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        state: stateName,
        stateCode: formData.stateCode,
        pan: formData.pan,
        openingBalance: Number(formData.openingBalance) || 0,
        currentBalance: Number(formData.openingBalance) || 0,
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
            <Truck className="w-5 h-5 text-indigo-600" />
            <span>Supplier / Vendor Directory</span>
          </h2>
          <p className="text-xs text-slate-500">
            Maintain supplier profiles and GSTIN for Input Tax Credit (ITC) reconciliation
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
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
            placeholder="Search supplier by name or GSTIN..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supp) => (
          <div
            key={supp.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-200 transition-all space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{supp.name}</h3>
                <span className="inline-block mt-0.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {supp.gstin ? `GSTIN: ${supp.gstin}` : 'Unregistered (URP)'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(supp)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete supplier ${supp.name}?`)) {
                      deleteSupplier(supp.id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px]">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{supp.state} (Code: {supp.stateCode})</span>
              </div>
              {supp.phone && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{supp.phone}</span>
                </div>
              )}
              {supp.email && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{supp.email}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Payable Balance:</span>
                <p className="font-bold font-mono text-slate-900">{formatINR(supp.currentBalance || 0)}</p>
              </div>

              {onViewLedger && (
                <button
                  onClick={() => onViewLedger(supp.id)}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs cursor-pointer"
                >
                  Statement & Ledger →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dell Technologies"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="29AABCD1122K1Z9"
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
                {gstinFeedback && (
                  <p className={`text-[11px] mt-1 font-medium ${gstinFeedback.isValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {gstinFeedback.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State / UT *</label>
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
                    PAN <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
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
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, Pincode"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {!editingSupplier && (
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
                  {editingSupplier ? 'Save Changes' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
