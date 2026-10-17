import { jsPDF } from 'jspdf';
import { Invoice, Business, Quotation } from '../types';

// Format currency as clean standard text without corrupting Unicode glyphs in standard PDF fonts
function formatPdfCurrency(amount: number): string {
  const rounded = Number(amount || 0).toFixed(2);
  const parts = rounded.split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian currency numbering formatting: last 3 digits, then groups of 2
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `Rs. ${formattedInt}.${decimalPart}`;
}

export function renderInvoicePage(
  doc: jsPDF,
  invoice: Invoice,
  business: Business,
  copyType: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' = 'ORIGINAL',
  pageIndicator?: { current: number; total: number }
): void {

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm
  const rightMargin = pageWidth - margin;

  // Outer border function
  const drawPageBorder = () => {
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);
  };

  drawPageBorder();
  let y = margin;

  // 1. Top Title & Copy Type Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 8.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');

  const titleText =
    invoice.invoiceType === 'TAX_INVOICE'
      ? 'TAX INVOICE'
      : invoice.invoiceType === 'BILL_OF_SUPPLY'
      ? 'BILL OF SUPPLY'
      : 'EXPORT INVOICE';

  doc.text(titleText, pageWidth / 2, y + 5.8, { align: 'center' });

  // Copy Badge (Original for Recipient / Duplicate for Transporter / Triplicate for Supplier)
  const copyLabel =
    copyType === 'ORIGINAL'
      ? 'ORIGINAL FOR RECIPIENT'
      : copyType === 'DUPLICATE'
      ? 'DUPLICATE FOR TRANSPORTER'
      : 'TRIPLICATE FOR SUPPLIER';
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(copyLabel, rightMargin - 2, y + 5.8, { align: 'right' });

  // Subtitle under dark bar
  y += 8.5;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, contentWidth, 4.5, 'F');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.text(
    '(Issued under Section 31 of Central Goods and Services Tax Act, 2017 & Rule 46 of CGST Rules, 2017)',
    pageWidth / 2,
    y + 3.2,
    { align: 'center' }
  );

  y += 6.5;

  // 2. Business Entity & Invoice Details Grid
  const headerStartY = y;
  const leftColX = margin + 3;
  let textStartX = leftColX;

  // Logo rendering if available
  const logoWidth = 32;
  const logoHeight = 16;
  if (business.logoUrl) {
    try {
      doc.addImage(business.logoUrl, 'PNG', leftColX, y, logoWidth, logoHeight);
      textStartX = leftColX + logoWidth + 4;
    } catch {
      try {
        doc.addImage(business.logoUrl, 'JPEG', leftColX, y, logoWidth, logoHeight);
        textStartX = leftColX + logoWidth + 4;
      } catch (err) {
        console.warn('Could not render logo in PDF:', err);
        textStartX = leftColX;
      }
    }
  }

  // Seller Details
  let sellerY = y + 1;
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const bizName = business.name || 'Business Name';
  const splitBizName = doc.splitTextToSize(bizName, 68);
  doc.text(splitBizName, textStartX, sellerY + 3);
  sellerY += splitBizName.length * 4.2;

  if (business.tradeName && business.tradeName !== business.name) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    doc.text(`Trade Name: ${business.tradeName}`, textStartX, sellerY + 2.5);
    sellerY += 3.8;
  }

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  if (business.address) {
    const addressLines = doc.splitTextToSize(business.address, 72);
    doc.text(addressLines, textStartX, sellerY + 2.5);
    sellerY += addressLines.length * 3.4;
  }

  doc.text(
    `State: ${business.state || 'N/A'} (State Code: ${business.stateCode || 'N/A'})${
      business.pincode ? ` - ${business.pincode}` : ''
    }`,
    textStartX,
    sellerY + 2.5
  );
  sellerY += 3.6;

  // GSTIN & PAN (Prominent)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`GSTIN / UIN: ${business.gstin || 'UNREGISTERED'}`, textStartX, sellerY + 2.5);
  sellerY += 3.6;

  if (business.pan) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`PAN: ${business.pan}`, textStartX, sellerY + 2.5);
    sellerY += 3.4;
  }

  if (business.phone || business.email) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const contactStr = [business.phone && `Tel: ${business.phone}`, business.email && `Email: ${business.email}`]
      .filter(Boolean)
      .join(' | ');
    const splitContact = doc.splitTextToSize(contactStr, 72);
    doc.text(splitContact, textStartX, sellerY + 2.5);
    sellerY += splitContact.length * 3.4;
  }

  // Right Side: Invoice Meta Box
  const metaBoxWidth = 82;
  const metaBoxX = rightMargin - metaBoxWidth;
  const metaBoxY = headerStartY;
  const metaHeight = Math.max(38, sellerY - headerStartY + 2);

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.rect(metaBoxX, metaBoxY, metaBoxWidth, metaHeight, 'FD');

  // Meta box header line
  doc.setFillColor(241, 245, 249);
  doc.rect(metaBoxX, metaBoxY, metaBoxWidth, 5.5, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('INVOICE IDENTIFICATION', metaBoxX + 3, metaBoxY + 3.8);

  let metaLineY = metaBoxY + 9;
  const drawMetaRow = (label: string, val: string, isStrong = false) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, metaBoxX + 3, metaLineY);

    doc.setFont('helvetica', isStrong ? 'bold' : 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(val, metaBoxX + metaBoxWidth - 3, metaLineY, { align: 'right' });
    metaLineY += 4.5;
  };

  drawMetaRow('Invoice No:', invoice.invoiceNumber, true);
  drawMetaRow('Invoice Date:', invoice.date);
  drawMetaRow('Payment Due:', invoice.dueDate || invoice.date);
  drawMetaRow('Place of Supply:', `${invoice.placeOfSupply} (${invoice.placeOfSupplyCode})`);
  drawMetaRow('Reverse Charge:', invoice.reverseCharge ? 'YES' : 'NO');
  drawMetaRow(
    'Supply Type:',
    invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)',
    true
  );

  y = Math.max(sellerY + 4, metaBoxY + metaHeight + 3);

  // 3. Buyer & Consignee Details Box (Clean 2-Column Split)
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, rightMargin, y);
  y += 2;

  const partyBoxWidth = (contentWidth - 2) / 2;
  const partyBoxHeight = 24;

  // Left Box: Billed To (Buyer)
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, partyBoxWidth, partyBoxHeight, 'FD');
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, partyBoxWidth, 5, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('BILLED TO (BUYER / RECIPIENT)', margin + 3, y + 3.6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customerName || 'Customer', margin + 3, y + 9);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const buyerAddrLines = doc.splitTextToSize(invoice.customerAddress || 'Address not specified', partyBoxWidth - 6);
  doc.text(buyerAddrLines, margin + 3, y + 12.5);

  const buyerGstY = y + 19.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`GSTIN / UIN: ${invoice.customerGstin || 'URP (Unregistered)'}`, margin + 3, buyerGstY);
  if (invoice.customerPhone) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Phone: ${invoice.customerPhone}`, margin + partyBoxWidth - 3, buyerGstY, { align: 'right' });
  }

  // Right Box: Shipped To / Place of Delivery
  const rightPartyX = margin + partyBoxWidth + 2;
  doc.setFillColor(248, 250, 252);
  doc.rect(rightPartyX, y, partyBoxWidth, partyBoxHeight, 'FD');
  doc.setFillColor(241, 245, 249);
  doc.rect(rightPartyX, y, partyBoxWidth, 5, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('SHIPPED TO (CONSIGNEE / DESTINATION)', rightPartyX + 3, y + 3.6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customerName || 'Customer', rightPartyX + 3, y + 9);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const shipAddrLines = doc.splitTextToSize(
    invoice.customerAddress || `Delivery State: ${invoice.placeOfSupply} (${invoice.placeOfSupplyCode})`,
    partyBoxWidth - 6
  );
  doc.text(shipAddrLines, rightPartyX + 3, y + 12.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Place of Supply: ${invoice.placeOfSupply} (Code ${invoice.placeOfSupplyCode})`, rightPartyX + 3, buyerGstY);

  y += partyBoxHeight + 3;

  // 4. Line Items Table
  // Column layout definitions (total = 190mm)
  const cols = {
    sno: { x: margin, w: 8, label: '#' },
    item: { x: margin + 8, w: 58, label: 'Item Description' },
    hsn: { x: margin + 66, w: 18, label: 'HSN/SAC' },
    qty: { x: margin + 84, w: 14, label: 'Qty' },
    unit: { x: margin + 98, w: 12, label: 'Unit' },
    rate: { x: margin + 110, w: 18, label: 'Rate (Rs)' },
    disc: { x: margin + 128, w: 13, label: 'Disc' },
    taxable: { x: margin + 141, w: 22, label: 'Taxable (Rs)' },
    tax: { x: margin + 163, w: 11, label: 'GST' },
    total: { x: margin + 174, w: 16, label: 'Total (Rs)' },
  };

  const drawTableHeader = (atY: number) => {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, atY, contentWidth, 6.5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    doc.text(cols.sno.label, cols.sno.x + 2, atY + 4.5);
    doc.text(cols.item.label, cols.item.x + 1, atY + 4.5);
    doc.text(cols.hsn.label, cols.hsn.x + 1, atY + 4.5);
    doc.text(cols.qty.label, cols.qty.x + cols.qty.w - 1, atY + 4.5, { align: 'right' });
    doc.text(cols.unit.label, cols.unit.x + cols.unit.w / 2, atY + 4.5, { align: 'center' });
    doc.text(cols.rate.label, cols.rate.x + cols.rate.w - 1, atY + 4.5, { align: 'right' });
    doc.text(cols.disc.label, cols.disc.x + cols.disc.w - 1, atY + 4.5, { align: 'right' });
    doc.text(cols.taxable.label, cols.taxable.x + cols.taxable.w - 1, atY + 4.5, { align: 'right' });
    doc.text(cols.tax.label, cols.tax.x + cols.tax.w / 2, atY + 4.5, { align: 'center' });
    doc.text(cols.total.label, cols.total.x + cols.total.w - 1, atY + 4.5, { align: 'right' });
  };

  drawTableHeader(y);
  y += 6.5;

  // Render Table Rows with proper multi-line text wrapping
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');

  invoice.items.forEach((item, idx) => {
    const itemLines = doc.splitTextToSize(item.name || 'Item', cols.item.w - 2);
    const rowHeight = Math.max(6, itemLines.length * 3.5 + 2.2);

    // Page overflow safety
    if (y + rowHeight > pageHeight - 65) {
      doc.addPage();
      drawPageBorder();
      y = margin + 5;
      drawTableHeader(y);
      y += 6.5;
    }

    // Zebra striping
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, contentWidth, rowHeight, 'F');

    // Horizontal border line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowHeight, rightMargin, y + rowHeight);

    // Text cells
    doc.setTextColor(71, 85, 105);
    doc.text(String(idx + 1), cols.sno.x + 2, y + 4);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(itemLines, cols.item.x + 1, y + 4);
    doc.setFont('helvetica', 'normal');

    doc.setTextColor(71, 85, 105);
    doc.text(item.hsnSac || '-', cols.hsn.x + 1, y + 4);
    doc.text(String(item.quantity), cols.qty.x + cols.qty.w - 1, y + 4, { align: 'right' });
    doc.text(item.unit || 'NOS', cols.unit.x + cols.unit.w / 2, y + 4, { align: 'center' });
    doc.text(item.unitPrice.toFixed(2), cols.rate.x + cols.rate.w - 1, y + 4, { align: 'right' });

    const discStr = item.discount > 0 ? (item.discountType === 'PERCENT' ? `${item.discount}%` : `Rs.${item.discount}`) : '-';
    doc.text(discStr, cols.disc.x + cols.disc.w - 1, y + 4, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.taxableAmount.toFixed(2), cols.taxable.x + cols.taxable.w - 1, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    doc.setTextColor(71, 85, 105);
    doc.text(`${item.gstRate}%`, cols.tax.x + cols.tax.w / 2, y + 4, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.totalAmount.toFixed(2), cols.total.x + cols.total.w - 1, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += rowHeight;
  });

  // Table Subtotal Row
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 5.5, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Total Quantities & Subtotal', cols.item.x + 1, y + 3.8);

  const totalQty = invoice.items.reduce((s, it) => s + (it.quantity || 0), 0);
  doc.text(String(totalQty), cols.qty.x + cols.qty.w - 1, y + 3.8, { align: 'right' });
  doc.text(invoice.totalTaxable.toFixed(2), cols.taxable.x + cols.taxable.w - 1, y + 3.8, { align: 'right' });
  doc.text(invoice.grandTotal.toFixed(2), cols.total.x + cols.total.w - 1, y + 3.8, { align: 'right' });

  y += 7.5;

  // 5. Statutory GST Tax Breakdown Summary (HSN/SAC Distribution Table)
  // Check page overflow
  if (y > pageHeight - 75) {
    doc.addPage();
    drawPageBorder();
    y = margin + 5;
  }

  // Aggregate by HSN and GST Rate
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

  // Render HSN Tax Summary Mini Table
  const hsnTableWidth = contentWidth;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, hsnTableWidth, 5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  if (invoice.isInterState) {
    doc.text('HSN/SAC', margin + 3, y + 3.5);
    doc.text('Taxable Value (Rs.)', margin + 40, y + 3.5, { align: 'right' });
    doc.text('IGST Rate', margin + 70, y + 3.5, { align: 'right' });
    doc.text('IGST Amount (Rs.)', margin + 110, y + 3.5, { align: 'right' });
    doc.text('Total Tax Amount (Rs.)', rightMargin - 3, y + 3.5, { align: 'right' });
  } else {
    doc.text('HSN/SAC', margin + 3, y + 3.5);
    doc.text('Taxable Value (Rs.)', margin + 38, y + 3.5, { align: 'right' });
    doc.text('CGST Rate', margin + 65, y + 3.5, { align: 'right' });
    doc.text('CGST Amt (Rs.)', margin + 95, y + 3.5, { align: 'right' });
    doc.text('SGST Rate', margin + 125, y + 3.5, { align: 'right' });
    doc.text('SGST Amt (Rs.)', margin + 155, y + 3.5, { align: 'right' });
    doc.text('Total Tax (Rs.)', rightMargin - 3, y + 3.5, { align: 'right' });
  }

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  hsnList.forEach((grp) => {
    doc.setTextColor(51, 65, 85);
    if (invoice.isInterState) {
      doc.text(grp.hsn, margin + 3, y + 3.2);
      doc.text(grp.taxable.toFixed(2), margin + 40, y + 3.2, { align: 'right' });
      doc.text(`${grp.rate}%`, margin + 70, y + 3.2, { align: 'right' });
      doc.text(grp.taxAmt.toFixed(2), margin + 110, y + 3.2, { align: 'right' });
      doc.text(grp.taxAmt.toFixed(2), rightMargin - 3, y + 3.2, { align: 'right' });
    } else {
      const halfRate = (grp.rate / 2).toFixed(1) + '%';
      const halfTax = (grp.taxAmt / 2).toFixed(2);
      doc.text(grp.hsn, margin + 3, y + 3.2);
      doc.text(grp.taxable.toFixed(2), margin + 38, y + 3.2, { align: 'right' });
      doc.text(halfRate, margin + 65, y + 3.2, { align: 'right' });
      doc.text(halfTax, margin + 95, y + 3.2, { align: 'right' });
      doc.text(halfRate, margin + 125, y + 3.2, { align: 'right' });
      doc.text(halfTax, margin + 155, y + 3.2, { align: 'right' });
      doc.text(grp.taxAmt.toFixed(2), rightMargin - 3, y + 3.2, { align: 'right' });
    }
    y += 4.2;
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, rightMargin, y);
  y += 3;

  // 6. Bottom Grid: Left (Words, Bank, Terms) & Right (Totals Summary, Stamp & Signatory)
  if (y > pageHeight - 55) {
    doc.addPage();
    drawPageBorder();
    y = margin + 5;
  }

  const bottomColWidth = (contentWidth - 4) / 2;
  const leftBottomX = margin;
  const rightBottomX = margin + bottomColWidth + 4;
  const bottomStartY = y;

  // Left Side: Total Amount in Words Card
  doc.setFillColor(248, 250, 252);
  doc.rect(leftBottomX, y, bottomColWidth, 11, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL INVOICE AMOUNT IN WORDS:', leftBottomX + 2, y + 3.5);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(15, 23, 42);
  const wordsSplit = doc.splitTextToSize(`Indian Rupees ${invoice.amountInWords || 'Zero'} Only`, bottomColWidth - 4);
  doc.text(wordsSplit, leftBottomX + 2, y + 7.5);

  let leftY = y + 13;

  // Left Side: Bank Details Card
  doc.setFillColor(248, 250, 252);
  doc.rect(leftBottomX, leftY, bottomColWidth, 22, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('BANK DETAILS FOR NEFT / RTGS / IMPS / UPI', leftBottomX + 3, leftY + 3.8);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Bank Name: ${business.bankName || 'N/A'}`, leftBottomX + 3, leftY + 7.5);
  doc.text(`Account No: ${business.accountNumber || 'N/A'}`, leftBottomX + 3, leftY + 11.2);
  doc.text(`IFSC Code: ${business.ifsc || 'N/A'} | Branch: ${business.branch || 'N/A'}`, leftBottomX + 3, leftY + 14.8);
  if (business.upiId) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`UPI VPA: ${business.upiId}`, leftBottomX + 3, leftY + 18.5);
  }

  leftY += 24;

  // Left Side: Terms and Conditions
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TERMS & CONDITIONS:', leftBottomX, leftY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const termsText =
    invoice.terms ||
    business.termsAndConditions ||
    '1. Goods once sold will not be taken back without authorization.\n2. Interest @ 18% p.a. will be levied on overdue payments.\n3. All disputes subject to local jurisdiction.';
  const termsLines = doc.splitTextToSize(termsText, bottomColWidth - 2);
  doc.text(termsLines, leftBottomX, leftY + 3.5);

  // Right Side: Totals Summary Box
  let rightY = bottomStartY;
  const summaryBoxWidth = bottomColWidth;

  const addSummaryRow = (label: string, value: string, isBold = false, isAccent = false) => {
    doc.setFillColor(isAccent ? 15 : 248, isAccent ? 23 : 250, isAccent ? 42 : 252);
    doc.rect(rightBottomX, rightY, summaryBoxWidth, 5.2, 'F');

    doc.setFontSize(isAccent ? 8.5 : 7.5);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(isAccent ? 255 : 71, isAccent ? 255 : 85, isAccent ? 255 : 105);
    doc.text(label, rightBottomX + 3, rightY + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isAccent ? 255 : 15, isAccent ? 255 : 23, isAccent ? 255 : 42);
    doc.text(value, rightBottomX + summaryBoxWidth - 3, rightY + 3.8, { align: 'right' });
    rightY += 5.4;
  };

  addSummaryRow('Total Taxable Value:', formatPdfCurrency(invoice.totalTaxable));
  if (!invoice.isInterState) {
    addSummaryRow('Central GST (CGST):', formatPdfCurrency(invoice.cgstTotal));
    addSummaryRow('State GST (SGST):', formatPdfCurrency(invoice.sgstTotal));
  } else {
    addSummaryRow('Integrated GST (IGST):', formatPdfCurrency(invoice.igstTotal));
  }
  if (invoice.cessTotal > 0) {
    addSummaryRow('Cess Total:', formatPdfCurrency(invoice.cessTotal));
  }
  if (invoice.roundOff !== 0) {
    addSummaryRow('Round Off:', `${invoice.roundOff > 0 ? '+' : ''}${invoice.roundOff.toFixed(2)}`);
  }

  // Invoice Grand Total Highlight
  addSummaryRow('INVOICE GRAND TOTAL:', formatPdfCurrency(invoice.grandTotal), true, true);

  if (invoice.paidAmount > 0) {
    addSummaryRow('Amount Received / Paid:', formatPdfCurrency(invoice.paidAmount));
    addSummaryRow('Net Balance Due:', formatPdfCurrency(invoice.balanceDue), true);
  }

  rightY += 3;

  // Right Side: Official Rubber Stamp and Authorized Signature Box
  const signBoxHeight = 28;
  const signBoxY = rightY;
  doc.setDrawColor(226, 232, 240);
  doc.rect(rightBottomX, signBoxY, summaryBoxWidth, signBoxHeight, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${business.name || 'Company'}`, rightBottomX + summaryBoxWidth / 2, signBoxY + 4, {
    align: 'center',
  });

  // Embed Company Official Stamp if uploaded
  const stampWidth = 20;
  const stampHeight = 16;
  const stampX = rightBottomX + 4;
  const stampY = signBoxY + 5.5;

  if (business.stampUrl) {
    try {
      doc.addImage(business.stampUrl, 'PNG', stampX, stampY, stampWidth, stampHeight);
    } catch {
      try {
        doc.addImage(business.stampUrl, 'JPEG', stampX, stampY, stampWidth, stampHeight);
      } catch (e) {
        console.warn('Could not render stamp in PDF:', e);
      }
    }
  }

  // Embed Authorized Signature if uploaded
  const signWidth = 26;
  const signHeight = 12;
  const signX = rightBottomX + summaryBoxWidth - signWidth - 5;
  const signY = signBoxY + 7;

  if (business.signatureUrl) {
    try {
      doc.addImage(business.signatureUrl, 'PNG', signX, signY, signWidth, signHeight);
    } catch {
      try {
        doc.addImage(business.signatureUrl, 'JPEG', signX, signY, signWidth, signHeight);
      } catch (e) {
        console.warn('Could not render signature in PDF:', e);
      }
    }
  }

  // Signatory Line & Title
  doc.setDrawColor(148, 163, 184);
  doc.line(
    rightBottomX + summaryBoxWidth / 2 - 25,
    signBoxY + 21,
    rightBottomX + summaryBoxWidth / 2 + 25,
    signBoxY + 21
  );

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const signatoryTitle = business.signatureName || 'Authorized Signatory';
  doc.text(signatoryTitle, rightBottomX + summaryBoxWidth / 2, signBoxY + 25, { align: 'center' });

  // 7. Page Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is a computer-generated tax invoice issued in accordance with Indian GST Rules.',
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );

  if (pageIndicator && pageIndicator.total > 1) {
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Doc ${pageIndicator.current} of ${pageIndicator.total} | ${invoice.invoiceNumber}`,
      rightMargin,
      pageHeight - 6,
      { align: 'right' }
    );
  }
}

export function generateInvoicePDF(
  invoice: Invoice,
  business: Business,
  action: 'download' | 'print' | 'blob' = 'download',
  copyType: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' = 'ORIGINAL'
): jsPDF | Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  renderInvoicePage(doc, invoice, business, copyType);

  if (action === 'download') {
    doc.save(`${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
  } else if (action === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }

  return doc;
}

// Generate Consolidated Multi-Invoice PDF
export function generateConsolidatedInvoicesPDF(
  invoices: Invoice[],
  defaultBusiness: Business,
  businesses: Business[] = [],
  action: 'download' | 'print' = 'download',
  copyType: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' = 'ORIGINAL'
): jsPDF {
  if (invoices.length === 0) {
    throw new Error('No invoices provided for consolidated export.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  invoices.forEach((inv, index) => {
    if (index > 0) {
      doc.addPage('a4', 'portrait');
    }

    const matchedBusiness =
      businesses.find((b) => b.id === inv.businessId) || defaultBusiness;

    renderInvoicePage(doc, inv, matchedBusiness, copyType, {
      current: index + 1,
      total: invoices.length,
    });
  });

  if (action === 'download') {
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`Consolidated_Invoices_${invoices.length}_Records_${timestamp}.pdf`);
  } else if (action === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }

  return doc;
}

// Generate Quotation / Estimate PDF with High-Fidelity Branding & Layout
export function generateQuotationPDF(
  quotation: Quotation,
  business: Business,
  action: 'download' | 'print' = 'download'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const rightMargin = pageWidth - margin;

  const drawPageBorder = () => {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);
  };
  drawPageBorder();

  let y = margin;
  // Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, contentWidth, 8.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('FORMAL COMMERCIAL QUOTATION / COST ESTIMATE', pageWidth / 2, y + 5.8, { align: 'center' });

  y += 8.5;

  // Header: Company Logo & Info
  const headerHeight = 28;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, headerHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + headerHeight, rightMargin, y + headerHeight);

  let textStartX = margin + 4;
  if (business.logoUrl) {
    try {
      doc.addImage(business.logoUrl, 'PNG', margin + 3, y + 3, 25, 22);
      textStartX = margin + 31;
    } catch {
      try {
        doc.addImage(business.logoUrl, 'JPEG', margin + 3, y + 3, 25, 22);
        textStartX = margin + 31;
      } catch (e) {
        console.warn('Could not load logo in quote PDF:', e);
      }
    }
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(business.name, textStartX, y + 6);

  if (business.tradeName && business.tradeName !== business.name) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`(${business.tradeName})`, textStartX, y + 10);
  }

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const idLine = business.pan
    ? `GSTIN: ${business.gstin || 'Unregistered'} | PAN: ${business.pan}`
    : `GSTIN: ${business.gstin || 'Unregistered'}`;
  doc.text(idLine, textStartX, y + 15);
  doc.text(
    `State: ${business.state || 'N/A'} (Code: ${business.stateCode || '27'}) | Phone: ${business.phone || 'N/A'}`,
    textStartX,
    y + 19
  );
  if (business.address) {
    const addr = doc.splitTextToSize(business.address, 95);
    doc.text(addr, textStartX, y + 23);
  }

  // Quote Meta on right
  const metaBoxX = rightMargin - 65;
  doc.setFillColor(248, 250, 252);
  doc.rect(metaBoxX, y + 2, 63, 24, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Quote Number:', metaBoxX + 2, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.quoteNumber, metaBoxX + 32, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Date of Quote:', metaBoxX + 2, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.date, metaBoxX + 32, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Valid Until:', metaBoxX + 2, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.validUntil, metaBoxX + 32, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.text('Place of Supply:', metaBoxX + 2, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.placeOfSupply || business.state, metaBoxX + 32, y + 22);

  y += headerHeight;

  // Buyer Info Bar
  const buyerBarHeight = 18;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, buyerBarHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + buyerBarHeight, rightMargin, y + buyerBarHeight);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('QUOTATION PREPARED FOR (PROSPECT / CLIENT):', margin + 4, y + 5);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(quotation.customerName, margin + 4, y + 11);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Destination State / Delivery Territory: ${quotation.placeOfSupply || 'Same as Supplier'}`, margin + 4, y + 15.5);

  y += buyerBarHeight;

  // Items Table Header
  const tableHeaderY = y;
  const colX = {
    sr: margin + 2,
    desc: margin + 11,
    hsn: margin + 68,
    qty: margin + 92,
    unit: margin + 107,
    rate: margin + 125,
    taxable: margin + 152,
    gst: margin + 168,
    total: rightMargin - 2,
  };

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, tableHeaderY, contentWidth, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, tableHeaderY + 7, rightMargin, tableHeaderY + 7);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  doc.text('#', colX.sr, tableHeaderY + 4.8);
  doc.text('Item & Description', colX.desc, tableHeaderY + 4.8);
  doc.text('HSN/SAC', colX.hsn, tableHeaderY + 4.8);
  doc.text('Qty', colX.qty, tableHeaderY + 4.8, { align: 'right' });
  doc.text('Unit', colX.unit, tableHeaderY + 4.8);
  doc.text('Rate (Rs)', colX.rate, tableHeaderY + 4.8, { align: 'right' });
  doc.text('Taxable', colX.taxable, tableHeaderY + 4.8, { align: 'right' });
  doc.text('GST %', colX.gst, tableHeaderY + 4.8, { align: 'right' });
  doc.text('Total (Rs)', colX.total, tableHeaderY + 4.8, { align: 'right' });

  y = tableHeaderY + 7;

  quotation.items.forEach((it, idx) => {
    const isEven = idx % 2 === 0;
    const rowHeight = 7.5;
    if (isEven) {
      doc.setFillColor(252, 253, 254);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowHeight, rightMargin, y + rowHeight);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    doc.text(String(idx + 1), colX.sr, y + 5);
    const splitName = doc.splitTextToSize(it.name, 54);
    doc.text(splitName[0] || '', colX.desc, y + 5);
    doc.text(it.hsnSac || '-', colX.hsn, y + 5);
    doc.text(String(it.quantity), colX.qty, y + 5, { align: 'right' });
    doc.text(it.unit || 'NOS', colX.unit, y + 5);
    doc.text(it.unitPrice.toFixed(2), colX.rate, y + 5, { align: 'right' });
    doc.text(it.taxableAmount.toFixed(2), colX.taxable, y + 5, { align: 'right' });
    doc.text(`${it.gstRate}%`, colX.gst, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(it.totalAmount.toFixed(2), colX.total, y + 5, { align: 'right' });

    y += rowHeight;
  });

  y += 4;

  // Bottom Section: Terms/Bank on Left, Totals/Stamp/Sign on Right
  const bottomStartY = y;
  const bottomColWidth = (contentWidth - 6) / 2;
  const leftBottomX = margin;
  const rightBottomX = margin + bottomColWidth + 6;

  // Left Side: Bank Details Card
  let leftY = bottomStartY;
  doc.setFillColor(248, 250, 252);
  doc.rect(leftBottomX, leftY, bottomColWidth, 24, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('BANK DETAILS FOR ADVANCE / CHEQUE PAYMENT', leftBottomX + 3, leftY + 4);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Bank Name: ${business.bankName || 'N/A'}`, leftBottomX + 3, leftY + 8);
  doc.text(`Account No: ${business.accountNumber || 'N/A'}`, leftBottomX + 3, leftY + 12);
  doc.text(`IFSC Code: ${business.ifsc || 'N/A'} | Branch: ${business.branch || 'N/A'}`, leftBottomX + 3, leftY + 16);
  if (business.upiId) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`UPI VPA: ${business.upiId}`, leftBottomX + 3, leftY + 20.5);
  }

  leftY += 27;

  // Left Side: Terms
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('QUOTATION TERMS & VALIDITY CONDITIONS:', leftBottomX, leftY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const quoteTerms =
    quotation.notes ||
    '1. Rates quoted are valid until the specified expiry date.\n2. Payment terms as agreed upon.\n3. Goods subject to availability at the time of order confirmation.';
  const termsLines = doc.splitTextToSize(quoteTerms, bottomColWidth - 2);
  doc.text(termsLines, leftBottomX, leftY + 4);

  // Right Side: Totals Summary
  let rightY = bottomStartY;
  const addQuoteSummaryRow = (label: string, value: string, isAccent = false) => {
    doc.setFillColor(isAccent ? 15 : 248, isAccent ? 23 : 250, isAccent ? 42 : 252);
    doc.rect(rightBottomX, rightY, bottomColWidth, 5.5, 'F');
    doc.setFontSize(isAccent ? 8.5 : 7.5);
    doc.setFont('helvetica', isAccent ? 'bold' : 'normal');
    doc.setTextColor(isAccent ? 255 : 71, isAccent ? 255 : 85, isAccent ? 255 : 105);
    doc.text(label, rightBottomX + 3, rightY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isAccent ? 255 : 15, isAccent ? 255 : 23, isAccent ? 255 : 42);
    doc.text(value, rightBottomX + bottomColWidth - 3, rightY + 4, { align: 'right' });
    rightY += 5.8;
  };

  addQuoteSummaryRow('Total Taxable Value:', formatPdfCurrency(quotation.totalTaxable));
  addQuoteSummaryRow('Central Tax (CGST):', formatPdfCurrency(quotation.cgstTotal));
  addQuoteSummaryRow('State Tax (SGST):', formatPdfCurrency(quotation.sgstTotal));
  if (quotation.igstTotal > 0) {
    addQuoteSummaryRow('Integrated Tax (IGST):', formatPdfCurrency(quotation.igstTotal));
  }
  addQuoteSummaryRow('ESTIMATE GRAND TOTAL:', formatPdfCurrency(quotation.grandTotal), true);

  rightY += 3;

  // Right Side: Official Stamp and Signature Box
  const signBoxHeight = 28;
  const signBoxY = rightY;
  doc.setDrawColor(226, 232, 240);
  doc.rect(rightBottomX, signBoxY, bottomColWidth, signBoxHeight, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${business.name || 'Company'}`, rightBottomX + bottomColWidth / 2, signBoxY + 4, {
    align: 'center',
  });

  // Stamp
  const stampWidth = 20;
  const stampHeight = 16;
  const stampX = rightBottomX + 4;
  const stampY = signBoxY + 5.5;
  if (business.stampUrl) {
    try {
      doc.addImage(business.stampUrl, 'PNG', stampX, stampY, stampWidth, stampHeight);
    } catch {
      try {
        doc.addImage(business.stampUrl, 'JPEG', stampX, stampY, stampWidth, stampHeight);
      } catch (e) {
        console.warn('Could not render stamp in quote PDF:', e);
      }
    }
  }

  // Signature
  const signWidth = 26;
  const signHeight = 12;
  const signX = rightBottomX + bottomColWidth - signWidth - 5;
  const signY = signBoxY + 7;
  if (business.signatureUrl) {
    try {
      doc.addImage(business.signatureUrl, 'PNG', signX, signY, signWidth, signHeight);
    } catch {
      try {
        doc.addImage(business.signatureUrl, 'JPEG', signX, signY, signWidth, signHeight);
      } catch (e) {
        console.warn('Could not render signature in quote PDF:', e);
      }
    }
  }

  // Signatory Line & Title
  doc.setDrawColor(148, 163, 184);
  doc.line(
    rightBottomX + bottomColWidth / 2 - 25,
    signBoxY + 21,
    rightBottomX + bottomColWidth / 2 + 25,
    signBoxY + 21
  );

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const signatoryTitle = business.signatureName || 'Authorized Signatory';
  doc.text(signatoryTitle, rightBottomX + bottomColWidth / 2, signBoxY + 25, { align: 'center' });

  // Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is a commercial quotation and cost estimate generated by InvoicePro GST.',
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );

  if (action === 'download') {
    doc.save(`${quotation.quoteNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
  } else if (action === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }

  return doc;
}
