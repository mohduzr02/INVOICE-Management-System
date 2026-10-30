import React, { useState } from 'react';
import { Invoice } from '../../types';
import { generateSingleInvoiceExcel, exportSingleInvoiceToExcel, shareExcelFile } from '../../services/excelExporter';
import { formatINR } from '../../services/gstEngine';
import {
  X,
  FileSpreadsheet,
  Download,
  Share2,
  Mail,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from 'lucide-react';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.06 7.42C8.92 7.42 8.68 7.47 8.48 7.69C8.27 7.91 7.7 8.45 7.7 9.54C7.7 10.63 8.49 11.68 8.6 11.83C8.72 11.98 10.15 14.19 12.33 15.13C14.15 15.91 14.52 15.76 14.93 15.72C15.34 15.68 16.27 15.17 16.46 14.62C16.65 14.08 16.65 13.62 16.59 13.52C16.53 13.42 16.39 13.36 16.18 13.26C15.97 13.15 14.94 12.64 14.75 12.57C14.56 12.5 14.42 12.46 14.28 12.67C14.14 12.88 13.75 13.36 13.63 13.5C13.51 13.63 13.39 13.65 13.18 13.55C12.97 13.45 12.3 13.23 11.51 12.52C10.89 11.97 10.47 11.29 10.35 11.08C10.23 10.87 10.34 10.76 10.44 10.66C10.54 10.56 10.66 10.4 10.76 10.28C10.86 10.17 10.9 10.08 10.97 9.94C11.04 9.8 11 9.68 10.95 9.58C10.9 9.47 10.48 8.45 10.31 8.03C10.14 7.62 9.97 7.68 9.84 7.67C9.72 7.67 9.58 7.66 9.44 7.66C9.31 7.66 9.17 7.66 9.06 7.42Z" />
  </svg>
);

interface ExcelShareModalProps {
  invoice: Invoice;
  business?: any;
  onClose: () => void;
  onActionLogged?: (action: string, details: string) => void;
}

export const ExcelShareModal: React.FC<ExcelShareModalProps> = ({
  invoice,
  business,
  onClose,
  onActionLogged,
}) => {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const cleanNum = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Invoice_${cleanNum}_${invoice.date}.xlsx`;

  // WhatsApp share link
  const whatsappSummary = `📊 *EXCEL INVOICE DETAILS: #${invoice.invoiceNumber}*
Seller: *${business?.name || 'Company'}*
Customer: *${invoice.customerName}*
Date: ${invoice.date} | Due Date: ${invoice.dueDate}
Total Amount: *${formatINR(invoice.grandTotal)}*
Balance Due: *${formatINR(invoice.balanceDue)}*
Items: ${invoice.items.length} line items

${business?.bankName ? `🏦 Bank: ${business.bankName} | A/C: ${business.accountNumber} | IFSC: ${business.ifsc}\n` : ''}${business?.upiId ? `📲 UPI: ${business.upiId}\n` : ''}Excel workbook is generated with itemized HSN breakdown and statutory GST calculation.`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappSummary)}`;

  // Email share link
  const emailSubject = `GST Invoice #${invoice.invoiceNumber} - ${business?.name || 'Invoice'}`;
  const emailBody = `Hi ${invoice.customerName},

Please find the summary of your Invoice #${invoice.invoiceNumber}:
• Invoice Date: ${invoice.date}
• Due Date: ${invoice.dueDate}
• Invoice Total: ${formatINR(invoice.grandTotal)}
• Balance Due: ${formatINR(invoice.balanceDue)}

${business?.bankName ? `Bank Details for Remittance:\nBank: ${business.bankName}\nAccount: ${business.accountNumber}\nIFSC: ${business.ifsc}\nUPI: ${business.upiId || 'N/A'}\n\n` : ''}The complete Excel spreadsheet report has been generated.

Best regards,
${business?.name || 'Accounts Department'}`;

  const emailUrl = `mailto:${invoice.customerEmail || ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const handleDownload = () => {
    exportSingleInvoiceToExcel(invoice, business, fileName);
    setToastMsg(`Downloaded "${fileName}" successfully!`);
    if (onActionLogged) {
      onActionLogged('Downloaded Excel Invoice', `Exported Excel (.xlsx) for Invoice #${invoice.invoiceNumber}`);
    }
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleNativeShare = async () => {
    setSharing(true);
    try {
      const blob = generateSingleInvoiceExcel(invoice, business);
      const res = await shareExcelFile(
        blob,
        fileName,
        `Invoice #${invoice.invoiceNumber} Spreadsheet`,
        `GST Tax Invoice #${invoice.invoiceNumber} for ${invoice.customerName} (₹${invoice.grandTotal.toLocaleString('en-IN')})`
      );
      if (res.success) {
        setToastMsg(res.method === 'web-share' ? 'Shared successfully!' : 'File downloaded to device.');
        if (onActionLogged) {
          onActionLogged('Shared Excel Invoice', `Shared Excel file for Invoice #${invoice.invoiceNumber} via ${res.method}`);
        }
      }
    } catch (e: any) {
      setToastMsg('Share action completed.');
    } finally {
      setSharing(false);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(whatsappSummary);
    setCopied(true);
    if (onActionLogged) {
      onActionLogged('Copied Invoice Summary', `Copied text summary of Invoice #${invoice.invoiceNumber}`);
    }
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs">
              <FileSpreadsheet className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Excel Spreadsheet Options</h3>
              <p className="text-[11px] text-emerald-100 font-mono">Invoice #{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* File details card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>File Format:</span>
              <span className="font-mono font-semibold text-slate-800">Microsoft Excel (.xlsx)</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Target File:</span>
              <span className="font-mono text-emerald-700 font-medium truncate max-w-[200px]" title={fileName}>
                {fileName}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Invoice Value:</span>
              <span className="font-bold text-slate-900">{formatINR(invoice.grandTotal)}</span>
            </div>
            {invoice.manualAdjustment && invoice.manualAdjustment !== 0 && (
              <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200">
                <span>Authority Adjustment:</span>
                <span className="font-medium text-amber-700">
                  {invoice.manualAdjustment > 0 ? '+' : ''}₹{invoice.manualAdjustment.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="flex flex-col items-center justify-center gap-1.5 p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-900 font-semibold text-xs transition-all cursor-pointer group"
            >
              <Download className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition-transform" />
              <span>Download Excel</span>
              <span className="text-[10px] text-emerald-600 font-normal">Save .xlsx to PC</span>
            </button>

            {/* Native Web Share Button */}
            <button
              onClick={handleNativeShare}
              disabled={sharing}
              className="flex flex-col items-center justify-center gap-1.5 p-3.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-indigo-900 font-semibold text-xs transition-all cursor-pointer group"
            >
              {sharing ? (
                <Loader2 className="w-5 h-5 text-indigo-700 animate-spin" />
              ) : (
                <Share2 className="w-5 h-5 text-indigo-700 group-hover:scale-110 transition-transform" />
              )}
              <span>Share File</span>
              <span className="text-[10px] text-indigo-600 font-normal">Web Share / Mobile</span>
            </button>
          </div>

          {/* External Share Links */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Direct Communication
            </span>

            <div className="flex items-center gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>Share on WhatsApp</span>
              </a>

              <a
                href={emailUrl}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                title="Send invoice breakdown via Email"
              >
                <Mail className="w-4 h-4 text-slate-600" />
                <span>Email</span>
              </a>

              <button
                type="button"
                onClick={handleCopySummary}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Copy formatted invoice text to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Toast feedback */}
          {toastMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
