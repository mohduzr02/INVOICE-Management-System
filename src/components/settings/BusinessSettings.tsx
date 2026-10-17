import React, { useState, useRef, useEffect } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { INDIAN_STATES } from '../../types';
import { validateGSTIN } from '../../utils/gstinValidator';
import { CompanyModal } from '../common/CompanyModal';
import {
  Settings,
  Save,
  Building,
  CreditCard,
  FileText,
  CheckCircle,
  AlertCircle,
  Database,
  HardDrive,
  Cloud,
  FolderDown,
  Upload,
  Trash2,
  Sparkles,
  Building2,
  Plus,
  Stamp,
  PenTool,
  Check,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

export const BusinessSettings: React.FC = () => {
  const {
    business,
    businesses,
    activeBusinessId,
    switchBusiness,
    deleteBusiness,
    setDefaultBusiness,
    updateBusiness,
    storageMode,
    setStorageMode,
    exportBackupJSON,
    importBackupJSON,
    clearAllSampleData,
    clearAllData,
  } = useBusiness();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'upload' | 'draw'>('upload');

  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [gstinMessage, setGstinMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: business.name || '',
    tradeName: business.tradeName || '',
    gstin: business.gstin || '',
    pan: business.pan || '',
    stateCode: business.stateCode || '27',
    email: business.email || '',
    phone: business.phone || '',
    address: business.address || '',
    pincode: business.pincode || '',
    bankName: business.bankName || '',
    accountNumber: business.accountNumber || '',
    ifsc: business.ifsc || '',
    branch: business.branch || '',
    upiId: business.upiId || '',
    invoicePrefix: business.invoicePrefix || 'INV/26-27/',
    nextInvoiceNumber: business.nextInvoiceNumber || 101,
    termsAndConditions: business.termsAndConditions || '',
    compositionScheme: !!business.compositionScheme,
    logoUrl: business.logoUrl || '',
    stampUrl: business.stampUrl || '',
    signatureUrl: business.signatureUrl || '',
    signatureName: business.signatureName || 'Authorized Signatory',
  });

  // Sync formData whenever active company changes
  useEffect(() => {
    setFormData({
      name: business.name || '',
      tradeName: business.tradeName || '',
      gstin: business.gstin || '',
      pan: business.pan || '',
      stateCode: business.stateCode || '27',
      email: business.email || '',
      phone: business.phone || '',
      address: business.address || '',
      pincode: business.pincode || '',
      bankName: business.bankName || '',
      accountNumber: business.accountNumber || '',
      ifsc: business.ifsc || '',
      branch: business.branch || '',
      upiId: business.upiId || '',
      invoicePrefix: business.invoicePrefix || 'INV/26-27/',
      nextInvoiceNumber: business.nextInvoiceNumber || 101,
      termsAndConditions: business.termsAndConditions || '',
      compositionScheme: !!business.compositionScheme,
      logoUrl: business.logoUrl || '',
      stampUrl: business.stampUrl || '',
      signatureUrl: business.signatureUrl || '',
      signatureName: business.signatureName || 'Authorized Signatory',
    });
  }, [business]);

  // Image compressor helper
  const handleImageUpload = (file: File, field: 'logoUrl' | 'stampUrl' | 'signatureUrl') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
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

  // Canvas Drawing functions for Digital Signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setFormData((prev) => ({ ...prev, signatureUrl: dataUrl }));
  };

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase();
    let updatedState = formData.stateCode;
    let updatedPan = formData.pan;

    if (upper.length === 15) {
      const res = validateGSTIN(upper);
      if (res.isValid) {
        setGstinMessage(`Valid GSTIN registered in ${res.stateName}`);
        if (INDIAN_STATES.some((s) => s.code === res.stateCode)) {
          updatedState = res.stateCode!;
        }
        if (res.pan) updatedPan = res.pan;
      } else {
        setGstinMessage(res.error || 'Invalid GSTIN');
      }
    } else {
      setGstinMessage(null);
    }

    setFormData({
      ...formData,
      gstin: upper,
      stateCode: updatedState,
      pan: updatedPan,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = INDIAN_STATES.find((s) => s.code === formData.stateCode);

    await updateBusiness({
      ...formData,
      state: st ? st.name : business.state,
      nextInvoiceNumber: Number(formData.nextInvoiceNumber),
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>Business Profile & Multi-Company Configuration</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage multiple company profiles, company logo, official stamp, signatures, and GST details
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddCompanyOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Another Company</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Business settings, branding logos, and GST configuration successfully saved!</span>
        </div>
      )}

      {/* MULTI-COMPANY MANAGEMENT CARDS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <div>
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                Registered Companies ({businesses.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Switch active entity or manage business details for each company
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAddCompanyOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Company</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {businesses.map((biz) => {
            const isActive = biz.id === activeBusinessId;
            return (
              <div
                key={biz.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {biz.logoUrl ? (
                        <img
                          src={biz.logoUrl}
                          alt="Logo"
                          className="w-7 h-7 object-contain rounded border border-slate-200 bg-white shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {biz.name.substring(0, 1).toUpperCase()}
                        </div>
                      )}
                      <h4 className="font-bold text-slate-900 text-xs truncate" title={biz.name}>
                        {biz.name}
                      </h4>
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                    <p className="truncate">GSTIN: {biz.gstin || 'UNREGISTERED'}</p>
                    <p className="text-[10px] text-slate-500 font-sans">
                      {biz.state} (Code: {biz.stateCode})
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => switchBusiness(biz.id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-md font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      Switch to This
                    </button>
                  ) : (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Currently Selected
                    </span>
                  )}

                  {businesses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove "${biz.name}"?`)) {
                          deleteBusiness(biz.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      title="Delete this company"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BRANDING: LOGO, STAMP & SIGNATURE UPLOADS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Stamp className="w-4 h-4 text-indigo-600" />
            <span>Company Branding, Rubber Stamp & Signatures</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Uploaded images are automatically printed on your Tax Invoices, Quotations, and PDF exports
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Company Logo */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-xs text-slate-900 block">Company Logo</span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Printed on top-left of Tax Invoices. PNG or JPG format with transparent or clean background.
              </p>
            </div>

            <div className="h-28 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center p-2 relative overflow-hidden">
              {formData.logoUrl ? (
                <>
                  <img
                    src={formData.logoUrl}
                    alt="Uploaded Logo"
                    className="max-h-24 max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logoUrl: '' })}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors cursor-pointer shadow-xs"
                    title="Remove Logo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer p-2 text-center"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-[11px] font-semibold">Click to Upload Logo</span>
                  <span className="text-[9px] text-slate-400">PNG, JPG, SVG</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logoUrl')}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-white px-3 py-1 rounded-lg border border-slate-200 cursor-pointer shadow-2xs"
              >
                {formData.logoUrl ? 'Change Logo' : 'Browse File'}
              </button>
              {formData.logoUrl && (
                <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ready
                </span>
              )}
            </div>
          </div>

          {/* 2. Official Rubber Stamp */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-xs text-slate-900 block">Company Official Stamp / Seal</span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Scanned circular/oval rubber stamp. Rendered in the authorized signatory block.
              </p>
            </div>

            <div className="h-28 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center p-2 relative overflow-hidden">
              {formData.stampUrl ? (
                <>
                  <img
                    src={formData.stampUrl}
                    alt="Uploaded Stamp"
                    className="max-h-24 max-w-full object-contain opacity-90"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, stampUrl: '' })}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors cursor-pointer shadow-xs"
                    title="Remove Stamp"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <div
                  onClick={() => stampInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer p-2 text-center"
                >
                  <Stamp className="w-5 h-5 text-emerald-600" />
                  <span className="text-[11px] font-semibold">Upload Scanned Stamp</span>
                  <span className="text-[9px] text-slate-400">PNG (Transparent recommended)</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <input
                ref={stampInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'stampUrl')}
              />
              <button
                type="button"
                onClick={() => stampInputRef.current?.click()}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-white px-3 py-1 rounded-lg border border-slate-200 cursor-pointer shadow-2xs"
              >
                {formData.stampUrl ? 'Change Stamp' : 'Browse File'}
              </button>
              {formData.stampUrl && (
                <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ready
                </span>
              )}
            </div>
          </div>

          {/* 3. Authorized Signature (Upload OR Draw Pad) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 block">Authorized Signature</span>
                <div className="flex items-center gap-1 bg-slate-200 rounded-lg p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSignatureMode('upload')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      signatureMode === 'upload' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureMode('draw')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      signatureMode === 'draw' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Draw Ink
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Sign directly on canvas or upload scanned signature.
              </p>
            </div>

            <div className="h-28 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center p-2 relative overflow-hidden">
              {signatureMode === 'draw' ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={220}
                    height={85}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="border border-slate-200 rounded bg-white w-full h-[85px] cursor-crosshair touch-none"
                  />
                  <div className="flex items-center justify-between w-full mt-1 px-1">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[10px] text-slate-500 hover:text-rose-600 cursor-pointer flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear
                    </button>
                    <button
                      type="button"
                      onClick={saveDrawnSignature}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded cursor-pointer"
                    >
                      Apply Signature
                    </button>
                  </div>
                </div>
              ) : formData.signatureUrl ? (
                <>
                  <img
                    src={formData.signatureUrl}
                    alt="Uploaded Signature"
                    className="max-h-24 max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, signatureUrl: '' })}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors cursor-pointer shadow-xs"
                    title="Remove Signature"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <div
                  onClick={() => signatureInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer p-2 text-center"
                >
                  <PenTool className="w-5 h-5 text-indigo-600" />
                  <span className="text-[11px] font-semibold">Upload Signature File</span>
                  <span className="text-[9px] text-slate-400">PNG / JPG</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'signatureUrl')}
              />
              <button
                type="button"
                onClick={() => signatureInputRef.current?.click()}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-white px-3 py-1 rounded-lg border border-slate-200 cursor-pointer shadow-2xs"
              >
                Browse File
              </button>
              {formData.signatureUrl && (
                <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ready
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Signer Designation Input */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-700 shrink-0">Signatory Designation / Title:</label>
          <input
            type="text"
            value={formData.signatureName}
            onChange={(e) => setFormData({ ...formData, signatureName: e.target.value })}
            placeholder="e.g. Authorized Signatory / Managing Director / Proprietor"
            className="flex-1 text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-medium"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Business Identity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building className="w-4 h-4 text-indigo-600" />
            <span>Entity Legal & Trade Profile: {formData.name || 'Current Company'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Business Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trade Name (Brand / Doing Business As)
              </label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (15 characters) *</label>
              <input
                type="text"
                maxLength={15}
                required
                value={formData.gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                className="w-full text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
              {gstinMessage && (
                <p className="text-[11px] text-indigo-600 font-medium mt-1">{gstinMessage}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registered State / GST Code *</label>
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
                placeholder="Optional (e.g. AABCA1234F)"
                className="w-full text-xs font-mono uppercase border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Principal Place of Business (Address)</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
              <input
                type="text"
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Bank & Remittance Credentials */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>Bank Remittance & UPI Payment Credentials</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="e.g. HDFC Bank Ltd"
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                maxLength={11}
                value={formData.ifsc}
                onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                placeholder="HDFC0000123"
                className="w-full text-xs font-mono uppercase border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">UPI ID for Payment QR</label>
              <input
                type="text"
                value={formData.upiId}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                placeholder="bizname@bank"
                className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Invoicing Sequence & Terms */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Invoice Serial Numbering & Policy Terms</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                placeholder="INV/26-27/"
                className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Next Serial Number</label>
              <input
                type="number"
                min="1"
                value={formData.nextInvoiceNumber}
                onChange={(e) => setFormData({ ...formData, nextInvoiceNumber: parseInt(e.target.value, 10) || 1 })}
                className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Default Terms and Conditions</label>
            <textarea
              rows={3}
              value={formData.termsAndConditions}
              onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
              className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Company Profile & Branding</span>
          </button>
        </div>
      </form>

      {/* Storage Engine & Local Running Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Storage Engine & Local Persistence</h3>
              <p className="text-[11px] text-slate-500">
                Choose between 100% Offline Local Storage or Firebase Spark Free Cloud
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              storageMode === 'local'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            {storageMode === 'local' ? 'Active: Local Computer Storage' : 'Active: Firebase Spark Free Cloud'}
          </span>
        </div>

        {backupStatus && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium">
            {backupStatus}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            onClick={() => setStorageMode('local')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              storageMode === 'local'
                ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Local Storage (Default & 100% Offline)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Your invoices, products, and customer records are saved directly in your browser's local database. Zero setup, complete privacy, and zero reliance on cloud services.
            </p>
          </div>

          <div
            onClick={() => setStorageMode('firebase-spark')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              storageMode === 'firebase-spark'
                ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Cloud className="w-4 h-4 text-blue-600" />
              <span>Firebase Spark (100% Free Plan)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Syncs records with Firestore using Firebase's generous Free Spark plan. If offline or quota is exceeded, the app safely retains everything locally.
            </p>
          </div>
        </div>

        {/* Database Export & Import */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportBackupJSON}
              className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              <FolderDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Full Database Backup (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Import Database (.json)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const text = ev.target?.result as string;
                  const res = await importBackupJSON(text);
                  setBackupStatus(res.message);
                  setTimeout(() => setBackupStatus(null), 4000);
                };
                reader.readAsText(file);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
          </div>

          <span className="text-[11px] text-slate-400">
            InvoicePro GST v2.4 • Offline-Ready Architecture
          </span>
        </div>
      </div>

      {/* Data Cleaning & Unnecessary Data Removal Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Data Cleaning & Factory Reset</h3>
              <p className="text-[11px] text-slate-500">
                Purge mock demo items, delete unnecessary data, or wipe everything to start completely fresh
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between gap-3">
            <div>
              <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Remove All Demo & Sample Data</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Strips out any pre-loaded demo items without affecting your own real transactions.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await clearAllSampleData();
                setBackupStatus('All sample and demo data has been purged successfully.');
                setTimeout(() => setBackupStatus(null), 4000);
              }}
              className="self-start px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Remove All Sample Data
            </button>
          </div>

          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 flex flex-col justify-between gap-3">
            <div>
              <h4 className="font-semibold text-rose-900 text-xs flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Clear All Records (Clean Slate)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Completely wipes all invoices, products, customers, suppliers, expenses, and resets your business profile.
              </p>
            </div>
            {confirmWipe ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await clearAllData();
                    setConfirmWipe(false);
                    setBackupStatus('Database completely wiped. Clean slate ready.');
                    setTimeout(() => setBackupStatus(null), 4000);
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Yes, Wipe Everything
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmWipe(false)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmWipe(true)}
                className="self-start px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold text-xs rounded-lg border border-rose-300 transition-colors cursor-pointer"
              >
                Start Clean Slate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Company Modal */}
      <CompanyModal
        isOpen={isAddCompanyOpen}
        onClose={() => setIsAddCompanyOpen(false)}
        onSuccess={() => {
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 3500);
        }}
      />
    </div>
  );
};
