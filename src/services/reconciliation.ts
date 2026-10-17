import { Purchase, Gstr2BRecord, ReconciliationResult } from '../types';

/**
 * Reconciles Purchase Register against GSTR-2B Records
 */
export function reconcileGstr2B(purchases: Purchase[], portalRecords: Gstr2BRecord[]): ReconciliationResult {
  const matched: Array<{ book: Purchase; portal: Gstr2BRecord }> = [];
  const taxMismatch: Array<{ book: Purchase; portal: Gstr2BRecord; difference: number }> = [];
  const matchedBookIds = new Set<string>();
  const matchedPortalIndices = new Set<number>();

  const normalizeInvNum = (str: string) => (str || '').toLowerCase().replace(/[\s\-_/]/g, '');
  const normalizeGstin = (str: string) => (str || '').toUpperCase().trim();

  // Step 1: Match purchases with 2B
  purchases.forEach((book) => {
    const bookInvNum = normalizeInvNum(book.supplierInvoiceNumber || book.billNumber);
    const bookGstin = normalizeGstin(book.supplierGstin || '');

    const portalIndex = portalRecords.findIndex((portal, idx) => {
      if (matchedPortalIndices.has(idx)) return false;
      const portalInv = normalizeInvNum(portal.invoiceNumber);
      const portalGst = normalizeGstin(portal.gstinSupplier);

      // Match condition: Invoice numbers match AND (either GSTIN matches or no GSTIN in books)
      const invMatch = portalInv === bookInvNum || portalInv.endsWith(bookInvNum) || bookInvNum.endsWith(portalInv);
      const gstMatch = !bookGstin || !portalGst || bookGstin === portalGst;

      return invMatch && gstMatch;
    });

    if (portalIndex !== -1) {
      const portal = portalRecords[portalIndex];
      matchedPortalIndices.add(portalIndex);
      matchedBookIds.add(book.id);

      const bookTax = (book.cgstTotal || 0) + (book.sgstTotal || 0) + (book.igstTotal || 0);
      const portalTax = (portal.centralTax || 0) + (portal.stateTax || 0) + (portal.integratedTax || 0);
      const diff = Math.abs(bookTax - portalTax);

      if (diff <= 2) {
        matched.push({ book, portal });
      } else {
        taxMismatch.push({ book, portal, difference: diff });
      }
    }
  });

  const booksOnly = purchases.filter((b) => !matchedBookIds.has(b.id));
  const portalOnly = portalRecords.filter((_, idx) => !matchedPortalIndices.has(idx));

  return {
    matched,
    booksOnly,
    portalOnly,
    taxMismatch,
  };
}
