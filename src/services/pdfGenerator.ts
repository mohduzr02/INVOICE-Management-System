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

/**
 * Robust text wrapping that guarantees zero text overflow or cell overlap.
 * If any word, code, address, or unbroken token has no spaces or exceeds maxWidth,
 * it breaks the token character-by-character into chunks that fit strictly within maxWidth.
 */
export function breakAndWrapText(
  doc: jsPDF,
  text: string | number | undefined | null,
  maxWidth: number
): string[] {
  if (text === undefined || text === null) return [];
  const str = String(text).trim();
  if (!str) return [];
  if (maxWidth <= 2) return [str];

  // Split on manual newlines first
  const rawParagraphs = str.split(/\r?\n/);
  const resultLines: string[] = [];

  for (const para of rawParagraphs) {
    if (!para.trim()) {
      resultLines.push('');
      continue;
    }

    // Split paragraph by whitespace tokens
    const words = para.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if (!word) continue;

      // If the word itself exceeds maxWidth (e.g. unspaced text, long serial no, URL, hyphenated SKU),
      // we break it down character by character
      if (doc.getTextWidth(word) > maxWidth) {
        if (currentLine) {
          resultLines.push(currentLine);
          currentLine = '';
        }

        let chunk = '';
        for (let i = 0; i < word.length; i++) {
          const char = word[i];
          const testChunk = chunk + char;
          if (doc.getTextWidth(testChunk) <= maxWidth) {
            chunk = testChunk;
          } else {
            if (chunk) {
              resultLines.push(chunk);
            }
            chunk = char;
          }
        }
        if (chunk) {
          currentLine = chunk;
        }
        continue;
      }

      // Check if word fits on the current line
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (doc.getTextWidth(testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          resultLines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines.length > 0 ? resultLines : [''];
}

/**
 * Render right-aligned text with dynamic font size reduction if width exceeds maxWidth.
 */
export function renderFittedTextRight(
  doc: jsPDF,
  text: string,
  rightX: number,
  y: number,
  maxWidth: number,
  baseFontSize: number = 7,
  minFontSize: number = 4.8
): void {
  let fontSize = baseFontSize;
  doc.setFontSize(fontSize);
  while (doc.getTextWidth(text) > maxWidth && fontSize > minFontSize) {
    fontSize -= 0.3;
    doc.setFontSize(fontSize);
  }
  doc.text(text, rightX, y, { align: 'right' });
  doc.setFontSize(baseFontSize);
}

/**
 * Render centered text with dynamic font size reduction if width exceeds maxWidth.
 */
export function renderFittedTextCenter(
  doc: jsPDF,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  baseFontSize: number = 7,
  minFontSize: number = 4.8
): void {
  let fontSize = baseFontSize;
  doc.setFontSize(fontSize);
  while (doc.getTextWidth(text) > maxWidth && fontSize > minFontSize) {
    fontSize -= 0.3;
    doc.setFontSize(fontSize);
  }
  doc.text(text, centerX, y, { align: 'center' });
  doc.setFontSize(baseFontSize);
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
  const rightMargin = pageWidth - margin; // 200mm

  // Professional soothing palette
  const COLOR_HEADER = [30, 41, 59]; // slate-800: calm, authoritative
  const COLOR_SUB_HEADER = [248, 250, 252]; // slate-50: soft light surface
  const COLOR_BOX_HEADER = [241, 245, 249]; // slate-100: crisp structure
  const COLOR_BORDER = [226, 232, 240]; // slate-200: subtle hairline
  const COLOR_PAGE_BORDER = [203, 213, 225]; // slate-300: clean outer boundary
  const COLOR_TEXT_PRIMARY = [15, 23, 42]; // slate-900: sharp legible text
  const COLOR_TEXT_SECONDARY = [71, 85, 105]; // slate-600: clean secondary
  const COLOR_TEXT_MUTED = [100, 116, 139]; // slate-500: quiet metadata

  // Page Outer Border
  const drawPageBorder = () => {
    doc.setDrawColor(COLOR_PAGE_BORDER[0], COLOR_PAGE_BORDER[1], COLOR_PAGE_BORDER[2]);
    doc.setLineWidth(0.35);
    doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);
  };

  drawPageBorder();
  let y = margin;

  // 1. Top Title & Statutory Copy Banner
  doc.setFillColor(COLOR_HEADER[0], COLOR_HEADER[1], COLOR_HEADER[2]);
  doc.rect(margin, y, contentWidth, 8.8, 'F');

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

  // Copy Type Pill (Right-aligned)
  const copyLabel =
    copyType === 'ORIGINAL'
      ? 'ORIGINAL FOR RECIPIENT'
      : copyType === 'DUPLICATE'
      ? 'DUPLICATE FOR TRANSPORTER'
      : 'TRIPLICATE FOR SUPPLIER';
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(copyLabel, rightMargin - 3, y + 5.8, { align: 'right' });

  // Subtitle Bar (Issued under CGST Act Section 31)
  y += 8.8;
  doc.setFillColor(COLOR_SUB_HEADER[0], COLOR_SUB_HEADER[1], COLOR_SUB_HEADER[2]);
  doc.rect(margin, y, contentWidth, 4.5, 'F');
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 4.5, rightMargin, y + 4.5);

  doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.text(
    '(Issued under Section 31 of Central Goods and Services Tax Act, 2017 & Rule 46 of CGST Rules, 2017)',
    pageWidth / 2,
    y + 3.2,
    { align: 'center' }
  );

  y += 6.5;

  // 2. Business Entity (Left) & Invoice Identification (Right)
  const headerStartY = y;
  const leftColX = margin + 3;
  let textStartX = leftColX;

  // Render Business Logo if uploaded
  const logoWidth = 28;
  const logoHeight = 15;
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

  // Right Side: Pre-calculate Invoice Meta Box Height with Text Wrapping
  const metaBoxWidth = 80;
  const metaBoxX = rightMargin - metaBoxWidth;
  const metaBoxY = headerStartY;

  const metaRows: Array<{ label: string; val: string; isStrong?: boolean }> = [
    { label: 'Invoice No:', val: invoice.invoiceNumber || 'INV/26-27/1', isStrong: true },
    { label: 'Invoice Date:', val: invoice.date || '2026-10-29' },
    {
      label: 'Place of Supply:',
      val: `${invoice.placeOfSupply || 'Maharashtra'} (${invoice.placeOfSupplyCode || '27'})`,
    },
    {
      label: 'Supply Type:',
      val: invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)',
      isStrong: true,
    },
    { label: 'Contract No:', val: invoice.contractNo || 'N/A' },
    { label: 'Contract Date:', val: invoice.contractDate || 'N/A' },
    { label: 'Reverse Charge:', val: invoice.reverseCharge ? 'YES' : 'NO' },
  ];

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let precomputedMetaHeight = 6.5; // header
  metaRows.forEach((row) => {
    const labelW = doc.getTextWidth(row.label);
    const maxValW = metaBoxWidth - labelW - 8;
    const vLines = breakAndWrapText(doc, row.val, maxValW);
    precomputedMetaHeight += vLines.length > 1 ? vLines.length * 3.3 + 1.2 : 4.4;
  });
  precomputedMetaHeight += 2;

  // Seller Details (Left Side with Dynamic Sentence Breaking & Zero Overlap Wrapping)
  let sellerY = y + 1;
  const maxSellerWidth = metaBoxX - textStartX - 5;

  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const bizName = business.name || 'Business Name';
  const splitBizName = breakAndWrapText(doc, bizName, maxSellerWidth);
  doc.text(splitBizName, textStartX, sellerY + 3);
  sellerY += splitBizName.length * 4.0;

  if (business.tradeName && business.tradeName !== business.name) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
    const splitTrade = breakAndWrapText(doc, `Trade Name: ${business.tradeName}`, maxSellerWidth);
    doc.text(splitTrade, textStartX, sellerY + 2.5);
    sellerY += splitTrade.length * 3.4;
  }

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);

  if (business.address) {
    const addressLines = breakAndWrapText(doc, business.address, maxSellerWidth);
    doc.text(addressLines, textStartX, sellerY + 2.5);
    sellerY += addressLines.length * 3.3;
  }

  const stateStr = `State: ${business.state || 'N/A'} (State Code: ${business.stateCode || 'N/A'})${
    business.pincode ? ` - ${business.pincode}` : ''
  }`;
  const splitState = breakAndWrapText(doc, stateStr, maxSellerWidth);
  doc.text(splitState, textStartX, sellerY + 2.5);
  sellerY += splitState.length * 3.3;

  // GSTIN & PAN (Prominent)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  const splitGstin = breakAndWrapText(doc, `GSTIN / UIN: ${business.gstin || 'UNREGISTERED'}`, maxSellerWidth);
  doc.text(splitGstin, textStartX, sellerY + 2.5);
  sellerY += splitGstin.length * 3.4;

  if (business.pan) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
    const splitPan = breakAndWrapText(doc, `PAN: ${business.pan}`, maxSellerWidth);
    doc.text(splitPan, textStartX, sellerY + 2.5);
    sellerY += splitPan.length * 3.3;
  }

  if (business.phone || business.email) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
    const contactStr = [business.phone && `Tel: ${business.phone}`, business.email && `Email: ${business.email}`]
      .filter(Boolean)
      .join(' | ');
    const splitContact = breakAndWrapText(doc, contactStr, maxSellerWidth);
    doc.text(splitContact, textStartX, sellerY + 2.5);
    sellerY += splitContact.length * 3.3;
  }

  // Draw Invoice Meta Box on Right
  const metaHeight = Math.max(precomputedMetaHeight, sellerY - headerStartY + 2);
  doc.setFillColor(COLOR_SUB_HEADER[0], COLOR_SUB_HEADER[1], COLOR_SUB_HEADER[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.rect(metaBoxX, metaBoxY, metaBoxWidth, metaHeight, 'FD');

  // Meta box header line
  doc.setFillColor(COLOR_BOX_HEADER[0], COLOR_BOX_HEADER[1], COLOR_BOX_HEADER[2]);
  doc.rect(metaBoxX, metaBoxY, metaBoxWidth, 5.5, 'F');
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  doc.text('INVOICE DETAILS', metaBoxX + 3, metaBoxY + 3.8);

  let metaLineY = metaBoxY + 8.8;
  metaRows.forEach((row) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
    const labelW = doc.getTextWidth(row.label);
    doc.text(row.label, metaBoxX + 3, metaLineY);

    doc.setFont('helvetica', row.isStrong ? 'bold' : 'normal');
    doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
    const maxValW = metaBoxWidth - labelW - 8;
    const valLines = breakAndWrapText(doc, row.val, maxValW);

    if (valLines.length === 1) {
      doc.text(valLines[0], metaBoxX + metaBoxWidth - 3, metaLineY, { align: 'right' });
      metaLineY += 4.4;
    } else {
      valLines.forEach((vl: string, vi: number) => {
        doc.text(vl, metaBoxX + metaBoxWidth - 3, metaLineY + vi * 3.3, { align: 'right' });
      });
      metaLineY += valLines.length * 3.3 + 1.1;
    }
  });

  // Advance y past both seller info and meta box
  y = Math.max(sellerY + 3, metaBoxY + metaHeight + 3);

  // 3. Buyer & Consignee Details Boxes (Dynamic Height & Zero Overlap Guarantee)
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.2);
  doc.line(margin, y, rightMargin, y);
  y += 2.5;

  const partyBoxWidth = (contentWidth - 2) / 2; // 94mm each
  const partyInnerW = partyBoxWidth - 6;

  // Pre-calculate wrapped lines for Buyer Box using robust word/character wrapping
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  const buyerNameLines = breakAndWrapText(doc, invoice.customerName || 'Customer', partyInnerW);

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  const buyerAddressText = invoice.customerAddress || 'Address not specified';
  const buyerAddrLines = breakAndWrapText(doc, buyerAddressText, partyInnerW);
  const buyerStateLines = breakAndWrapText(
    doc,
    `State: ${invoice.placeOfSupply || 'N/A'} (Code: ${invoice.placeOfSupplyCode || 'N/A'})`,
    partyInnerW
  );
  const buyerGstinLines = breakAndWrapText(
    doc,
    `GSTIN / UIN: ${invoice.customerGstin || 'URP (Unregistered)'}`,
    partyInnerW
  );
  const buyerPhoneLines = invoice.customerPhone
    ? breakAndWrapText(doc, `Phone: ${invoice.customerPhone}`, partyInnerW)
    : [];

  // Pre-calculate wrapped lines for Shipped-To Box (handles Ship-To different from Bill-To)
  const rightPartyX = margin + partyBoxWidth + 2;
  const shipName = invoice.shippingName || invoice.customerName || 'Customer';
  const shipAddressText =
    invoice.shippingAddress ||
    invoice.customerAddress ||
    `Delivery Destination: ${invoice.placeOfSupply} (State Code ${invoice.placeOfSupplyCode})`;
  const shipStateText = invoice.shippingState
    ? `Destination: ${invoice.shippingState} (Code ${invoice.shippingStateCode || 'N/A'})`
    : `Place of Supply: ${invoice.placeOfSupply} (Code ${invoice.placeOfSupplyCode})`;
  const shipGstinText = invoice.shippingGstin
    ? `GSTIN / UIN: ${invoice.shippingGstin}`
    : (invoice.customerGstin ? `GSTIN: ${invoice.customerGstin}` : 'URP (Unregistered)');
  const shipPhoneText = invoice.shippingPhone
    ? `Phone: ${invoice.shippingPhone}`
    : (invoice.customerPhone ? `Phone: ${invoice.customerPhone}` : '');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  const shipNameLines = breakAndWrapText(doc, shipName, partyInnerW);

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  const shipAddrLines = breakAndWrapText(doc, shipAddressText, partyInnerW);
  const shipStateLines = breakAndWrapText(doc, shipStateText, partyInnerW);

  doc.setFont('helvetica', 'bold');
  const shipGstinLines = breakAndWrapText(doc, shipGstinText, partyInnerW);
  const shipPhoneLines = shipPhoneText ? breakAndWrapText(doc, shipPhoneText, partyInnerW) : [];

  // Dynamic box height: computed from actual wrapped lines
  const buyerContentH =
    5 +
    3 +
    buyerNameLines.length * 3.8 +
    buyerAddrLines.length * 3.3 +
    buyerStateLines.length * 3.3 +
    buyerGstinLines.length * 3.3 +
    (buyerPhoneLines.length > 0 ? buyerPhoneLines.length * 3.3 : 0) +
    3;

  const shipContentH =
    5 +
    3 +
    shipNameLines.length * 3.8 +
    shipAddrLines.length * 3.3 +
    shipStateLines.length * 3.3 +
    shipGstinLines.length * 3.3 +
    (shipPhoneLines.length > 0 ? shipPhoneLines.length * 3.3 : 0) +
    3;

  const partyBoxHeight = Math.max(30, buyerContentH, shipContentH);

  // Background and borders
  doc.setFillColor(COLOR_SUB_HEADER[0], COLOR_SUB_HEADER[1], COLOR_SUB_HEADER[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.rect(margin, y, partyBoxWidth, partyBoxHeight, 'FD');
  doc.rect(rightPartyX, y, partyBoxWidth, partyBoxHeight, 'FD');

  // Header strips
  doc.setFillColor(COLOR_BOX_HEADER[0], COLOR_BOX_HEADER[1], COLOR_BOX_HEADER[2]);
  doc.rect(margin, y, partyBoxWidth, 5, 'F');
  doc.rect(rightPartyX, y, partyBoxWidth, 5, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  doc.text('BILLED TO (BUYER / RECIPIENT)', margin + 3, y + 3.6);
  doc.text('SHIPPED TO (CONSIGNEE / DESTINATION)', rightPartyX + 3, y + 3.6);

  // Render Buyer Box contents sequentially
  let curBuyerY = y + 8.5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  doc.text(buyerNameLines, margin + 3, curBuyerY);
  curBuyerY += buyerNameLines.length * 3.8;

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
  doc.text(buyerAddrLines, margin + 3, curBuyerY);
  curBuyerY += buyerAddrLines.length * 3.3;

  doc.text(buyerStateLines, margin + 3, curBuyerY);
  curBuyerY += buyerStateLines.length * 3.3;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  doc.text(buyerGstinLines, margin + 3, curBuyerY);
  curBuyerY += buyerGstinLines.length * 3.3;

  if (buyerPhoneLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
    doc.text(buyerPhoneLines, margin + 3, curBuyerY);
  }

  // Render Shipped-To Box contents sequentially
  let curShipY = y + 8.5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  doc.text(shipNameLines, rightPartyX + 3, curShipY);
  curShipY += shipNameLines.length * 3.8;

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
  doc.text(shipAddrLines, rightPartyX + 3, curShipY);
  curShipY += shipAddrLines.length * 3.3;

  doc.text(shipStateLines, rightPartyX + 3, curShipY);
  curShipY += shipStateLines.length * 3.3;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  doc.text(shipGstinLines, rightPartyX + 3, curShipY);
  curShipY += shipGstinLines.length * 3.3;

  if (shipPhoneLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
    doc.text(shipPhoneLines, rightPartyX + 3, curShipY);
  }

  y += partyBoxHeight + 3.5;

  // 4. Line Items Table (Balanced column width allocation = 190mm)
  const cols = {
    sno: { x: margin, w: 10, label: 'SL No.' },
    item: { x: margin + 10, w: 54, label: 'Item Description' },
    hsn: { x: margin + 64, w: 18, label: 'HSN/SAC' },
    qty: { x: margin + 82, w: 12, label: 'Qty' },
    unit: { x: margin + 94, w: 11, label: 'Unit' },
    rate: { x: margin + 105, w: 18, label: 'Rate (Rs)' },
    disc: { x: margin + 123, w: 12, label: 'Disc' },
    taxable: { x: margin + 135, w: 22, label: 'Taxable (Rs)' },
    tax: { x: margin + 157, w: 13, label: 'GST %' },
    total: { x: margin + 170, w: 20, label: 'Total (Rs)' },
  };

  const drawTableHeader = (atY: number) => {
    doc.setFillColor(COLOR_HEADER[0], COLOR_HEADER[1], COLOR_HEADER[2]);
    doc.rect(margin, atY, contentWidth, 6.5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    doc.text(cols.sno.label, cols.sno.x + cols.sno.w / 2, atY + 4.5, { align: 'center' });
    doc.text(cols.item.label, cols.item.x + 1.5, atY + 4.5);
    doc.text(cols.hsn.label, cols.hsn.x + 1.5, atY + 4.5);
    doc.text(cols.qty.label, cols.qty.x + cols.qty.w - 1.5, atY + 4.5, { align: 'right' });
    doc.text(cols.unit.label, cols.unit.x + cols.unit.w / 2, atY + 4.5, { align: 'center' });
    doc.text(cols.rate.label, cols.rate.x + cols.rate.w - 1.5, atY + 4.5, { align: 'right' });
    doc.text(cols.disc.label, cols.disc.x + cols.disc.w - 1.5, atY + 4.5, { align: 'right' });
    doc.text(cols.taxable.label, cols.taxable.x + cols.taxable.w - 1.5, atY + 4.5, { align: 'right' });
    doc.text(cols.tax.label, cols.tax.x + cols.tax.w / 2, atY + 4.5, { align: 'center' });
    doc.text(cols.total.label, cols.total.x + cols.total.w - 1.5, atY + 4.5, { align: 'right' });
  };

  drawTableHeader(y);
  y += 6.5;

  // Render Table Rows with proper multi-line sentence breaking and padding
  invoice.items.forEach((item, idx) => {
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    const itemLines = breakAndWrapText(doc, item.name || 'Item', cols.item.w - 3);

    const descLines = (item as any).description
      ? breakAndWrapText(doc, String((item as any).description), cols.item.w - 3)
      : [];

    const hsnLines = breakAndWrapText(doc, item.hsnSac || '-', cols.hsn.w - 2);

    const nameH = itemLines.length * 3.4;
    const descH = descLines.length > 0 ? descLines.length * 2.8 : 0;
    const hsnH = hsnLines.length > 1 ? hsnLines.length * 3.0 : 0;
    const rowHeight = Math.max(7, nameH + descH + 2.5, hsnH + 2.5);

    // Page overflow safety
    if (y + rowHeight > pageHeight - margin - 20) {
      doc.addPage();
      drawPageBorder();
      y = margin + 5;
      drawTableHeader(y);
      y += 6.5;
    }

    // Soft zebra striping
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, contentWidth, rowHeight, 'F');

    // Horizontal hairline border
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowHeight, rightMargin, y + rowHeight);

    // S.No
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
    doc.text(String(idx + 1), cols.sno.x + cols.sno.w / 2, y + 4.2, { align: 'center' });

    // Item Name and optional description
    doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text(itemLines, cols.item.x + 1.5, y + 4.2);

    if (descLines.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.2);
      doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
      doc.text(descLines, cols.item.x + 1.5, y + 4.2 + nameH);
    }

    // Other Columns with strict bounds and fitted sizing
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);

    doc.text(hsnLines, cols.hsn.x + 1.5, y + 4.2);
    renderFittedTextRight(doc, String(item.quantity), cols.qty.x + cols.qty.w - 1.5, y + 4.2, cols.qty.w - 2.5);
    renderFittedTextCenter(doc, item.unit || 'NOS', cols.unit.x + cols.unit.w / 2, y + 4.2, cols.unit.w - 1);
    renderFittedTextRight(doc, item.unitPrice.toFixed(2), cols.rate.x + cols.rate.w - 1.5, y + 4.2, cols.rate.w - 2.5);

    const discStr =
      item.discount > 0
        ? item.discountType === 'PERCENT'
          ? `${item.discount}%`
          : `Rs.${item.discount}`
        : '-';
    renderFittedTextRight(doc, discStr, cols.disc.x + cols.disc.w - 1.5, y + 4.2, cols.disc.w - 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
    renderFittedTextRight(doc, item.taxableAmount.toFixed(2), cols.taxable.x + cols.taxable.w - 1.5, y + 4.2, cols.taxable.w - 2.5);
    doc.setFont('helvetica', 'normal');

    doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
    renderFittedTextCenter(doc, `${item.gstRate}%`, cols.tax.x + cols.tax.w / 2, y + 4.2, cols.tax.w - 1);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
    renderFittedTextRight(doc, item.totalAmount.toFixed(2), cols.total.x + cols.total.w - 1.5, y + 4.2, cols.total.w - 2.5);
    doc.setFont('helvetica', 'normal');

    y += rowHeight;
  });

  // Table Subtotal Row
  doc.setFillColor(COLOR_BOX_HEADER[0], COLOR_BOX_HEADER[1], COLOR_BOX_HEADER[2]);
  doc.rect(margin, y, contentWidth, 5.8, 'F');
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  doc.text('Subtotal & Quantities', cols.item.x + 1.5, y + 4);

  const totalQty = invoice.items.reduce((s, it) => s + (it.quantity || 0), 0);
  renderFittedTextRight(doc, String(totalQty), cols.qty.x + cols.qty.w - 1.5, y + 4, cols.qty.w - 2.5, 7.2);
  renderFittedTextRight(doc, invoice.totalTaxable.toFixed(2), cols.taxable.x + cols.taxable.w - 1.5, y + 4, cols.taxable.w - 2.5, 7.2);
  renderFittedTextRight(doc, invoice.grandTotal.toFixed(2), cols.total.x + cols.total.w - 1.5, y + 4, cols.total.w - 2.5, 7.2);

  y += 7.5;

  // 5. Statutory GST Tax Breakdown Summary (HSN/SAC Table)
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
  const hsnTableHeight = 5 + hsnList.length * 4.2 + 2;

  // Check page overflow for HSN section
  if (y + hsnTableHeight > pageHeight - margin - 20) {
    doc.addPage();
    drawPageBorder();
    y = margin + 5;
  }

  // Render HSN Tax Summary Mini Table
  doc.setFillColor(COLOR_BOX_HEADER[0], COLOR_BOX_HEADER[1], COLOR_BOX_HEADER[2]);
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);

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
    doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
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

  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.line(margin, y, rightMargin, y);
  y += 3.5;

  // 6. Bottom Grid: Precise Dynamic Height Calculations to Guarantee Zero Overlap
  const bottomColWidth = (contentWidth - 4) / 2; // 93mm each
  const leftBottomX = margin;
  const rightBottomX = margin + bottomColWidth + 4;
  const summaryBoxWidth = bottomColWidth;

  // Amount in Words Wrapped Calculation
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bolditalic');
  const wordsSplit = breakAndWrapText(
    doc,
    `Indian Rupees ${invoice.amountInWords || 'Zero'} Only`,
    bottomColWidth - 6
  );
  const wordsBoxHeight = Math.max(12, 4.5 + wordsSplit.length * 3.4 + 2.5);

  // Bank Details Wrapped Calculation
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const bankNameLine = `Bank Name: ${business.bankName || 'N/A'}`;
  const acctLine = `Account No: ${business.accountNumber || 'N/A'}`;
  const ifscLine = `IFSC Code: ${business.ifsc || 'N/A'} | Branch: ${business.branch || 'N/A'}`;
  const upiLine = business.upiId ? `UPI VPA: ${business.upiId}` : null;

  const splitBankName = breakAndWrapText(doc, bankNameLine, bottomColWidth - 6);
  const splitAcct = breakAndWrapText(doc, acctLine, bottomColWidth - 6);
  const splitIfsc = breakAndWrapText(doc, ifscLine, bottomColWidth - 6);
  const splitUpi = upiLine ? breakAndWrapText(doc, upiLine, bottomColWidth - 6) : [];

  const totalBankLines = splitBankName.length + splitAcct.length + splitIfsc.length + splitUpi.length;
  const bankBoxHeight = Math.max(22, 5 + totalBankLines * 3.4 + 2.5);

  // Terms Wrapped Calculation
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  const termsText =
    invoice.terms ||
    business.termsAndConditions ||
    '1. Goods once sold will not be taken back without authorization.\n2. Interest @ 18% p.a. will be levied on overdue payments.\n3. All disputes subject to local jurisdiction.';
  const termsLines = breakAndWrapText(doc, termsText, bottomColWidth - 4);
  const termsHeight = 3.5 + termsLines.length * 3.2;

  const actualLeftHeight = wordsBoxHeight + 2.5 + bankBoxHeight + 2.5 + termsHeight;

  // Totals Summary Box Rows
  let summaryRowsCount = 1; // taxable
  summaryRowsCount += invoice.isInterState ? 1 : 2; // CGST+SGST or IGST
  if (invoice.cessTotal > 0) summaryRowsCount++;
  if (invoice.manualAdjustment && invoice.manualAdjustment !== 0) summaryRowsCount++;
  if (invoice.roundOff !== 0) summaryRowsCount++;
  summaryRowsCount++; // Grand Total row
  if (invoice.paidAmount > 0) summaryRowsCount += 2; // Paid & Balance

  const totalsBoxHeight = summaryRowsCount * 5.4 + 2;
  const signBoxHeight = 30;
  const actualRightHeight = totalsBoxHeight + 3 + signBoxHeight;
  const requiredBottomHeight = Math.max(actualLeftHeight, actualRightHeight) + 8;

  // Check if bottom section fits on current page without overlapping footer/page border
  if (y + requiredBottomHeight > pageHeight - margin - 8) {
    doc.addPage();
    drawPageBorder();
    y = margin + 6;
  }

  const bottomStartY = y;

  // Left Side: Total Amount in Words Card
  doc.setFillColor(COLOR_SUB_HEADER[0], COLOR_SUB_HEADER[1], COLOR_SUB_HEADER[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.rect(leftBottomX, y, bottomColWidth, wordsBoxHeight, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
  doc.text('TOTAL INVOICE AMOUNT IN WORDS:', leftBottomX + 3, y + 3.8);

  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  doc.text(wordsSplit, leftBottomX + 3, y + 7.5);

  let leftY = y + wordsBoxHeight + 2.5;

  // Left Side: Bank Details Card
  doc.setFillColor(COLOR_SUB_HEADER[0], COLOR_SUB_HEADER[1], COLOR_SUB_HEADER[2]);
  doc.rect(leftBottomX, leftY, bottomColWidth, bankBoxHeight, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  doc.text('BANK DETAILS FOR NEFT / RTGS / IMPS / UPI', leftBottomX + 3, leftY + 3.8);

  let curBankY = leftY + 7.5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);

  doc.text(splitBankName, leftBottomX + 3, curBankY);
  curBankY += splitBankName.length * 3.4;

  doc.text(splitAcct, leftBottomX + 3, curBankY);
  curBankY += splitAcct.length * 3.4;

  doc.text(splitIfsc, leftBottomX + 3, curBankY);
  curBankY += splitIfsc.length * 3.4;

  if (splitUpi.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
    doc.text(splitUpi, leftBottomX + 3, curBankY);
    curBankY += splitUpi.length * 3.4;
  }

  leftY += bankBoxHeight + 2.5;

  // Left Side: Terms and Conditions
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
  doc.text('TERMS & CONDITIONS:', leftBottomX, leftY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
  doc.text(termsLines, leftBottomX, leftY + 3.5);

  // Right Side: Totals Summary Box (With Dynamic Collision-Free Sentence Breaking)
  let rightY = bottomStartY;

  const addSummaryRow = (label: string, value: string, isBold = false, isAccent = false) => {
    doc.setFontSize(isAccent ? 8 : 7.2);
    doc.setFont('helvetica', isBold || isAccent ? 'bold' : 'normal');
    const valWidth = doc.getTextWidth(value);
    const maxLabelW = summaryBoxWidth - valWidth - 8;
    const labelLines = breakAndWrapText(doc, label, maxLabelW);
    const rowH = Math.max(isAccent ? 5.8 : 5.2, labelLines.length * 3.2 + 2);

    if (isAccent) {
      doc.setFillColor(COLOR_HEADER[0], COLOR_HEADER[1], COLOR_HEADER[2]);
      doc.rect(rightBottomX, rightY, summaryBoxWidth, rowH, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(labelLines, rightBottomX + 3, rightY + 3.8);
      doc.text(value, rightBottomX + summaryBoxWidth - 3, rightY + 3.8, { align: 'right' });
    } else {
      doc.setFillColor(COLOR_SUB_HEADER[0], COLOR_SUB_HEADER[1], COLOR_SUB_HEADER[2]);
      doc.rect(rightBottomX, rightY, summaryBoxWidth, rowH, 'F');
      doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
      doc.text(labelLines, rightBottomX + 3, rightY + 3.6);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
      doc.text(value, rightBottomX + summaryBoxWidth - 3, rightY + 3.6, { align: 'right' });
    }
    rightY += rowH;
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
  if (invoice.manualAdjustment && invoice.manualAdjustment !== 0) {
    const adjSign = invoice.manualAdjustment > 0 ? '+' : '';
    const adjLabel = invoice.adjustmentAuthorizedBy
      ? `Adjustment (${invoice.adjustmentAuthorizedBy}):`
      : 'Authority Adjustment:';
    addSummaryRow(adjLabel, `${adjSign}${formatPdfCurrency(invoice.manualAdjustment)}`);
  }
  if (invoice.roundOff !== 0) {
    const roundLabel = invoice.isManualRoundOff ? 'Round Off (Manual):' : 'Round Off:';
    addSummaryRow(roundLabel, `${invoice.roundOff > 0 ? '+' : ''}${invoice.roundOff.toFixed(2)}`);
  }

  // Invoice Grand Total Highlight
  addSummaryRow('INVOICE GRAND TOTAL:', formatPdfCurrency(invoice.grandTotal), true, true);

  if (invoice.paidAmount > 0) {
    addSummaryRow('Amount Received / Paid:', formatPdfCurrency(invoice.paidAmount));
    addSummaryRow('Net Balance Due:', formatPdfCurrency(invoice.balanceDue), true);
  }

  rightY += 3;

  // Right Side: Official Rubber Stamp and Authorized Signature Box (Zero Overlap Guaranteed)
  const signBoxY = rightY;
  doc.setFillColor(COLOR_SUB_HEADER[0], COLOR_SUB_HEADER[1], COLOR_SUB_HEADER[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.rect(rightBottomX, signBoxY, summaryBoxWidth, signBoxHeight, 'FD');

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_PRIMARY[0], COLOR_TEXT_PRIMARY[1], COLOR_TEXT_PRIMARY[2]);
  const forBizLines = breakAndWrapText(doc, `For ${business.name || 'Company'}`, summaryBoxWidth - 6);
  doc.text(forBizLines, rightBottomX + summaryBoxWidth / 2, signBoxY + 3.8, {
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
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.line(
    rightBottomX + summaryBoxWidth / 2 - 25,
    signBoxY + 22,
    rightBottomX + summaryBoxWidth / 2 + 25,
    signBoxY + 22
  );

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_TEXT_SECONDARY[0], COLOR_TEXT_SECONDARY[1], COLOR_TEXT_SECONDARY[2]);
  const signatoryTitle = business.signatureName || 'Authorized Signatory';
  const signatoryLines = breakAndWrapText(doc, signatoryTitle, summaryBoxWidth - 8);
  doc.text(signatoryLines, rightBottomX + summaryBoxWidth / 2, signBoxY + 26, { align: 'center' });

  // 7. Page Footer
  doc.setFontSize(6.5);
  doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
  doc.text(
    'This is a computer-generated tax invoice issued in accordance with Indian GST Rules.',
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );

  const curPage = pageIndicator ? pageIndicator.current : 1;
  const totalPages = pageIndicator ? pageIndicator.total : 1;
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Page ${curPage} of ${totalPages} | ${invoice.invoiceNumber}`,
    rightMargin,
    pageHeight - 6,
    { align: 'right' }
  );
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
    const addr = breakAndWrapText(doc, business.address, 95);
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

  // Buyer Info Bar (Dynamic Height Calculation with Sentence-Breaking Wrapping)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const custNameLines = breakAndWrapText(doc, quotation.customerName || 'Customer / Client', contentWidth - 10);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  const destTerritoryLines = breakAndWrapText(
    doc,
    `Destination State / Delivery Territory: ${quotation.placeOfSupply || 'Same as Supplier'}`,
    contentWidth - 10
  );

  const buyerBarHeight = Math.max(18, 7 + custNameLines.length * 3.8 + destTerritoryLines.length * 3.2 + 2);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, buyerBarHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + buyerBarHeight, rightMargin, y + buyerBarHeight);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('QUOTATION PREPARED FOR (PROSPECT / CLIENT):', margin + 4, y + 4.5);

  let curQuoteBuyerY = y + 8.5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(custNameLines, margin + 4, curQuoteBuyerY);
  curQuoteBuyerY += custNameLines.length * 3.8;

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(destTerritoryLines, margin + 4, curQuoteBuyerY);

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

  const drawQuoteTableHeader = (atY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, atY, contentWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, atY + 7, rightMargin, atY + 7);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    doc.text('#', colX.sr, atY + 4.8);
    doc.text('Item & Description', colX.desc, atY + 4.8);
    doc.text('HSN/SAC', colX.hsn, atY + 4.8);
    doc.text('Qty', colX.qty, atY + 4.8, { align: 'right' });
    doc.text('Unit', colX.unit, atY + 4.8);
    doc.text('Rate (Rs)', colX.rate, atY + 4.8, { align: 'right' });
    doc.text('Taxable', colX.taxable, atY + 4.8, { align: 'right' });
    doc.text('GST %', colX.gst, atY + 4.8, { align: 'right' });
    doc.text('Total (Rs)', colX.total, atY + 4.8, { align: 'right' });
  };

  drawQuoteTableHeader(tableHeaderY);
  y = tableHeaderY + 7;

  quotation.items.forEach((it, idx) => {
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    const splitName = breakAndWrapText(doc, it.name || 'Item', 54);
    const rowHeight = Math.max(7, splitName.length * 3.4 + 2.5);

    if (y + rowHeight > pageHeight - margin - 20) {
      doc.addPage();
      drawPageBorder();
      y = margin + 5;
      drawQuoteTableHeader(y);
      y += 7;
    }

    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(252, 253, 254);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowHeight, rightMargin, y + rowHeight);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    doc.text(String(idx + 1), colX.sr, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(splitName, colX.desc, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    doc.text(it.hsnSac || '-', colX.hsn, y + 4.5);
    renderFittedTextRight(doc, String(it.quantity), colX.qty, y + 4.5, 12);
    doc.text(it.unit || 'NOS', colX.unit, y + 4.5);
    renderFittedTextRight(doc, it.unitPrice.toFixed(2), colX.rate, y + 4.5, 17);
    renderFittedTextRight(doc, it.taxableAmount.toFixed(2), colX.taxable, y + 4.5, 20);
    doc.text(`${it.gstRate}%`, colX.gst, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    renderFittedTextRight(doc, it.totalAmount.toFixed(2), colX.total, y + 4.5, 22);

    y += rowHeight;
  });

  y += 4;

  // Bottom Section: Terms/Bank on Left, Totals/Stamp/Sign on Right
  const bottomColWidth = (contentWidth - 6) / 2;
  const leftBottomX = margin;
  const rightBottomX = margin + bottomColWidth + 6;

  // Bank details lines
  const qBankLine = `Bank Name: ${business.bankName || 'N/A'}`;
  const qAcctLine = `Account No: ${business.accountNumber || 'N/A'}`;
  const qIfscLine = `IFSC Code: ${business.ifsc || 'N/A'} | Branch: ${business.branch || 'N/A'}`;
  const qUpiLine = business.upiId ? `UPI VPA: ${business.upiId}` : null;

  const splitQBank = breakAndWrapText(doc, qBankLine, bottomColWidth - 6);
  const splitQAcct = breakAndWrapText(doc, qAcctLine, bottomColWidth - 6);
  const splitQIfsc = breakAndWrapText(doc, qIfscLine, bottomColWidth - 6);
  const splitQUpi = qUpiLine ? breakAndWrapText(doc, qUpiLine, bottomColWidth - 6) : [];

  const totalQBankLines = splitQBank.length + splitQAcct.length + splitQIfsc.length + splitQUpi.length;
  const qBankBoxHeight = Math.max(22, 5 + totalQBankLines * 3.4 + 2.5);

  const quoteTerms =
    quotation.notes ||
    '1. Rates quoted are valid until the specified expiry date.\n2. Payment terms as agreed upon.\n3. Goods subject to availability at the time of order confirmation.';
  const quoteTermsLines = breakAndWrapText(doc, quoteTerms, bottomColWidth - 4);
  const quoteTermsHeight = 4 + quoteTermsLines.length * 3.2;

  const quoteActualLeftH = qBankBoxHeight + 3 + quoteTermsHeight;

  let quoteSummaryRowsCount = 3; // Taxable, CGST, SGST
  if (quotation.igstTotal > 0) quoteSummaryRowsCount++;
  quoteSummaryRowsCount++; // Grand Total
  const quoteTotalsHeight = quoteSummaryRowsCount * 5.8 + 2;
  const quoteSignBoxHeight = 28;
  const quoteActualRightH = quoteTotalsHeight + 3 + quoteSignBoxHeight;

  const requiredQuoteBottomHeight = Math.max(quoteActualLeftH, quoteActualRightH) + 8;
  if (y + requiredQuoteBottomHeight > pageHeight - margin - 8) {
    doc.addPage();
    drawPageBorder();
    y = margin + 6;
  }

  const bottomStartY = y;

  // Left Side: Bank Details Card
  let leftY = bottomStartY;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(leftBottomX, leftY, bottomColWidth, qBankBoxHeight, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('BANK DETAILS FOR ADVANCE / CHEQUE PAYMENT', leftBottomX + 3, leftY + 4);

  let curQBankY = leftY + 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text(splitQBank, leftBottomX + 3, curQBankY);
  curQBankY += splitQBank.length * 3.4;

  doc.text(splitQAcct, leftBottomX + 3, curQBankY);
  curQBankY += splitQAcct.length * 3.4;

  doc.text(splitQIfsc, leftBottomX + 3, curQBankY);
  curQBankY += splitQIfsc.length * 3.4;

  if (splitQUpi.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(splitQUpi, leftBottomX + 3, curQBankY);
  }

  leftY += qBankBoxHeight + 3;

  // Left Side: Terms
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('QUOTATION TERMS & VALIDITY CONDITIONS:', leftBottomX, leftY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(quoteTermsLines, leftBottomX, leftY + 3.8);

  // Right Side: Totals Summary
  let rightY = bottomStartY;
  const addQuoteSummaryRow = (label: string, value: string, isAccent = false) => {
    doc.setFontSize(isAccent ? 8 : 7.2);
    doc.setFont('helvetica', isAccent ? 'bold' : 'normal');
    const valW = doc.getTextWidth(value);
    const maxLblW = bottomColWidth - valW - 8;
    const lblLines = breakAndWrapText(doc, label, maxLblW);
    const rowH = Math.max(isAccent ? 5.8 : 5.2, lblLines.length * 3.2 + 2);

    doc.setFillColor(isAccent ? 15 : 248, isAccent ? 23 : 250, isAccent ? 42 : 252);
    doc.rect(rightBottomX, rightY, bottomColWidth, rowH, 'F');
    doc.setTextColor(isAccent ? 255 : 71, isAccent ? 255 : 85, isAccent ? 255 : 105);
    doc.text(lblLines, rightBottomX + 3, rightY + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isAccent ? 255 : 15, isAccent ? 255 : 23, isAccent ? 255 : 42);
    doc.text(value, rightBottomX + bottomColWidth - 3, rightY + 3.8, { align: 'right' });
    rightY += rowH;
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

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const quoteForLines = breakAndWrapText(doc, `For ${business.name || 'Company'}`, bottomColWidth - 6);
  doc.text(quoteForLines, rightBottomX + bottomColWidth / 2, signBoxY + 3.8, {
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
  const signatoryLines = breakAndWrapText(doc, signatoryTitle, bottomColWidth - 8);
  doc.text(signatoryLines, rightBottomX + bottomColWidth / 2, signBoxY + 25, { align: 'center' });

  // Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is a commercial quotation and cost estimate generated by Zavianoice.',
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
