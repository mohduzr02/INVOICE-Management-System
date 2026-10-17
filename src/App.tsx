/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { BusinessProvider, useBusiness } from './context/BusinessContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { InvoiceGenerator } from './components/invoices/InvoiceGenerator';
import { InvoiceRegister } from './components/invoices/InvoiceRegister';
import { InvoicePreviewModal } from './components/invoices/InvoicePreviewModal';
import { QuotationsModule } from './components/quotations/QuotationsModule';
import { CustomerManagement } from './components/parties/CustomerManagement';
import { SupplierManagement } from './components/parties/SupplierManagement';
import { ProductManagement } from './components/products/ProductManagement';
import { PurchaseManagement } from './components/purchases/PurchaseManagement';
import { PaymentManagement } from './components/payments/PaymentManagement';
import { CreditNotesModule } from './components/credit-notes/CreditNotesModule';
import { ExpenseManagement } from './components/expenses/ExpenseManagement';
import { LedgersModule } from './components/ledgers/LedgersModule';
import { Gstr1Module } from './components/gst/Gstr1Module';
import { Gstr3bModule } from './components/gst/Gstr3bModule';
import { Gstr2bReconciliation } from './components/gst/Gstr2bReconciliation';
import { BusinessSettings } from './components/settings/BusinessSettings';
import { AuditLogModal } from './components/settings/AuditLogModal';
import { RunLocalModal } from './components/common/RunLocalModal';
import { Invoice, Quotation } from './types';

function MainLayout() {
  const { invoices } = useBusiness();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Cross-module states
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [ledgerPartyId, setLedgerPartyId] = useState<string | null>(null);
  const [showRunLocalModal, setShowRunLocalModal] = useState(false);

  // Global hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + N -> New Invoice
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setEditingInvoiceId(null);
        setCurrentTab('invoice-generator');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateNewInvoice = () => {
    setEditingInvoiceId(null);
    setCurrentTab('invoice-generator');
  };

  const handleEditInvoice = (id: string) => {
    setEditingInvoiceId(id);
    setCurrentTab('invoice-generator');
  };

  const handleViewLedger = (partyId: string) => {
    setLedgerPartyId(partyId);
    setCurrentTab('ledgers');
  };

  const handleSelectInvoiceFromSearch = (invoiceId: string, action?: 'preview' | 'edit') => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (action === 'edit' || (inv && inv.status === 'DRAFT' && action !== 'preview')) {
      handleEditInvoice(invoiceId);
    } else if (inv) {
      setPreviewInvoice(inv);
    } else {
      handleEditInvoice(invoiceId);
    }
  };

  const handleSelectCustomerFromSearch = (customerId: string, action?: 'ledger' | 'details') => {
    if (action === 'ledger') {
      handleViewLedger(customerId);
    } else {
      setCurrentTab('customers');
    }
  };

  const handleSelectProductFromSearch = () => {
    setCurrentTab('products');
  };

  const handleConvertQuoteToInvoice = (quote: Quotation) => {
    // Navigate to invoice generator with quote converted
    setEditingInvoiceId(null);
    setCurrentTab('invoice-generator');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'invoice-generator') {
            setEditingInvoiceId(null);
          }
          setCurrentTab(tab);
        }}
        collapsed={sidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onNewInvoice={handleCreateNewInvoice}
          toggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onOpenRunLocal={() => setShowRunLocalModal(true)}
          onSelectInvoice={handleSelectInvoiceFromSearch}
          onSelectCustomer={handleSelectCustomerFromSearch}
          onSelectProduct={handleSelectProductFromSearch}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin">
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigate={(tab) => {
                if (tab === 'invoice-generator') setEditingInvoiceId(null);
                setCurrentTab(tab);
              }}
              onOpenInvoice={(id) => handleEditInvoice(id)}
            />
          )}

          {currentTab === 'invoice-generator' && (
            <InvoiceGenerator
              initialInvoiceId={editingInvoiceId}
              onDone={() => setCurrentTab('invoice-register')}
              onOpenPreview={(inv) => setPreviewInvoice(inv)}
            />
          )}

          {currentTab === 'invoice-register' && (
            <InvoiceRegister
              onNewInvoice={handleCreateNewInvoice}
              onEditInvoice={handleEditInvoice}
              onPreviewInvoice={(inv) => setPreviewInvoice(inv)}
            />
          )}

          {currentTab === 'quotations' && (
            <QuotationsModule onConvertToInvoice={handleConvertQuoteToInvoice} />
          )}

          {currentTab === 'customers' && (
            <CustomerManagement onViewLedger={handleViewLedger} />
          )}

          {currentTab === 'suppliers' && (
            <SupplierManagement onViewLedger={handleViewLedger} />
          )}

          {currentTab === 'products' && <ProductManagement />}

          {currentTab === 'purchases' && <PurchaseManagement />}

          {currentTab === 'expenses' && <ExpenseManagement />}

          {currentTab === 'payments' && <PaymentManagement />}

          {currentTab === 'credit-notes' && <CreditNotesModule />}

          {currentTab === 'ledgers' && <LedgersModule initialPartyId={ledgerPartyId} />}

          {currentTab === 'gstr1' && <Gstr1Module />}

          {currentTab === 'gstr3b' && <Gstr3bModule />}

          {currentTab === 'gstr2b' && <Gstr2bReconciliation />}

          {currentTab === 'settings' && <BusinessSettings />}

          {currentTab === 'audit-trail' && <AuditLogModal />}
        </main>
      </div>

      {/* Full Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}

      {/* Run Local on Computer Modal */}
      {showRunLocalModal && (
        <RunLocalModal onClose={() => setShowRunLocalModal(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <MainLayout />
      </BusinessProvider>
    </AuthProvider>
  );
}
