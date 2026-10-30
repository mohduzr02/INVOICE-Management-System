import * as XLSX from 'xlsx';
import { Invoice, Purchase, Gstr2BRecord, LedgerEntry, Customer, Supplier } from '../types';

/**
 * Helper to download CSV data with UTF-8 BOM so Excel and external spreadsheet tools decode special characters correctly.
 */
function downloadCsvData(csvContent: string, fileName: string) {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format invoice data rows for export
 */
function formatSalesRegisterRows(invoices: Invoice[]) {
  return invoices.map((inv, idx) => ({
    'S.No': idx + 1,
    'Invoice Number': inv.invoiceNumber,
    'Date': inv.date,
    'Contract No': inv.contractNo || 'N/A',
    'Contract Date': inv.contractDate || 'N/A',
    'Customer Name': inv.customerName,
    'Customer GSTIN': inv.customerGstin || 'URP',
    'Place of Supply': `${inv.placeOfSupply} (${inv.placeOfSupplyCode})`,
    'Supply Type': inv.isInterState ? 'Inter-State' : 'Intra-State',
    'Status': inv.status,
    'Taxable Value (₹)': inv.totalTaxable,
    'CGST (₹)': inv.cgstTotal,
    'SGST (₹)': inv.sgstTotal,
    'IGST (₹)': inv.igstTotal,
    'Cess (₹)': inv.cessTotal,
    'Round Off (₹)': inv.roundOff,
    'Invoice Total (₹)': inv.grandTotal,
    'Paid Amount (₹)': inv.paidAmount,
    'Balance Due (₹)': inv.balanceDue,
  }));
}

/**
 * Export Invoices / Sales Register to Excel
 */
export function exportSalesRegisterToExcel(invoices: Invoice[], fileName: string = 'Sales_Register.xlsx') {
  const data = formatSalesRegisterRows(invoices);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');
  XLSX.writeFile(wb, fileName);
}

/**
 * Export Invoices / Sales Register to CSV
 */
export function exportSalesRegisterToCSV(invoices: Invoice[], fileName: string = 'Sales_Register.csv') {
  const data = formatSalesRegisterRows(invoices);
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadCsvData(csv, fileName);
}

/**
 * Generate a formatted Excel Blob for a Single Invoice with itemized lines, taxes, and authority adjustments
 */
export function generateSingleInvoiceExcel(invoice: Invoice, business?: any): Blob {
  const wb = XLSX.utils.book_new();

  // Header info
  const summaryRows = [
    ['INVOICE PRO GST - TAX INVOICE'],
    ['Supplier Name:', business?.name || 'Seller Business'],
    ['Supplier GSTIN:', business?.gstin || '-'],
    ['Supplier State:', `${business?.state || '-'} (${business?.stateCode || '-'})`],
    ['Supplier Address:', business?.address || '-'],
    [],
    ['Invoice Number:', invoice.invoiceNumber, '', 'Invoice Date:', invoice.date],
    ['Invoice Type:', invoice.invoiceType, '', 'Place of Supply:', `${invoice.placeOfSupply} (${invoice.placeOfSupplyCode})`],
    ['Contract No:', invoice.contractNo || 'N/A', '', 'Contract Date:', invoice.contractDate || 'N/A'],
    ['Supply Type:', invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)', '', 'Status:', invoice.status],
    [],
    ['BILLED TO (BUYER DETAILS)', '', '', 'SHIPPED TO (CONSIGNEE DETAILS)'],
    ['Customer Name:', invoice.customerName, '', 'Consignee Name:', invoice.shippingName || invoice.customerName],
    ['Customer GSTIN:', invoice.customerGstin || 'URP', '', 'Consignee GSTIN:', invoice.shippingGstin || invoice.customerGstin || 'URP'],
    ['Billing Address:', invoice.customerAddress || '-', '', 'Shipping Address:', invoice.shippingAddress || invoice.customerAddress || '-'],
    ['Phone:', invoice.customerPhone || '-', '', 'Consignee Phone:', invoice.shippingPhone || invoice.customerPhone || '-'],
    [],
    ['ITEMIZED LINE ITEMS'],
  ];

  // Table items
  const itemRows = invoice.items.map((it, idx) => [
    idx + 1,
    it.name,
    it.hsnSac || '-',
    it.quantity,
    it.unit,
    it.unitPrice,
    it.discount ? (it.discountType === 'PERCENT' ? `${it.discount}%` : `₹${it.discount}`) : '0',
    it.taxableAmount,
    `${it.gstRate}%`,
    it.cgstAmount || 0,
    it.sgstAmount || 0,
    it.igstAmount || 0,
    it.cessAmount || 0,
    it.totalAmount,
  ]);

  const itemHeader = [
    'S.No',
    'Item Description',
    'HSN/SAC',
    'Qty',
    'Unit',
    'Unit Price (₹)',
    'Discount',
    'Taxable Value (₹)',
    'GST Rate',
    'CGST (₹)',
    'SGST (₹)',
    'IGST (₹)',
    'Cess (₹)',
    'Total Amount (₹)',
  ];

  // Totals & Authority Adjustment
  const totalsRows = [
    [],
    ['', '', '', '', '', '', '', '', '', '', '', '', 'Sub Total (₹):', invoice.subTotal],
    ['', '', '', '', '', '', '', '', '', '', '', '', 'Discount Total (₹):', invoice.discountTotal],
    ['', '', '', '', '', '', '', '', '', '', '', '', 'Taxable Amount (₹):', invoice.totalTaxable],
    ['', '', '', '', '', '', '', '', '', '', '', '', 'CGST Total (₹):', invoice.cgstTotal],
    ['', '', '', '', '', '', '', '', '', '', '', '', 'SGST Total (₹):', invoice.sgstTotal],
    ['', '', '', '', '', '', '', '', '', '', '', '', 'IGST Total (₹):', invoice.igstTotal],
    ['', '', '', '', '', '', '', '', '', '', '', '', 'Cess Total (₹):', invoice.cessTotal],
  ];

  if (invoice.manualAdjustment && invoice.manualAdjustment !== 0) {
    totalsRows.push([
      '', '', '', '', '', '', '', '', '', '', '', '',
      `Authority Adjustment (${invoice.adjustmentReason || 'Managerial'} - Auth by: ${invoice.adjustmentAuthorizedBy || 'Manager'}):`,
      invoice.manualAdjustment,
    ]);
  }

  totalsRows.push([
    '', '', '', '', '', '', '', '', '', '', '', '',
    invoice.isManualRoundOff ? 'Round Off (Manual Override):' : 'Round Off:',
    invoice.roundOff,
  ]);

  totalsRows.push([
    '', '', '', '', '', '', '', '', '', '', '', '',
    'GRAND TOTAL (₹):',
    invoice.grandTotal,
  ]);

  totalsRows.push([
    '', '', '', '', '', '', '', '', '', '', '', '',
    'Amount Received (₹):',
    invoice.paidAmount,
  ]);

  totalsRows.push([
    '', '', '', '', '', '', '', '', '', '', '', '',
    'Balance Due (₹):',
    invoice.balanceDue,
  ]);

  totalsRows.push([]);
  totalsRows.push(['Amount in Words:', invoice.amountInWords]);
  totalsRows.push(['Terms & Conditions:', invoice.terms || business?.termsAndConditions || '']);
  if (business?.bankName) {
    totalsRows.push([
      'Bank Payment Details:',
      `Bank: ${business.bankName} | A/C: ${business.accountNumber} | IFSC: ${business.ifsc}${business.upiId ? ` | UPI: ${business.upiId}` : ''}`,
    ]);
  }

  const allRows = [...summaryRows, itemHeader, ...itemRows, ...totalsRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, ws, `Invoice_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}`);

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Export and Download Single Invoice to Excel
 */
export function exportSingleInvoiceToExcel(invoice: Invoice, business?: any, customFileName?: string) {
  const blob = generateSingleInvoiceExcel(invoice, business);
  const cleanNum = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = customFileName || `Invoice_${cleanNum}_${invoice.date}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Share Excel File via Web Share API or download fallback
 */
export async function shareExcelFile(
  blob: Blob,
  fileName: string,
  title: string = 'Invoice Excel Document',
  text: string = 'Please find attached invoice spreadsheet.'
): Promise<{ success: boolean; method: 'web-share' | 'download' | 'fallback'; message?: string }> {
  try {
    const file = new File([blob], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return { success: true, method: 'web-share' };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, method: 'web-share', message: 'Share action cancelled by user.' };
    }
    console.warn('Native web share not supported or failed, falling back to download:', err);
  }

  // Fallback: trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, method: 'download', message: 'Downloaded Excel file to your device.' };
}

/**
 * Export Purchase Register to Excel
 */
export function exportPurchaseRegisterToExcel(purchases: Purchase[], fileName: string = 'Purchase_Register.xlsx') {
  const data = purchases.map((p, idx) => ({
    'S.No': idx + 1,
    'Bill No': p.billNumber,
    'Supplier Invoice No': p.supplierInvoiceNumber || '-',
    'Date': p.date,
    'Supplier Name': p.supplierName,
    'Supplier GSTIN': p.supplierGstin || 'URP',
    'Place of Supply': p.placeOfSupply,
    'ITC Eligibility': p.itcEligibility,
    'Taxable Value (₹)': p.totalTaxable,
    'CGST (₹)': p.cgstTotal,
    'SGST (₹)': p.sgstTotal,
    'IGST (₹)': p.igstTotal,
    'Cess (₹)': p.cessTotal,
    'Total (₹)': p.grandTotal,
    'Payment Status': p.status,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Purchase Register');
  XLSX.writeFile(wb, fileName);
}

/**
 * Export GSTR-1 Worksheets into official-compatible multi-sheet workbook
 */
export function exportGSTR1ToExcel(invoices: Invoice[], fileName: string = 'GSTR1_Return_Worksheet.xlsx') {
  const wb = XLSX.utils.book_new();

  // B2B Sheet (Registered recipients)
  const b2bInvoices = invoices.filter(inv => inv.customerGstin && inv.customerGstin.trim().length === 15 && inv.status !== 'CANCELLED');
  const b2bData = b2bInvoices.map(inv => ({
    'GSTIN/UIN of Recipient': inv.customerGstin,
    'Receiver Name': inv.customerName,
    'Invoice Number': inv.invoiceNumber,
    'Invoice date': inv.date,
    'Invoice Value': inv.grandTotal,
    'Place Of Supply': `${inv.placeOfSupplyCode}-${inv.placeOfSupply}`,
    'Reverse Charge': inv.reverseCharge ? 'Y' : 'N',
    'Applicable % of Tax Rate': '',
    'Invoice Type': 'Regular',
    'E-Commerce GSTIN': '',
    'Rate': inv.items[0]?.gstRate || 18,
    'Taxable Value': inv.totalTaxable,
    'Cess Amount': inv.cessTotal,
  }));
  const wsB2B = XLSX.utils.json_to_sheet(b2bData);
  XLSX.utils.book_append_sheet(wb, wsB2B, 'b2b');

  // B2CL Sheet (Unregistered, Inter-state > 2.5 Lakhs)
  const b2clInvoices = invoices.filter(inv => (!inv.customerGstin || inv.customerGstin.trim().length !== 15) && inv.isInterState && inv.grandTotal > 250000 && inv.status !== 'CANCELLED');
  const b2clData = b2clInvoices.map(inv => ({
    'Invoice Number': inv.invoiceNumber,
    'Invoice date': inv.date,
    'Invoice Value': inv.grandTotal,
    'Place Of Supply': `${inv.placeOfSupplyCode}-${inv.placeOfSupply}`,
    'Rate': inv.items[0]?.gstRate || 18,
    'Taxable Value': inv.totalTaxable,
    'Cess Amount': inv.cessTotal,
  }));
  const wsB2CL = XLSX.utils.json_to_sheet(b2clData);
  XLSX.utils.book_append_sheet(wb, wsB2CL, 'b2cl');

  // B2CS Sheet (Other Unregistered)
  const b2csInvoices = invoices.filter(inv => (!inv.customerGstin || inv.customerGstin.trim().length !== 15) && !(inv.isInterState && inv.grandTotal > 250000) && inv.status !== 'CANCELLED');
  const b2csData = b2csInvoices.map(inv => ({
    'Type': inv.isInterState ? 'OE' : 'OE',
    'Place Of Supply': `${inv.placeOfSupplyCode}-${inv.placeOfSupply}`,
    'Rate': inv.items[0]?.gstRate || 18,
    'Taxable Value': inv.totalTaxable,
    'Cess Amount': inv.cessTotal,
    'E-Commerce GSTIN': '',
  }));
  const wsB2CS = XLSX.utils.json_to_sheet(b2csData);
  XLSX.utils.book_append_sheet(wb, wsB2CS, 'b2cs');

  // HSN Summary Sheet
  const hsnMap: { [code: string]: { description: string; uqc: string; totalQty: number; totalVal: number; taxableVal: number; igst: number; cgst: number; sgst: number; cess: number } } = {};
  
  invoices.filter(i => i.status !== 'CANCELLED').forEach(inv => {
    inv.items.forEach(item => {
      const code = item.hsnSac || 'OTHER';
      if (!hsnMap[code]) {
        hsnMap[code] = {
          description: item.name,
          uqc: item.unit || 'NOS',
          totalQty: 0,
          totalVal: 0,
          taxableVal: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0,
        };
      }
      hsnMap[code].totalQty += item.quantity;
      hsnMap[code].totalVal += item.totalAmount;
      hsnMap[code].taxableVal += item.taxableAmount;
      hsnMap[code].igst += item.igstAmount;
      hsnMap[code].cgst += item.cgstAmount;
      hsnMap[code].sgst += item.sgstAmount;
      hsnMap[code].cess += item.cessAmount;
    });
  });

  const hsnData = Object.entries(hsnMap).map(([hsn, data]) => ({
    'HSN': hsn,
    'Description': data.description,
    'UQC': data.uqc,
    'Total Quantity': data.totalQty,
    'Total Value': data.totalVal,
    'Taxable Value': data.taxableVal,
    'Integrated Tax Amount': data.igst,
    'Central Tax Amount': data.cgst,
    'State/UT Tax Amount': data.sgst,
    'Cess Amount': data.cess,
  }));
  const wsHSN = XLSX.utils.json_to_sheet(hsnData);
  XLSX.utils.book_append_sheet(wb, wsHSN, 'hsn');

  XLSX.writeFile(wb, fileName);
}

/**
 * Export Customer or Supplier Ledger to Excel
 */
export function exportLedgerToExcel(partyName: string, entries: LedgerEntry[], fileName?: string) {
  const data = entries.map(e => ({
    'Date': e.date,
    'Voucher Type': e.voucherType,
    'Voucher No': e.voucherNo,
    'Particulars': e.particulars,
    'Debit (₹)': e.debit > 0 ? e.debit : '',
    'Credit (₹)': e.credit > 0 ? e.credit : '',
    'Balance (₹)': e.balance,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ledger Statement');
  XLSX.writeFile(wb, fileName || `${partyName.replace(/\s+/g, '_')}_Ledger.xlsx`);
}

/**
 * Parse an uploaded GSTR-2B file (JSON or Excel sheet)
 */
export async function parseGstr2BFile(file: File): Promise<Gstr2BRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    if (file.name.endsWith('.json')) {
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const json = JSON.parse(content);
          const records: Gstr2BRecord[] = [];

          // Parse official GSTR-2B JSON schema or simplified schema
          if (json.data && json.data.docdata && json.data.docdata.b2b) {
            for (const item of json.data.docdata.b2b) {
              const gstin = item.ctin;
              const trdNm = item.trdnm || gstin;
              for (const inv of item.inv || []) {
                const totalTax = (inv.items || []).reduce((acc: number, curr: any) => acc + (curr.txval || 0), 0);
                records.push({
                  gstinSupplier: gstin,
                  tradeNameSupplier: trdNm,
                  invoiceNumber: inv.inum,
                  invoiceType: inv.typ || 'Regular',
                  invoiceDate: inv.dt,
                  invoiceValue: inv.val,
                  placeOfSupply: inv.pos,
                  taxableValue: totalTax,
                  integratedTax: (inv.items || []).reduce((acc: number, curr: any) => acc + (curr.iamt || 0), 0),
                  centralTax: (inv.items || []).reduce((acc: number, curr: any) => acc + (curr.camt || 0), 0),
                  stateTax: (inv.items || []).reduce((acc: number, curr: any) => acc + (curr.samt || 0), 0),
                  cess: (inv.items || []).reduce((acc: number, curr: any) => acc + (curr.csamt || 0), 0),
                  itcAvailable: inv.itcavl || 'Y',
                });
              }
            }
          } else if (Array.isArray(json)) {
            // direct array format
            records.push(...json);
          }
          resolve(records);
        } catch (err) {
          reject(new Error('Invalid GSTR-2B JSON format: ' + err));
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);

          const records: Gstr2BRecord[] = rows.map((r) => ({
            gstinSupplier: r['GSTIN of supplier'] || r['Supplier GSTIN'] || r['ctin'] || '',
            tradeNameSupplier: r['Trade/Legal name'] || r['Supplier Name'] || r['trdnm'] || '',
            invoiceNumber: String(r['Invoice number'] || r['Invoice Number'] || r['inum'] || ''),
            invoiceType: r['Invoice type'] || 'Regular',
            invoiceDate: String(r['Invoice date'] || r['Date'] || r['dt'] || ''),
            invoiceValue: Number(r['Invoice Value(₹)'] || r['Invoice Value'] || r['val'] || 0),
            placeOfSupply: String(r['Place of supply'] || r['POS'] || r['pos'] || ''),
            taxableValue: Number(r['Taxable Value (₹)'] || r['Taxable Value'] || r['txval'] || 0),
            integratedTax: Number(r['Integrated Tax(₹)'] || r['IGST'] || r['iamt'] || 0),
            centralTax: Number(r['Central Tax(₹)'] || r['CGST'] || r['camt'] || 0),
            stateTax: Number(r['State/UT Tax(₹)'] || r['SGST'] || r['samt'] || 0),
            cess: Number(r['Cess(₹)'] || r['Cess'] || r['csamt'] || 0),
            itcAvailable: r['ITC Availability'] || 'Y',
          }));
          resolve(records.filter(r => r.invoiceNumber));
        } catch (err) {
          reject(new Error('Failed to read Excel file: ' + err));
        }
      };
      reader.readAsArrayBuffer(file);
    }
  });
}

/**
 * Format Customer Master records into structured tabular rows
 */
function formatCustomerRows(customers: Customer[]) {
  return customers.map((c, idx) => ({
    'S.No': idx + 1,
    'Customer Name': c.name,
    'GSTIN': c.gstin || 'URP (Unregistered)',
    'PAN': c.pan || '-',
    'State': `${c.state} (${c.stateCode})`,
    'Phone': c.phone || '-',
    'Email': c.email || '-',
    'Billing Address': c.billingAddress || '-',
    'Shipping Address': c.shippingAddress || '-',
    'Registration Type': c.isComposition ? 'Composition Dealer' : (c.gstin ? 'Regular Registered' : 'Unregistered Consumer'),
    'Opening Balance (₹)': c.openingBalance ?? 0,
    'Current Outstanding Balance (₹)': c.currentBalance ?? 0,
    'Credit Limit (₹)': c.creditLimit ?? 0,
    'Created Date': c.createdAt ? c.createdAt.split('T')[0] : '-',
  }));
}

/**
 * Export Customer list to Excel (.xlsx)
 */
export function exportCustomersToExcel(customers: Customer[], fileName: string = 'Customer_Master_Registry.xlsx') {
  const data = formatCustomerRows(customers);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  XLSX.writeFile(wb, fileName);
}

/**
 * Export Customer list to CSV (.csv)
 */
export function exportCustomersToCSV(customers: Customer[], fileName: string = 'Customer_Master_Registry.csv') {
  const data = formatCustomerRows(customers);
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadCsvData(csv, fileName);
}

/**
 * Format Supplier / Vendor records into structured tabular rows
 */
function formatSupplierRows(suppliers: Supplier[]) {
  return suppliers.map((s, idx) => ({
    'S.No': idx + 1,
    'Supplier Name': s.name,
    'GSTIN': s.gstin || 'URP (Unregistered)',
    'PAN': s.pan || '-',
    'State': `${s.state} (${s.stateCode})`,
    'Phone': s.phone || '-',
    'Email': s.email || '-',
    'Address': s.address || '-',
    'Opening Balance (₹)': s.openingBalance ?? 0,
    'Current Outstanding Payable (₹)': s.currentBalance ?? 0,
    'Created Date': s.createdAt ? s.createdAt.split('T')[0] : '-',
  }));
}

/**
 * Export Supplier list to Excel (.xlsx)
 */
export function exportSuppliersToExcel(suppliers: Supplier[], fileName: string = 'Supplier_Vendor_Registry.xlsx') {
  const data = formatSupplierRows(suppliers);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
  XLSX.writeFile(wb, fileName);
}

/**
 * Export Supplier list to CSV (.csv)
 */
export function exportSuppliersToCSV(suppliers: Supplier[], fileName: string = 'Supplier_Vendor_Registry.csv') {
  const data = formatSupplierRows(suppliers);
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadCsvData(csv, fileName);
}
