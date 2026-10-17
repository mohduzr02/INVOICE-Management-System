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
    // gemini-3.1-pro-preview for complex tasks, gemini-3.5-flash for general, gemini-3.1-flash-lite for fast
    let selectedModel = 'gemini-3.5-flash';
    if (model === 'complex' || model === 'gemini-3.1-pro-preview') {
      selectedModel = 'gemini-3.1-pro-preview';
    } else if (model === 'fast' || model === 'gemini-3.1-flash-lite') {
      selectedModel = 'gemini-3.1-flash-lite';
    } else if (model) {
      selectedModel = model;
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
      `You are TaxPro AI, a seasoned Chartered Accountant and Indian Indirect Tax specialist for "InvoicePro GST".
Your goal is to provide accurate, reliable, practical guidance for Indian businesses, retailers, wholesalers, service providers, and accountants.
Key topics you master:
1. GST Slab Rates: 0% (Nil/Exempt), 0.1%, 0.25%, 3% (Gold/Jewellery), 5%, 12%, 18%, 28%, and Compensation Cess.
2. Place of Supply Rules (Sections 10, 11, 12, 13 of IGST Act): Intra-state (CGST + SGST) vs Inter-state (IGST).
3. HSN and SAC tariff codes for goods and services.
4. Input Tax Credit (ITC) eligibility under Section 16 and Blocked Credits under Section 17(5).
5. GSTR-1 preparation (Tables 4 B2B, 5 B2CL, 7 B2CS, 9B CDNR, 12 HSN, 13 Docs Issued) and GSTR-3B monthly return (Table 3.1, Table 4 ITC, Table 6.1 cash payment).
6. GSTR-2B monthly matching and vendor reconciliation.
7. Reverse Charge Mechanism (RCM) u/s 9(3) and 9(4).
8. E-Invoicing and E-Way bill compliance thresholds.

Respond in clear, professional, well-formatted English with concise bullet points, tax section references, and relevant numerical examples in Indian Rupees (₹) when helpful.`;

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
