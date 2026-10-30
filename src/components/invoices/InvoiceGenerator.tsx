import React, { useState, useEffect, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  LineItem,
  Invoice,
  InvoiceType,
  InvoiceStatus,
  INDIAN_STATES,
  GST_RATES,
  GST_COMMON_UNITS,
  GstRate,
  Customer,
} from '../../types';
import {
  calculateLineItem,
  calculateInvoiceTotals,
  formatINR,
  safeAdd,
  safeSub,
} from '../../services/gstEngine';
import { generateInvoicePDF } from '../../services/pdfGenerator';
import {
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Eye,
  FileDown,
  Printer,
  Share2,
  Copy,
  AlertCircle,
  Building,
  Building2,
  UserPlus,
  RefreshCw,
  Search,
  X,
  CreditCard,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Edit3,
  FileSpreadsheet,
  Shield,
  Sliders,
  Truck,
  MapPin,
} from 'lucide-react';
import { validateGSTIN } from '../../utils/gstinValidator';
import { CompanyModal } from '../common/CompanyModal';
import { ExcelShareModal } from '../common/ExcelShareModal';

interface InvoiceGeneratorProps {
  initialInvoiceId?: string | null;
  onDone?: () => void;
  onOpenPreview?: (invoice: Invoice) => void;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  initialInvoiceId,
  onDone,
  onOpenPreview,
}) => {
  const {
    business,
    businesses,
    activeBusinessId,
    switchBusiness,
    customers,
    products,
    invoices,
    saveInvoice,
    addCustomer,
    logAppAction,
  } = useBusiness();

  const { user } = useAuth();

  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Selected or existing invoice
  const existingInvoice = useMemo(() => {
    return initialInvoiceId ? invoices.find((i) => i.id === initialInvoiceId) : null;
  }, [initialInvoiceId, invoices]);

  // Form State
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('TAX_INVOICE');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [contractNo, setContractNo] = useState<string>('');
  const [contractDate, setContractDate] = useState<string>('');

  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerGstin, setCustomerGstin] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState<string>(business.stateCode || '27');
  const [reverseCharge, setReverseCharge] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [terms, setTerms] = useState<string>(business.termsAndConditions || '');

  // Distinct Shipped-To (Consignee / Destination) state
  const [isDifferentShipTo, setIsDifferentShipTo] = useState<boolean>(false);
  const [shippingName, setShippingName] = useState<string>('');
  const [shippingGstin, setShippingGstin] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [shippingStateCode, setShippingStateCode] = useState<string>(business.stateCode || '27');
  const [shippingPhone, setShippingPhone] = useState<string>('');

  const shippingStateName = useMemo(() => {
    return INDIAN_STATES.find((s) => s.code === shippingStateCode)?.name || 'Maharashtra';
  }, [shippingStateCode]);

  // Overwriting Authority for Adjusting Amount & Round-off Override
  const [enableAuthorityAdjustment, setEnableAuthorityAdjustment] = useState<boolean>(false);
  const [manualAdjustment, setManualAdjustment] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [adjustmentAuthorizedBy, setAdjustmentAuthorizedBy] = useState<string>('Manager / Accounts Head');
  const [isManualRoundOff, setIsManualRoundOff] = useState<boolean>(false);
  const [customRoundOff, setCustomRoundOff] = useState<number>(0);

  // Line Items
  const [items, setItems] = useState<LineItem[]>([
    {
      id: 'item_init_1',
      name: '',
      hsnSac: '',
      quantity: 1,
      unit: 'NOS',
      unitPrice: 0,
      isTaxInclusive: false,
      discount: 0,
      discountType: 'PERCENT',
      taxableAmount: 0,
      gstRate: 18,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      cessRate: 0,
      cessAmount: 0,
      totalAmount: 0,
    },
  ]);

  // Status & notifications
  const [status, setStatus] = useState<InvoiceStatus>('DRAFT');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-Save States & Storage
  const AUTOSAVE_STORAGE_KEY = 'invoicepro_autosave_invoice_draft_v1';
  const userDraftKey = user ? `${AUTOSAVE_STORAGE_KEY}_${user.uid}` : AUTOSAVE_STORAGE_KEY;
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState<boolean>(false);
  const [draftInfo, setDraftInfo] = useState<{ time: string; customerName: string; itemCount: number } | null>(null);
  const cachedDraftDataRef = React.useRef<any>(null);
  const isInitialMount = React.useRef(true);

  // Inspect storage for recoverable draft on mount and whenever user or business changes
  useEffect(() => {
    if (initialInvoiceId) return;

    let isCancelled = false;

    const inspectDraft = async () => {
      // 1. First inspect local storage
      let localDraft: any = null;
      try {
        const rawUser = user ? localStorage.getItem(userDraftKey) : null;
        const rawGeneric = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
        const raw = rawUser || rawGeneric;
        if (raw) {
          localDraft = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Error reading local draft:', e);
      }

      // 2. If user is logged in, also check cloud draft in Firestore
      let cloudDraft: any = null;
      if (user && business?.id) {
        try {
          const draftDocRef = doc(db, 'businesses', business.id, 'drafts', user.uid);
          const snap = await getDoc(draftDocRef);
          if (snap.exists()) {
            cloudDraft = snap.data();
          }
        } catch (e) {
          console.warn('Error reading cloud draft:', e);
        }
      }

      if (isCancelled) return;

      const chosenDraft = cloudDraft || localDraft;
      if (
        chosenDraft &&
        (chosenDraft.customerName ||
          (chosenDraft.items && chosenDraft.items.length > 0 && chosenDraft.items[0].name))
      ) {
        cachedDraftDataRef.current = chosenDraft;
        setHasUnsavedDraft(true);
        setDraftInfo({
          time: chosenDraft.savedAt || 'earlier session',
          customerName: chosenDraft.customerName || 'Untitled customer',
          itemCount: chosenDraft.items?.length || 1,
        });
      }
    };

    inspectDraft();

    return () => {
      isCancelled = true;
    };
  }, [initialInvoiceId, user, business?.id, userDraftKey]);

  const handleRestoreDraft = () => {
    try {
      const parsed =
        cachedDraftDataRef.current ||
        (() => {
          const raw =
            (user ? localStorage.getItem(userDraftKey) : null) ||
            localStorage.getItem(AUTOSAVE_STORAGE_KEY);
          return raw ? JSON.parse(raw) : null;
        })();

      if (parsed) {
        if (parsed.invoiceType) setInvoiceType(parsed.invoiceType);
        if (parsed.invoiceNumber) setInvoiceNumber(parsed.invoiceNumber);
        if (parsed.contractNo) setContractNo(parsed.contractNo);
        if (parsed.contractDate) setContractDate(parsed.contractDate);
        if (parsed.date) setDate(parsed.date);
        if (parsed.dueDate) setDueDate(parsed.dueDate);
        if (parsed.selectedCustomerId) setSelectedCustomerId(parsed.selectedCustomerId);
        if (parsed.customerName) setCustomerName(parsed.customerName);
        if (parsed.customerGstin) setCustomerGstin(parsed.customerGstin);
        if (parsed.customerAddress) setCustomerAddress(parsed.customerAddress);
        if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone);
        if (parsed.customerEmail) setCustomerEmail(parsed.customerEmail);
        if (parsed.placeOfSupplyCode) setPlaceOfSupplyCode(parsed.placeOfSupplyCode);
        if (parsed.reverseCharge !== undefined) setReverseCharge(parsed.reverseCharge);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.terms) setTerms(parsed.terms);
        if (parsed.items && parsed.items.length > 0) setItems(parsed.items);
        if (parsed.paidAmount !== undefined) setPaidAmount(parsed.paidAmount);
        if (parsed.enableAuthorityAdjustment !== undefined)
          setEnableAuthorityAdjustment(parsed.enableAuthorityAdjustment);
        if (parsed.manualAdjustment !== undefined) setManualAdjustment(parsed.manualAdjustment);
        if (parsed.adjustmentReason) setAdjustmentReason(parsed.adjustmentReason);
        if (parsed.adjustmentAuthorizedBy) setAdjustmentAuthorizedBy(parsed.adjustmentAuthorizedBy);
        if (parsed.isManualRoundOff !== undefined) setIsManualRoundOff(parsed.isManualRoundOff);
        if (parsed.customRoundOff !== undefined) setCustomRoundOff(parsed.customRoundOff);

        if (parsed.isDifferentShipTo !== undefined) setIsDifferentShipTo(parsed.isDifferentShipTo);
        if (parsed.shippingName) setShippingName(parsed.shippingName);
        if (parsed.shippingGstin) setShippingGstin(parsed.shippingGstin);
        if (parsed.shippingAddress) setShippingAddress(parsed.shippingAddress);
        if (parsed.shippingStateCode) setShippingStateCode(parsed.shippingStateCode);
        if (parsed.shippingPhone) setShippingPhone(parsed.shippingPhone);

        setHasUnsavedDraft(false);
        setSaveSuccessMsg('Restored auto-saved draft successfully!');
        logAppAction(
          'Restored Invoice Draft',
          'AUTOSAVE',
          `Restored draft for ${parsed.customerName || 'customer'} (${parsed.items?.length || 1} items)`,
          { status: 'success' }
        );
        setTimeout(() => setSaveSuccessMsg(null), 3500);
      }
    } catch (e) {
      console.warn('Could not restore draft', e);
    }
  };

  const handleDiscardDraft = async () => {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    if (user) {
      localStorage.removeItem(userDraftKey);
    }
    if (user && business?.id) {
      try {
        await deleteDoc(doc(db, 'businesses', business.id, 'drafts', user.uid));
      } catch (err) {
        console.warn('Could not delete cloud draft:', err);
      }
    }
    cachedDraftDataRef.current = null;
    setHasUnsavedDraft(false);
    setDraftInfo(null);
    logAppAction('Discarded Draft', 'AUTOSAVE', 'Cleared invoice auto-save draft from storage', {
      status: 'info',
    });
  };

  // Debounced Auto-Save effect
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!autoSaveEnabled) return;

    const hasMeaningfulContent =
      customerName.trim().length > 0 ||
      items.some((i) => i.name.trim().length > 0 || i.unitPrice > 0);

    if (!hasMeaningfulContent) return;

    setIsAutoSaving(true);
    const timer = setTimeout(async () => {
      try {
        const draftPayload = {
          invoiceType,
          invoiceNumber,
          contractNo,
          contractDate,
          date,
          selectedCustomerId,
          customerName,
          customerGstin,
          customerAddress,
          customerPhone,
          customerEmail,
          isDifferentShipTo,
          shippingName,
          shippingGstin,
          shippingAddress,
          shippingStateCode,
          shippingPhone,
          placeOfSupplyCode,
          reverseCharge,
          notes,
          terms,
          items,
          paidAmount,
          status,
          enableAuthorityAdjustment,
          manualAdjustment,
          adjustmentReason,
          adjustmentAuthorizedBy,
          isManualRoundOff,
          customRoundOff,
          targetBusinessId: business.id,
          savedAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        };
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(draftPayload));
        if (user) {
          localStorage.setItem(userDraftKey, JSON.stringify(draftPayload));
        }
        setLastAutoSavedAt(draftPayload.savedAt);

        // Also sync draft to cloud if user is authenticated
        if (user && business?.id) {
          await setDoc(doc(db, 'businesses', business.id, 'drafts', user.uid), draftPayload);
        }
      } catch (err) {
        console.warn('Auto-save write error:', err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    autoSaveEnabled,
    customerName,
    customerGstin,
    customerAddress,
    customerPhone,
    customerEmail,
    isDifferentShipTo,
    shippingName,
    shippingGstin,
    shippingAddress,
    shippingStateCode,
    shippingPhone,
    placeOfSupplyCode,
    invoiceType,
    invoiceNumber,
    contractNo,
    contractDate,
    date,
    reverseCharge,
    notes,
    terms,
    items,
    paidAmount,
    status,
    enableAuthorityAdjustment,
    manualAdjustment,
    adjustmentReason,
    adjustmentAuthorizedBy,
    isManualRoundOff,
    customRoundOff,
    business.id,
    user,
    userDraftKey,
  ]);

  // Quick Customer Creation modal
  const [isAddingCustomerModal, setIsAddingCustomerModal] = useState<boolean>(false);
  const [newCustForm, setNewCustForm] = useState({
    name: '',
    gstin: '',
    phone: '',
    email: '',
    billingAddress: '',
    stateCode: business.stateCode || '27',
  });

  // Determine place of supply name
  const placeOfSupplyName = useMemo(() => {
    const s = INDIAN_STATES.find((st) => st.code === placeOfSupplyCode);
    return s ? s.name : 'Unknown';
  }, [placeOfSupplyCode]);

  // Recalculate line items whenever supplierStateCode or placeOfSupplyCode or item attributes change
  const recalculateAllItems = (itemList: LineItem[], targetPosCode: string) => {
    return itemList.map((item) => {
      const calc = calculateLineItem({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        gstRate: item.gstRate,
        cessRate: item.cessRate,
        isTaxInclusive: item.isTaxInclusive,
        supplierStateCode: business.stateCode,
        placeOfSupplyCode: targetPosCode,
      });

      return {
        ...item,
        taxableAmount: calc.taxableAmount,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        igstAmount: calc.igstAmount,
        cessAmount: calc.cessAmount,
        totalAmount: calc.totalAmount,
      };
    });
  };

  // Populate form if editing existing invoice
  useEffect(() => {
    if (existingInvoice) {
      setInvoiceType(existingInvoice.invoiceType);
      setInvoiceNumber(existingInvoice.invoiceNumber);
      setContractNo(existingInvoice.contractNo || '');
      setContractDate(existingInvoice.contractDate || '');
      setDate(existingInvoice.date);
      if (existingInvoice.dueDate) setDueDate(existingInvoice.dueDate);
      setSelectedCustomerId(existingInvoice.customerId);
      setCustomerName(existingInvoice.customerName);
      setCustomerGstin(existingInvoice.customerGstin || '');
      setCustomerAddress(existingInvoice.customerAddress || '');
      setCustomerPhone(existingInvoice.customerPhone || '');
      setCustomerEmail(existingInvoice.customerEmail || '');
      setPlaceOfSupplyCode(existingInvoice.placeOfSupplyCode);
      setReverseCharge(existingInvoice.reverseCharge);

      if (existingInvoice.shippingName || existingInvoice.shippingAddress || existingInvoice.shippingGstin) {
        setIsDifferentShipTo(true);
        setShippingName(existingInvoice.shippingName || '');
        setShippingGstin(existingInvoice.shippingGstin || '');
        setShippingAddress(existingInvoice.shippingAddress || '');
        setShippingStateCode(existingInvoice.shippingStateCode || existingInvoice.placeOfSupplyCode || '27');
        setShippingPhone(existingInvoice.shippingPhone || '');
      } else {
        setIsDifferentShipTo(false);
        setShippingName('');
        setShippingGstin('');
        setShippingAddress('');
        setShippingStateCode(existingInvoice.placeOfSupplyCode || '27');
        setShippingPhone('');
      }

      setNotes(existingInvoice.notes || '');
      setTerms(existingInvoice.terms || '');
      setStatus(existingInvoice.status);
      setPaidAmount(existingInvoice.paidAmount || 0);
      setItems(existingInvoice.items);

      if (existingInvoice.manualAdjustment !== undefined && existingInvoice.manualAdjustment !== 0) {
        setEnableAuthorityAdjustment(true);
        setManualAdjustment(existingInvoice.manualAdjustment);
        setAdjustmentReason(existingInvoice.adjustmentReason || '');
        setAdjustmentAuthorizedBy(existingInvoice.adjustmentAuthorizedBy || 'Manager');
      }
      if (existingInvoice.isManualRoundOff) {
        setIsManualRoundOff(true);
        setCustomRoundOff(existingInvoice.roundOff);
      }
    } else {
      // Auto-generate invoice number
      const nextNum = business.nextInvoiceNumber || 101;
      const prefix = business.invoicePrefix || 'INV/26-27/';
      setInvoiceNumber(`${prefix}${nextNum}`);
      setPlaceOfSupplyCode(business.stateCode || '27');
    }
  }, [existingInvoice, business]);

  // Handle customer selection from dropdown
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerGstin(cust.gstin || '');
      setCustomerAddress(cust.billingAddress || '');
      setCustomerPhone(cust.phone || '');
      if (cust.email) setCustomerEmail(cust.email);
      const newPos = cust.stateCode || business.stateCode;
      setPlaceOfSupplyCode(newPos);
      setItems((prev) => recalculateAllItems(prev, newPos));
    }
  };

  // Handle Place of Supply change
  const handlePlaceOfSupplyChange = (code: string) => {
    setPlaceOfSupplyCode(code);
    setItems((prev) => recalculateAllItems(prev, code));
  };

  // Line Item edits
  const handleItemFieldChange = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    const updated = [...items];
    const target = { ...updated[index], [field]: value };

    // Auto fill product properties if productId changed
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        target.name = prod.name;
        target.hsnSac = prod.hsnSac;
        target.unit = prod.unit;
        target.unitPrice = prod.sellingPrice;
        target.gstRate = prod.taxRate;
        target.cessRate = prod.cessRate || 0;
        target.isTaxInclusive = prod.isTaxInclusive;
      }
    }

    const calc = calculateLineItem({
      quantity: target.quantity,
      unitPrice: target.unitPrice,
      discount: target.discount,
      discountType: target.discountType,
      gstRate: target.gstRate,
      cessRate: target.cessRate,
      isTaxInclusive: target.isTaxInclusive,
      supplierStateCode: business.stateCode,
      placeOfSupplyCode,
    });

    target.taxableAmount = calc.taxableAmount;
    target.cgstAmount = calc.cgstAmount;
    target.sgstAmount = calc.sgstAmount;
    target.igstAmount = calc.igstAmount;
    target.cessAmount = calc.cessAmount;
    target.totalAmount = calc.totalAmount;

    updated[index] = target;
    setItems(updated);
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `item_${Date.now()}_${items.length + 1}`,
      name: '',
      hsnSac: '',
      quantity: 1,
      unit: 'NOS',
      unitPrice: 0,
      isTaxInclusive: false,
      discount: 0,
      discountType: 'PERCENT',
      taxableAmount: 0,
      gstRate: 18,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      cessRate: 0,
      cessAmount: 0,
      totalAmount: 0,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Aggregate totals with Manager/Authority adjustment and round-off override
  const totals = useMemo(() => {
    return calculateInvoiceTotals(items, {
      manualAdjustment: enableAuthorityAdjustment ? Number(manualAdjustment) || 0 : 0,
      customRoundOff: Number(customRoundOff) || 0,
      isManualRoundOff,
    });
  }, [items, enableAuthorityAdjustment, manualAdjustment, customRoundOff, isManualRoundOff]);

  const balanceDue = useMemo(() => {
    return Math.max(0, totals.grandTotal - (Number(paidAmount) || 0));
  }, [totals.grandTotal, paidAmount]);

  const isInterState = business.stateCode !== placeOfSupplyCode;

  // Save logic (Draft or Finalize)
  const handleSave = async (targetStatus: InvoiceStatus) => {
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('Please select or specify a Customer name.');
      return;
    }

    if (!invoiceNumber.trim()) {
      setFormError('Invoice Number cannot be empty.');
      return;
    }

    const validItems = items.filter((i) => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      setFormError('Please add at least one line item with item description and quantity.');
      return;
    }

    // GSTIN validation warning check
    if (customerGstin.trim()) {
      const gstinVal = validateGSTIN(customerGstin);
      if (!gstinVal.isValid) {
        setFormError(`Customer GSTIN is invalid: ${gstinVal.error}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const effectiveAdjustment = enableAuthorityAdjustment ? Number(manualAdjustment) || 0 : 0;
      const invoicePayload: Omit<Invoice, 'id' | 'businessId' | 'ownerUid' | 'createdAt' | 'updatedAt'> = {
        invoiceNumber,
        invoiceType,
        status: targetStatus,
        date,
        dueDate: undefined,
        customerId: selectedCustomerId,
        customerName,
        customerGstin,
        customerAddress,
        customerPhone,
        customerEmail,
        shippingName: isDifferentShipTo && shippingName.trim() ? shippingName.trim() : undefined,
        shippingGstin: isDifferentShipTo && shippingGstin.trim() ? shippingGstin.trim() : undefined,
        shippingAddress: isDifferentShipTo && shippingAddress.trim() ? shippingAddress.trim() : undefined,
        shippingState: isDifferentShipTo ? shippingStateName : undefined,
        shippingStateCode: isDifferentShipTo ? shippingStateCode : undefined,
        shippingPhone: isDifferentShipTo && shippingPhone.trim() ? shippingPhone.trim() : undefined,
        placeOfSupply: placeOfSupplyName,
        placeOfSupplyCode,
        isInterState,
        reverseCharge,
        contractNo: contractNo.trim() || undefined,
        contractDate: contractDate || undefined,
        items: validItems,
        subTotal: totals.subTotal,
        discountTotal: totals.discountTotal,
        totalTaxable: totals.totalTaxable,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        cessTotal: totals.cessTotal,
        roundOff: totals.roundOff,
        isManualRoundOff,
        manualAdjustment: effectiveAdjustment,
        adjustmentReason: enableAuthorityAdjustment && adjustmentReason ? adjustmentReason : undefined,
        adjustmentAuthorizedBy: enableAuthorityAdjustment && adjustmentAuthorizedBy ? adjustmentAuthorizedBy : undefined,
        grandTotal: totals.grandTotal,
        amountInWords: totals.amountInWords,
        paidAmount: targetStatus === 'PAID' ? totals.grandTotal : Number(paidAmount) || 0,
        balanceDue: targetStatus === 'PAID' ? 0 : balanceDue,
        notes,
        terms,
      };

      const saved = await saveInvoice(invoicePayload, existingInvoice?.id);
      localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
      if (user) {
        localStorage.removeItem(userDraftKey);
      }
      if (user && business?.id) {
        deleteDoc(doc(db, 'businesses', business.id, 'drafts', user.uid)).catch(() => {});
      }
      cachedDraftDataRef.current = null;
      setHasUnsavedDraft(false);
      setLastAutoSavedAt(null);

      // Log central audit app action
      logAppAction(
        existingInvoice ? 'Updated Invoice' : 'Created Invoice',
        'INVOICE',
        `${existingInvoice ? 'Updated' : 'Created'} ${invoiceType} #${saved.invoiceNumber} for ₹${totals.grandTotal.toLocaleString('en-IN')}${effectiveAdjustment !== 0 ? ` (Authority override: ${effectiveAdjustment > 0 ? '+' : ''}₹${effectiveAdjustment})` : ''}`,
        { entityId: saved.id, entityNumber: saved.invoiceNumber, status: 'success' }
      );

      setStatus(targetStatus);
      setSaveSuccessMsg(
        existingInvoice
          ? `Invoice #${saved.invoiceNumber} successfully updated!`
          : `Invoice #${saved.invoiceNumber} successfully saved as ${targetStatus}!`
      );
      setTimeout(() => setSaveSuccessMsg(null), 4000);

      if (onDone && targetStatus !== 'DRAFT') {
        setTimeout(() => onDone(), 1200);
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };


  // Quick Customer Creation
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustForm.name.trim()) return;

    try {
      const stateObj = INDIAN_STATES.find((s) => s.code === newCustForm.stateCode);
      const created = await addCustomer({
        name: newCustForm.name,
        gstin: newCustForm.gstin,
        phone: newCustForm.phone,
        email: newCustForm.email,
        billingAddress: newCustForm.billingAddress,
        state: stateObj ? stateObj.name : 'Maharashtra',
        stateCode: newCustForm.stateCode,
        currentBalance: 0,
      });

      setSelectedCustomerId(created.id);
      setCustomerName(created.name);
      setCustomerGstin(created.gstin || '');
      setCustomerAddress(created.billingAddress || '');
      setCustomerPhone(created.phone || '');
      setPlaceOfSupplyCode(created.stateCode);
      setItems((prev) => recalculateAllItems(prev, created.stateCode));
      setIsAddingCustomerModal(false);
    } catch (err: any) {
      alert('Failed to add customer: ' + err.message);
    }
  };

  // Current preview invoice object
  const currentInvoiceObj: Invoice = {
    id: existingInvoice?.id || 'temp_preview',
    businessId: business.id,
    ownerUid: business.ownerUid,
    invoiceNumber,
    invoiceType,
    status,
    date,
    dueDate: undefined,
    customerId: selectedCustomerId,
    customerName,
    customerGstin,
    customerAddress,
    customerPhone,
    customerEmail,
    shippingName: isDifferentShipTo && shippingName.trim() ? shippingName.trim() : undefined,
    shippingGstin: isDifferentShipTo && shippingGstin.trim() ? shippingGstin.trim() : undefined,
    shippingAddress: isDifferentShipTo && shippingAddress.trim() ? shippingAddress.trim() : undefined,
    shippingState: isDifferentShipTo ? shippingStateName : undefined,
    shippingStateCode: isDifferentShipTo ? shippingStateCode : undefined,
    shippingPhone: isDifferentShipTo && shippingPhone.trim() ? shippingPhone.trim() : undefined,
    placeOfSupply: placeOfSupplyName,
    placeOfSupplyCode,
    isInterState,
    reverseCharge,
    contractNo: contractNo.trim() || undefined,
    contractDate: contractDate || undefined,
    items,
    subTotal: totals.subTotal,
    discountTotal: totals.discountTotal,
    totalTaxable: totals.totalTaxable,
    cgstTotal: totals.cgstTotal,
    sgstTotal: totals.sgstTotal,
    igstTotal: totals.igstTotal,
    cessTotal: totals.cessTotal,
    roundOff: totals.roundOff,
    isManualRoundOff,
    manualAdjustment: enableAuthorityAdjustment ? Number(manualAdjustment) || 0 : 0,
    adjustmentReason: enableAuthorityAdjustment ? adjustmentReason : undefined,
    adjustmentAuthorizedBy: enableAuthorityAdjustment ? adjustmentAuthorizedBy : undefined,
    grandTotal: totals.grandTotal,
    amountInWords: totals.amountInWords,
    paidAmount: Number(paidAmount) || 0,
    balanceDue,
    notes,
    terms,
    createdAt: date,
    updatedAt: date,
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Return to Invoice Register"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">
                {existingInvoice ? `Edit Invoice: ${existingInvoice.invoiceNumber}` : 'Create New GST Tax Invoice'}
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded font-semibold ${
                  status === 'FINALIZED' || status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {status}
              </span>
              {existingInvoice && (
                <span className="text-[11px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">
                  Editing Record
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Compliant with Central Goods and Services Tax Rules, 2017
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Real-time Auto-Save Status Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            {isAutoSaving ? (
              <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Auto-saving...</span>
              </span>
            ) : lastAutoSavedAt ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Auto-saved at {lastAutoSavedAt}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-500">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Auto-save active</span>
              </span>
            )}
            <label
              className="flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-200 cursor-pointer text-slate-500 text-[11px] select-none"
              title="Toggle automatic draft saving"
            >
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
              />
              <span className="font-semibold text-slate-600">Auto</span>
            </label>
          </div>

          {/* Save Draft */}
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Save as Draft without affecting inventory balances"
          >
            <Save className="w-4 h-4" />
            <span>{existingInvoice ? 'Update Draft' : 'Save Draft'}</span>
          </button>

          {/* Preview Modal */}
          {onOpenPreview && (
            <button
              onClick={() => onOpenPreview(currentInvoiceObj)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-600" />
              <span>Preview</span>
            </button>
          )}

          {/* Download PDF */}
          <button
            onClick={() => generateInvoicePDF(currentInvoiceObj, business, 'download')}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-indigo-600" />
            <span>Download PDF</span>
          </button>

          {/* Excel Share & Download */}
          <button
            type="button"
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            title="Download or share invoice as Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>

          {/* Print */}
          <button
            onClick={() => generateInvoicePDF(currentInvoiceObj, business, 'print')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print</span>
          </button>

          {/* Finalize / Update Button */}
          <button
            onClick={() => handleSave('FINALIZED')}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{existingInvoice ? 'Update Invoice' : 'Finalize Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Editing Mode Banner */}
      {existingInvoice && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 px-4 py-3 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Editing Mode:</strong> You are modifying existing invoice{' '}
              <strong className="font-mono text-indigo-900">{existingInvoice.invoiceNumber}</strong> (originally dated{' '}
              {existingInvoice.date}). Click "Update Invoice" to save your edits.
            </span>
          </div>
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-100 rounded-lg border border-indigo-300 transition-colors cursor-pointer shrink-0"
            >
              Exit Edit
            </button>
          )}
        </div>
      )}

      {/* Recoverable Unsaved Auto-Saved Draft Banner */}
      {hasUnsavedDraft && draftInfo && !existingInvoice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-950 px-4 py-3 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Auto-Saved Draft Detected:</strong> Found an unsaved invoice draft from{' '}
              <span className="font-semibold text-amber-900">{draftInfo.time}</span> for customer{' '}
              <span className="font-bold text-amber-900">"{draftInfo.customerName}"</span> with {draftInfo.itemCount}{' '}
              item(s).
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg cursor-pointer transition-colors shadow-2xs"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-2.5 py-1 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Notifications */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Primary Invoice Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-6">
        {/* Issuing Entity / Company Selector */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-200">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                  Issuing Seller / Company
                </span>
                {business.compositionScheme && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                    Composition
                  </span>
                )}
                {business.stampUrl && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                    Seal Loaded
                  </span>
                )}
                {business.signatureUrl && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                    Sign Loaded
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-sm truncate">{business.name}</h3>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                GSTIN: <span className="font-semibold text-slate-700">{business.gstin || 'Unregistered'}</span> | State: {business.state} (Code: {business.stateCode})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {businesses.length > 1 && (
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600 hidden sm:inline">Switch Entity:</label>
                <select
                  value={business.id}
                  onChange={(e) => {
                    const newBizId = e.target.value;
                    switchBusiness(newBizId);
                    const targetBiz = businesses.find((b) => b.id === newBizId);
                    if (targetBiz && !existingInvoice) {
                      const nextNum = targetBiz.nextInvoiceNumber || 101;
                      const prefix = targetBiz.invoicePrefix || 'INV/26-27/';
                      setInvoiceNumber(`${prefix}${nextNum}`);
                      setItems((prev) => recalculateAllItems(prev, placeOfSupplyCode));
                    }
                  }}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.gstin ? b.gstin.substring(0, 8) + '...' : 'No GSTIN'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsAddCompanyModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="Add another business or legal entity"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Company</span>
            </button>
          </div>
        </div>

        {/* Section 1: Business and Invoice Meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Type</label>
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="TAX_INVOICE">Tax Invoice (Regular)</option>
              <option value="BILL_OF_SUPPLY">Bill of Supply (Exempt/Composition)</option>
              <option value="EXPORT_INVOICE">Export Invoice</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Number</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV/26-27/1"
              className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contract No</label>
              <input
                type="text"
                value={contractNo}
                onChange={(e) => setContractNo(e.target.value)}
                placeholder="e.g. CNT-001"
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contract Date</label>
              <input
                type="date"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Dedicated Columns for Billed To, Shipped To (When Different), and GST Engine */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-5 border-b border-slate-200">
          {/* Column 1: Billed To (Buyer / Recipient) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                <span>Billed To (Buyer)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCustomerModal(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Customer</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Select from Contacts</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Choose Customer or Enter Below --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.gstin ? `(${c.gstin})` : '(URP)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Customer / Trade Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (!isDifferentShipTo) setShippingName(e.target.value);
                }}
                placeholder="e.g. Bharat Logistics Ltd"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Customer GSTIN / UIN</label>
              <input
                type="text"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                placeholder="15-character GSTIN (Leave blank for URP)"
                maxLength={15}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Billing Address</label>
              <textarea
                rows={2}
                value={customerAddress}
                onChange={(e) => {
                  setCustomerAddress(e.target.value);
                  if (!isDifferentShipTo) setShippingAddress(e.target.value);
                }}
                placeholder="Street, Building, City, Pincode"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Phone / Mobile</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="accounts@buyer.com"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Column 2: Shipped To (Consignee / Destination - Dedicated Column for Bill To / Ship To Different) */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Shipped To (Consignee)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 transition-colors">
                <input
                  type="checkbox"
                  checked={isDifferentShipTo}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsDifferentShipTo(checked);
                    if (checked && !shippingName) {
                      setShippingName(customerName);
                      setShippingAddress(customerAddress);
                      setShippingStateCode(placeOfSupplyCode);
                      setShippingGstin(customerGstin);
                      setShippingPhone(customerPhone);
                    }
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Different Ship-To?</span>
              </label>
            </div>

            {!isDifferentShipTo ? (
              <div className="bg-white rounded-lg border border-slate-200 p-3.5 text-xs space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-[11px]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Same as Billing Address (Default)</span>
                </div>
                <div className="space-y-1 text-slate-600 border-t border-slate-100 pt-2 text-[11px]">
                  <div className="font-semibold text-slate-800">{customerName || 'Customer / Buyer'}</div>
                  <div className="line-clamp-2 text-slate-500">{customerAddress || 'Billing address will be used for delivery.'}</div>
                  <div className="text-slate-500">Destination: {placeOfSupplyName} ({placeOfSupplyCode})</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDifferentShipTo(true);
                    if (!shippingName) {
                      setShippingName(customerName);
                      setShippingAddress(customerAddress);
                      setShippingStateCode(placeOfSupplyCode);
                      setShippingGstin(customerGstin);
                      setShippingPhone(customerPhone);
                    }
                  }}
                  className="w-full mt-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer text-center"
                >
                  Configure Separate Delivery Destination
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Consignee / Recipient Name *
                  </label>
                  <input
                    type="text"
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    placeholder="e.g. Warehouse / Branch / Consignee"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Consignee GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={shippingGstin}
                    onChange={(e) => setShippingGstin(e.target.value.toUpperCase())}
                    placeholder="15-digit GSTIN (if separate branch/SEZ)"
                    maxLength={15}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Shipping / Delivery Address *
                  </label>
                  <textarea
                    rows={2}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Delivery site, warehouse street address, pincode"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 resize-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Destination State
                    </label>
                    <select
                      value={shippingStateCode}
                      onChange={(e) => setShippingStateCode(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st.code} value={st.code}>
                          {st.code} - {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Consignee Phone
                    </label>
                    <input
                      type="text"
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      placeholder="+91 Contact person"
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Place of Supply & Tax Treatment Engine */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>GST Tax Engine</span>
            </h4>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Place of Supply (State / Code) *
              </label>
              <select
                value={placeOfSupplyCode}
                onChange={(e) => handlePlaceOfSupplyChange(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.code} - {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Supplier State:</span>
                <span className="font-semibold text-slate-800">
                  {business.state} ({business.stateCode})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Place of Supply:</span>
                <span className="font-semibold text-slate-800">
                  {placeOfSupplyName} ({placeOfSupplyCode})
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-500">Applicable Tax:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    isInterState
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {isInterState ? 'Inter-State (IGST 100%)' : 'Intra-State (CGST + SGST)'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="rcmCheck"
                checked={reverseCharge}
                onChange={(e) => setReverseCharge(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="rcmCheck" className="text-xs text-slate-700 font-medium cursor-pointer">
                Subject to Reverse Charge (RCM)
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Line Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Goods and Services Items
              </h3>
              <p className="text-[11px] text-slate-500">
                HSN/SAC codes, quantities, decimal-safe GST calculations
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-indigo-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-2 w-14 text-center">SL No.</th>
                  <th className="py-2.5 px-2 min-w-[200px]">Item Description / Catalogue</th>
                  <th className="py-2.5 px-2 w-24">HSN / SAC</th>
                  <th className="py-2.5 px-2 w-20">Qty</th>
                  <th className="py-2.5 px-2 w-24">Unit</th>
                  <th className="py-2.5 px-2 w-24">Rate (₹)</th>
                  <th className="py-2.5 px-2 w-28">Disc (% / ₹)</th>
                  <th className="py-2.5 px-2 w-24">Taxable (₹)</th>
                  <th className="py-2.5 px-2 w-24">GST Rate</th>
                  <th className="py-2.5 px-2 w-24 text-right">Tax (₹)</th>
                  <th className="py-2.5 px-2 w-28 text-right">Total (₹)</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const lineTax = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Item Name / Autocomplete from product catalogue */}
                      <td className="py-2 px-2">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemFieldChange(idx, 'name', e.target.value)}
                            placeholder="Enter item description..."
                            className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500"
                          />
                          {products.length > 0 && (
                            <select
                              value={item.productId || ''}
                              onChange={(e) => handleItemFieldChange(idx, 'productId', e.target.value)}
                              className="w-full text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded p-1"
                            >
                              <option value="">Quick pick from Catalogue...</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} - ₹{p.sellingPrice} ({p.taxRate}% GST)
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>

                      {/* HSN/SAC */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.hsnSac}
                          onChange={(e) => handleItemFieldChange(idx, 'hsnSac', e.target.value)}
                          placeholder="84713010"
                          maxLength={8}
                          className="w-full text-xs font-mono bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>

                      {/* Quantity - Smooth typing without sticky zero */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleItemFieldChange(idx, 'quantity', val === '' ? 0 : parseFloat(val) || 0);
                          }}
                          placeholder="0"
                          className="w-full text-xs font-mono bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>

                      {/* Unit - Type any custom unit or choose from standard GST UQC list */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          list="invoice-gst-units"
                          value={item.unit || ''}
                          onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value.toUpperCase())}
                          placeholder="NOS"
                          className="w-full text-xs font-mono uppercase bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 font-semibold text-center"
                        />
                      </td>

                      {/* Unit Price (Rate) - Smooth typing */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice === 0 ? '' : item.unitPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleItemFieldChange(idx, 'unitPrice', val === '' ? 0 : parseFloat(val) || 0);
                          }}
                          placeholder="0.00"
                          className="w-full text-xs font-mono bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>

                      {/* Discount - Type % or flat ₹ with quick switch */}
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max={item.discountType === 'PERCENT' ? 100 : undefined}
                            step="any"
                            value={item.discount === 0 ? '' : item.discount}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleItemFieldChange(idx, 'discount', val === '' ? 0 : parseFloat(val) || 0);
                            }}
                            placeholder="0"
                            className="w-full text-xs font-mono bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleItemFieldChange(
                                idx,
                                'discountType',
                                item.discountType === 'PERCENT' ? 'AMOUNT' : 'PERCENT'
                              )
                            }
                            title={`Switch discount type: Currently ${
                              item.discountType === 'PERCENT' ? '% (Percent)' : '₹ (Flat Amount)'
                            }`}
                            className={`px-1.5 py-1 text-[10px] font-bold rounded border cursor-pointer select-none transition-colors shrink-0 ${
                              item.discountType === 'PERCENT'
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {item.discountType === 'PERCENT' ? '%' : '₹'}
                          </button>
                        </div>
                      </td>

                      {/* Taxable Amount */}
                      <td className="py-2 px-2 font-mono text-slate-800">
                        ₹ {item.taxableAmount.toFixed(2)}
                      </td>

                      {/* GST Rate */}
                      <td className="py-2 px-2">
                        <select
                          value={item.gstRate}
                          onChange={(e) => handleItemFieldChange(idx, 'gstRate', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-medium bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500"
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Tax Amount */}
                      <td className="py-2 px-2 text-right font-mono text-slate-600">
                        ₹ {lineTax.toFixed(2)}
                      </td>

                      {/* Line Total */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                        ₹ {item.totalAmount.toFixed(2)}
                      </td>

                      {/* Remove item button */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer disabled:opacity-30"
                          title="Remove Line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Totals Summary & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Notes and Terms */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Notes / Remarks</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Thanks for your business. Payment terms: 15 days."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Terms and Conditions</label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Tax Summary Table */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Gross Subtotal:</span>
              <span className="font-mono">₹ {totals.subTotal.toFixed(2)}</span>
            </div>

            {totals.discountTotal > 0 && (
              <div className="flex justify-between text-xs text-emerald-700">
                <span>Discount Total:</span>
                <span className="font-mono">- ₹ {totals.discountTotal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-800 font-semibold pt-1 border-t border-slate-200">
              <span>Total Taxable Value:</span>
              <span className="font-mono">₹ {totals.totalTaxable.toFixed(2)}</span>
            </div>

            {/* Intra vs Inter-State Tax Rows */}
            {!isInterState ? (
              <>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Central GST (CGST):</span>
                  <span className="font-mono">₹ {totals.cgstTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>State GST (SGST):</span>
                  <span className="font-mono">₹ {totals.sgstTotal.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-xs text-purple-700 font-medium">
                <span>Integrated GST (IGST):</span>
                <span className="font-mono">₹ {totals.igstTotal.toFixed(2)}</span>
              </div>
            )}

            {totals.cessTotal > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>GST Compensation Cess:</span>
                <span className="font-mono">₹ {totals.cessTotal.toFixed(2)}</span>
              </div>
            )}

            {/* Manager / Authority Amount Adjustment Override */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableAuthorityAdjustment}
                    onChange={(e) => setEnableAuthorityAdjustment(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>Authority Adjustment / Concession</span>
                  </span>
                </label>
                {enableAuthorityAdjustment && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase">
                    Override Active
                  </span>
                )}
              </div>

              {enableAuthorityAdjustment && (
                <div className="mt-2.5 p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-amber-900 mb-1">
                        Adjustment Amount (₹) <span className="text-[10px] text-amber-700">(use - for discount, + for charge)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500">₹</span>
                        <input
                          type="number"
                          step="any"
                          value={manualAdjustment === 0 ? '' : manualAdjustment}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualAdjustment(val === '' ? 0 : parseFloat(val) || 0);
                          }}
                          placeholder="e.g. -250.00"
                          className="w-full pl-7 pr-2 py-1.5 bg-white border border-amber-300 rounded text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-amber-900 mb-1">
                        Authorized By
                      </label>
                      <input
                        type="text"
                        value={adjustmentAuthorizedBy}
                        onChange={(e) => setAdjustmentAuthorizedBy(e.target.value)}
                        placeholder="Manager / Accounts Head"
                        className="w-full p-1.5 bg-white border border-amber-300 rounded text-xs text-slate-800 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-amber-900 mb-1">
                      Adjustment Reason / Note *
                    </label>
                    <input
                      type="text"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="e.g. MD special discount, Goodwill settlement concession, Price correction"
                      className="w-full p-1.5 bg-white border border-amber-300 rounded text-xs text-slate-800 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {manualAdjustment !== 0 && (
                    <div className="flex items-center justify-between text-[11px] pt-1 text-amber-900 font-semibold border-t border-amber-200/60">
                      <span>Applied Adjustment:</span>
                      <span className="font-mono">
                        {manualAdjustment > 0 ? '+' : ''}₹ {manualAdjustment.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Authority Round-Off Override */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <span>Round Off:</span>
                  {isManualRoundOff ? (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                      Manual
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Auto (Nearest ₹)</span>
                  )}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isManualRoundOff) {
                        setIsManualRoundOff(true);
                        setCustomRoundOff(totals.roundOff);
                      } else {
                        setIsManualRoundOff(false);
                        setCustomRoundOff(0);
                      }
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded border font-semibold transition-colors cursor-pointer ${
                      isManualRoundOff
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {isManualRoundOff ? 'Custom Round-off Active' : 'Override Round-off'}
                  </button>

                  <span className="font-mono text-xs font-semibold">
                    {totals.roundOff > 0 ? '+' : ''}₹ {totals.roundOff.toFixed(2)}
                  </span>
                </div>
              </div>

              {isManualRoundOff && (
                <div className="mt-2 p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-600 shrink-0">Custom Round-off (₹):</span>
                    <input
                      type="number"
                      step="any"
                      value={customRoundOff === 0 ? '' : customRoundOff}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomRoundOff(val === '' ? 0 : parseFloat(val) || 0);
                      }}
                      placeholder="0.00"
                      className="w-24 p-1 bg-white border border-slate-300 rounded text-right font-mono text-xs font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-slate-500">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setCustomRoundOff(0)}
                      className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-300 rounded text-[10px] font-semibold text-slate-700 cursor-pointer"
                    >
                      Exact Paise (₹0.00)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const dec = totals.unadjustedGrand - Math.floor(totals.unadjustedGrand);
                        setCustomRoundOff(Number((-dec).toFixed(2)));
                      }}
                      className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-300 rounded text-[10px] font-semibold text-slate-700 cursor-pointer"
                    >
                      Round Down
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const dec = totals.unadjustedGrand - Math.floor(totals.unadjustedGrand);
                        setCustomRoundOff(dec > 0 ? Number((1 - dec).toFixed(2)) : 0);
                      }}
                      className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-300 rounded text-[10px] font-semibold text-slate-700 cursor-pointer"
                    >
                      Round Up
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t-2 border-slate-300">
              <span>Grand Total:</span>
              <span className="font-mono text-base text-indigo-700">{formatINR(totals.grandTotal)}</span>
            </div>

            <p className="text-[11px] text-slate-500 italic pt-1 leading-snug">
              {totals.amountInWords}
            </p>

            {/* Payment record input */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-700">Amount Received Now:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">₹</span>
                <input
                  type="number"
                  min="0"
                  max={totals.grandTotal}
                  step="any"
                  value={paidAmount === 0 ? '' : paidAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPaidAmount(val === '' ? 0 : parseFloat(val) || 0);
                  }}
                  placeholder="0.00"
                  className="w-28 text-xs font-mono bg-white border border-slate-300 rounded p-1 text-right font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-between text-xs font-bold text-slate-800">
              <span>Balance Due:</span>
              <span className={`font-mono ${balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatINR(balanceDue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {isAddingCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Add New Customer</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Customer / Company Name *</label>
                <input
                  type="text"
                  required
                  value={newCustForm.name}
                  onChange={(e) => setNewCustForm({ ...newCustForm, name: e.target.value })}
                  placeholder="e.g. Acme Industries Ltd"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={newCustForm.gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const update: any = { gstin: val };
                      if (val.length >= 2) {
                        const code = val.substring(0, 2);
                        if (INDIAN_STATES.some((s) => s.code === code)) {
                          update.stateCode = code;
                        }
                      }
                      setNewCustForm({ ...newCustForm, ...update });
                    }}
                    placeholder="27AABCA..."
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">State / Code *</label>
                  <select
                    value={newCustForm.stateCode}
                    onChange={(e) => setNewCustForm({ ...newCustForm, stateCode: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newCustForm.phone}
                    onChange={(e) => setNewCustForm({ ...newCustForm, phone: e.target.value })}
                    placeholder="+91..."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustForm.email}
                    onChange={(e) => setNewCustForm({ ...newCustForm, email: e.target.value })}
                    placeholder="accounts@..."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  value={newCustForm.billingAddress}
                  onChange={(e) => setNewCustForm({ ...newCustForm, billingAddress: e.target.value })}
                  placeholder="Address..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomerModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick Company Creation Modal */}
      <CompanyModal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setIsAddCompanyModalOpen(false)}
        onSuccess={(newCompanyId) => {
          switchBusiness(newCompanyId);
          setIsAddCompanyModalOpen(false);
        }}
      />

      {/* Excel Share & Download Modal */}
      {isExcelModalOpen && (
        <ExcelShareModal
          invoice={currentInvoiceObj}
          business={business}
          onClose={() => setIsExcelModalOpen(false)}
          onActionLogged={(action, details) => {
            logAppAction(action, 'EXPORT', details, {
              entityId: currentInvoiceObj.id,
              entityNumber: currentInvoiceObj.invoiceNumber,
              status: 'success',
            });
          }}
        />
      )}

      {/* UQC Unit Autocomplete Datalist */}
      <datalist id="invoice-gst-units">
        {GST_COMMON_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </datalist>
    </div>
  );
};
