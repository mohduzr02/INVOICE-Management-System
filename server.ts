import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize GoogleGenAI with mandatory telemetry header (optional when running purely offline locally)
const apiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Gemini Multi-Turn Chatbot API
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, model, systemRole } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!ai) {
      res.json({
        reply:
          'TaxPro AI runs via Gemini API. To enable it locally on your computer, add your GEMINI_API_KEY in the `.env` file. All GST invoicing, PDF generation, calculation engine, and accounting features run 100% offline locally without needing any API key!',
        modelUsed: 'local-offline',
      });
      return;
    }

    // Model selection based on user request or complexity
    // Use gemini-4-argon for particularly complex tasks, gemini-3.8-flash for general tasks, and gemini-3.1-flash-lite for fast tasks
    let selectedModel = 'gemini-3.8-flash';
    if (model === 'complex' || model === 'gemini-4-argon' || model === 'gemini-3.1-pro-preview') {
      selectedModel = 'gemini-4-argon';
    } else if (model === 'fast' || model === 'gemini-3.1-flash-lite') {
      selectedModel = 'gemini-3.1-flash-lite';
    } else if (model === 'general' || model === 'gemini-3.8-flash' || model === 'models/gemini-3.8-flash') {
      selectedModel = 'gemini-3.8-flash';
    } else if (model) {
      selectedModel = model.replace('models/', '');
    }

    // Build multi-turn contents array
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const turn of history) {
        if (turn.text && turn.role) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }],
          });
        }
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const systemInstruction =
      systemRole ||
      `You are TaxPro AI & App Assistant for "InvoicePro GST", a production Indian GST Invoicing, Accounting & Compliance Suite.
You have two primary expertise domains:

DOMAIN 1: INVOICEPRO GST APPLICATION & DIRECTORY SETTINGS
You know the entire application layout, settings directory, and features intimately:
- Settings Directory (/settings): Business profiles, multi-company switcher, GSTIN validation, state codes, bank remittance credentials, digital signature canvas drawing, company rubber seal, backup JSON export/import, sample data purger.
- Invoicing: Creating Tax Invoices, Bills of Supply, and Export Invoices under LUT. Line items, decimal-safe tax engine, authority/managerial adjustment overwrite (discounts/surcharges with authorized personnel & reason), manual round-off override (custom paise or auto-round to nearest rupee).
- Automated Reminders & Customer Profile (/customers): Scheduling automated email/WhatsApp/SMS reminders for overdue invoices, recurrence rules, and tracking sent history logs in the customer's profile.
- Excel Sharing & Downloads: Single invoice .xlsx generation, sales register spreadsheet export, Web Share API, WhatsApp link sharing.
- Local Offline Auto-Save: Continuous draft autosave in localStorage with restoration and discard options.
- Live App Action Log Drawer: Accessible via the Header "Actions" button to audit every transaction, draft save, reminder, and export.
- Google Workspace (/google-workspace): Saving invoice PDFs to Google Drive, generating editable Google Docs, exporting registers to Google Sheets.

DOMAIN 2: INDIAN GST LAW & ACCOUNTING RULES
- GST Slab Rates: 0% (Exempt), 0.1%, 0.25%, 3% (Gold/Jewellery), 5%, 12%, 18%, 28%, plus Compensation Cess.
- Place of Supply (IGST Act Sec 10-13): Intra-State (CGST + SGST) vs Inter-State (IGST).
- HSN & SAC 4/6/8-digit codes and UQC unit codes.
- Input Tax Credit (ITC) Section 16 eligibility, Section 17(5) blocked credits, Rule 42/43 reversals, and GSTR-2B reconciliation.
- GSTR-1, GSTR-3B return tables, Reverse Charge Mechanism (RCM) u/s 9(3) & 9(4).

Always answer with clear, structured markdown, bullet points, and helpful references to sections in the app or Indian GST law.`;

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || 'I could not generate an answer at this time.';
    res.json({ reply, modelUsed: selectedModel });
  } catch (error: any) {
    console.error('Gemini Chatbot API error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate response from Gemini API',
    });
  }
});

// Dev vs Prod Vite Integration
async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`InvoicePro GST server running on port ${PORT}`);
  });
}

bootstrap();
