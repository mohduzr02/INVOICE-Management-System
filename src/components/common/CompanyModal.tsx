import React, { useState, useRef } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { INDIAN_STATES } from '../../types';
import { validateGSTIN } from '../../utils/gstinValidator';
import { X, Building2, Plus, CheckCircle, Upload, Stamp, PenTool, Trash2 } from 'lucide-react';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newCompanyId: string) => void;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addBusiness } = useBusiness();
  const fileLogoRef = useRef<HTMLInputElement>(null);
  const fileStampRef = useRef<HTMLInputElement>(null);
  const fileSignRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    tradeName: '',
    gstin: '',
    pan: '',
    stateCode: '27',
    state: 'Maharashtra',
    email: '',
    phone: '',
    address: '',
    pincode: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    branch: '',
    upiId: '',
    invoicePrefix: 'INV/26-27/',
    nextInvoiceNumber: 1,
    termsAndConditions:
      '1. Goods once sold will not be accepted back without authorization.\n2. Payment terms as agreed upon.\n3. All disputes subject to local jurisdiction.',
    compositionScheme: false,
    logoUrl: '',
    stampUrl: '',
    signatureUrl: '',
    signatureName: 'Authorized Signatory',
  });

  const [gstinMessage, setGstinMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Process & compress uploaded image
  const handleImageUpload = (file: File, field: 'logoUrl' | 'stampUrl' | 'signatureUrl') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 500;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setFormData((prev) => ({ ...prev, [field]: canvas.toDataURL('image/png', 0.9) }));
        } else {
          setFormData((prev) => ({ ...prev, [field]: e.target?.result as string }));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase();
    let updatedStateCode = formData.stateCode;
    let updatedState = formData.state;
    let updatedPan = formData.pan;

    if (upper.length === 15) {
      const res = validateGSTIN(upper);
      if (res.isValid) {
        setGstinMessage(`Valid GSTIN in ${res.stateName}`);
        const found = INDIAN_STATES.find((s) => s.code === res.stateCode);
        if (found) {
          updatedStateCode = found.code;
          updatedState = found.name;
        }
        if (res.pan) updatedPan = res.pan;
      } else {
        setGstinMessage(res.error || 'Invalid GSTIN');
      }
    } else {
      setGstinMessage(null);
    }

    setFormData((prev) => ({
      ...prev,
      gstin: upper,
      stateCode: updatedStateCode,
      state: updatedState,
      pan: updatedPan,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      const st = INDIAN_STATES.find((s) => s.code === formData.stateCode);
      const created = await addBusiness({
        ...formData,
        state: st ? st.name : formData.state,
        nextInvoiceNumber: Number(formData.nextInvoiceNumber) || 1,
      });
      onSuccess?.(created.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm">Add New Company Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl text-indigo-900 text-[11px] leading-relaxed">
            Register an additional business entity, sister company, or branch GSTIN. You can switch between your companies anytime with 1 click from the header or settings.
          </div>

          {/* Section: Entity Details */}
          <div className="space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wide text-[10px] block border-b border-slate-100 pb-1">
              Entity Legal & Trade Profile
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex Trading Corp"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trade / Brand Name</label>
                <input
                  type="text"
                  value={formData.tradeName}
                  onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                  placeholder="e.g. Apex Store"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN (15 Digits)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="27AABCA1234F1Z8"
                  className="w-full font-mono font-bold uppercase border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
                {gstinMessage && <p className="text-[10px] text-indigo-600 mt-1">{gstinMessage}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">State / Code *</label>
                <select
                  value={formData.stateCode}
                  onChange={(e) => {
                    const st = INDIAN_STATES.find((s) => s.code === e.target.value);
                    setFormData({
                      ...formData,
                      stateCode: e.target.value,
                      state: st ? st.name : formData.state,
                    });
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  PAN Number <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  placeholder="Optional (e.g. AABCA1234F)"
                  className="w-full font-mono uppercase border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Shop / Building, Road, City"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="400001"
                  className="w-full font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="billing@company.com"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Bank Details */}
          <div className="space-y-3 pt-2">
            <span className="font-bold text-slate-800 uppercase tracking-wide text-[10px] block border-b border-slate-100 pb-1">
              Bank Details & Invoicing Prefix
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="HDFC Bank"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="50200012345678"
                  className="w-full font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  maxLength={11}
                  value={formData.ifsc}
                  onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                  placeholder="HDFC0000123"
                  className="w-full font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={formData.invoicePrefix}
                  onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                  placeholder="INV/26-27/"
                  className="w-full font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">UPI ID (Optional)</label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  placeholder="company@bank"
                  className="w-full font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Logo, Stamp & Signature Upload */}
          <div className="space-y-3 pt-2">
            <span className="font-bold text-slate-800 uppercase tracking-wide text-[10px] block border-b border-slate-100 pb-1">
              Company Branding, Seal & Signature (Optional)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Logo */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col justify-between items-center text-center">
                <span className="font-bold text-slate-700 mb-1">Company Logo</span>
                {formData.logoUrl ? (
                  <div className="relative my-2">
                    <img src={formData.logoUrl} alt="Logo" className="h-12 max-w-[100px] object-contain rounded" />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, logoUrl: '' }))}
                      className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileLogoRef.current?.click()}
                    className="my-2 p-3 border border-dashed border-slate-300 rounded-lg hover:bg-white text-slate-500 flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px]">Upload Logo</span>
                  </button>
                )}
                <input
                  ref={fileLogoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logoUrl')}
                />
                <span className="text-[9px] text-slate-400">PNG/JPG (Max 500KB)</span>
              </div>

              {/* Rubber Stamp */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col justify-between items-center text-center">
                <span className="font-bold text-slate-700 mb-1">Official Stamp</span>
                {formData.stampUrl ? (
                  <div className="relative my-2">
                    <img src={formData.stampUrl} alt="Stamp" className="h-12 max-w-[100px] object-contain rounded" />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, stampUrl: '' }))}
                      className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileStampRef.current?.click()}
                    className="my-2 p-3 border border-dashed border-slate-300 rounded-lg hover:bg-white text-slate-500 flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <Stamp className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px]">Upload Stamp</span>
                  </button>
                )}
                <input
                  ref={fileStampRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'stampUrl')}
                />
                <span className="text-[9px] text-slate-400">Scanned seal / stamp</span>
              </div>

              {/* Signature */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col justify-between items-center text-center">
                <span className="font-bold text-slate-700 mb-1">Signature</span>
                {formData.signatureUrl ? (
                  <div className="relative my-2">
                    <img src={formData.signatureUrl} alt="Signature" className="h-12 max-w-[100px] object-contain rounded" />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, signatureUrl: '' }))}
                      className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileSignRef.current?.click()}
                    className="my-2 p-3 border border-dashed border-slate-300 rounded-lg hover:bg-white text-slate-500 flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <PenTool className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px]">Upload Sign</span>
                  </button>
                )}
                <input
                  ref={fileSignRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'signatureUrl')}
                />
                <span className="text-[9px] text-slate-400">Scanned signature</span>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{submitting ? 'Creating...' : 'Create & Switch to Company'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
