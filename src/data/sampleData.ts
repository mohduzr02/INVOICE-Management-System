import { Business, Customer, Supplier, Product, Invoice, Purchase, Payment, Expense } from '../types';

// Clean default business profile with blank placeholders so users enter their real details
export const DEFAULT_BUSINESS: Business = {
  id: 'biz_default_001',
  ownerUid: 'system_default',
  name: 'My Business Enterprise',
  tradeName: '',
  gstin: '',
  pan: '',
  state: 'Maharashtra',
  stateCode: '27',
  email: '',
  phone: '',
  address: '',
  pincode: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  branch: '',
  upiId: '',
  invoicePrefix: 'INV/26-27/',
  nextInvoiceNumber: 1,
  termsAndConditions: '1. Goods once sold will not be accepted back without prior authorization.\n2. Payment terms as agreed upon.\n3. All disputes subject to local jurisdiction.',
  compositionScheme: false,
  createdAt: '2026-04-01',
  updatedAt: '2026-10-12',
};

// All production lists start 100% CLEAN & EMPTY
// No dummy stock alerts, no mock invoices, no fake customers or toner cartridges!
export const SAMPLE_CUSTOMERS: Customer[] = [];
export const SAMPLE_SUPPLIERS: Supplier[] = [];
export const SAMPLE_PRODUCTS: Product[] = [];
export const SAMPLE_INVOICES: Invoice[] = [];
export const SAMPLE_PURCHASES: Purchase[] = [];
export const SAMPLE_PAYMENTS: Payment[] = [];
export const SAMPLE_EXPENSES: Expense[] = [];

// Optional DEMO data available strictly on-demand (e.g., if a user explicitly requests to load a preview demo)
export const DEMO_BUSINESS: Business = {
  id: 'biz_demo_001',
  ownerUid: 'demo_user',
  name: 'Apex Infotech & Hardware Solutions Pvt Ltd',
  tradeName: 'Apex Infotech Solutions',
  gstin: '27AABCA1234F1Z8',
  pan: 'AABCA1234F',
  state: 'Maharashtra',
  stateCode: '27',
  email: 'accounts@apexinfotech.in',
  phone: '+91 98200 12345',
  address: 'Plot 42, Electronics Zone, MIDC Andheri East, Mumbai',
  pincode: '400093',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200012345678',
  ifsc: 'HDFC0000123',
  branch: 'Andheri East, Mumbai',
  upiId: 'apexinfotech@okhdfcbank',
  invoicePrefix: 'INV/26-27/',
  nextInvoiceNumber: 104,
  termsAndConditions: '1. Goods once sold will not be accepted back without prior RMA.\n2. Interest @ 18% p.a. will be levied on overdue payments.\n3. All disputes subject to Mumbai jurisdiction only.',
  compositionScheme: false,
  createdAt: '2026-04-01',
  updatedAt: '2026-10-12',
};

export const DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'demo_cust_001',
    businessId: 'biz_demo_001',
    ownerUid: 'demo_user',
    name: 'Bharat Logistics & Transport Corp',
    gstin: '27AAECB9876P1ZV',
    phone: '+91 98211 44556',
    email: 'billing@bharatlogistics.in',
    billingAddress: 'Unit 12, Industrial Logistics Park, Bhiwandi, Thane',
    shippingAddress: 'Unit 12, Industrial Logistics Park, Bhiwandi, Thane',
    state: 'Maharashtra',
    stateCode: '27',
    pan: 'AAECB9876P',
    currentBalance: 35400,
    createdAt: '2026-04-10',
    updatedAt: '2026-10-12',
  },
  {
    id: 'demo_cust_002',
    businessId: 'biz_demo_001',
    ownerUid: 'demo_user',
    name: 'Kaveri Enterprise & Retail Hub',
    gstin: '29AAACH8901L1Z4',
    phone: '+91 94480 33221',
    email: 'kaveri.enterprises@gmail.com',
    billingAddress: '45, MG Road, Brigade Junction, Bengaluru',
    shippingAddress: '45, MG Road, Brigade Junction, Bengaluru',
    state: 'Karnataka',
    stateCode: '29',
    pan: 'AAACH8901L',
    currentBalance: 118000,
    createdAt: '2026-04-12',
    updatedAt: '2026-10-12',
  },
];

export const DEMO_SUPPLIERS: Supplier[] = [
  {
    id: 'demo_supp_001',
    businessId: 'biz_demo_001',
    ownerUid: 'demo_user',
    name: 'Dell Technologies India Pvt Ltd',
    gstin: '29AABCD1122K1Z9',
    phone: '+91 80 4455 6677',
    email: 'india_orders@dell.com',
    address: 'Inner Ring Road, Domlur, Bengaluru',
    state: 'Karnataka',
    stateCode: '29',
    pan: 'AABCD1122K',
    currentBalance: 84000,
    createdAt: '2026-04-05',
    updatedAt: '2026-10-12',
  },
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo_prod_001',
    businessId: 'biz_demo_001',
    ownerUid: 'demo_user',
    name: 'Dell OptiPlex 7010 Desktop Core i7',
    description: '13th Gen Intel Core i7, 16GB RAM, 512GB NVMe SSD, Windows 11 Pro',
    hsnSac: '84713010',
    type: 'goods',
    unit: 'NOS',
    purchasePrice: 58000,
    sellingPrice: 72000,
    taxRate: 18,
    isTaxInclusive: false,
    openingStock: 25,
    currentStock: 18,
    minStockAlert: 5,
    createdAt: '2026-04-01',
    updatedAt: '2026-10-12',
  },
];
