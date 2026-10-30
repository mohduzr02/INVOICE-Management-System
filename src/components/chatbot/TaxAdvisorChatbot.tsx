import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Bot,
  User,
  Zap,
  Brain,
  HelpCircle,
  Lightbulb,
  Search,
  BookOpen,
  MapPin,
  ExternalLink,
  ChevronRight,
  Settings,
  FileSpreadsheet,
  Bell,
  Save,
  Activity,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

export interface AppDirectoryItem {
  id: string;
  title: string;
  category: 'Settings' | 'Invoicing' | 'Reminders' | 'Exports' | 'Auditing' | 'GST Compliance';
  description: string;
  location: string;
  keywords: string[];
  suggestedPrompt: string;
}

export const APP_DIRECTORY_ITEMS: AppDirectoryItem[] = [
  {
    id: 'dir_company_profiles',
    title: 'Multi-Company Profiles & Switcher',
    category: 'Settings',
    description: 'Add multiple legal entities, trade names, state codes, and switch between companies with 1 click.',
    location: 'Settings > Registered Companies & Top Header Switcher',
    keywords: ['company', 'multi company', 'entity', 'trade name', 'switch', 'add company', 'profiles'],
    suggestedPrompt: 'How do I add multiple companies and switch between them in Settings?',
  },
  {
    id: 'dir_stamp_signature',
    title: 'Digital Signature & Rubber Stamp',
    category: 'Settings',
    description: 'Upload official company seal/rubber stamp or draw digital signature on interactive HTML5 canvas.',
    location: 'Settings > Company Rubber Stamp & Authorized Signature',
    keywords: ['stamp', 'seal', 'signature', 'sign', 'draw signature', 'canvas'],
    suggestedPrompt: 'Where do I upload company seal and draw digital signature in settings?',
  },
  {
    id: 'dir_bank_upi',
    title: 'Bank & UPI Remittance Details',
    category: 'Settings',
    description: 'Configure Bank Name, Account Number, IFSC, Branch, and instant QR/UPI ID for invoice remittances.',
    location: 'Settings > Bank & Payment Remittance Details',
    keywords: ['bank', 'account', 'ifsc', 'upi', 'payment details', 'remittance'],
    suggestedPrompt: 'Where do I configure bank account and UPI ID in settings?',
  },
  {
    id: 'dir_backup_storage',
    title: 'Database Backup JSON & Storage Engine',
    category: 'Settings',
    description: 'Export complete JSON database backup, import backups, or switch between Local Storage and Firebase Cloud.',
    location: 'Settings > Storage Engine & Database Backup',
    keywords: ['backup', 'export json', 'import', 'local storage', 'firebase', 'data', 'restore'],
    suggestedPrompt: 'How do I export and import full database backup JSON in settings?',
  },
  {
    id: 'dir_authority_adj',
    title: 'Authority Adjustment Overwrite',
    category: 'Invoicing',
    description: 'Over-writing authority for adjusting invoice amount (concessions, surcharges, managerial discounts) with reason and authorized-by validation.',
    location: 'Create Invoice > Authority / Managerial Amount Adjustment',
    keywords: ['adjustment', 'authority', 'overwrite', 'discount', 'manager', 'authorized by'],
    suggestedPrompt: 'How does the managerial authority adjustment overwrite work on invoices?',
  },
  {
    id: 'dir_manual_roundoff',
    title: 'Manual Round-Off Override',
    category: 'Invoicing',
    description: 'Authority to change roundoff from auto-round to exact custom decimal paise, round down, or round up.',
    location: 'Create Invoice > Manual Round-Off Override (Paise)',
    keywords: ['roundoff', 'round off', 'change roundoff', 'manual roundoff', 'exact paise'],
    suggestedPrompt: 'How do I change roundoff or set custom decimal paise on invoices?',
  },
  {
    id: 'dir_auto_reminders',
    title: 'Automated Overdue Email Reminders',
    category: 'Reminders',
    description: 'Schedule automated payment reminder emails for overdue invoices and inspect complete history of sent reminders in customer profile.',
    location: 'Customer Management > Reminders Button on Customer Card',
    keywords: ['reminder', 'schedule', 'email reminder', 'overdue', 'customer profile', 'history'],
    suggestedPrompt: 'How do I schedule automated email reminders and check reminder history in customer profiles?',
  },
  {
    id: 'dir_excel_share',
    title: 'Excel (.xlsx) File Share & Download',
    category: 'Exports',
    description: 'Download multi-row styled Excel workbook for any invoice or share directly via Web Share API and WhatsApp.',
    location: 'Invoice Generator, Register Row Actions, and Invoice Preview Modal',
    keywords: ['excel', 'xlsx', 'share excel', 'download excel', 'sales register'],
    suggestedPrompt: 'How do I download or share an invoice in Excel (.xlsx) format?',
  },
  {
    id: 'dir_local_autosave',
    title: 'Offline Draft Auto-Save',
    category: 'Auditing',
    description: 'Automatic continuous saving of in-progress invoice drafts to local storage with timestamp indicator and restore option.',
    location: 'Invoice Generator > Real-time Autosave Badge',
    keywords: ['autosave', 'draft', 'offline', 'restore draft', 'discard draft'],
    suggestedPrompt: 'How does invoice draft local autosave work when building an invoice?',
  },
  {
    id: 'dir_live_action_stream',
    title: 'Live App Action Log Stream',
    category: 'Auditing',
    description: 'Real-time drawer tracking every action taken on the app (invoices, payments, reminders, autosaves, exports).',
    location: 'Top Header > Actions Button',
    keywords: ['action log', 'activity feed', 'audit', 'track every action', 'history'],
    suggestedPrompt: 'Where can I see the live action audit log tracking every action taken in the app?',
  },
  {
    id: 'dir_preview_email',
    title: 'Direct Invoice Email Utility',
    category: 'Exports',
    description: 'Send invoices directly to customer email from Invoice Preview Modal via Gmail Web, Outlook Web, or Default Mail client.',
    location: 'Invoice Preview Modal > Email Button',
    keywords: ['email invoice', 'send email', 'gmail', 'outlook', 'preview email'],
    suggestedPrompt: 'How do I send an invoice directly to my customer by email from the preview modal?',
  },
];

