import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth } from './AuthContext';
import {
  Business,
  Customer,
  Supplier,
  Product,
  Invoice,
  Purchase,
  Payment,
  CreditDebitNote,
  Expense,
  Quotation,
  AuditLog,
} from '../types';
import {
  DEFAULT_BUSINESS,
  SAMPLE_CUSTOMERS,
  SAMPLE_SUPPLIERS,
  SAMPLE_PRODUCTS,
  SAMPLE_INVOICES,
  SAMPLE_PURCHASES,
  SAMPLE_PAYMENTS,
  SAMPLE_EXPENSES,
  DEMO_BUSINESS,
  DEMO_CUSTOMERS,
  DEMO_SUPPLIERS,
  DEMO_PRODUCTS,
} from '../data/sampleData';

export type StorageMode = 'local' | 'firebase-spark';
export type CloudSyncStatus = 'synced' | 'local_only' | 'syncing' | 'error';

interface BusinessContextType {
  storageMode: StorageMode;
  setStorageMode: (mode: StorageMode) => void;
  cloudSyncStatus: CloudSyncStatus;
  cloudSyncError: string | null;
  syncLocalToCloud: () => Promise<boolean>;
  syncCloudToLocal: () => Promise<boolean>;
  exportBackupJSON: () => void;
  importBackupJSON: (jsonData: string | object) => Promise<{ success: boolean; message: string }>;
  clearAllSampleData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  hasSampleData: boolean;
  business: Business;
  businesses: Business[];
  activeBusinessId: string;
  switchBusiness: (id: string) => void;
  addBusiness: (newBiz: Partial<Business> & { name: string; gstin?: string }) => Promise<Business>;
  deleteBusiness: (id: string) => Promise<void>;
  setDefaultBusiness: (id: string) => Promise<void>;
  updateBusiness: (updates: Partial<Business>, targetId?: string) => Promise<void>;
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'businessId' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'businessId' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => Promise<Supplier>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'businessId' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  invoices: Invoice[];
  saveInvoice: (invoice: Omit<Invoice, 'id' | 'businessId' | 'ownerUid' | 'createdAt' | 'updatedAt'>, existingId?: string) => Promise<Invoice>;
  cancelInvoice: (id: string, reason?: string) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  purchases: Purchase[];
  addPurchase: (purchase: Omit<Purchase, 'id' | 'businessId' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => Promise<Purchase>;
  deletePurchase: (id: string) => Promise<void>;
  payments: Payment[];
  recordPayment: (payment: Omit<Payment, 'id' | 'businessId' | 'ownerUid' | 'createdAt'>) => Promise<Payment>;
  creditNotes: CreditDebitNote[];
  addCreditDebitNote: (note: Omit<CreditDebitNote, 'id' | 'businessId' | 'ownerUid' | 'createdAt'>) => Promise<CreditDebitNote>;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'businessId' | 'ownerUid' | 'createdAt'>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  quotations: Quotation[];
  saveQuotation: (quote: Omit<Quotation, 'id' | 'businessId' | 'ownerUid' | 'createdAt'>, existingId?: string) => Promise<Quotation>;
  deleteQuotation: (id: string) => Promise<void>;
  auditLogs: AuditLog[];
  resetToSampleData: () => Promise<void>;
  loading: boolean;
  isCloudSynced: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'invoicepro_gst_local_v1';
const STORAGE_PREF_KEY = 'invoicepro_storage_preference';

// Sample IDs and keywords to purge automatically from user's storage
const SAMPLE_IDS = new Set([
  'prod_001', 'prod_002', 'prod_003', 'prod_004', 'prod_005',
  'cust_001', 'cust_002', 'cust_003',
  'supp_001', 'supp_002',
  'inv_001', 'inv_002', 'inv_003',
  'purch_001', 'purch_002',
  'pay_001', 'pay_002',
  'exp_001', 'exp_002',
]);

const SAMPLE_NAMES = new Set([
  'Laserjet Toner Cartridge Black High Yield',
  'Dell OptiPlex 7010 Desktop Core i7',
  'Cat6 UTP High-Speed Network Cable 305M Roll',
  'Enterprise IT AMC & Server Maintenance (Annual)',
  'Solar Inverter 5kVA Hybrid Sine Wave',
  'Bharat Logistics & Transport Corp',
  'Kaveri Enterprise & Retail Hub',
  'Modern Retail Mart (Unregistered Consumer)',
  'Dell Technologies India Pvt Ltd',
  'QuickLink Cable & Networking Co',
]);

export function isSampleRecord(item: any): boolean {
  if (!item) return false;
  if (item.id && (SAMPLE_IDS.has(item.id) || String(item.id).startsWith('demo_'))) return true;
  if (item.name && SAMPLE_NAMES.has(item.name)) return true;
  if (item.ownerUid === 'system_default' || item.ownerUid === 'demo_user') return true;
  return false;
}

const ACTIVE_BIZ_KEY = 'invoicepro_active_biz_id';

function getInitialBusinesses(): Business[] {
  if (typeof window === 'undefined') return [DEFAULT_BUSINESS];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.businesses) && parsed.businesses.length > 0) {
        return parsed.businesses;
      }
      if (parsed?.business) {
        const single = parsed.business;
        if (
          single.name === 'Apex Infotech & Hardware Solutions Pvt Ltd' ||
          single.gstin === '27AABCA1234F1Z8' ||
          single.ownerUid === 'system_default'
        ) {
          return [DEFAULT_BUSINESS];
        }
        return [single];
      }
    }
  } catch (e) {
    console.warn('Error reading businesses from localStorage:', e);
  }
  return [DEFAULT_BUSINESS];
}

