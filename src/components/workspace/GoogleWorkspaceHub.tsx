import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { GoogleSignInButton } from '../common/GoogleSignInButton';
import { WorkspaceConfirmModal } from './WorkspaceConfirmModal';
import {
  uploadInvoicePdfToDrive,
  uploadConsolidatedInvoicesToDrive,
  listDriveFiles,
  deleteDriveFile,
  createInvoiceGoogleDoc,
  createQuotationGoogleDoc,
  exportInvoicesToGoogleSheets,
  exportCustomersToGoogleSheets,
  exportProductsToGoogleSheets,
  DriveFileItem,
  WorkspaceExportResult,
} from '../../services/googleWorkspaceService';
import {
  HardDrive,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  FolderPlus,
  Trash2,
  Sparkles,
  FileUp,
  Download,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface GoogleWorkspaceHubProps {
  onOpenInvoicePreview?: (invoiceId: string) => void;
}

export const GoogleWorkspaceHub: React.FC<GoogleWorkspaceHubProps> = ({ onOpenInvoicePreview }) => {
  const { user, isWorkspaceConnected, connectWorkspace, getAccessToken } = useAuth();
  const { invoices, businesses, business, customers, products, quotations } = useBusiness();

  const [activeTab, setActiveTab] = useState<'drive' | 'docs' | 'sheets'>('drive');
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; link?: string; linkText?: string } | null>(null);

  // Modal confirmation state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    itemCount?: number;
    itemsList?: string[];
    confirmVariant?: 'primary' | 'danger';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Selected invoice for Doc generation
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices[0]?.id || '');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(quotations[0]?.id || '');

  // Fetch Drive files when workspace is connected
  const refreshDriveFiles = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      setIsLoadingFiles(true);
      const files = await listDriveFiles(token);
      setDriveFiles(files);
    } catch (err: any) {
      console.warn('Could not list drive files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (isWorkspaceConnected) {
      refreshDriveFiles();
    }
  }, [isWorkspaceConnected]);

  // Handle Connect
  const handleConnect = async () => {
    try {
      setActionLoading(true);
      const token = await connectWorkspace();
      if (token) {
        setStatusMessage({
          type: 'success',
          text: 'Google Workspace successfully connected! Google Drive, Docs, and Sheets APIs are active.',
        });
        const files = await listDriveFiles(token);
        setDriveFiles(files);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to connect Google Workspace',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Google Drive: Backup All Invoices
  const handleBackupAllInvoices = () => {
    if (invoices.length === 0) {
      setStatusMessage({ type: 'info', text: 'No invoices found to backup.' });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Backup Invoices to Google Drive',
      description: `You are about to upload a consolidated PDF archive of ${invoices.length} invoices to your Google Drive in the "Zavianoice Documents" folder.`,
      itemCount: invoices.length,
      itemsList: invoices.slice(0, 5).map((i) => `${i.invoiceNumber} - ${i.customerName}`),
      confirmVariant: 'primary',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(true);
          const token = await getAccessToken();
          if (!token) {
            await handleConnect();
            return;
          }
          const result = await uploadConsolidatedInvoicesToDrive(token, invoices, businesses);
          if (result.success && result.url) {
            setStatusMessage({
              type: 'success',
              text: `Successfully uploaded consolidated PDF (${invoices.length} invoices) to Google Drive!`,
              link: result.url,
              linkText: 'Open in Google Drive',
            });
            refreshDriveFiles();
          } else {
            setStatusMessage({ type: 'error', text: result.error || 'Upload failed' });
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Google Drive: Delete File (MANDATORY User Confirmation)
  const handleDeleteDriveFile = (file: DriveFileItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete File from Google Drive',
      description: `Are you sure you want to delete "${file.name}" from your Google Drive? This action will permanently remove the file from your Drive.`,
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(true);
          const token = await getAccessToken();
          if (!token) return;
          await deleteDriveFile(token, file.id);
          setStatusMessage({
            type: 'info',
            text: `File "${file.name}" was deleted from Google Drive.`,
          });
          refreshDriveFiles();
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Google Docs: Generate Invoice Doc
  const handleGenerateInvoiceDoc = async () => {
    const inv = invoices.find((i) => i.id === selectedInvoiceId) || invoices[0];
    if (!inv) {
      setStatusMessage({ type: 'info', text: 'Please select an invoice first.' });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Generate Google Doc for Invoice',
      description: `Create an official, editable Google Doc document for Tax Invoice ${inv.invoiceNumber} (${inv.customerName}) in your Google Drive account?`,
      confirmVariant: 'primary',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(true);
          const token = await getAccessToken();
          if (!token) {
            await handleConnect();
            return;
          }
          const invBiz = businesses.find((b) => b.id === inv.businessId) || business;
          const result = await createInvoiceGoogleDoc(token, inv, invBiz);
          if (result.success && result.url) {
            setStatusMessage({
              type: 'success',
              text: `Google Doc "${result.title}" created successfully!`,
              link: result.url,
              linkText: 'Open Google Doc in Editor',
            });
            refreshDriveFiles();
          } else {
            setStatusMessage({ type: 'error', text: result.error || 'Failed to create Google Doc' });
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Google Docs: Generate Quote Doc
  const handleGenerateQuoteDoc = async () => {
    const quote = quotations.find((q) => q.id === selectedQuoteId) || quotations[0];
    if (!quote) {
      setStatusMessage({ type: 'info', text: 'No quotations found to generate document.' });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Generate Google Doc for Quotation',
      description: `Create an editable Google Doc for Quotation ${quote.quoteNumber} (${quote.customerName})?`,
      confirmVariant: 'primary',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(true);
          const token = await getAccessToken();
          if (!token) {
            await handleConnect();
            return;
          }
          const result = await createQuotationGoogleDoc(token, quote, business);
          if (result.success && result.url) {
            setStatusMessage({
              type: 'success',
              text: `Google Doc "${result.title}" created successfully!`,
              link: result.url,
              linkText: 'Open Quotation in Google Docs',
            });
            refreshDriveFiles();
          } else {
            setStatusMessage({ type: 'error', text: result.error || 'Failed to create Google Doc' });
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Google Sheets: Export Sales Register
  const handleExportInvoicesToSheets = () => {
    if (invoices.length === 0) {
      setStatusMessage({ type: 'info', text: 'No invoices found to export.' });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Export Sales Register to Google Sheets',
      description: `Create a newly formatted Google Sheets spreadsheet with all ${invoices.length} invoices, including GST breakdown (CGST, SGST, IGST), payment statuses, and customer details?`,
      itemCount: invoices.length,
      confirmVariant: 'primary',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(true);
          const token = await getAccessToken();
          if (!token) {
            await handleConnect();
            return;
          }
          const result = await exportInvoicesToGoogleSheets(token, invoices, business);
          if (result.success && result.url) {
            setStatusMessage({
              type: 'success',
              text: `Sales Register exported to Google Sheets with ${invoices.length} rows!`,
              link: result.url,
              linkText: 'Open in Google Sheets',
            });
            refreshDriveFiles();
          } else {
            setStatusMessage({ type: 'error', text: result.error || 'Export failed' });
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Google Sheets: Export Customers
  const handleExportCustomersToSheets = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Export Customer Directory to Google Sheets',
      description: `Create a Google Sheets spreadsheet containing all ${customers.length} customer records with GSTIN, state codes, addresses, and outstanding ledger balances?`,
      itemCount: customers.length,
      confirmVariant: 'primary',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(true);
          const token = await getAccessToken();
          if (!token) {
            await handleConnect();
            return;
          }
          const result = await exportCustomersToGoogleSheets(token, customers);
          if (result.success && result.url) {
            setStatusMessage({
              type: 'success',
              text: `Customer Master exported to Google Sheets!`,
              link: result.url,
              linkText: 'Open Customer Sheet',
            });
            refreshDriveFiles();
          } else {
            setStatusMessage({ type: 'error', text: result.error || 'Export failed' });
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Google Sheets: Export Products
  const handleExportProductsToSheets = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Export Inventory to Google Sheets',
      description: `Create a Google Sheets spreadsheet containing ${products.length} products with HSN/SAC codes, GST tax rates, units, and stock quantities?`,
      itemCount: products.length,
      confirmVariant: 'primary',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(true);
          const token = await getAccessToken();
          if (!token) {
            await handleConnect();
            return;
          }
          const result = await exportProductsToGoogleSheets(token, products);
          if (result.success && result.url) {
            setStatusMessage({
              type: 'success',
              text: `Products & Inventory catalog exported to Google Sheets!`,
              link: result.url,
              linkText: 'Open Inventory Sheet',
            });
            refreshDriveFiles();
          } else {
            setStatusMessage({ type: 'error', text: result.error || 'Export failed' });
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-amber-500 via-emerald-500 to-blue-500 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Google Workspace Integration</h2>
              <p className="text-xs text-slate-500">
                Connect and sync invoices, spreadsheets, and tax documents across Google Drive, Google Docs, and Google Sheets
              </p>
            </div>
          </div>
        </div>

        {/* Auth / Connection Button */}
        <div>
          {isWorkspaceConnected ? (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Workspace Connected ({user?.email || 'Active'})</span>
              <button
                type="button"
                onClick={handleConnect}
                className="text-[11px] underline text-emerald-700 hover:text-emerald-900 ml-2"
                title="Refresh Google authorization"
              >
                Refresh
              </button>
            </div>
          ) : (
            <GoogleSignInButton
              onClick={handleConnect}
              label={user ? 'Authorize Google Workspace' : 'Sign in & Connect Workspace'}
              disabled={actionLoading}
            />
          )}
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>

          <div className="flex items-center gap-3">
            {statusMessage.link && (
              <a
                href={statusMessage.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold underline hover:opacity-80"
              >
                <span>{statusMessage.linkText || 'Open Link'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Feature Capabilities Cards (Drive, Docs, Sheets) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Google Drive Card */}
        <div
          onClick={() => setActiveTab('drive')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'drive'
              ? 'bg-blue-50/70 border-blue-300 shadow-sm ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
              Drive API v3
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Google Drive</h3>
          <p className="text-xs text-slate-500 mt-1">
            Store and backup invoice PDFs, consolidated archives, and receipts in your private Google Drive folder.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-blue-600">
            <span>Explore Drive files</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Google Docs Card */}
        <div
          onClick={() => setActiveTab('docs')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'docs'
              ? 'bg-indigo-50/70 border-indigo-300 shadow-sm ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
              Docs API v1
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Google Docs</h3>
          <p className="text-xs text-slate-500 mt-1">
            Create official, formatted GST Tax Invoices and Quotation documents editable directly in Google Docs.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-indigo-600">
            <span>Create Invoice Docs</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Google Sheets Card */}
        <div
          onClick={() => setActiveTab('sheets')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'sheets'
              ? 'bg-emerald-50/70 border-emerald-300 shadow-sm ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
              Sheets API v4
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Google Sheets</h3>
          <p className="text-xs text-slate-500 mt-1">
            Export Sales Registers, Customer Masters, and Inventory catalogs with real-time currency formatting.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-emerald-600">
            <span>Export to Sheets</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('drive')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'drive'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Google Drive Storage</span>
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'docs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Google Docs Creator</span>
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'sheets'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google Sheets Exporter</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: GOOGLE DRIVE */}
      {activeTab === 'drive' && (
        <div className="space-y-4">
          {/* Quick Actions for Drive */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Drive Backup & Synchronization</h4>
                <p className="text-xs text-slate-500">
                  Files are saved into your private Google Drive in the <strong className="text-slate-700">"Zavianoice Documents"</strong> folder.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={refreshDriveFiles}
                  disabled={isLoadingFiles}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  <span>Refresh Drive</span>
                </button>

                <button
                  type="button"
                  onClick={handleBackupAllInvoices}
                  disabled={actionLoading || invoices.length === 0}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Backup All Invoices to Drive ({invoices.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Drive Files List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">Your Files on Google Drive</h4>
                <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {driveFiles.length} items
                </span>
              </div>
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <span>Open Google Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {isLoadingFiles ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading files from Google Drive...
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <HardDrive className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                <p>No documents uploaded to Google Drive yet.</p>
                <p className="text-[11px] text-slate-400">
                  Click "Backup All Invoices to Drive" above or save an invoice from the preview modal to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {driveFiles.map((file) => (
                  <div key={file.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {file.mimeType.includes('pdf') ? (
                          <FileText className="w-4 h-4 text-rose-500" />
                        ) : file.mimeType.includes('spreadsheet') ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {file.createdTime ? new Date(file.createdTime).toLocaleString() : 'Recent'} • {file.mimeType.split('.').pop()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <span>View on Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteDriveFile(file)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete from Google Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: GOOGLE DOCS */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Generate Official Google Doc Invoices</h4>
              <p className="text-xs text-slate-500">
                Transforms any GST invoice into a fully formatted, editable Google Doc containing complete seller and buyer details, line items table, GST rate breakdowns, bank transfer credentials, and terms.
              </p>
            </div>

            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Select Invoice to Convert
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.customerName} (₹{inv.grandTotal.toFixed(2)}) - {inv.date}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerateInvoiceDoc}
                disabled={actionLoading || invoices.length === 0}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>Create Invoice Google Doc</span>
              </button>
            </div>

            {/* Quotations Google Doc section */}
            {quotations.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Or Convert a Quotation / Estimate
                  </label>
                  <select
                    value={selectedQuoteId}
                    onChange={(e) => setSelectedQuoteId(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {quotations.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.quoteNumber} - {q.customerName} (₹{q.grandTotal.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateQuoteDoc}
                  disabled={actionLoading}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Create Quote Google Doc</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: GOOGLE SHEETS */}
      {activeTab === 'sheets' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">1-Click Google Sheets Export</h4>
              <p className="text-xs text-slate-500">
                Exports live business data into styled Google Spreadsheets with frozen header rows, INR currency patterns, and column auto-resizing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Sales Register Sheet Export */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Sales Invoices Register</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Export all {invoices.length} invoices with detailed GST tax rates, HSN summary, payment states, and balance due.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportInvoicesToSheets}
                  disabled={actionLoading || invoices.length === 0}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Sales ({invoices.length})</span>
                </button>
              </div>

              {/* Customer Directory Sheet Export */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Customer Master Directory</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Export {customers.length} customer records with GSTINs, phone numbers, state codes, and current ledger balances.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCustomersToSheets}
                  disabled={actionLoading || customers.length === 0}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Customers ({customers.length})</span>
                </button>
              </div>

              {/* Products & Inventory Sheet Export */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Products & Stock Catalog</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Export {products.length} catalog items with HSN/SAC codes, GST slab rates, units, and inventory alerts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportProductsToSheets}
                  disabled={actionLoading || products.length === 0}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Products ({products.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <WorkspaceConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        itemCount={confirmModal.itemCount}
        itemsList={confirmModal.itemsList}
        confirmVariant={confirmModal.confirmVariant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isLoading={actionLoading}
      />
    </div>
  );
};
