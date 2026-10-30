import React, { useState, useMemo } from 'react';
import { Invoice } from '../../types';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../services/gstEngine';
import { generateInvoicePDF } from '../../services/pdfGenerator';
import { uploadInvoicePdfToDrive, createInvoiceGoogleDoc } from '../../services/googleWorkspaceService';
import {
  X,
  FileDown,
  Printer,
  Share2,
  Check,
  ShieldCheck,
  Stamp,
  Copy,
  ExternalLink,
  Link2,
  Phone,
  Sparkles,
  CheckCircle2,
  Edit,
  HardDrive,
  FileText,
  Loader2,
  Mail,
  FileSpreadsheet,
  Send,
  AtSign,
} from 'lucide-react';
import { ExcelShareModal } from '../common/ExcelShareModal';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.06 7.42C8.92 7.42 8.68 7.47 8.48 7.69C8.27 7.91 7.7 8.45 7.7 9.54C7.7 10.63 8.49 11.68 8.6 11.83C8.72 11.98 10.15 14.19 12.33 15.13C14.15 15.91 14.52 15.76 14.93 15.72C15.34 15.68 16.27 15.17 16.46 14.62C16.65 14.08 16.65 13.62 16.59 13.52C16.53 13.42 16.39 13.36 16.18 13.26C15.97 13.15 14.94 12.64 14.75 12.57C14.56 12.5 14.42 12.46 14.28 12.67C14.14 12.88 13.75 13.36 13.63 13.5C13.51 13.63 13.39 13.65 13.18 13.55C12.97 13.45 12.3 13.23 11.51 12.52C10.89 11.97 10.47 11.29 10.35 11.08C10.23 10.87 10.34 10.76 10.44 10.66C10.54 10.56 10.66 10.4 10.76 10.28C10.86 10.17 10.9 10.08 10.97 9.94C11.04 9.8 11 9.68 10.95 9.58C10.9 9.47 10.48 8.45 10.31 8.03C10.14 7.62 9.97 7.68 9.84 7.67C9.72 7.67 9.58 7.66 9.44 7.66C9.31 7.66 9.17 7.66 9.06 7.42Z" />
  </svg>
);