const PRESET_PROMPTS = [
  'How do I search the settings directory and configure multi-company details?',
  'How does managerial authority amount adjustment and roundoff overwrite work?',
  'Where can I schedule automated email reminders for overdue invoices?',
  'How do I download and share an invoice in Excel (.xlsx) format?',
  'Explain Section 17(5) blocked Input Tax Credit with practical examples.',
];

interface TaxAdvisorChatbotProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialRole?: string;
  initialQuery?: string;
  onNavigate?: (tab: string) => void;
}

export const TaxAdvisorChatbot: React.FC<TaxAdvisorChatbotProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  initialRole,
  initialQuery,
  onNavigate,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const [isMinimized, setIsMinimized] = useState(false);

  // Tab mode inside chatbot: 'chat' | 'directory'
  const [activeTab, setActiveTab] = useState<'chat' | 'directory'>('chat');
  const [directorySearch, setDirectorySearch] = useState('');

  // Selected Model: gemini-3.8-flash (general default), gemini-3.1-flash-lite (fast), gemini-4-argon (complex)
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');

  // Selected Role / Persona
  const [selectedRole, setSelectedRole] = useState<string>(initialRole || 'APP_NAVIGATOR');

  // Multi-turn conversation history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'model',
      text: "Namaste! I am your AI Consultant & App Navigator for Zavianoice powered by Gemini.\n\nI can help you:\n• Search & explain any Directory Setting or App Feature (multi-company, managerial adjustments, roundoff, automated reminders, Excel share)\n• Advise on GST slab rates (0-28%), HSN/SAC codes, ITC rules u/s 16 & 17(5), and Place of Supply\n\nAsk me anything below or explore the Directory tab!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.8-flash',
    },
  ]);

  const [inputText, setInputText] = useState(initialQuery || '');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized && activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, activeTab]);

  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
  }, [initialRole]);

  useEffect(() => {
    if (initialQuery) {
      setInputText(initialQuery);
    }
  }, [initialQuery]);

  const getSystemRolePrompt = () => {
    switch (selectedRole) {
      case 'APP_NAVIGATOR':
        return `You are the official Guide and Directory Assistant for the Zavianoice application.
Explain all features with exact step-by-step instructions:
- Backup & Restore (/backup-data): One-click local JSON export of entire business database and secure JSON restore with pre-validation inspection, checksum, and safe merge or clean replace options.
- Settings Directory (/settings): Multi-company switching, GSTIN format validation, company logo, seal/stamp upload, HTML5 signature canvas drawing, bank/UPI remittance info, JSON export/import backup.
- Invoicing: Creating Tax Invoices, Bills of Supply, Export under LUT. Managerial authority adjustments (+ or -) with reasons and authorized personnel, and manual round-off override (paise adjustments or auto-round).
- Automated Reminders & Customer Profile (/customers): Reminders button on customer cards, scheduling automated email/WhatsApp/SMS reminders for overdue invoices, and sent reminder history.
- Excel Sharing: Single-invoice formatted .xlsx export, Sales Register Excel export, and Web Share API / WhatsApp sharing.
- Offline Local Draft Auto-save: Real-time saving of invoice drafts in localStorage with status indicator and restore options.
- Live Action Log Drawer: Audit trail of every action taken in the app.`;
      case 'ITC_SPECIALIST':
        return 'You are an Indian Tax specialist strictly focused on Input Tax Credit (ITC), Section 16 requirements, Section 17(5) blocked credits, Rule 42/43 reversals, and GSTR-2B reconciliation.';
      case 'HSN_EXPERT':
        return 'You are a GST Tariff and HSN/SAC code specialist. Provide accurate 4, 6, and 8-digit HSN codes, UQC units, and current GST slab notifications.';
      case 'LEGAL_COMPLEX':
        return 'You are a Senior Chartered Accountant handling complex indirect tax disputes, place of supply litigation, export under LUT vs IGST refund, and advance rulings under Indian GST law.';
      default:
        return 'You are TaxPro AI, a seasoned Chartered Accountant and Indian Indirect Tax specialist for Zavianoice assisting Indian SMEs, accountants, and traders.';
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setActiveTab('chat');
    setIsLoading(true);

    try {
      // Build history payload for multi-turn chat
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          model: selectedModel,
          systemRole: getSystemRolePrompt(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      const botMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'model',
        text: data.reply || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || selectedModel,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        text: `⚠️ Error consulting AI: ${err.message}. Please verify the backend dev server is active.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear current chat conversation history?')) {
      setMessages([
        {
          id: `welcome_${Date.now()}`,
          role: 'model',
          text: 'Conversation history reset. Ask me anything about Zavianoice features, settings directory, or Indian GST law!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: selectedModel,
        },
      ]);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  // Filter directory items
  const filteredDirectory = APP_DIRECTORY_ITEMS.filter((item) => {
    if (!directorySearch.trim()) return true;
    const q = directorySearch.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  return (
    <>
      {/* Floating Trigger Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => {
            setInternalIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-indigo-500/25 transition-all cursor-pointer group scale-100 hover:scale-105"
          title="Open AI GST & App Directory Assistant"
        >
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          <span className="text-xs font-bold tracking-wide">Ask TaxPro AI</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-5 right-5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 transition-all duration-200 flex flex-col overflow-hidden ${
            isMinimized
              ? 'w-80 h-14'
              : 'w-[94vw] sm:w-[460px] md:w-[500px] h-[600px] max-h-[88vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs tracking-tight">TaxPro AI Assistant</h3>
                  <span className="text-[9px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.2 rounded font-mono">
                    Gemini 3.8
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-none">App Directory & GST Consultant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Navigation Tabs: Chat vs Directory Search */}
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 text-xs">
                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                      activeTab === 'chat'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chatbot</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('directory')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                      activeTab === 'directory'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Search Directory</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1 py-0.2 rounded-full">
                      {APP_DIRECTORY_ITEMS.length}
                    </span>
                  </button>
                </div>

                {/* Model Selector */}
                <div className="flex items-center gap-1">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    title="Select Gemini Model: gemini-3.8-flash for general, gemini-3.1-flash-lite for fast, gemini-4-argon for complex tasks"
                  >
                    <option value="gemini-3.8-flash">gemini-3.8-flash (General)</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
                    <option value="gemini-4-argon">gemini-4-argon (Complex)</option>
                  </select>
                </div>
              </div>

              {activeTab === 'chat' ? (
                <>
                  {/* Persona Bar */}
                  <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] shrink-0">
                    <span className="text-slate-500 font-medium">Assistant Persona:</span>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 text-[11px] text-slate-700 font-medium cursor-pointer"
                    >
                      <option value="APP_NAVIGATOR">Role: App Guide & Directory</option>
                      <option value="GST_ADVISOR">Role: GST Tax Advisor</option>
                      <option value="ITC_SPECIALIST">Role: ITC & Reversal Specialist</option>
                      <option value="HSN_EXPERT">Role: HSN Tariff & Rates</option>
                      <option value="LEGAL_COMPLEX">Role: Senior CA (Audit & Legal)</option>
                    </select>
                  </div>

                  {/* Message Thread (Scrollable) */}
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs bg-slate-50/50 scrollbar-thin">
                    {messages.map((msg) => {
                      const isUser = msg.role === 'user';

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isUser && (
                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                          )}

                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs leading-relaxed whitespace-pre-wrap ${
                              isUser
                                ? 'bg-indigo-600 text-white rounded-tr-xs'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                            }`}
                          >
                            <div>{msg.text}</div>
                            <div
                              className={`mt-1 flex items-center gap-2 text-[9px] ${
                                isUser ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'
                              }`}
                            >
                              <span>{msg.timestamp}</span>
                              {msg.modelUsed && <span>• {msg.modelUsed}</span>}
                            </div>
                          </div>

                          {isUser && (
                            <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isLoading && (
                      <div className="flex gap-2.5 items-center text-xs text-slate-500">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 text-slate-600 flex items-center gap-2 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]"></span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Analyzing with {selectedModel}...
                          </span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggested Quick Prompts */}
                  {messages.length <= 2 && (
                    <div className="p-2 bg-white border-t border-slate-200 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none">
                      {PRESET_PROMPTS.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(p)}
                          className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 transition-colors shrink-0 cursor-pointer"
                        >
                          {p.length > 42 ? p.substring(0, 40) + '...' : p}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Chat Input Box */}
                  <div className="p-2.5 bg-white border-t border-slate-200 shrink-0">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Ask about app features, directory settings, or GST rules..."
                        className="flex-1 bg-slate-100 text-xs text-slate-800 placeholder-slate-400 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                      />

                      <button
                        type="submit"
                        disabled={!inputText.trim() || isLoading}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title="Send Query"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                /* Directory Search Tab */
                <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
                  {/* Search Input */}
                  <div className="p-3 bg-white border-b border-slate-200 space-y-2 shrink-0">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={directorySearch}
                        onChange={(e) => setDirectorySearch(e.target.value)}
                        placeholder="Search settings directory, features, keywords..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 overflow-x-auto pb-0.5 scrollbar-none">
                      <span className="font-semibold text-slate-700">Quick Filters:</span>
                      {['Settings', 'Invoicing', 'Reminders', 'Exports', 'Auditing'].map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setDirectorySearch(filter)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-full border border-slate-200 cursor-pointer whitespace-nowrap"
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Directory Items List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {filteredDirectory.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs">
                        No directory settings found matching "{directorySearch}". Try searching "company", "roundoff", "remind", "excel", or "stamp".
                      </div>
                    ) : (
                      filteredDirectory.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all shadow-2xs space-y-1.5 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                                {item.category}
                              </span>
                              <h4 className="font-bold text-slate-900 leading-tight">{item.title}</h4>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono truncate max-w-[140px]">
                              {item.location}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 leading-snug">{item.description}</p>

                          <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-[10px]">
                            <span className="text-slate-400">
                              Keywords: {item.keywords.slice(0, 3).join(', ')}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleSendMessage(item.suggestedPrompt);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span>Ask AI About This</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};