function getLocalData<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed[key] !== undefined) {
        const val = parsed[key];
        // If stored business has mock company name or mock GSTIN, replace with clean default
        if (key === 'business' && val) {
          if (
            val.name === 'Apex Infotech & Hardware Solutions Pvt Ltd' ||
            val.gstin === '27AABCA1234F1Z8' ||
            val.ownerUid === 'system_default'
          ) {
            return DEFAULT_BUSINESS as unknown as T;
          }
          return val;
        }
        // If an array contains sample items (like Laserjet Toner Cartridge), strip them out!
        if (Array.isArray(val)) {
          const cleaned = val.filter((item: any) => !isSampleRecord(item));
          return cleaned as unknown as T;
        }
        return val;
      }
    }
  } catch (err) {
    console.warn('Error reading from localStorage:', err);
  }
  return defaultVal;
}

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Storage Mode Preference: 'local' (offline local storage) vs 'firebase-spark' (cloud Firestore)
  const [storageMode, setStorageModeState] = useState<StorageMode>(() => {
    if (typeof window === 'undefined') return 'local';
    const saved = localStorage.getItem(STORAGE_PREF_KEY);
    return saved === 'firebase-spark' ? 'firebase-spark' : 'local';
  });

  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(() =>
    storageMode === 'firebase-spark' ? 'syncing' : 'local_only'
  );
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  // Multi-company entity list
  const [businesses, setBusinesses] = useState<Business[]>(getInitialBusinesses);
  const [activeBusinessId, setActiveBusinessIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_BUSINESS.id;
    const savedId = localStorage.getItem(ACTIVE_BIZ_KEY);
    const initialList = getInitialBusinesses();
    if (savedId && initialList.some((b) => b.id === savedId)) return savedId;
    return initialList[0]?.id || DEFAULT_BUSINESS.id;
  });

  const business = businesses.find((b) => b.id === activeBusinessId) || businesses[0] || DEFAULT_BUSINESS;

  // States with offline local persistence
  const [customers, setCustomers] = useState<Customer[]>(() => getLocalData('customers', SAMPLE_CUSTOMERS));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getLocalData('suppliers', SAMPLE_SUPPLIERS));
  const [products, setProducts] = useState<Product[]>(() => getLocalData('products', SAMPLE_PRODUCTS));
  const [invoices, setInvoices] = useState<Invoice[]>(() => getLocalData('invoices', SAMPLE_INVOICES));
  const [purchases, setPurchases] = useState<Purchase[]>(() => getLocalData('purchases', SAMPLE_PURCHASES));
  const [payments, setPayments] = useState<Payment[]>(() => getLocalData('payments', SAMPLE_PAYMENTS));
  const [creditNotes, setCreditNotes] = useState<CreditDebitNote[]>(() => getLocalData('creditNotes', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => getLocalData('expenses', SAMPLE_EXPENSES));
  const [quotations, setQuotations] = useState<Quotation[]>(() => getLocalData('quotations', []));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getLocalData('auditLogs', []));

  // Sync to local storage on computer whenever state changes
  useEffect(() => {
    try {
      const payload = {
        businesses,
        business,
        customers,
        suppliers,
        products,
        invoices,
        purchases,
        payments,
        creditNotes,
        expenses,
        quotations,
        auditLogs,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [
    businesses,
    business,
    customers,
    suppliers,
    products,
    invoices,
    purchases,
    payments,
    creditNotes,
    expenses,
    quotations,
    auditLogs,
  ]);

  const businessId = business.id || (user ? `biz_${user.uid.substring(0, 12)}` : DEFAULT_BUSINESS.id);
  const ownerUid = user ? user.uid : 'system_default';

  // Toggle storage mode
  const setStorageMode = (mode: StorageMode) => {
    setStorageModeState(mode);
    try {
      localStorage.setItem(STORAGE_PREF_KEY, mode);
    } catch (e) {
      console.warn(e);
    }
    if (mode === 'local') {
      setIsCloudSynced(false);
      setCloudSyncStatus('local_only');
      setCloudSyncError(null);
    } else {
      setCloudSyncStatus('syncing');
      loadBusinessData();
    }
  };

  // Load from Firestore if in firebase-spark mode and user is logged in
  const loadBusinessData = useCallback(async () => {
    if (!user || storageMode === 'local') {
      setLoading(false);
      setIsCloudSynced(false);
      setCloudSyncStatus('local_only');
      return;
    }

    try {
      setLoading(true);
      setCloudSyncStatus('syncing');
      const bizDocRef = doc(db, 'businesses', businessId);
      const bizSnap = await getDoc(bizDocRef);

      if (bizSnap.exists()) {
        const rawBiz = bizSnap.data() as Business;
        if (
          rawBiz.name === 'Apex Infotech & Hardware Solutions Pvt Ltd' ||
          rawBiz.gstin === '27AABCA1234F1Z8' ||
          rawBiz.ownerUid === 'system_default'
        ) {
          setBusinesses([DEFAULT_BUSINESS]);
        } else {
          setBusinesses([rawBiz]);
        }

        // Fetch subcollections and sanitize any mock data
        const custSnap = await getDocs(collection(db, `businesses/${businessId}/customers`));
        const custData = custSnap.docs.map((d) => d.data() as Customer).filter((c) => !isSampleRecord(c));
        setCustomers(custData);

        const suppSnap = await getDocs(collection(db, `businesses/${businessId}/suppliers`));
        const suppData = suppSnap.docs.map((d) => d.data() as Supplier).filter((s) => !isSampleRecord(s));
        setSuppliers(suppData);

        const prodSnap = await getDocs(collection(db, `businesses/${businessId}/products`));
        const prodData = prodSnap.docs.map((d) => d.data() as Product).filter((p) => !isSampleRecord(p));
        setProducts(prodData);

        const invSnap = await getDocs(collection(db, `businesses/${businessId}/invoices`));
        const invData = invSnap.docs.map((d) => d.data() as Invoice).filter((i) => !isSampleRecord(i));
        setInvoices(invData);

        const purchSnap = await getDocs(collection(db, `businesses/${businessId}/purchases`));
        const purchData = purchSnap.docs.map((d) => d.data() as Purchase).filter((p) => !isSampleRecord(p));
        setPurchases(purchData);

        const paySnap = await getDocs(collection(db, `businesses/${businessId}/payments`));
        const payData = paySnap.docs.map((d) => d.data() as Payment).filter((p) => !isSampleRecord(p));
        setPayments(payData);

        const expSnap = await getDocs(collection(db, `businesses/${businessId}/expenses`));
        const expData = expSnap.docs.map((d) => d.data() as Expense).filter((e) => !isSampleRecord(e));
        setExpenses(expData);

        const cnSnap = await getDocs(collection(db, `businesses/${businessId}/credit_notes`));
        const cnData = cnSnap.docs.map((d) => d.data() as CreditDebitNote).filter((cn) => !isSampleRecord(cn));
        setCreditNotes(cnData);

        const qSnap = await getDocs(collection(db, `businesses/${businessId}/quotations`));
        const qData = qSnap.docs.map((d) => d.data() as Quotation).filter((q) => !isSampleRecord(q));
        setQuotations(qData);

        const logSnap = await getDocs(collection(db, `businesses/${businessId}/audit_logs`));
        const logData = logSnap.docs.map((d) => d.data() as AuditLog);
        setAuditLogs(logData);

        setIsCloudSynced(true);
        setCloudSyncStatus('synced');
        setCloudSyncError(null);
      } else {
        // First-time user setup: Initialize user business in Firestore
        const initialBiz: Business = {
          ...business,
          id: businessId,
          ownerUid: user.uid,
          name: user.displayName ? `${user.displayName}'s Enterprises` : business.name,
          email: user.email || business.email,
        };
        await setDoc(bizDocRef, initialBiz);
        setBusinesses([initialBiz]);
        setIsCloudSynced(true);
        setCloudSyncStatus('synced');
        setCloudSyncError(null);
      }
    } catch (err: any) {
      console.warn('Could not sync with Firestore (falling back to Local Storage):', err);
      setIsCloudSynced(false);
      setCloudSyncStatus('error');
      setCloudSyncError(err?.message || 'Cloud sync unavailable');
    } finally {
      setLoading(false);
    }
  }, [user, businessId, storageMode]);

  useEffect(() => {
    loadBusinessData();
  }, [loadBusinessData]);

  // Sync Local Storage to Firebase Spark Free
  const syncLocalToCloud = useCallback(async () => {
    if (!user) return false;
    try {
      setCloudSyncStatus('syncing');
      await setDoc(doc(db, 'businesses', businessId), business);

      const batchPromises = [
        ...customers.map((c) => setDoc(doc(db, `businesses/${businessId}/customers`, c.id), c)),
        ...suppliers.map((s) => setDoc(doc(db, `businesses/${businessId}/suppliers`, s.id), s)),
        ...products.map((p) => setDoc(doc(db, `businesses/${businessId}/products`, p.id), p)),
        ...invoices.map((i) => setDoc(doc(db, `businesses/${businessId}/invoices`, i.id), i)),
        ...purchases.map((pu) => setDoc(doc(db, `businesses/${businessId}/purchases`, pu.id), pu)),
        ...payments.map((py) => setDoc(doc(db, `businesses/${businessId}/payments`, py.id), py)),
        ...expenses.map((ex) => setDoc(doc(db, `businesses/${businessId}/expenses`, ex.id), ex)),
        ...creditNotes.map((cn) => setDoc(doc(db, `businesses/${businessId}/credit_notes`, cn.id), cn)),
        ...quotations.map((q) => setDoc(doc(db, `businesses/${businessId}/quotations`, q.id), q)),
      ];
      await Promise.allSettled(batchPromises);
      setIsCloudSynced(true);
      setCloudSyncStatus('synced');
      setCloudSyncError(null);
      return true;
    } catch (err: any) {
      console.warn('Sync local to cloud error:', err);
      setCloudSyncStatus('error');
      setCloudSyncError(err?.message || 'Sync failed');
      return false;
    }
  }, [user, businessId, business, customers, suppliers, products, invoices, purchases, payments, expenses, creditNotes, quotations]);

  // Sync Firebase Spark Free to Local Storage
  const syncCloudToLocal = useCallback(async () => {
    if (!user) return false;
    await loadBusinessData();
    return true;
  }, [user, loadBusinessData]);

  // Export full backup JSON
  const exportBackupJSON = useCallback(() => {
    const backupData = {
      version: '1.0',
      appName: 'InvoicePro GST',
      exportedAt: new Date().toISOString(),
      storageMode,
      business,
      businesses,
      activeBusinessId,
      customers,
      suppliers,
      products,
      invoices,
      purchases,
      payments,
      expenses,
      creditNotes,
      quotations,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `InvoicePro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    storageMode,
    business,
    businesses,
    activeBusinessId,
    customers,
    suppliers,
    products,
    invoices,
    purchases,
    payments,
    expenses,
    creditNotes,
    quotations,
    auditLogs,
  ]);

  // Import full backup JSON
  const importBackupJSON = useCallback(async (jsonInput: string | object) => {
    try {
      const data: any = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Invalid backup file structure' };
      }
      if (Array.isArray(data.businesses) && data.businesses.length > 0) {
        setBusinesses(data.businesses);
      } else if (data.business) {
        setBusinesses([data.business]);
      }
      if (data.activeBusinessId) {
        setActiveBusinessIdState(data.activeBusinessId);
      }
      if (Array.isArray(data.customers)) setCustomers(data.customers);
      if (Array.isArray(data.suppliers)) setSuppliers(data.suppliers);
      if (Array.isArray(data.products)) setProducts(data.products);
      if (Array.isArray(data.invoices)) setInvoices(data.invoices);
      if (Array.isArray(data.purchases)) setPurchases(data.purchases);
      if (Array.isArray(data.payments)) setPayments(data.payments);
      if (Array.isArray(data.expenses)) setExpenses(data.expenses);
      if (Array.isArray(data.creditNotes)) setCreditNotes(data.creditNotes);
      if (Array.isArray(data.quotations)) setQuotations(data.quotations);
      if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);

      return { success: true, message: 'All local records successfully restored!' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to read backup file' };
    }
  }, []);

  // Safe Audit log helper
  const addAuditLog = async (action: string, entityType: string, entityId: string, summary: string) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      businessId,
      ownerUid,
      action,
      entityType,
      entityId,
      summary,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await setDoc(doc(db, `businesses/${businessId}/audit_logs`, newLog.id), newLog);
      } catch (e) {
        console.warn('Audit log cloud sync note:', e);
      }
    }
  };

  // Switch active company
  const switchBusiness = (id: string) => {
    const target = businesses.find((b) => b.id === id);
    if (target) {
      setActiveBusinessIdState(id);
      try {
        localStorage.setItem(ACTIVE_BIZ_KEY, id);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // Add new company profile
  const addBusiness = async (newBizData: Partial<Business> & { name: string; gstin?: string }) => {
    const newId = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created: Business = {
      ...DEFAULT_BUSINESS,
      ...newBizData,
      id: newId,
      ownerUid: user ? user.uid : 'system_default',
      isDefault: businesses.length === 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    const nextList = [...businesses, created];
    setBusinesses(nextList);
    setActiveBusinessIdState(newId);
    try {
      localStorage.setItem(ACTIVE_BIZ_KEY, newId);
    } catch (e) {
      console.warn(e);
    }
    addAuditLog('CREATE', 'BUSINESS', newId, `Added new company profile: ${created.name}`);
    return created;
  };

  // Delete company profile
  const deleteBusiness = async (id: string) => {
    if (businesses.length <= 1) {
      throw new Error('At least one company profile must be retained.');
    }
    const nextList = businesses.filter((b) => b.id !== id);
    setBusinesses(nextList);
    if (activeBusinessId === id) {
      const nextActive = nextList[0].id;
      setActiveBusinessIdState(nextActive);
      try {
        localStorage.setItem(ACTIVE_BIZ_KEY, nextActive);
      } catch (e) {
        console.warn(e);
      }
    }
    addAuditLog('DELETE', 'BUSINESS', id, 'Deleted company profile');
  };

  // Set default company
  const setDefaultBusiness = async (id: string) => {
    setBusinesses((prev) =>
      prev.map((b) => ({
        ...b,
        isDefault: b.id === id,
      }))
    );
  };

  // Business Profile Update
  const updateBusiness = async (updates: Partial<Business>, targetId?: string) => {
    const idToUpdate = targetId || activeBusinessId;
    let updatedObj: Business | undefined;
    setBusinesses((prev) =>
      prev.map((b) => {
        if (b.id === idToUpdate) {
          updatedObj = {
            ...b,
            ...updates,
            updatedAt: new Date().toISOString().split('T')[0],
          };
          return updatedObj;
        }
        return b;
      })
    );
    addAuditLog('UPDATE', 'BUSINESS', idToUpdate, `Updated business profile: ${updates.name || 'settings'}`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced && updatedObj) {
      try {
        await updateDoc(doc(db, 'businesses', idToUpdate), updatedObj as any);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Business update cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  // Customers
  const addCustomer = async (cust: Omit<Customer, 'id' | 'businessId' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => {
    const newCustomer: Customer = {
      ...cust,
      id: `cust_${Date.now()}`,
      businessId,
      ownerUid,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    addAuditLog('CREATE', 'CUSTOMER', newCustomer.id, `Created customer: ${newCustomer.name}`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await setDoc(doc(db, `businesses/${businessId}/customers`, newCustomer.id), newCustomer);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Customer create cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
    return newCustomer;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : c))
    );
    addAuditLog('UPDATE', 'CUSTOMER', id, `Updated customer details`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await updateDoc(doc(db, `businesses/${businessId}/customers`, id), {
          ...updates,
          updatedAt: new Date().toISOString().split('T')[0],
        } as any);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Customer update cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  const deleteCustomer = async (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    addAuditLog('DELETE', 'CUSTOMER', id, `Deleted customer`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await deleteDoc(doc(db, `businesses/${businessId}/customers`, id));
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Customer delete cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  // Suppliers
  const addSupplier = async (supp: Omit<Supplier, 'id' | 'businessId' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => {
    const newSupplier: Supplier = {
      ...supp,
      id: `supp_${Date.now()}`,
      businessId,
      ownerUid,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    addAuditLog('CREATE', 'SUPPLIER', newSupplier.id, `Created supplier: ${newSupplier.name}`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await setDoc(doc(db, `businesses/${businessId}/suppliers`, newSupplier.id), newSupplier);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Supplier create cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
    return newSupplier;
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : s))
    );
    addAuditLog('UPDATE', 'SUPPLIER', id, `Updated supplier details`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await updateDoc(doc(db, `businesses/${businessId}/suppliers`, id), updates as any);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Supplier update cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  const deleteSupplier = async (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    addAuditLog('DELETE', 'SUPPLIER', id, `Deleted supplier`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await deleteDoc(doc(db, `businesses/${businessId}/suppliers`, id));
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Supplier delete cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  // Products
  const addProduct = async (prod: Omit<Product, 'id' | 'businessId' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...prod,
      id: `prod_${Date.now()}`,
      businessId,
      ownerUid,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setProducts((prev) => [newProduct, ...prev]);
    addAuditLog('CREATE', 'PRODUCT', newProduct.id, `Created product: ${newProduct.name}`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await setDoc(doc(db, `businesses/${businessId}/products`, newProduct.id), newProduct);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Product create cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
    return newProduct;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : p))
    );
    addAuditLog('UPDATE', 'PRODUCT', id, `Updated product details`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await updateDoc(doc(db, `businesses/${businessId}/products`, id), updates as any);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Product update cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addAuditLog('DELETE', 'PRODUCT', id, `Deleted product`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await deleteDoc(doc(db, `businesses/${businessId}/products`, id));
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Product delete cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  // Invoices
  const saveInvoice = async (
    invData: Omit<Invoice, 'id' | 'businessId' | 'ownerUid' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ): Promise<Invoice> => {
    const now = new Date().toISOString().split('T')[0];
    const invoiceId = existingId || `inv_${Date.now()}`;
    const targetBusinessId = (invData as any).businessId || businessId;
    const newInvoice: Invoice = {
      ...invData,
      id: invoiceId,
      businessId: targetBusinessId,
      ownerUid,
      createdAt: existingId ? (invoices.find((i) => i.id === existingId)?.createdAt || now) : now,
      updatedAt: now,
    };

    if (existingId) {
      setInvoices((prev) => prev.map((i) => (i.id === existingId ? newInvoice : i)));
      addAuditLog('UPDATE', 'INVOICE', invoiceId, `Updated invoice ${newInvoice.invoiceNumber}`);
    } else {
      setInvoices((prev) => [newInvoice, ...prev]);
      addAuditLog('CREATE', 'INVOICE', invoiceId, `Created ${newInvoice.invoiceType} #${newInvoice.invoiceNumber} for ₹${newInvoice.grandTotal}`);

      // Increment business next invoice number if this matches prefix
      const targetBiz = businesses.find((b) => b.id === targetBusinessId) || business;
      const currentNext = targetBiz.nextInvoiceNumber || 101;
      updateBusiness({ nextInvoiceNumber: currentNext + 1 }, targetBusinessId);
    }

    // Deduct stock if status is FINALIZED or PAID and goods
    if (newInvoice.status === 'FINALIZED' || newInvoice.status === 'PAID') {
      newInvoice.items.forEach((item) => {
        if (item.productId) {
          setProducts((prev) =>
            prev.map((p) => {
              if (p.id === item.productId && p.type === 'goods') {
                return { ...p, currentStock: Math.max(0, p.currentStock - item.quantity) };
              }
              return p;
            })
          );
        }
      });
    }

    // Update customer current balance if not fully paid
    if (newInvoice.balanceDue > 0 && newInvoice.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === newInvoice.customerId
            ? { ...c, currentBalance: (c.currentBalance || 0) + newInvoice.balanceDue }
            : c
        )
      );
    }

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await setDoc(doc(db, `businesses/${businessId}/invoices`, invoiceId), newInvoice);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Invoice save cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }

    return newInvoice;
  };

  const cancelInvoice = async (id: string, reason?: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              status: 'CANCELLED',
              notes: `${inv.notes ? inv.notes + ' | ' : ''}CANCELLED: ${reason || 'Cancelled by user'}`,
              updatedAt: new Date().toISOString().split('T')[0],
            }
          : inv
      )
    );
    addAuditLog('CANCEL', 'INVOICE', id, `Cancelled invoice ${id}: ${reason || ''}`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await updateDoc(doc(db, `businesses/${businessId}/invoices`, id), {
          status: 'CANCELLED',
          updatedAt: new Date().toISOString().split('T')[0],
        });
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Invoice cancel cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  const deleteInvoice = async (id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    addAuditLog('DELETE', 'INVOICE', id, `Deleted draft invoice ${id}`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await deleteDoc(doc(db, `businesses/${businessId}/invoices`, id));
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Invoice delete cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  // Purchases
  const addPurchase = async (p: Omit<Purchase, 'id' | 'businessId' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => {
    const newPurchase: Purchase = {
      ...p,
      id: `purch_${Date.now()}`,
      businessId,
      ownerUid,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setPurchases((prev) => [newPurchase, ...prev]);
    addAuditLog('CREATE', 'PURCHASE', newPurchase.id, `Recorded purchase bill ${newPurchase.billNumber} from ${newPurchase.supplierName}`);

    // Inward stock movement
    newPurchase.items.forEach((item) => {
      if (item.productId) {
        setProducts((prev) =>
          prev.map((prod) =>
            prod.id === item.productId && prod.type === 'goods'
              ? { ...prod, currentStock: prod.currentStock + item.quantity }
              : prod
          )
        );
      }
    });

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await setDoc(doc(db, `businesses/${businessId}/purchases`, newPurchase.id), newPurchase);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Purchase create cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
    return newPurchase;
  };

  const deletePurchase = async (id: string) => {
    setPurchases((prev) => prev.filter((p) => p.id !== id));
    addAuditLog('DELETE', 'PURCHASE', id, `Deleted purchase bill ${id}`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await deleteDoc(doc(db, `businesses/${businessId}/purchases`, id));
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Purchase delete cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  // Payments / Receipts
  const recordPayment = async (p: Omit<Payment, 'id' | 'businessId' | 'ownerUid' | 'createdAt'>) => {
    const newPayment: Payment = {
      ...p,
      id: `pay_${Date.now()}`,
      businessId,
      ownerUid,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPayments((prev) => [newPayment, ...prev]);
    addAuditLog('CREATE', 'PAYMENT', newPayment.id, `Recorded ${newPayment.type} of ₹${newPayment.amount} for ${newPayment.partyName}`);

    // If receipt against invoice, update invoice paid amount and balance
    if (newPayment.type === 'RECEIPT' && newPayment.invoiceId) {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === newPayment.invoiceId) {
            const paid = (inv.paidAmount || 0) + newPayment.amount;
            const bal = Math.max(0, inv.grandTotal - paid);
            return {
              ...inv,
              paidAmount: paid,
              balanceDue: bal,
              status: bal === 0 ? 'PAID' : 'PARTIALLY_PAID',
            };
          }
          return inv;
        })
      );
    }

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await setDoc(doc(db, `businesses/${businessId}/payments`, newPayment.id), newPayment);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Payment create cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
    return newPayment;
  };

  // Credit / Debit Notes
  const addCreditDebitNote = async (n: Omit<CreditDebitNote, 'id' | 'businessId' | 'ownerUid' | 'createdAt'>) => {
    const newNote: CreditDebitNote = {
      ...n,
      id: `note_${Date.now()}`,
      businessId,
      ownerUid,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCreditNotes((prev) => [newNote, ...prev]);
    addAuditLog('CREATE', 'CREDIT_DEBIT_NOTE', newNote.id, `Created ${newNote.noteType} #${newNote.noteNumber} against ${newNote.originalInvoiceNumber}`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await setDoc(doc(db, `businesses/${businessId}/credit_notes`, newNote.id), newNote);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Credit note cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
    return newNote;
  };

  // Expenses
  const addExpense = async (e: Omit<Expense, 'id' | 'businessId' | 'ownerUid' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...e,
      id: `exp_${Date.now()}`,
      businessId,
      ownerUid,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setExpenses((prev) => [newExpense, ...prev]);
    addAuditLog('CREATE', 'EXPENSE', newExpense.id, `Recorded expense ₹${newExpense.amount} (${newExpense.category})`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await setDoc(doc(db, `businesses/${businessId}/expenses`, newExpense.id), newExpense);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Expense create cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
    return newExpense;
  };

  const deleteExpense = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    addAuditLog('DELETE', 'EXPENSE', id, `Deleted expense entry`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await deleteDoc(doc(db, `businesses/${businessId}/expenses`, id));
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Expense delete cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  // Quotations
  const saveQuotation = async (
    q: Omit<Quotation, 'id' | 'businessId' | 'ownerUid' | 'createdAt'>,
    existingId?: string
  ) => {
    const quoteId = existingId || `quote_${Date.now()}`;
    const newQuote: Quotation = {
      ...q,
      id: quoteId,
      businessId,
      ownerUid,
      createdAt: new Date().toISOString().split('T')[0],
    };
    if (existingId) {
      setQuotations((prev) => prev.map((item) => (item.id === existingId ? newQuote : item)));
    } else {
      setQuotations((prev) => [newQuote, ...prev]);
    }
    addAuditLog('SAVE', 'QUOTATION', quoteId, `Saved quotation #${newQuote.quoteNumber}`);

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await setDoc(doc(db, `businesses/${businessId}/quotations`, quoteId), newQuote);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Quotation save cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
    return newQuote;
  };

  const deleteQuotation = async (id: string) => {
    setQuotations((prev) => prev.filter((q) => q.id !== id));
    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        await deleteDoc(doc(db, `businesses/${businessId}/quotations`, id));
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Quotation delete cloud sync note:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud write delayed');
      }
    }
  };

  const hasSampleData = Boolean(
    products.some(isSampleRecord) ||
    customers.some(isSampleRecord) ||
    invoices.some(isSampleRecord) ||
    suppliers.some(isSampleRecord) ||
    purchases.some(isSampleRecord) ||
    business.name === 'Apex Infotech & Hardware Solutions Pvt Ltd' ||
    business.gstin === '27AABCA1234F1Z8'
  );

  const clearAllSampleData = async () => {
    setCustomers((prev) => prev.filter((c) => !isSampleRecord(c)));
    setSuppliers((prev) => prev.filter((s) => !isSampleRecord(s)));
    setProducts((prev) => prev.filter((p) => !isSampleRecord(p)));
    setInvoices((prev) => prev.filter((i) => !isSampleRecord(i)));
    setPurchases((prev) => prev.filter((p) => !isSampleRecord(p)));
    setPayments((prev) => prev.filter((p) => !isSampleRecord(p)));
    setExpenses((prev) => prev.filter((e) => !isSampleRecord(e)));
    setCreditNotes((prev) => prev.filter((cn) => !isSampleRecord(cn)));
    setQuotations((prev) => prev.filter((q) => !isSampleRecord(q)));
    setAuditLogs((prev) => prev.filter((log) => !log.summary?.toLowerCase().includes('sample') && !log.summary?.toLowerCase().includes('demo')));

    if (
      business.name === 'Apex Infotech & Hardware Solutions Pvt Ltd' ||
      business.gstin === '27AABCA1234F1Z8' ||
      business.ownerUid === 'system_default'
    ) {
      setBusinesses([DEFAULT_BUSINESS]);
    }

    addAuditLog('CLEANUP', 'SYSTEM', businessId, 'Removed all demo/sample data from database');

    // Clean cloud Firestore if synced
    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        const collections = ['customers', 'suppliers', 'products', 'invoices', 'purchases', 'payments', 'expenses', 'credit_notes', 'quotations'];
        for (const col of collections) {
          const snap = await getDocs(collection(db, `businesses/${businessId}/${col}`));
          for (const d of snap.docs) {
            if (isSampleRecord(d.data())) {
              await deleteDoc(d.ref);
            }
          }
        }
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Error clearing cloud sample data:', err);
      }
    }
  };

  const clearAllData = async () => {
    setCustomers([]);
    setSuppliers([]);
    setProducts([]);
    setInvoices([]);
    setPurchases([]);
    setPayments([]);
    setExpenses([]);
    setCreditNotes([]);
    setQuotations([]);
    setAuditLogs([]);
    setBusinesses([DEFAULT_BUSINESS]);

    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }

    if (user && storageMode === 'firebase-spark' && isCloudSynced) {
      try {
        const collections = ['customers', 'suppliers', 'products', 'invoices', 'purchases', 'payments', 'expenses', 'credit_notes', 'quotations', 'audit_logs'];
        for (const col of collections) {
          const snap = await getDocs(collection(db, `businesses/${businessId}/${col}`));
          for (const d of snap.docs) {
            await deleteDoc(d.ref);
          }
        }
        await setDoc(doc(db, 'businesses', businessId), DEFAULT_BUSINESS);
        setCloudSyncStatus('synced');
      } catch (err: any) {
        console.warn('Error clearing cloud data:', err);
      }
    }
  };

  const loadDemoData = async () => {
    setBusinesses([DEMO_BUSINESS]);
    setCustomers(DEMO_CUSTOMERS);
    setSuppliers(DEMO_SUPPLIERS);
    setProducts(DEMO_PRODUCTS);
    setInvoices([]);
    setPurchases([]);
    setPayments([]);
    setExpenses([]);
    setCreditNotes([]);
    setQuotations([]);
    addAuditLog('LOAD_DEMO', 'SYSTEM', businessId, 'Loaded preview demo dataset');
  };

  const resetToSampleData = async () => {
    await clearAllData();
  };

  return (
    <BusinessContext.Provider
      value={{
        storageMode,
        setStorageMode,
        cloudSyncStatus,
        cloudSyncError,
        syncLocalToCloud,
        syncCloudToLocal,
        exportBackupJSON,
        importBackupJSON,
        clearAllSampleData,
        clearAllData,
        loadDemoData,
        hasSampleData,
        business,
        businesses,
        activeBusinessId,
        switchBusiness,
        addBusiness,
        deleteBusiness,
        setDefaultBusiness,
        updateBusiness,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        invoices,
        saveInvoice,
        cancelInvoice,
        deleteInvoice,
        purchases,
        addPurchase,
        deletePurchase,
        payments,
        recordPayment,
        creditNotes,
        addCreditDebitNote,
        expenses,
        addExpense,
        deleteExpense,
        quotations,
        saveQuotation,
        deleteQuotation,
        auditLogs,
        resetToSampleData,
        loading,
        isCloudSynced,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
