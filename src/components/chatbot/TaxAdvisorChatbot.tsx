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
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

const PRESET_PROMPTS = [
  'What is the GST slab rate on software services and SaaS in India?',
  'Explain Section 17(5) blocked Input Tax Credit with practical examples.',
  'How do I determine Place of Supply for inter-state consulting services?',
  'What are the mandatory invoice rules and HSN digit requirements for ₹5 Cr+ turnover?',
];

export const TaxAdvisorChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Selected Model: gemini-3.5-flash (general), gemini-3.1-flash-lite (fast), gemini-3.1-pro-preview (complex)
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');

  // Selected Role / Persona
  const [selectedRole, setSelectedRole] = useState<string>('GST_ADVISOR');

  // Multi-turn conversation history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'model',
      text: "Namaste! I am your AI Indian GST & Tax Accounting Consultant for InvoicePro GST. Ask me anything about GST slab rates (0-28%), HSN/SAC classifications, Input Tax Credit (ITC) eligibility under Section 16 & 17(5), Place of Supply rules, or GSTR-1/3B filing procedures.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.5-flash',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const getSystemRolePrompt = () => {
    switch (selectedRole) {
      case 'ITC_SPECIALIST':
        return 'You are an Indian Tax specialist strictly focused on Input Tax Credit (ITC), Section 16 requirements, Section 17(5) blocked credits, Rule 42/43 reversals, and GSTR-2B reconciliation.';
      case 'HSN_EXPERT':
        return 'You are a GST Tariff and HSN/SAC code specialist. Provide accurate 4, 6, and 8-digit HSN codes, UQC units, and current GST slab notifications.';
      case 'LEGAL_COMPLEX':
        return 'You are a Senior Chartered Accountant handling complex indirect tax disputes, place of supply litigation, export under LUT vs IGST refund, and advance rulings under Indian GST law.';
      default:
        return 'You are TaxPro AI, a seasoned Chartered Accountant and Indian Indirect Tax specialist for InvoicePro GST assisting Indian SMEs, accountants, and traders.';
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
        text: `⚠️ Error consulting AI: ${err.message}. Please ensure the server is running and your network is connected.`,
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
          text: 'Conversation history reset. How can I assist you with Indian GST or bookkeeping today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: selectedModel,
        },
      ]);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-indigo-500/25 transition-all cursor-pointer group scale-100 hover:scale-105"
          title="Open AI GST Advisor"
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
              : 'w-[92vw] sm:w-[440px] md:w-[480px] h-[580px] max-h-[85vh]'
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
                  <h3 className="font-bold text-xs tracking-tight">TaxPro AI</h3>
                  <span className="text-[9px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.2 rounded font-mono">
                    Gemini
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-none">Indian GST & Accounting Consultant</p>
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
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Model & Persona Selection Bar */}
              <div className="bg-slate-50 border-b border-slate-200 p-2 text-[11px] flex items-center justify-between gap-2 shrink-0">
                {/* Model selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Model:</span>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="gemini-3.5-flash">gemini-3.5-flash (General)</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex)</option>
                  </select>
                </div>

                {/* Role selector */}
                <div className="flex items-center gap-1">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] text-slate-700"
                  >
                    <option value="GST_ADVISOR">Role: GST Advisor</option>
                    <option value="ITC_SPECIALIST">Role: ITC Specialist</option>
                    <option value="HSN_EXPERT">Role: HSN Tariff</option>
                    <option value="LEGAL_COMPLEX">Role: Legal CA</option>
                  </select>
                </div>
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
                        Analyzing GST provisions ({selectedModel})...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Quick Prompts (shown if few messages) */}
              {messages.length <= 2 && (
                <div className="p-2 bg-white border-t border-slate-200 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none">
                  {PRESET_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(p)}
                      className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 transition-colors shrink-0 cursor-pointer"
                    >
                      {p.length > 40 ? p.substring(0, 38) + '...' : p}
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
                    placeholder="Ask about GST slabs, HSN, ITC rules, or returns..."
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
          )}
        </div>
      )}
    </>
  );
};
