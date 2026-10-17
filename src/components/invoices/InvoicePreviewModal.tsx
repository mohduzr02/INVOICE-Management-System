import React, { useState } from 'react';
import { Invoice } from '../../types';
import { useBusiness } from '../../context/BusinessContext';
import { formatINR } from '../../services/gstEngine';
import { generateInvoicePDF } from '../../services/pdfGenerator';
import { X, FileDown, Printer, Share2, Check, ShieldCheck, Stamp } from 'lucide-react';

interface InvoicePreviewModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ invoice, onClose }) => {
  const { business } = useBusiness();
  const [copied, setCopied] = useState(false);
  const [copyType, setCopyType] = useState<'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'>('ORIGINAL');

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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight">GST Tax Invoice</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              {invoice.invoiceNumber}
            </span>
            <div className="hidden sm:flex items-center gap-1 ml-2 bg-slate-800 rounded-lg p-0.5 text-xs text-slate-300">
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => generateInvoicePDF(invoice, business, 'download', copyType)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              title="Download print-ready GST Tax Invoice PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download PDF</span>
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
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

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

              {/* Invoice Meta Card */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-slate-700 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="font-bold text-slate-900">Invoice No:</span>
                  <span className="font-mono font-extrabold text-indigo-700">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600">Invoice Date:</span>
                  <span className="font-medium">{invoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600">Payment Due:</span>
                  <span className="font-medium">{invoice.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600">Place of Supply:</span>
                  <span className="font-semibold text-slate-800">
                    {invoice.placeOfSupply} ({invoice.placeOfSupplyCode})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600">Reverse Charge:</span>
                  <span>{invoice.reverseCharge ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600">Supply Type:</span>
                  <span className="font-semibold text-indigo-700">
                    {invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Billed To & Shipped To Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Billed To (Buyer / Recipient)
                </span>
                <h4 className="font-bold text-slate-900 text-xs">{invoice.customerName}</h4>
                <p className="text-slate-600 text-[11px] mt-0.5">{invoice.customerAddress || 'Address not specified'}</p>
                <p className="text-slate-600 text-[11px]">
                  State: {invoice.placeOfSupply} (Code: {invoice.placeOfSupplyCode})
                </p>
                <p className="font-bold text-slate-900 text-[11px] mt-1">
                  GSTIN / UIN:{' '}
                  <span className="font-mono font-semibold">
                    {invoice.customerGstin || 'URP (Unregistered Person)'}
                  </span>
                </p>
                {invoice.customerPhone && (
                  <p className="text-slate-600 text-[11px]">Phone: {invoice.customerPhone}</p>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Shipped To (Consignee / Destination)
                </span>
                <h4 className="font-bold text-slate-900 text-xs">{invoice.customerName}</h4>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  {invoice.customerAddress || `Delivery Destination: ${invoice.placeOfSupply}`}
                </p>
                <p className="text-slate-600 text-[11px]">
                  Place of Delivery: {invoice.placeOfSupply} (Code: {invoice.placeOfSupplyCode})
                </p>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>GST Compliant Recipient Profile</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold">
                    <th className="py-2 px-2 text-center w-8">#</th>
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-2 w-20">HSN/SAC</th>
                    <th className="py-2 px-2 w-16 text-right">Qty</th>
                    <th className="py-2 px-2 w-14 text-center">Unit</th>
                    <th className="py-2 px-2 w-20 text-right">Rate</th>
                    <th className="py-2 px-2 w-16 text-right">Disc</th>
                    <th className="py-2 px-2 w-22 text-right">Taxable</th>
                    <th className="py-2 px-2 w-16 text-center">GST %</th>
                    <th className="py-2 px-2 w-24 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="py-2 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium text-slate-900">{item.name}</td>
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

                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Round Off:</span>
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
      </div>
    </div>
  );
};
