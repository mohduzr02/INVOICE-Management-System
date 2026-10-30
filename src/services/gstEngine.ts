import { LineItem } from '../types';

/**
 * Decimal-Safe Financial Math Helpers (avoiding floating point drift)
 */
export const round2 = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const safeAdd = (a: number, b: number): number => {
  return round2(round2(a) + round2(b));
};

export const safeSub = (a: number, b: number): number => {
  return round2(round2(a) - round2(b));
};

export const safeMul = (a: number, b: number): number => {
  return round2(round2(a) * round2(b));
};

export const safeDiv = (a: number, b: number): number => {
  if (b === 0) return 0;
  return round2(round2(a) / round2(b));
};

export interface CalculateItemParams {
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'PERCENT' | 'AMOUNT';
  gstRate: number;
  cessRate?: number;
  isTaxInclusive?: boolean;
  supplierStateCode: string;
  placeOfSupplyCode: string;
}

export interface CalculatedItemResult {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalAmount: number;
  isInterState: boolean;
}

/**
 * Calculates GST components for a single line item
 */
export function calculateLineItem(params: CalculateItemParams): CalculatedItemResult {
  const {
    quantity,
    unitPrice,
    discount = 0,
    discountType = 'PERCENT',
    gstRate = 0,
    cessRate = 0,
    isTaxInclusive = false,
    supplierStateCode,
    placeOfSupplyCode,
  } = params;

  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const baseGross = safeMul(qty, price);

  // Calculate discount
  let discountAmt = 0;
  if (discountType === 'PERCENT') {
    discountAmt = safeMul(baseGross, (Number(discount) || 0) / 100);
  } else {
    discountAmt = Number(discount) || 0;
  }
  if (discountAmt > baseGross) discountAmt = baseGross;

  const afterDiscount = safeSub(baseGross, discountAmt);

  // Check intra vs inter state
  const isInterState = !supplierStateCode || !placeOfSupplyCode
    ? false
    : supplierStateCode.trim().padStart(2, '0') !== placeOfSupplyCode.trim().padStart(2, '0');

  let taxableAmount = 0;
  let totalTax = 0;

  if (isTaxInclusive && gstRate > 0) {
    // Gross = Taxable * (1 + (gstRate + cessRate) / 100)
    // Taxable = Gross / (1 + (gstRate + cessRate) / 100)
    const combinedRate = gstRate + (cessRate || 0);
    const divisor = 1 + combinedRate / 100;
    taxableAmount = round2(afterDiscount / divisor);
    totalTax = safeSub(afterDiscount, taxableAmount);
  } else {
    taxableAmount = afterDiscount;
    totalTax = safeMul(taxableAmount, gstRate / 100);
  }

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = isTaxInclusive
      ? safeMul(taxableAmount, gstRate / 100)
      : round2(taxableAmount * (gstRate / 100));
  } else {
    const halfRate = gstRate / 2;
    cgstAmount = round2(taxableAmount * (halfRate / 100));
    sgstAmount = round2(taxableAmount * (halfRate / 100));
  }

  const cessAmount = cessRate && cessRate > 0
    ? round2(taxableAmount * (cessRate / 100))
    : 0;

  const totalAmount = round2(taxableAmount + cgstAmount + sgstAmount + igstAmount + cessAmount);

  return {
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cessAmount,
    totalAmount,
    isInterState,
  };
}

export interface InvoiceTotals {
  subTotal: number;
  discountTotal: number;
  totalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  unadjustedGrand: number;
  manualAdjustment: number;
  roundOff: number;
  isManualRoundOff: boolean;
  grandTotal: number;
  amountInWords: string;
}

/**
 * Calculates aggregated invoice totals from line items, with authority adjustment and round-off override
 */
export function calculateInvoiceTotals(
  items: LineItem[],
  options?: {
    manualAdjustment?: number;
    customRoundOff?: number;
    isManualRoundOff?: boolean;
  }
): InvoiceTotals {
  let subTotal = 0;
  let discountTotal = 0;
  let totalTaxable = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let cessTotal = 0;

  for (const item of items) {
    const gross = safeMul(item.quantity, item.unitPrice);
    subTotal = safeAdd(subTotal, gross);

    let disc = 0;
    if (item.discountType === 'PERCENT') {
      disc = safeMul(gross, (item.discount || 0) / 100);
    } else {
      disc = item.discount || 0;
    }
    discountTotal = safeAdd(discountTotal, disc);

    totalTaxable = safeAdd(totalTaxable, item.taxableAmount || 0);
    cgstTotal = safeAdd(cgstTotal, item.cgstAmount || 0);
    sgstTotal = safeAdd(sgstTotal, item.sgstAmount || 0);
    igstTotal = safeAdd(igstTotal, item.igstAmount || 0);
    cessTotal = safeAdd(cessTotal, item.cessAmount || 0);
  }

  const unadjustedGrand = round2(totalTaxable + cgstTotal + sgstTotal + igstTotal + cessTotal);
  const manualAdjustment = Number(options?.manualAdjustment || 0);
  const afterAdjustment = round2(unadjustedGrand + manualAdjustment);

  let roundOff = 0;
  let grandTotal = 0;
  const isManual = !!options?.isManualRoundOff;

  if (isManual) {
    roundOff = round2(Number(options?.customRoundOff || 0));
    grandTotal = round2(afterAdjustment + roundOff);
  } else {
    const roundedGrand = Math.round(afterAdjustment);
    roundOff = round2(roundedGrand - afterAdjustment);
    grandTotal = roundedGrand;
  }

  const amountInWords = numberToIndianWords(grandTotal);

  return {
    subTotal,
    discountTotal,
    totalTaxable,
    cgstTotal,
    sgstTotal,
    igstTotal,
    cessTotal,
    unadjustedGrand,
    manualAdjustment,
    roundOff,
    isManualRoundOff: isManual,
    grandTotal,
    amountInWords,
  };
}

/**
 * Converts numbers to Indian English Words (Rupees Lakhs & Crores)
 */
export function numberToIndianWords(num: number): string {
  if (num === 0) return 'Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    const unit = n % 10;
    const ten = Math.floor(n / 10);
    return tens[ten] + (unit !== 0 ? ' ' + ones[unit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += ones[hundred] + ' Hundred';
      if (rest > 0) res += ' ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  const parts = num.toFixed(2).split('.');
  let integerPart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);

  if (integerPart === 0 && decimalPart === 0) return 'Rupees Zero Only';

  let result = '';

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;

  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;

  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;

  const hundred = integerPart;

  if (crore > 0) {
    result += convertThreeDigits(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertThreeDigits(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertThreeDigits(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    result += convertThreeDigits(hundred) + ' ';
  }

  result = result.trim();
  let finalStr = 'Rupees ' + (result || 'Zero');

  if (decimalPart > 0) {
    finalStr += ' and ' + convertTwoDigits(decimalPart) + ' Paise';
  }

  finalStr += ' Only';
  return finalStr;
}

/**
 * Format currency in Indian standard (e.g. ₹ 1,25,000.00)
 */
export function formatINR(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount).toFixed(2);
  const [integer, decimal] = abs.split('.');

  // Indian thousands and lakhs separator
  let lastThree = integer.substring(integer.length - 3);
  const otherNumbers = integer.substring(0, integer.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return `${isNegative ? '-' : ''}₹ ${formattedInteger}.${decimal}`;
}
