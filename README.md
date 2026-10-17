# InvoicePro GST — Invoice Management System

A GST-compliant billing, invoicing and accounting web app for Indian businesses. It covers the full cycle from quotation and tax invoice to purchase bills (ITC), payments, ledgers and GST return preparation (GSTR-1, GSTR-3B, GSTR-2B reconciliation), with an optional AI tax advisor.

It runs **fully offline in your browser (Local Storage)** by default, with optional **Firebase (Google sign-in) cloud sync**.

---

## Features

### Sales & Billing
- Create GST tax invoices with line items, discounts (% or amount), tax-inclusive/exclusive pricing and cess
- Automatic **CGST + SGST / IGST** split based on supplier state and place of supply
- Reverse-charge flag, round-off, and **amount in words (Indian numbering)**
- Invoice register with preview modal and PDF export (single or consolidated)
- Quotations / estimates with PDF output
- Credit & debit notes

### Parties, Products & Inventory
- Customer and supplier management with **GSTIN validation**
- Product catalogue with HSN/SAC, units and GST rates (0, 0.1, 0.25, 3, 5, 12, 18, 28%)

### Purchases & Expenses
- Purchase bills with ITC eligibility tracking (Eligible / Ineligible / Reversed)
- Expense management

### Payments & Accounting
- Payments and receipts with outstanding balance tracking
- Party-wise account ledgers
- Dashboard with financial trends

### GST Compliance
- **GSTR-1** return preparation (B2B, B2CL, B2CS, HSN summary) with Excel export
- **GSTR-3B** summary
- **GSTR-2B reconciliation**: upload the portal file and match it against your purchase register (matched, tax mismatch, missing records)

### Other
- Multi-business support, audit trail, and full JSON backup/restore
- Excel exports: sales register, purchase register, GSTR-1 worksheet, ledgers
- **TaxPro AI** chatbot for GST queries (powered by Gemini, optional)
- Installable as a desktop app (PWA)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Backend | Express (dev server + `/api/chat` endpoint) |
| Storage | Browser Local Storage (default) / Firebase Firestore (optional) |
| Auth | Firebase Authentication (Google sign-in, optional) |
| AI | Google Gemini via `@google/genai` (optional) |
| Exports | jsPDF (PDF), SheetJS `xlsx` (Excel) |
| Icons / Motion | lucide-react, motion |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher

### Quick launch
- **Windows:** double-click `run-local-windows.bat`
- **macOS / Linux:**
  ```bash
  chmod +x run-local-linux-mac.sh
  ./run-local-linux-mac.sh
  ```

### Manual setup
```bash
git clone https://github.com/mohduzr02/INVOICE-Management-System.git
cd INVOICE-Management-System
npm install
npm run dev
```
Open **http://localhost:3000**.

### Environment variables (optional)
Only needed for the AI tax advisor. Copy `.env.example` to `.env`:

```env
GEMINI_API_KEY="your_gemini_api_key"
```

Without a key, everything else (invoicing, GST calculations, PDFs, ledgers, returns) still works; the chatbot simply replies that AI is not configured.

---

## Storage Options

**1. Local Storage (default)**
No account or internet required. All data stays in your browser. Export a `.json` backup anytime from *Settings → Audit Trail & Backup*.

**2. Firebase (optional cloud sync)**
Sign in with Google to sync across devices. Works on Firebase's free Spark plan. If Firebase is unreachable or quota is exceeded, the app falls back to Local Storage. Firestore security rules in `firestore.rules` restrict each user to their own businesses and data.

To use your own Firebase project, replace the values in `firebase-applet-config.json` and deploy `firestore.rules`.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Express + Vite) on port 3000 |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |

---

## Project Structure

```
├── server.ts                  # Express server, Vite middleware, Gemini chat API
├── firestore.rules            # Firestore security rules
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── dashboard/         # Dashboard & financial trends
│   │   ├── invoices/          # Generator, register, preview
│   │   ├── quotations/
│   │   ├── credit-notes/
│   │   ├── parties/           # Customers & suppliers
│   │   ├── products/
│   │   ├── purchases/
│   │   ├── expenses/
│   │   ├── payments/
│   │   ├── ledgers/
│   │   ├── gst/               # GSTR-1, GSTR-3B, GSTR-2B reconciliation
│   │   ├── settings/          # Business settings, audit log
│   │   ├── chatbot/           # TaxPro AI advisor
│   │   ├── layout/            # Header, sidebar
│   │   └── common/
│   ├── services/
│   │   ├── gstEngine.ts       # Decimal-safe tax calculations
│   │   ├── reconciliation.ts  # GSTR-2B matching logic
│   │   ├── pdfGenerator.ts
│   │   └── excelExporter.ts
│   ├── context/               # Auth & business state
│   ├── utils/gstinValidator.ts
│   ├── firebase/config.ts
│   └── types/index.ts
```

---

## How the GST Engine Works

- All amounts use rounding-safe helpers (`round2`, `safeAdd`, `safeMul`, ...) to avoid floating-point drift.
- If the supplier state code equals the place-of-supply code, tax is split into CGST + SGST; otherwise IGST applies.
- Supports taxable value derivation from tax-inclusive prices, line discounts, and cess.

---

## Disclaimer

This tool assists with GST billing and return preparation. It does not file returns on the GST portal, and AI responses are informational, not professional tax advice. Verify figures with a qualified Chartered Accountant before filing.

---

## Author

**Mohd Uzair**
MBA (Finance), Aligarh Muslim University
GitHub: [@mohduzr02](https://github.com/mohduzr02)

## License

MIT License.
