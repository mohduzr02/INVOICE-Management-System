import React, { useState, useMemo } from 'react';
import { Customer, Invoice, PaymentReminderRecord, ScheduledReminderConfig } from '../../types';
import { useBusiness } from '../../context/BusinessContext';
import { formatINR } from '../../services/gstEngine';
import {
  X,
  Bell,
  Clock,
  Calendar,
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Trash2,
  FileText,
  RotateCcw,
  Sparkles,
  History,
  Eye,
  Check,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.06 7.42C8.92 7.42 8.68 7.47 8.48 7.69C8.27 7.91 7.7 8.45 7.7 9.54C7.7 10.63 8.49 11.68 8.6 11.83C8.72 11.98 10.15 14.19 12.33 15.13C14.15 15.91 14.52 15.76 14.93 15.72C15.34 15.68 16.27 15.17 16.46 14.62C16.65 14.08 16.65 13.62 16.59 13.52C16.53 13.42 16.39 13.36 16.18 13.26C15.97 13.15 14.94 12.64 14.75 12.57C14.56 12.5 14.42 12.46 14.28 12.67C14.14 12.88 13.75 13.36 13.63 13.5C13.51 13.63 13.39 13.65 13.18 13.55C12.97 13.45 12.3 13.23 11.51 12.52C10.89 11.97 10.47 11.29 10.35 11.08C10.23 10.87 10.34 10.76 10.44 10.66C10.54 10.56 10.66 10.4 10.76 10.28C10.86 10.17 10.9 10.08 10.97 9.94C11.04 9.8 11 9.68 10.95 9.58C10.9 9.47 10.48 8.45 10.31 8.03C10.14 7.62 9.97 7.68 9.84 7.67C9.72 7.67 9.58 7.66 9.44 7.66C9.31 7.66 9.17 7.66 9.06 7.42Z" />
  </svg>
);

interface CustomerRemindersModalProps {
  customer: Customer;
  onClose: () => void;
}

