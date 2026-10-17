// Indian States & Union Territories with GST State Codes
export interface StateCodeMap {
  code: string;
  name: string;
}

export const INDIAN_STATES: StateCodeMap[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export const GST_RATES = [0, 0.1, 0.25, 3, 5, 12, 18, 28] as const;
export type GstRate = typeof GST_RATES[number];

export const GST_COMMON_UNITS = [
  'NOS',
  'PCS',
  'KGS',
  'BOX',
  'SET',
  'MTR',
  'LTR',
  'BAG',
  'PKT',
  'SQFT',
  'SQM',
  'TON',
  'HRS',
  'DAYS',
  'DOZ',
  'PAIR',
  'ROLL',
  'BDL',
  'CAN',
  'BTL',
  'DRM',
  'QTL',
  'GMS',
  'MLT',
  'CTN',
  'UNT',
] as const;
export type GstUnit = typeof GST_COMMON_UNITS[number] | string;

export interface Business {
  id: string;
  ownerUid: string;
  name: string;
  tradeName?: string;
  gstin: string;
  pan?: string;
  state: string;
  stateCode: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId?: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  termsAndConditions: string;
  compositionScheme: boolean;
  logoUrl?: string;
  stampUrl?: string;
  signatureUrl?: string;
  signatureName?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  ownerUid: string;
  name: string;
  gstin?: string;
  phone?: string;
  email?: string;
  billingAddress: string;
  shippingAddress?: string;
  state: string;
  stateCode: string;
  pan?: string;
  isComposition?: boolean;
  creditLimit?: number;
  openingBalance?: number;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  businessId: string;
  ownerUid: string;
  name: string;
  gstin?: string;
  phone?: string;
  email?: string;
  address: string;
  state: string;
  stateCode: string;
  pan?: string;
  openingBalance?: number;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  ownerUid: string;
  name: string;
  description?: string;
  hsnSac: string;
  type: 'goods' | 'services';
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  taxRate: number;
  isTaxInclusive: boolean;
  cessRate?: number;
  openingStock: number;
  currentStock: number;
  minStockAlert: number;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  isTaxInclusive?: boolean;
  discount: number;
  discountType: 'PERCENT' | 'AMOUNT';
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessRate?: number;
  cessAmount: number;
  taxAmount?: number;
  totalAmount: number;
}

export type InvoiceType = 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'EXPORT_INVOICE';
export type InvoiceStatus = 'DRAFT' | 'FINALIZED' | 'CANCELLED' | 'PAID' | 'PARTIALLY_PAID';

export interface Invoice {
  id: string;
  businessId: string;
  ownerUid: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  customerAddress?: string;
  customerPhone?: string;
  placeOfSupply: string;
  placeOfSupplyCode: string;
  isInterState: boolean;
  reverseCharge: boolean;
  items: LineItem[];
  subTotal: number;
  discountTotal: number;
  totalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
  paidAmount: number;
  balanceDue: number;
  notes: string;
  terms: string;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  businessId: string;
  ownerUid: string;
  billNumber: string;
  supplierInvoiceNumber: string;
  supplierId: string;
  supplierName: string;
  supplierGstin?: string;
  date: string;
  dueDate: string;
  placeOfSupply: string;
  placeOfSupplyCode: string;
  isInterState: boolean;
  items: LineItem[];
  totalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  itcEligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'REVERSED';
  status: 'UNPAID' | 'PAID' | 'PARTIAL';
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  businessId: string;
  ownerUid: string;
  paymentNumber: string;
  type: 'RECEIPT' | 'PAYMENT';
  partyId: string;
  partyName: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  date: string;
  amount: number;
  mode: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE';
  referenceNo?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface CreditDebitNote {
  id: string;
  businessId: string;
  ownerUid: string;
  noteNumber: string;
  noteType: 'CREDIT_NOTE' | 'DEBIT_NOTE';
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  originalInvoiceDate: string;
  partyId: string;
  partyName: string;
  partyGstin?: string;
  date: string;
  reason: string;
  items: LineItem[];
  totalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  grandTotal: number;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: string;
}

export interface Expense {
  id: string;
  businessId: string;
  ownerUid: string;
  expenseNumber: string;
  category: string;
  date: string;
  amount: number;
  taxDeductible: boolean;
  gstRate: number;
  taxAmount: number;
  vendorName?: string;
  vendorGstin?: string;
  paymentMode: string;
  notes?: string;
  createdAt: string;
}

export interface Quotation {
  id: string;
  businessId: string;
  ownerUid: string;
  quoteNumber: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
  date: string;
  validUntil: string;
  customerId: string;
  customerName: string;
  placeOfSupply: string;
  items: LineItem[];
  totalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  notes?: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  voucherType: 'INVOICE' | 'PAYMENT_RECEIPT' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'PURCHASE_BILL' | 'VENDOR_PAYMENT';
  voucherNo: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface AuditLog {
  id: string;
  businessId: string;
  ownerUid: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  timestamp: string;
}

// GSTR-2B entry for reconciliation
export interface Gstr2BRecord {
  gstinSupplier: string;
  tradeNameSupplier: string;
  invoiceNumber: string;
  invoiceType: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  taxableValue: number;
  integratedTax: number;
  centralTax: number;
  stateTax: number;
  cess: number;
  itcAvailable: string;
  reason?: string;
}

export interface ReconciliationResult {
  matched: Array<{ book: Purchase; portal: Gstr2BRecord }>;
  booksOnly: Purchase[];
  portalOnly: Gstr2BRecord[];
  taxMismatch: Array<{ book: Purchase; portal: Gstr2BRecord; difference: number }>;
}
