# VMR Hostel Cloud OS • Client Live Demonstration Suite

A standalone, 100% static React + Vite web application built specifically for client demonstrations and live presentations.

## 🌟 Key Highlights

- **Zero Backend Required**: Runs completely in the browser on static hosting (Vercel, Netlify, Cloudflare Pages, GitHub Pages) or local machine.
- **Persistent State**: Any new student enrolled, bed allocated, fee paid, receipt issued, or expense recorded persists in `localStorage` in real-time.
- **WhatsApp Integration Direct Hook**: Configured to redirect all automated fee reminders and digital receipt dispatches directly to phone `+91 9491554114` (with custom recipient options).
- **Rich Factory Demo Dataset**:
  - 3 Hostel Buildings (Main Wing G+3, Executive Tower B, Elite Suites North Campus)
  - 25+ detailed resident student profiles with photos, college info, KYC, parent details, and fees history.
  - 15 rooms with 33 individual beds across 3 floors with interactive visual floor plan.
  - Complete Fee collection ledger with printable and downloadable official GST PDF receipts.
  - Comprehensive P&L accounting with operating expenses and category breakdown charts.
  - Maintenance helpdesk with SLA ticketing.
  - 1-Click CSV export for Students, Occupancy, Fees, and Expenses.

---

## 🚀 Running Locally

```bash
cd demo-frontend
npm install
npm run dev
```

App will start at: `http://localhost:5174/`

---

## 📦 Deploying to Vercel or Netlify

- **Framework Preset**: Vite
- **Root Directory**: `demo-frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