export const CustomerRemindersModal: React.FC<CustomerRemindersModalProps> = ({ customer, onClose }) => {
  const {
    business,
    invoices,
    reminderRecords,
    scheduledReminders,
    sendPaymentReminder,
    schedulePaymentReminder,
    updateScheduledReminder,
    cancelScheduledReminder,
    deletePaymentReminderRecord,
    logAppAction,
  } = useBusiness();

  const [activeTab, setActiveTab] = useState<'history' | 'schedules' | 'new_schedule'>('history');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [expandedRecord, setExpandedRecord] = useState<PaymentReminderRecord | null>(null);

  // Invoices for this customer
  const customerInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        (inv.customerId === customer.id || inv.customerName.toLowerCase() === customer.name.toLowerCase()) &&
        inv.status !== 'CANCELLED'
    );
  }, [invoices, customer]);

  const overdueInvoices = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return customerInvoices.filter((inv) => inv.balanceDue > 0 && !!inv.dueDate && inv.dueDate < today);
  }, [customerInvoices]);

  const unpaidInvoices = useMemo(() => {
    return customerInvoices.filter((inv) => inv.balanceDue > 0);
  }, [customerInvoices]);

  // Customer specific reminder records & scheduled reminders
  const customerReminderRecords = useMemo(() => {
    return reminderRecords.filter(
      (r) => r.customerId === customer.id || r.customerName.toLowerCase() === customer.name.toLowerCase()
    );
  }, [reminderRecords, customer]);

  const customerSchedules = useMemo(() => {
    return scheduledReminders.filter(
      (s) => s.customerId === customer.id || s.customerName.toLowerCase() === customer.name.toLowerCase()
    );
  }, [scheduledReminders, customer]);

  // New Schedule / Send Form State
  const defaultInvoice = unpaidInvoices[0] || customerInvoices[0];
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(defaultInvoice?.id || '');
  const [recipientEmail, setRecipientEmail] = useState<string>(customer.email || '');
  const [scheduleType, setScheduleType] = useState<ScheduledReminderConfig['scheduleType']>('AFTER_OVERDUE');
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [frequencyDays, setFrequencyDays] = useState<number>(7);
  const [actionMode, setActionMode] = useState<'SCHEDULE' | 'SEND_IMMEDIATE'>('SCHEDULE');

  const selectedInvoice = useMemo(() => {
    return customerInvoices.find((i) => i.id === selectedInvoiceId) || defaultInvoice;
  }, [customerInvoices, selectedInvoiceId, defaultInvoice]);

  // Default email templates
  const defaultSubject = selectedInvoice
    ? `Payment Reminder: Overdue Invoice #${selectedInvoice.invoiceNumber} (₹${selectedInvoice.balanceDue.toLocaleString('en-IN')}) - ${business.name}`
    : `Payment Reminder - ${business.name}`;

  const defaultBody = useMemo(() => {
    if (!selectedInvoice) return '';
    return `Dear ${customer.name},

Greetings from ${business.name}.

This is an automated reminder regarding payment for Invoice #${selectedInvoice.invoiceNumber}.

Invoice Details:
• Invoice Number: ${selectedInvoice.invoiceNumber}
• Invoice Date: ${selectedInvoice.date}
• Due Date: ${selectedInvoice.dueDate}
• Total Invoice Amount: ₹${selectedInvoice.grandTotal.toLocaleString('en-IN')}
• Balance Outstanding Due: ₹${selectedInvoice.balanceDue.toLocaleString('en-IN')}

Payment Remittance Details:
• Bank Name: ${business.bankName || 'N/A'}
• Account Number: ${business.accountNumber || 'N/A'}
• IFSC Code: ${business.ifsc || 'N/A'}
${business.upiId ? `• UPI Payment VPA: ${business.upiId}\n` : ''}
Kindly arrange the payment at your earliest convenience. If you have already remitted the funds, kindly disregard this notice or reply with the transaction reference.

Warm regards,
Accounts Department
${business.name}
Phone: ${business.phone || '-'} | Email: ${business.email || '-'}`;
  }, [selectedInvoice, customer.name, business]);

  const [emailSubject, setEmailSubject] = useState<string>(defaultSubject);
  const [emailTemplate, setEmailTemplate] = useState<string>(defaultBody);

  // Sync template when invoice changes
  React.useEffect(() => {
    if (selectedInvoice) {
      setEmailSubject(`Payment Reminder: Overdue Invoice #${selectedInvoice.invoiceNumber} (₹${selectedInvoice.balanceDue.toLocaleString('en-IN')}) - ${business.name}`);
      setEmailTemplate(`Dear ${customer.name},

Greetings from ${business.name}.

This is an automated reminder regarding payment for Invoice #${selectedInvoice.invoiceNumber}.

Invoice Details:
• Invoice Number: ${selectedInvoice.invoiceNumber}
• Invoice Date: ${selectedInvoice.date}
• Due Date: ${selectedInvoice.dueDate}
• Total Invoice Amount: ₹${selectedInvoice.grandTotal.toLocaleString('en-IN')}
• Balance Outstanding Due: ₹${selectedInvoice.balanceDue.toLocaleString('en-IN')}

Payment Remittance Details:
• Bank Name: ${business.bankName || 'N/A'}
• Account Number: ${business.accountNumber || 'N/A'}
• IFSC Code: ${business.ifsc || 'N/A'}
${business.upiId ? `• UPI Payment VPA: ${business.upiId}\n` : ''}
Kindly arrange the payment at your earliest convenience. If you have already remitted the funds, kindly reply with the transaction reference.

Warm regards,
Accounts Department
${business.name}`);
    }
  }, [selectedInvoiceId]);

  // Form submission: either Schedule or Send Now
  const handleScheduleOrSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) {
      alert('Please select an invoice.');
      return;
    }
    if (!recipientEmail.trim()) {
      alert('Please specify recipient email address.');
      return;
    }

    if (actionMode === 'SEND_IMMEDIATE') {
      // Send reminder immediately
      await sendPaymentReminder({
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: recipientEmail.trim(),
        customerPhone: customer.phone,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        amountDue: selectedInvoice.balanceDue,
        channel: 'EMAIL',
        subject: emailSubject,
        message: emailTemplate,
        sentBy: 'Manual Trigger (User)',
      });

      setSuccessToast(`Reminder email successfully sent for #${selectedInvoice.invoiceNumber}!`);
      setActiveTab('history');
    } else {
      // Schedule automated reminder
      await schedulePaymentReminder({
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: recipientEmail.trim(),
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        amountDue: selectedInvoice.balanceDue,
        scheduleType,
        scheduledDate,
        nextRunDate: scheduledDate,
        frequencyDays: scheduleType === 'WEEKLY_RECURRING' ? frequencyDays : undefined,
        emailSubject,
        emailTemplate,
      });

      setSuccessToast(`Automated email reminder scheduled for #${selectedInvoice.invoiceNumber} on ${scheduledDate}!`);
      setActiveTab('schedules');
    }

    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleToggleSchedule = async (schedule: ScheduledReminderConfig) => {
    const nextStatus = schedule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await updateScheduledReminder(schedule.id, { status: nextStatus });
    setSuccessToast(`Schedule #${schedule.invoiceNumber} marked as ${nextStatus}.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleCancelSchedule = async (id: string) => {
    if (confirm('Cancel this automated reminder schedule?')) {
      await cancelScheduledReminder(id);
      setSuccessToast('Automated reminder cancelled.');
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (confirm('Delete this reminder log entry?')) {
      await deletePaymentReminderRecord(id);
      setSuccessToast('Log entry removed.');
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/40 rounded-xl backdrop-blur-xs">
              <Bell className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">{customer.name}</h3>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded font-mono font-semibold">
                  {customer.gstin ? customer.gstin : 'URP'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated Payment Reminders & Full Audit Communication History
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Balance Ribbon */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[11px] text-slate-500">Outstanding Balance:</span>{' '}
              <strong className={`font-mono text-xs ${customer.currentBalance > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700'}`}>
                {formatINR(customer.currentBalance || 0)}
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Overdue Invoices:</span>{' '}
              <strong className="font-bold text-slate-800">{overdueInvoices.length}</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Active Schedules:</span>{' '}
              <strong className="font-bold text-indigo-700">
                {customerSchedules.filter((s) => s.status === 'ACTIVE').length}
              </strong>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 truncate max-w-[280px]">
            {customer.email ? (
              <span className="flex items-center gap-1 text-slate-700">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>{customer.email}</span>
              </span>
            ) : (
              <span className="text-amber-600 italic">No email on customer profile</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Reminder History ({customerReminderRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'schedules'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Scheduled Reminders ({customerSchedules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new_schedule')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'new_schedule'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule / Send Reminder</span>
          </button>
        </div>

        {/* Toast Alert */}
        {successToast && (
          <div className="mx-5 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* TAB 1: History of Sent Reminders */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                    Sent Reminders Log
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Comprehensive chronological audit trail of all email, WhatsApp, and SMS notices dispatched to this customer.
                  </p>
                </div>
                {customerReminderRecords.length > 0 && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    Total: {customerReminderRecords.length} records
                  </span>
                )}
              </div>

              {customerReminderRecords.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-400 mx-auto flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <h5 className="font-semibold text-xs text-slate-700">No Reminders Sent Yet</h5>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    No payment reminders have been sent to {customer.name} yet. Use the "Schedule / Send Reminder" tab to automate overdue notifications.
                  </p>
                  <button
                    onClick={() => setActiveTab('new_schedule')}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send First Reminder</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customerReminderRecords.map((record) => {
                    const isExpanded = expandedRecord?.id === record.id;
                    const dateFormatted = new Date(record.sentAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={record.id}
                        className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition-all text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {/* Channel Badge */}
                            {record.channel === 'EMAIL' ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                                <Mail className="w-3 h-3" />
                                <span>EMAIL</span>
                              </span>
                            ) : record.channel === 'WHATSAPP' ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                <WhatsAppIcon className="w-3 h-3" />
                                <span>WHATSAPP</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                                <span>SMS</span>
                              </span>
                            )}

                            <span className="font-bold text-slate-900">
                              Invoice #{record.invoiceNumber}
                            </span>
                            <span className="text-slate-400 font-mono">|</span>
                            <span className="font-mono font-semibold text-amber-700">
                              {formatINR(record.amountDue)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {dateFormatted}
                            </span>

                            <button
                              onClick={() => setExpandedRecord(isExpanded ? null : record)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"
                              title={isExpanded ? 'Hide message' : 'View full message'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteHistory(record.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              title="Delete log record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {record.subject && (
                          <p className="text-[11px] font-semibold text-slate-700">
                            Subject: {record.subject}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            Recipient:{' '}
                            <strong className="text-slate-700 font-mono">
                              {record.customerEmail || record.customerPhone || 'N/A'}
                            </strong>
                          </span>
                          <span>
                            Dispatched via:{' '}
                            <span className="font-semibold text-slate-700">{record.sentBy || 'System'}</span>
                          </span>
                        </div>

                        {/* Expanded Full Message Body */}
                        {isExpanded && (
                          <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {record.message}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Scheduled Automated Email Reminders */}
          {activeTab === 'schedules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                    Automated Reminder Scheduler
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Active background schedules that automatically fire email reminders when overdue conditions or scheduled run dates are met.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('new_schedule')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Create New Schedule</span>
                </button>
              </div>

              {customerSchedules.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-400 mx-auto flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h5 className="font-semibold text-xs text-slate-700">No Automated Schedules Configured</h5>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Never forget to follow up! Configure an automated schedule to email {customer.name} on overdue invoices.
                  </p>
                  <button
                    onClick={() => setActiveTab('new_schedule')}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <span>Configure Scheduler</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerSchedules.map((schedule) => {
                    const isOverdueRun = schedule.status === 'ACTIVE' && schedule.nextRunDate <= new Date().toISOString().split('T')[0];

                    return (
                      <div
                        key={schedule.id}
                        className={`bg-white border rounded-xl p-3.5 shadow-2xs text-xs space-y-2.5 transition-all ${
                          schedule.status === 'ACTIVE'
                            ? 'border-indigo-200 hover:border-indigo-300'
                            : 'border-slate-200 opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                schedule.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : schedule.status === 'PAUSED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {schedule.status}
                            </span>

                            <span className="font-bold text-slate-900 text-sm">
                              Invoice #{schedule.invoiceNumber}
                            </span>
                            <span className="font-mono font-semibold text-amber-700">
                              {formatINR(schedule.amountDue)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {schedule.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleToggleSchedule(schedule)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                                title={schedule.status === 'ACTIVE' ? 'Pause schedule' : 'Resume schedule'}
                              >
                                {schedule.status === 'ACTIVE' ? (
                                  <>
                                    <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Pause</span>
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Resume</span>
                                  </>
                                )}
                              </button>
                            )}

                            {schedule.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCancelSchedule(schedule.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="Cancel schedule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-lg text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Schedule Type:</span>
                            <strong className="text-slate-800">
                              {schedule.scheduleType === 'WEEKLY_RECURRING'
                                ? `Recurring (Every ${schedule.frequencyDays || 7} days)`
                                : schedule.scheduleType === 'AFTER_OVERDUE'
                                ? 'Overdue Follow-up'
                                : schedule.scheduleType === 'ON_DUE_DATE'
                                ? 'On Due Date'
                                : 'Specific Date'}
                            </strong>
                          </div>

                          <div>
                            <span className="text-slate-500 block">Next Run Date:</span>
                            <strong className={`font-mono ${isOverdueRun ? 'text-amber-700 font-bold' : 'text-slate-800'}`}>
                              {schedule.nextRunDate} {isOverdueRun && '(Due Today / Pending)'}
                            </strong>
                          </div>

                          <div>
                            <span className="text-slate-500 block">Recipient Email:</span>
                            <strong className="text-slate-800 font-mono truncate block" title={schedule.customerEmail}>
                              {schedule.customerEmail}
                            </strong>
                          </div>
                        </div>

                        {schedule.lastRunAt && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>Last executed on {new Date(schedule.lastRunAt).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Schedule / Send Reminder Form */}
          {activeTab === 'new_schedule' && (
            <form onSubmit={handleScheduleOrSend} className="space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Configure automated email dispatch or trigger a payment reminder right now.
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-indigo-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActionMode('SCHEDULE')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      actionMode === 'SCHEDULE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Automated Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionMode('SEND_IMMEDIATE')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      actionMode === 'SEND_IMMEDIATE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Send Immediately
                  </button>
                </div>
              </div>

              {/* Invoice Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Target Invoice *
                </label>
                {customerInvoices.length === 0 ? (
                  <p className="text-xs text-rose-600 italic">
                    No invoices generated yet for this customer. Create an invoice first!
                  </p>
                ) : (
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium focus:ring-1 focus:ring-indigo-500"
                  >
                    {customerInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        Invoice #{inv.invoiceNumber} | Total: ₹{inv.grandTotal.toLocaleString('en-IN')} | Due: ₹{inv.balanceDue.toLocaleString('en-IN')} (Due date: {inv.dueDate})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Recipient Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="accounts@customer.com"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {actionMode === 'SCHEDULE' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Schedule Trigger Type
                    </label>
                    <select
                      value={scheduleType}
                      onChange={(e) => setScheduleType(e.target.value as any)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      <option value="AFTER_OVERDUE">After Overdue (Follow-up)</option>
                      <option value="ON_DUE_DATE">On Exact Invoice Due Date</option>
                      <option value="WEEKLY_RECURRING">Weekly Recurring until balance paid</option>
                      <option value="CUSTOM_DATE">Custom Target Date</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Schedule Timing Options */}
              {actionMode === 'SCHEDULE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Execution Date (First Run) *
                    </label>
                    <input
                      type="date"
                      required
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono"
                    />
                  </div>

                  {scheduleType === 'WEEKLY_RECURRING' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Repeat Frequency (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={frequencyDays}
                        onChange={(e) => setFrequencyDays(parseInt(e.target.value) || 7)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Subject Line *
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Template Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Email Message Content
                  </label>
                  <span className="text-[10px] text-slate-400">Includes Bank & UPI details automatically</span>
                </div>
                <textarea
                  rows={8}
                  required
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono leading-relaxed focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedInvoice}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {actionMode === 'SCHEDULE' ? (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>Save Scheduled Reminder</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Reminder Email Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-500 text-[11px]">
            Automated reminders run periodically and log all executions in the customer history.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