interface InvoicePreviewModalProps {
  invoice: Invoice;
  onClose: () => void;
  onEdit?: (invoiceId: string) => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ invoice, onClose, onEdit }) => {
  const { business: defaultBusiness, businesses, customers, sendPaymentReminder, logAppAction } = useBusiness();
  const { getAccessToken, connectWorkspace } = useAuth();
  const business = businesses.find((b) => b.id === invoice.businessId) || defaultBusiness;

  const [copied, setCopied] = useState(false);
  const [copyType, setCopyType] = useState<'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'>('ORIGINAL');

  // Google Workspace States
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [workspaceToast, setWorkspaceToast] = useState<{ text: string; url?: string; type: 'success' | 'error' } | null>(null);

  // Excel Modal State
  const [showExcelModal, setShowExcelModal] = useState(false);

  // WhatsApp Share States
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const matchedCustomer = useMemo(() => {
    return customers.find(
      (c) => c.id === invoice.customerId || c.name.toLowerCase() === invoice.customerName.toLowerCase()
    );
  }, [customers, invoice.customerId, invoice.customerName]);

  const [recipientPhone, setRecipientPhone] = useState(
    invoice.customerPhone || matchedCustomer?.phone || ''
  );
  const [includePublicLink, setIncludePublicLink] = useState(true);
  const [includeBankDetails, setIncludeBankDetails] = useState(true);
  const [includeItemsSummary, setIncludeItemsSummary] = useState(true);
  const [copiedWhatsAppMsg, setCopiedWhatsAppMsg] = useState(false);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);

  // Direct Customer Email Utility States
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(
    invoice.customerEmail || matchedCustomer?.email || ''
  );
  const [ccEmail, setCcEmail] = useState(business.email || '');
  const [emailSubject, setEmailSubject] = useState(
    `Tax Invoice #${invoice.invoiceNumber} from ${business.tradeName || business.name || 'Company'} [₹${Number(invoice.grandTotal || 0).toLocaleString('en-IN')}]`
  );
  const [includeEmailItemsSummary, setIncludeEmailItemsSummary] = useState(true);
  const [includeEmailBankDetails, setIncludeEmailBankDetails] = useState(true);
  const [includeEmailPublicLink, setIncludeEmailPublicLink] = useState(true);
  const [copiedEmailBody, setCopiedEmailBody] = useState(false);
  const [emailRecordedNotice, setEmailRecordedNotice] = useState<string | null>(null);

  // Generate public link to invoice
  const publicInvoiceLink = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('invoiceId', invoice.id);
      return url.toString();
    } catch {
      return `${window.location.origin}${window.location.pathname}?invoiceId=${invoice.id}`;
    }
  }, [invoice.id]);

  // Generate structured, professional WhatsApp message
  const generatedWhatsAppMessage = useMemo(() => {
    const sellerTitle = business.tradeName || business.name || 'Our Company';
    const lines: string[] = [];

    lines.push(`🧾 *TAX INVOICE: ${invoice.invoiceNumber}*`);
    lines.push(`*From:* ${sellerTitle}`);
    lines.push('────────────────────────');
    lines.push(`Dear *${invoice.customerName}*,`);
    lines.push('');
    lines.push('Please find the summary of your GST Tax Invoice:');
    lines.push(`• *Invoice No:* ${invoice.invoiceNumber}`);
    lines.push(`• *Date:* ${invoice.date}`);
    if (invoice.dueDate) {
      lines.push(`• *Due Date:* ${invoice.dueDate}`);
    }
    lines.push(
      `• *Total Taxable:* ₹${Number(invoice.totalTaxable || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })}`
    );
    const totalTax =
      (invoice.cgstTotal || 0) +
      (invoice.sgstTotal || 0) +
      (invoice.igstTotal || 0) +
      (invoice.cessTotal || 0);
    lines.push(
      `• *GST Amount:* ₹${Number(totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    );
    lines.push(
      `• *Grand Total:* ₹${Number(invoice.grandTotal || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })}`
    );
    lines.push(
      `• *Balance Due:* ₹${Number(invoice.balanceDue || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })}`
    );
    lines.push(`• *Status:* ${invoice.status}`);

    if (includeItemsSummary && invoice.items && invoice.items.length > 0) {
      lines.push('');
      lines.push('📦 *Itemized Summary:*');
      invoice.items.slice(0, 5).forEach((item, idx) => {
        lines.push(
          `${idx + 1}. ${item.name} (${item.quantity} ${item.unit || 'PCS'}) — ₹${Number(
            item.totalAmount || 0
          ).toFixed(2)}`
        );
      });
      if (invoice.items.length > 5) {
        lines.push(`   _...and ${invoice.items.length - 5} more item(s)_`);
      }
    }

    if (
      includeBankDetails &&
      (business.bankName || business.accountNumber || business.upiId)
    ) {
      lines.push('');
      lines.push('🏦 *Payment Details:*');
      if (business.bankName) lines.push(`• Bank: ${business.bankName}`);
      if (business.accountNumber) lines.push(`• A/c No: ${business.accountNumber}`);
      if (business.ifsc) lines.push(`• IFSC: ${business.ifsc}`);
      if (business.branch) lines.push(`• Branch: ${business.branch}`);
      if (business.upiId) lines.push(`• UPI ID: ${business.upiId}`);
    }

    if (includePublicLink) {
      lines.push('');
      lines.push('🔗 *View & Download Invoice Online:*');
      lines.push(publicInvoiceLink);
    }

    lines.push('');
    lines.push('Thank you for your business!');
    lines.push(`_${sellerTitle}_`);

    return lines.join('\n');
  }, [
    invoice,
    business,
    includeItemsSummary,
    includeBankDetails,
    includePublicLink,
    publicInvoiceLink,
  ]);

  // Compute clean phone & WhatsApp URL
  const whatsappUrl = useMemo(() => {
    const raw = recipientPhone.replace(/[^0-9]/g, '');
    let cleanPhone = raw;
    if (raw.length === 10) {
      cleanPhone = `91${raw}`;
    }
    const encoded = encodeURIComponent(generatedWhatsAppMessage);
    if (cleanPhone) {
      return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    }
    return `https://api.whatsapp.com/send?text=${encoded}`;
  }, [recipientPhone, generatedWhatsAppMessage]);

  // Generate structured, professional GST Email message
  const generatedEmailBody = useMemo(() => {
    const seller = business.tradeName || business.name || 'Our Company';
    const lines: string[] = [];

    lines.push(`Dear ${invoice.customerName},`);
    lines.push('');
    lines.push(`Greetings from ${seller}!`);
    lines.push('');
    lines.push(`Please find the summary and remittance details for your GST Tax Invoice #${invoice.invoiceNumber}:`);
    lines.push('────────────────────────────────────────');
    lines.push(`• Invoice Number : ${invoice.invoiceNumber}`);
    lines.push(`• Invoice Date   : ${invoice.date}`);
    if (invoice.dueDate) {
      lines.push(`• Due Date       : ${invoice.dueDate}`);
    }
    lines.push(`• Total Taxable  : ₹${Number(invoice.totalTaxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    const totalTax =
      (invoice.cgstTotal || 0) +
      (invoice.sgstTotal || 0) +
      (invoice.igstTotal || 0) +
      (invoice.cessTotal || 0);
    lines.push(`• Total GST      : ₹${Number(totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${invoice.isInterState ? 'IGST' : 'CGST + SGST'})`);
    if (invoice.manualAdjustment && invoice.manualAdjustment !== 0) {
      lines.push(`• Adjustment     : ${invoice.manualAdjustment > 0 ? '+' : ''}₹${Number(invoice.manualAdjustment).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${invoice.adjustmentReason || 'Authorized by ' + (invoice.adjustmentAuthorizedBy || 'Manager')})`);
    }
    if (invoice.roundOff !== 0) {
      lines.push(`• Round Off      : ${invoice.roundOff > 0 ? '+' : ''}₹${Number(invoice.roundOff).toFixed(2)}${invoice.isManualRoundOff ? ' (Manual override)' : ''}`);
    }
    lines.push(`• Invoice Total  : ₹${Number(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    lines.push(`• Amount Paid    : ₹${Number(invoice.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    lines.push(`• Balance Due    : ₹${Number(invoice.balanceDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    lines.push(`• Payment Status : ${invoice.status}`);
    lines.push('────────────────────────────────────────');

    if (includeEmailItemsSummary && invoice.items && invoice.items.length > 0) {
      lines.push('');
      lines.push('📦 Itemized Breakdown:');
      invoice.items.forEach((item, idx) => {
        lines.push(
          `${idx + 1}. ${item.name} (${item.quantity} ${item.unit || 'PCS'}) — ₹${Number(item.totalAmount || 0).toFixed(2)} [HSN: ${item.hsnSac || 'N/A'}, GST: ${item.gstRate}%]`
        );
      });
    }

    if (
      includeEmailBankDetails &&
      (business.bankName || business.accountNumber || business.upiId)
    ) {
      lines.push('');
      lines.push('🏦 Bank Details for Direct Remittance:');
      if (business.bankName) lines.push(`• Bank Name   : ${business.bankName}`);
      if (business.accountNumber) lines.push(`• Account No  : ${business.accountNumber}`);
      if (business.ifsc) lines.push(`• IFSC Code   : ${business.ifsc}`);
      if (business.branch) lines.push(`• Branch      : ${business.branch}`);
      if (business.upiId) lines.push(`• UPI ID      : ${business.upiId}`);
    }

    if (includeEmailPublicLink) {
      lines.push('');
      lines.push('🔗 View & Download Official GST Invoice Online:');
      lines.push(publicInvoiceLink);
    }

    lines.push('');
    lines.push('Please feel free to reach out if you have any questions or require further assistance.');
    lines.push('');
    lines.push('Warm regards,');
    lines.push(seller);
    if (business.phone) lines.push(`Phone: ${business.phone}`);
    if (business.email) lines.push(`Email: ${business.email}`);
    if (business.gstin) lines.push(`GSTIN: ${business.gstin}`);

    return lines.join('\n');
  }, [
    invoice,
    business,
    includeEmailItemsSummary,
    includeEmailBankDetails,
    includeEmailPublicLink,
    publicInvoiceLink,
  ]);

  const mailtoUrl = useMemo(() => {
    const to = encodeURIComponent(recipientEmail.trim());
    const su = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(generatedEmailBody);
    const cc = ccEmail.trim() ? `&cc=${encodeURIComponent(ccEmail.trim())}` : '';
    return `mailto:${to}?subject=${su}&body=${body}${cc}`;
  }, [recipientEmail, ccEmail, emailSubject, generatedEmailBody]);

  const gmailWebUrl = useMemo(() => {
    const to = encodeURIComponent(recipientEmail.trim());
    const su = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(generatedEmailBody);
    const cc = ccEmail.trim() ? `&cc=${encodeURIComponent(ccEmail.trim())}` : '';
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}${cc}`;
  }, [recipientEmail, ccEmail, emailSubject, generatedEmailBody]);

  const outlookWebUrl = useMemo(() => {
    const to = encodeURIComponent(recipientEmail.trim());
    const su = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(generatedEmailBody);
    return `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}&body=${body}`;
  }, [recipientEmail, emailSubject, generatedEmailBody]);

  const handleCopyEmailBody = () => {
    navigator.clipboard.writeText(generatedEmailBody);
    setCopiedEmailBody(true);
    setTimeout(() => setCopiedEmailBody(false), 3000);
  };

  const handleRecordEmailSent = async () => {
    try {
      await sendPaymentReminder({
        customerId: invoice.customerId || matchedCustomer?.id || 'DIRECT',
        customerName: invoice.customerName,
        customerEmail: recipientEmail.trim(),
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amountDue: invoice.balanceDue,
        channel: 'EMAIL',
        subject: emailSubject,
        message: generatedEmailBody,
        recipientContact: recipientEmail.trim() || invoice.customerName,
        status: 'SENT',
      });
      setEmailRecordedNotice(`Logged email sent to ${recipientEmail || invoice.customerName} in customer history & audit trail!`);
      setTimeout(() => setEmailRecordedNotice(null), 4500);
    } catch (err: any) {
      console.warn('Could not record email reminder log:', err);
    }
  };

  const handleShare = () => {
    const text = `Invoice #${invoice.invoiceNumber} for ${invoice.customerName}: Grand Total ${formatINR(
      invoice.grandTotal
    )}, Due: ${formatINR(invoice.balanceDue)}. Bank: ${business.bankName} A/c: ${business.accountNumber} IFSC: ${
      business.ifsc
    }.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyWhatsAppMessage = () => {
    navigator.clipboard.writeText(generatedWhatsAppMessage);
    setCopiedWhatsAppMsg(true);
    setTimeout(() => setCopiedWhatsAppMsg(false), 3000);
  };

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(publicInvoiceLink);
    setCopiedPublicLink(true);
    setTimeout(() => setCopiedPublicLink(false), 3000);
  };

  // Compute HSN summary
  const hsnGroups: { [key: string]: { hsn: string; rate: number; taxable: number; taxAmt: number } } = {};
  invoice.items.forEach((it) => {
    const key = `${it.hsnSac || 'OTHER'}_${it.gstRate}`;
    if (!hsnGroups[key]) {
      hsnGroups[key] = {
        hsn: it.hsnSac || 'N/A',
        rate: it.gstRate,
        taxable: 0,
        taxAmt: 0,
      };
    }
    hsnGroups[key].taxable += it.taxableAmount;
    hsnGroups[key].taxAmt +=
      it.taxAmount ?? ((it.cgstAmount || 0) + (it.sgstAmount || 0) + (it.igstAmount || 0));
  });
  const hsnList = Object.values(hsnGroups);

  // Google Workspace Handlers
  const handleSaveToDrive = async () => {
    try {
      setIsUploadingToDrive(true);
      setWorkspaceToast(null);
      let token = await getAccessToken();
      if (!token) {
        token = await connectWorkspace();
      }
      if (!token) {
        setWorkspaceToast({ type: 'error', text: 'Google Workspace not connected. Please connect your account.' });
        return;
      }
      const result = await uploadInvoicePdfToDrive(token, invoice, business, copyType);
      if (result.success && result.url) {
        setWorkspaceToast({
          type: 'success',
          text: `Saved "${result.title}" to Google Drive!`,
          url: result.url,
        });
      } else {
        setWorkspaceToast({ type: 'error', text: result.error || 'Failed to upload to Google Drive' });
      }
    } catch (err: any) {
      setWorkspaceToast({ type: 'error', text: err.message });
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleCreateDoc = async () => {
    try {
      setIsGeneratingDoc(true);
      setWorkspaceToast(null);
      let token = await getAccessToken();
      if (!token) {
        token = await connectWorkspace();
      }
      if (!token) {
        setWorkspaceToast({ type: 'error', text: 'Google Workspace not connected. Please connect your account.' });
        return;
      }
      const result = await createInvoiceGoogleDoc(token, invoice, business);
      if (result.success && result.url) {
        setWorkspaceToast({
          type: 'success',
          text: `Created Google Doc "${result.title}"!`,
          url: result.url,
        });
      } else {
        setWorkspaceToast({ type: 'error', text: result.error || 'Failed to create Google Doc' });
      }
    } catch (err: any) {
      setWorkspaceToast({ type: 'error', text: err.message });
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Control Bar */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {invoice.invoiceNumber || 'DRAFT'}
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">{invoice.customerName}</span>

            {/* Copy Type Badges / Switcher */}
            <div className="hidden md:flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setCopyType('ORIGINAL')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  copyType === 'ORIGINAL' ? 'bg-indigo-600 text-white font-semibold' : 'hover:text-white'
                }`}
              >
                Original (Buyer)
              </button>
              <button
                type="button"
                onClick={() => setCopyType('DUPLICATE')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  copyType === 'DUPLICATE' ? 'bg-indigo-600 text-white font-semibold' : 'hover:text-white'
                }`}
              >
                Duplicate (Transporter)
              </button>
              <button
                type="button"
                onClick={() => setCopyType('TRIPLICATE')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  copyType === 'TRIPLICATE' ? 'bg-indigo-600 text-white font-semibold' : 'hover:text-white'
                }`}
              >
                Triplicate (Supplier)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct Email to Customer Button */}
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              title="Send GST Invoice directly to customer via Email"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>

            {/* Share via WhatsApp Button */}
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              title="Share invoice summary & public link via WhatsApp"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Excel Download & Share Button */}
            <button
              onClick={() => setShowExcelModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              title="Download & Share invoice in Excel (.xlsx) format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            {/* Save to Google Drive Button */}
            <button
              onClick={handleSaveToDrive}
              disabled={isUploadingToDrive}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              title="Upload invoice PDF directly to Google Drive"
            >
              {isUploadingToDrive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <HardDrive className="w-3.5 h-3.5" />
              )}
              <span>{isUploadingToDrive ? 'Saving...' : 'Drive'}</span>
            </button>

            {/* Generate Google Doc Button */}
            <button
              onClick={handleCreateDoc}
              disabled={isGeneratingDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              title="Create an editable Google Doc for this invoice"
            >
              {isGeneratingDoc ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingDoc ? 'Creating...' : 'Google Doc'}</span>
            </button>

            <button
              onClick={() => generateInvoicePDF(invoice, business, 'download', copyType)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              title="Download print-ready GST Tax Invoice PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={() => generateInvoicePDF(invoice, business, 'print', copyType)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              title="Copy quick summary to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>

            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(invoice.id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                title="Edit this invoice"
              >
                <Edit className="w-3.5 h-3.5 text-indigo-400" />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Toast Notification */}
        {workspaceToast && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between shrink-0 ${
              workspaceToast.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-b border-emerald-800'
                : 'bg-rose-950 text-rose-200 border-b border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{workspaceToast.text}</span>
            </div>
            <div className="flex items-center gap-3">
              {workspaceToast.url && (
                <a
                  href={workspaceToast.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline text-white hover:text-emerald-300 flex items-center gap-1"
                >
                  <span>Open Now</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={() => setWorkspaceToast(null)}
                className="text-slate-400 hover:text-white ml-2 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Scrollable A4 Sheet Simulation */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-200/60 flex justify-center">
          <div className="bg-white border border-slate-300 shadow-md p-6 md:p-8 max-w-3xl w-full rounded-sm text-slate-900 text-xs font-sans space-y-4">
            {/* Tax Invoice Header Bar */}
            <div className="border border-slate-800 rounded-xs overflow-hidden">
              <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  FORM GST INV-1
                </span>
                <h2 className="text-sm md:text-base font-extrabold tracking-wider uppercase text-center">
                  {invoice.invoiceType === 'TAX_INVOICE'
                    ? 'TAX INVOICE'
                    : invoice.invoiceType === 'BILL_OF_SUPPLY'
                    ? 'BILL OF SUPPLY'
                    : 'EXPORT INVOICE'}
                </h2>
                <span className="text-[10px] bg-slate-800 text-indigo-300 border border-slate-700 px-2 py-0.5 rounded font-bold uppercase">
                  {copyType === 'ORIGINAL'
                    ? 'ORIGINAL FOR RECIPIENT'
                    : copyType === 'DUPLICATE'
                    ? 'DUPLICATE FOR TRANSPORTER'
                    : 'TRIPLICATE FOR SUPPLIER'}
                </span>
              </div>
              <div className="bg-slate-50 text-slate-600 text-[10px] text-center py-1 border-t border-slate-200 italic">
                (Issued under Section 31 of Central Goods and Services Tax Act, 2017 & Rule 46 of CGST Rules, 2017)
              </div>
            </div>

            {/* Business & Invoice Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-slate-200">
              {/* Supplier Info with Brand Logo */}
              <div className="space-y-1">
                <div className="flex items-start gap-3">
                  {business.logoUrl ? (
                    <img
                      src={business.logoUrl}
                      alt="Company Logo"
                      className="max-h-14 max-w-[120px] object-contain rounded border border-slate-200 p-1 bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                      {business.name?.substring(0, 2).toUpperCase() || 'IP'}
                    </div>
                  )}

                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-tight">{business.name}</h3>
                    {business.tradeName && business.tradeName !== business.name && (
                      <p className="text-slate-600 italic text-[11px]">Trade: {business.tradeName}</p>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                  <p>{business.address}</p>
                  <p>
                    State: <span className="font-semibold text-slate-800">{business.state}</span> (Code:{' '}
                    <span className="font-semibold text-slate-800">{business.stateCode}</span>)
                    {business.pincode ? ` - ${business.pincode}` : ''}
                  </p>
                  <p className="font-bold text-slate-900">
                    GSTIN / UIN:{' '}
                    <span className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                      {business.gstin || 'UNREGISTERED'}
                    </span>
                  </p>
                  {business.pan && (
                    <p>
                      PAN: <span className="font-mono font-semibold">{business.pan}</span>
                    </p>
                  )}
                  {(business.phone || business.email) && (
                    <p className="text-slate-500">
                      Contact: {business.phone} {business.email ? `| ${business.email}` : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Invoice Meta Card - INVOICE DETAILS */}
              <div className="bg-slate-50 rounded-lg border border-slate-300 overflow-hidden text-xs">
                <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between">
                  <span className="font-bold text-[10px] tracking-wider uppercase">INVOICE DETAILS</span>
                  <span className="font-mono font-bold text-indigo-300 text-[11px]">{invoice.invoiceNumber || 'INV/26-27/1'}</span>
                </div>
                <div className="p-3 space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Invoice No:</span>
                    <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber || 'INV/26-27/1'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Invoice Date:</span>
                    <span className="font-medium text-slate-900">{invoice.date || '2026-10-29'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Place of Supply:</span>
                    <span className="font-semibold text-slate-800">
                      {invoice.placeOfSupply || 'Maharashtra'} ({invoice.placeOfSupplyCode || '27'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Supply Type:</span>
                    <span className="font-bold text-slate-900">
                      {invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Contract No:</span>
                    <span className="font-medium text-slate-900">{invoice.contractNo || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Contract Date:</span>
                    <span className="font-medium text-slate-900">{invoice.contractDate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Reverse Charge:</span>
                    <span className="font-bold">{invoice.reverseCharge ? 'YES' : 'NO'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Billed To & Shipped To Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50/70 rounded-lg border border-slate-300 overflow-hidden text-xs">
                <div className="bg-slate-900 text-white px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider">
                  BILLED TO (BUYER / RECIPIENT)
                </div>
                <div className="p-3 space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs">{invoice.customerName}</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{invoice.customerAddress || 'Address not specified'}</p>
                  <p className="text-slate-600 text-[11px]">
                    State: <span className="font-semibold text-slate-800">{invoice.placeOfSupply}</span> (Code: {invoice.placeOfSupplyCode})
                  </p>
                  <div className="pt-1.5 border-t border-slate-200 mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    <span className="font-bold text-slate-900">
                      GSTIN / UIN: <span className="font-mono font-semibold text-slate-800">{invoice.customerGstin || 'URP (Unregistered Person)'}</span>
                    </span>
                    {invoice.customerPhone && (
                      <span className="text-slate-600">Phone: {invoice.customerPhone}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/70 rounded-lg border border-slate-300 overflow-hidden text-xs">
                <div className="bg-slate-900 text-white px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider">
                  SHIPPED TO (CONSIGNEE / DESTINATION)
                </div>
                <div className="p-3 space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs">
                    {invoice.shippingName || invoice.customerName}
                  </h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {invoice.shippingAddress || invoice.customerAddress || `Delivery Destination: ${invoice.placeOfSupply}`}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Destination: <span className="font-semibold text-slate-800">{invoice.shippingState ? `${invoice.shippingState} (Code: ${invoice.shippingStateCode || 'N/A'})` : `${invoice.placeOfSupply} (Code: ${invoice.placeOfSupplyCode})`}</span>
                  </p>
                  <div className="pt-1.5 border-t border-slate-200 mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    <span className="font-bold text-slate-900">
                      GSTIN / UIN: <span className="font-mono font-semibold text-slate-800">{invoice.shippingGstin || invoice.customerGstin || 'URP (Unregistered)'}</span>
                    </span>
                    {(invoice.shippingPhone || invoice.customerPhone) && (
                      <span className="text-slate-600">Phone: {invoice.shippingPhone || invoice.customerPhone}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="py-2.5 px-2 text-center w-14">SL No.</th>
                    <th className="py-2.5 px-2">Item Description</th>
                    <th className="py-2.5 px-2 w-20">HSN/SAC</th>
                    <th className="py-2.5 px-2 w-14 text-right">Qty</th>
                    <th className="py-2.5 px-2 w-12 text-center">Unit</th>
                    <th className="py-2.5 px-2 w-20 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-2 w-14 text-right">Disc</th>
                    <th className="py-2.5 px-2 w-22 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-2 w-14 text-center">GST %</th>
                    <th className="py-2.5 px-2 w-24 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="py-2 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium text-slate-900 break-words max-w-[200px] leading-snug">
                        {item.name}
                        {(item as any).description && (
                          <span className="block text-[10px] text-slate-500 italic font-normal mt-0.5">
                            {(item as any).description}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 font-mono text-slate-600">{item.hsnSac || '-'}</td>
                      <td className="py-2 px-2 text-right font-mono">{item.quantity}</td>
                      <td className="py-2 px-2 text-center font-mono uppercase text-slate-700">
                        {item.unit || 'NOS'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-600">
                        {item.discount > 0
                          ? item.discountType === 'PERCENT'
                            ? `${item.discount}%`
                            : `₹${item.discount}`
                          : '-'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-semibold">
                        ₹{item.taxableAmount.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">{item.gstRate}%</td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                        ₹{item.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-t border-slate-200">
                    <td colSpan={3} className="py-1.5 px-2">
                      Subtotals:
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">
                      {invoice.items.reduce((s, it) => s + (it.quantity || 0), 0)}
                    </td>
                    <td colSpan={3}></td>
                    <td className="py-1.5 px-2 text-right font-mono">₹{invoice.totalTaxable.toFixed(2)}</td>
                    <td></td>
                    <td className="py-1.5 px-2 text-right font-mono text-indigo-700">
                      ₹{invoice.grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* HSN / SAC Statutory GST Breakdown Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto bg-slate-50/50 p-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                Statutory GST Distribution (HSN/SAC Breakdown)
              </span>
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-1 px-1.5">HSN/SAC</th>
                    <th className="py-1 px-1.5 text-right">Taxable Val</th>
                    {invoice.isInterState ? (
                      <>
                        <th className="py-1 px-1.5 text-right">IGST %</th>
                        <th className="py-1 px-1.5 text-right">IGST Amt</th>
                      </>
                    ) : (
                      <>
                        <th className="py-1 px-1.5 text-right">CGST %</th>
                        <th className="py-1 px-1.5 text-right">CGST Amt</th>
                        <th className="py-1 px-1.5 text-right">SGST %</th>
                        <th className="py-1 px-1.5 text-right">SGST Amt</th>
                      </>
                    )}
                    <th className="py-1 px-1.5 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hsnList.map((grp, i) => (
                    <tr key={i}>
                      <td className="py-1 px-1.5 font-mono text-slate-700">{grp.hsn}</td>
                      <td className="py-1 px-1.5 text-right font-mono">₹{grp.taxable.toFixed(2)}</td>
                      {invoice.isInterState ? (
                        <>
                          <td className="py-1 px-1.5 text-right font-mono">{grp.rate}%</td>
                          <td className="py-1 px-1.5 text-right font-mono">₹{grp.taxAmt.toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-1 px-1.5 text-right font-mono">{(grp.rate / 2).toFixed(1)}%</td>
                          <td className="py-1 px-1.5 text-right font-mono">₹{(grp.taxAmt / 2).toFixed(2)}</td>
                          <td className="py-1 px-1.5 text-right font-mono">{(grp.rate / 2).toFixed(1)}%</td>
                          <td className="py-1 px-1.5 text-right font-mono">₹{(grp.taxAmt / 2).toFixed(2)}</td>
                        </>
                      )}
                      <td className="py-1 px-1.5 text-right font-mono font-semibold text-slate-800">
                        ₹{grp.taxAmt.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Section: Bank details, Amount in words & Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              <div className="space-y-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase">
                    Amount in Words:
                  </span>
                  <p className="text-slate-800 italic font-medium text-[11px] mt-0.5">
                    Indian Rupees {invoice.amountInWords || 'Zero'} Only
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-1">
                  <span className="font-bold text-slate-800 block">Bank Details for Remittance:</span>
                  <p className="text-slate-600">Bank Name: {business.bankName || 'N/A'}</p>
                  <p className="text-slate-600">Account No: {business.accountNumber || 'N/A'}</p>
                  <p className="text-slate-600">
                    IFSC: {business.ifsc || 'N/A'} | Branch: {business.branch || 'N/A'}
                  </p>
                  {business.upiId && <p className="text-slate-600 font-mono">UPI ID: {business.upiId}</p>}
                </div>

                <div>
                  <span className="font-bold text-slate-700 block text-[10px]">Terms & Conditions:</span>
                  <p className="text-slate-500 text-[10px] whitespace-pre-line mt-0.5">
                    {invoice.terms || business.termsAndConditions}
                  </p>
                </div>
              </div>

              {/* Summary Totals & Stamp/Signatory */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Taxable Value:</span>
                    <span className="font-mono">₹ {invoice.totalTaxable.toFixed(2)}</span>
                  </div>

                  {!invoice.isInterState ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST Total:</span>
                        <span className="font-mono">₹ {invoice.cgstTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST Total:</span>
                        <span className="font-mono">₹ {invoice.sgstTotal.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST Total:</span>
                      <span className="font-mono">₹ {invoice.igstTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {invoice.cessTotal > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Cess Total:</span>
                      <span className="font-mono">₹ {invoice.cessTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {invoice.manualAdjustment && invoice.manualAdjustment !== 0 && (
                    <div className="flex justify-between items-start text-xs bg-purple-50 p-1.5 rounded border border-purple-200 text-purple-900">
                      <div>
                        <span className="font-bold">Authority Adjustment:</span>
                        {invoice.adjustmentAuthorizedBy && (
                          <span className="text-[10px] text-purple-700 block">
                            Auth: {invoice.adjustmentAuthorizedBy} {invoice.adjustmentReason ? `(${invoice.adjustmentReason})` : ''}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold">
                        {invoice.manualAdjustment > 0 ? '+' : ''}₹ {invoice.manualAdjustment.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Round Off {invoice.isManualRoundOff ? '(Manual)' : ''}:</span>
                      <span className="font-mono">
                        {invoice.roundOff > 0 ? '+' : ''}₹ {invoice.roundOff.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-sm text-white bg-slate-900 p-2 rounded">
                    <span>Invoice Grand Total:</span>
                    <span className="font-mono text-emerald-400">{formatINR(invoice.grandTotal)}</span>
                  </div>

                  {invoice.paidAmount > 0 && (
                    <>
                      <div className="flex justify-between text-slate-600 text-xs">
                        <span>Amount Received:</span>
                        <span className="font-mono">₹ {invoice.paidAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-xs text-amber-800">
                        <span>Net Balance Due:</span>
                        <span className="font-mono">{formatINR(invoice.balanceDue)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Stamp & Authorized Signatory Box */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 text-center flex flex-col items-center justify-between min-h-[110px]">
                  <p className="font-bold text-slate-800 text-xs">For {business.name}</p>

                  <div className="flex items-center justify-center gap-6 my-2">
                    {/* Company Rubber Stamp */}
                    {business.stampUrl ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={business.stampUrl}
                          alt="Company Seal / Stamp"
                          className="h-16 max-w-[90px] object-contain opacity-90"
                        />
                        <span className="text-[9px] text-slate-400">Official Seal</span>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-300 text-[9px]">
                        <Stamp className="w-4 h-4 mb-0.5" />
                        <span>Company Seal</span>
                      </div>
                    )}

                    {/* Digital Signature */}
                    {business.signatureUrl ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={business.signatureUrl}
                          alt="Authorized Signature"
                          className="h-14 max-w-[120px] object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-28 h-12 border-b border-slate-300 flex items-end justify-center pb-1 text-slate-300 text-[10px] italic">
                        [Signature]
                      </div>
                    )}
                  </div>

                  <div className="w-48 border-t border-slate-400 pt-1 text-slate-700 font-semibold text-[10px]">
                    {business.signatureName || 'Authorized Signatory'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Sharing Dialog Modal */}
        {showWhatsAppModal && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-emerald-600 px-5 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-700/60 rounded-xl">
                    <WhatsAppIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">Share Invoice via WhatsApp</h3>
                    <p className="text-xs text-emerald-100">
                      Pre-filled message & public link for {invoice.customerName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Customer Phone Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Customer Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="e.g. 9876543210 (or with country code +91)"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {recipientPhone.trim()
                      ? 'WhatsApp will open directly with this contact.'
                      : 'Leave blank to select any contact inside WhatsApp.'}
                  </p>
                </div>

                {/* Content Customization Toggles */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-700">
                  <p className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Include in WhatsApp Message:
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includePublicLink}
                      onChange={(e) => setIncludePublicLink(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium">
                      Public Link to View & Download Invoice Online
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeBankDetails}
                      onChange={(e) => setIncludeBankDetails(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium">
                      Bank & UPI Payment Credentials (IFSC, A/c, UPI ID)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeItemsSummary}
                      onChange={(e) => setIncludeItemsSummary(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium">
                      Itemized Breakdown of Products / Services
                    </span>
                  </label>
                </div>

                {/* Message Preview Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Message Preview
                    </label>
                    <span className="text-[11px] text-slate-400">Pre-formatted with WhatsApp Markdown</span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3 max-h-44 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-slate-800 leading-relaxed shadow-inner">
                    {generatedWhatsAppMessage}
                  </div>
                </div>

                {/* Public Link Quick Box */}
                {includePublicLink && (
                  <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <Link2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate font-mono text-slate-600 text-[11px] flex-1">
                      {publicInvoiceLink}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPublicLink}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded font-semibold text-slate-700 shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      {copiedPublicLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyWhatsAppMessage}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs"
                >
                  {copiedWhatsAppMsg ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Message Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-600" />
                      <span>Copy Full Message</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowWhatsAppModal(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>Open in WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Direct Email Sending Utility Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="bg-blue-600 px-5 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-700/60 rounded-xl">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">Send Invoice Directly to Customer</h3>
                    <p className="text-xs text-blue-100">
                      Email tax invoice details, bank remittance info & PDF link to {invoice.customerName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-blue-700/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Notice Toast */}
              {emailRecordedNotice && (
                <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{emailRecordedNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailRecordedNotice(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Email Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                      Customer Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <AtSign className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="customer@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                      CC (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <AtSign className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={ccEmail}
                        onChange={(e) => setCcEmail(e.target.value)}
                        placeholder="accounts@yourcompany.com"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Subject Line */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>

                {/* Content Options */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
                  <p className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Include in Email Content:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeEmailPublicLink}
                        onChange={(e) => setIncludeEmailPublicLink(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-medium text-[11px]">Online Invoice Link</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeEmailBankDetails}
                        onChange={(e) => setIncludeEmailBankDetails(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-medium text-[11px]">Bank & UPI Credentials</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeEmailItemsSummary}
                        onChange={(e) => setIncludeEmailItemsSummary(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-medium text-[11px]">Itemized Items List</span>
                    </label>
                  </div>
                </div>

                {/* Email Body Preview */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Email Body Preview
                    </label>
                    <span className="text-[11px] text-slate-400">Personalized with Seller & GST Summary</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-slate-800 leading-relaxed shadow-inner">
                    {generatedEmailBody}
                  </div>
                </div>

                {/* Fast Action Buttons row */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 text-xs">
                  <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Quick Attach:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => generateInvoicePDF(invoice, business, 'download', copyType)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-blue-200 rounded text-blue-700 font-semibold cursor-pointer flex items-center gap-1 text-[11px]"
                      title="Download PDF to easily drag-and-drop as attachment"
                    >
                      <FileDown className="w-3 h-3 text-blue-600" />
                      <span>Download PDF Attachment</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyEmailBody}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-blue-200 rounded text-blue-700 font-semibold cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      {copiedEmailBody ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-blue-600" />
                          <span>Copy Message Text</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleRecordEmailSent}
                      className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded text-blue-900 font-bold cursor-pointer flex items-center gap-1 text-[11px]"
                      title="Log this email in the customer's interaction audit trail"
                    >
                      <CheckCircle2 className="w-3 h-3 text-blue-700" />
                      <span>Save to Customer History</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 cursor-pointer transition-colors"
                >
                  Close
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Open in Gmail Web */}
                  <a
                    href={gmailWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleRecordEmailSent()}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                    title="Compose and send directly in Gmail Web"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Gmail</span>
                  </a>

                  {/* Open in Outlook Web */}
                  <a
                    href={outlookWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleRecordEmailSent()}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                    title="Compose and send in Outlook Web"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Outlook</span>
                  </a>

                  {/* Send via Default Native Email App */}
                  <a
                    href={mailtoUrl}
                    onClick={() => handleRecordEmailSent()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
                    title="Launch native email client (Outlook desktop, Apple Mail, etc.)"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send via Email App</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Excel Share & Download Modal */}
        {showExcelModal && (
          <ExcelShareModal
            invoice={invoice}
            business={business}
            onClose={() => setShowExcelModal(false)}
          />
        )}
      </div>
    </div>
  );
};
