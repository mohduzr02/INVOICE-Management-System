import * as XLSX from 'xlsx';
import { Invoice, Purchase, Gstr2BRecord, LedgerEntry } from '../types';

/**
 * Export Invoices / Sales Register to Excel
 */
export function exportSalesRegisterToExcel(invoices: Invoice[], fileName: string = 'Sales_Register.xlsx') {
  const data = invoices.map((inv, idx) => ({
    'S.No': idx + 1,
    'Invoice Number': inv.invoiceNumber,
    'Date': inv.date,
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

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');
  XLSX.writeFile(wb, fileName);
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
