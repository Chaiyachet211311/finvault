const express = require("express");
const cors = require("cors");
const path = require("path");
// const fs = require("fs");
// require("dotenv").config();
if (process.env.NODE_ENV !== 'production') require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname)));  

// ── CONFIG ────────────────────────────────────
// const CLAUDE_API_KEY = "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";
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const PORT = 3000;
const DB_FILE = path.join(__dirname, "db.json");
// ─────────────────────────────────────────────

// function loadDB() {
//   try {
//     if (fs.existsSync(DB_FILE)) {
//       return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
//     }
//   } catch (e) {
//     console.log("Could not load db.json, starting fresh");
//   }
//   return {
//     transactions: [],
//     investments: [
//       { id: 1, ticker: "VWCE",    name: "Vanguard All-World ETF", shares: 45,   price: 128.40, cost: 110.20, type: "ETF"    },
//       { id: 2, ticker: "ASML",    name: "ASML Holding NV",        shares: 3,    price: 842.50, cost: 790.00, type: "Stock"  },
//       { id: 3, ticker: "CSPX",    name: "iShares Core S&P 500",   shares: 20,   price: 515.80, cost: 480.00, type: "ETF"    },
//       { id: 4, ticker: "BTC-USD", name: "Bitcoin",                shares: 0.12, price: 68400,  cost: 52000,  type: "Crypto" },
//       { id: 5, ticker: "ETH-USD", name: "Ethereum",               shares: 1.5,  price: 3200,   cost: 2800,   type: "Crypto" },
//     ],
//     income: [
//       { id: 1, source: "Salary",           amount: 4200, frequency: "Monthly",   category: "Employment" },
//       { id: 2, source: "Freelance Design", amount: 850,  frequency: "Variable",  category: "Freelance"  },
//       { id: 3, source: "Dividend — VWCE",  amount: 120,  frequency: "Quarterly", category: "Investment" },
//       { id: 4, source: "Rental Income",    amount: 650,  frequency: "Monthly",   category: "Property"   },
//     ],
//     budgets: [
//       { id: 1, cat: "Groceries",     limit: 400, spent: 0 },
//       { id: 2, cat: "Dining",        limit: 200, spent: 0 },
//       { id: 3, cat: "Transport",     limit: 150, spent: 0 },
//       { id: 4, cat: "Shopping",      limit: 300, spent: 0 },
//       { id: 5, cat: "Entertainment", limit: 100, spent: 0 },
//       { id: 6, cat: "Utilities",     limit: 180, spent: 0 },
//     ],
//     networth: {
//       assets: [
//         { id: 1, name: "Investment Portfolio", value: 28640,  color: "#00c87a" },
//         { id: 2, name: "Savings Account",      value: 12000,  color: "#00c8f0" },
//         { id: 3, name: "Checking Account",     value: 3400,   color: "#9b6dff" },
//         { id: 4, name: "Property Value",       value: 180000, color: "#f5a623" },
//       ],
//       liabilities: [
//         { id: 1, name: "Mortgage",     value: 142000, color: "#ff4560" },
//         { id: 2, name: "Student Loan", value: 8200,   color: "#f5a623" },
//         { id: 3, name: "Credit Card",  value: 1200,   color: "#f06292" },
//       ],
//     },
//   };
// }

// function saveDB() {
//   try {
//     fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
//   } catch (e) {
//     console.error("Could not save db.json:", e.message);
//   }
// }

async function loadDB() {
  try {
    const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    const data = await r.json();
    console.log('📂 Database loaded from JSONBin');
    return data.record;
  } catch(e) {
    console.log('Could not load from JSONBin:', e.message);
    return { transactions: [], investments: [], income: [], budgets: [], networth: { assets: [], liabilities: [] } };
  }
}

async function saveDB() {
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
      body: JSON.stringify(db)
    });
  } catch(e) {
    console.error('Could not save to JSONBin:', e.message);
  }
}

let db = loadDB();
console.log(`📂 Database loaded — ${db.transactions.length} transactions`);

// ── TRANSACTIONS ─────────────────────────────
app.get("/transactions", (req, res) => res.json(db.transactions));

app.post("/transactions", (req, res) => {
  const tx = { id: Date.now(), source: "manual", ...req.body };
  db.transactions.push(tx);
  saveDB();
  res.json({ success: true, transaction: tx });
});

app.put("/transactions/:id", (req, res) => {
  const idx = db.transactions.findIndex((t) => t.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  db.transactions[idx] = { ...db.transactions[idx], ...req.body };
  saveDB();
  res.json({ success: true, transaction: db.transactions[idx] });
});

app.delete("/transactions/:id", (req, res) => {
  db.transactions = db.transactions.filter((t) => t.id !== parseInt(req.params.id));
  saveDB();
  res.json({ success: true });
});

// ── INVESTMENTS ───────────────────────────────
app.get("/investments", (req, res) => res.json(db.investments));

app.post("/investments", (req, res) => {
  const inv = { id: Date.now(), ...req.body };
  db.investments.push(inv);
  saveDB();
  res.json({ success: true, investment: inv });
});

app.put("/investments/:id", (req, res) => {
  const idx = db.investments.findIndex((i) => i.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  db.investments[idx] = { ...db.investments[idx], ...req.body };
  saveDB();
  res.json({ success: true });
});

app.delete("/investments/:id", (req, res) => {
  db.investments = db.investments.filter((i) => i.id !== parseInt(req.params.id));
  saveDB();
  res.json({ success: true });
});

// ── INCOME ────────────────────────────────────
app.get("/income", (req, res) => res.json(db.income));

app.post("/income", (req, res) => {
  const item = { id: Date.now(), ...req.body };
  db.income.push(item);
  saveDB();
  res.json({ success: true, income: item });
});

app.put("/income/:id", (req, res) => {
  const idx = db.income.findIndex((i) => i.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  db.income[idx] = { ...db.income[idx], ...req.body };
  saveDB();
  res.json({ success: true });
});

app.delete("/income/:id", (req, res) => {
  db.income = db.income.filter((i) => i.id !== parseInt(req.params.id));
  saveDB();
  res.json({ success: true });
});

// ── BUDGETS ───────────────────────────────────
app.get("/budgets", (req, res) => res.json(db.budgets));

app.post("/budgets", (req, res) => {
  const item = { id: Date.now(), spent: 0, ...req.body };
  db.budgets.push(item);
  saveDB();
  res.json({ success: true });
});

app.put("/budgets/:id", (req, res) => {
  const idx = db.budgets.findIndex((b) => b.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  db.budgets[idx] = { ...db.budgets[idx], ...req.body };
  saveDB();
  res.json({ success: true });
});

app.delete("/budgets/:id", (req, res) => {
  db.budgets = db.budgets.filter((b) => b.id !== parseInt(req.params.id));
  saveDB();
  res.json({ success: true });
});

// ── NET WORTH ─────────────────────────────────
app.get("/networth", (req, res) => res.json(db.networth));

app.put("/networth", (req, res) => {
  db.networth = req.body;
  saveDB();
  res.json({ success: true });
});

// ── FULL DB ───────────────────────────────────
app.get("/db", (req, res) => res.json(db));

app.put("/db", (req, res) => {
  const allowed = ["investments", "income", "budgets", "networth"];
  allowed.forEach((k) => { if (req.body[k]) db[k] = req.body[k]; });
  saveDB();
  res.json({ success: true });
});

// ── WHATSAPP WEBHOOK ──────────────────────────
app.post("/webhook", async (req, res) => {
  const message = req.body.Body;
  const from = req.body.From;
  console.log(`📱 Message from ${from}: ${message}`);

  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>Processing your transaction...</Message></Response>`);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Parse this financial transaction and return ONLY raw JSON (no markdown) with keys: merchant, amount (negative=expense), category (Groceries/Dining/Transport/Health/Shopping/Utilities/Entertainment/Income/Other), date (YYYY-MM-DD, today=${new Date().toISOString().slice(0,10)}), note (max 30 chars). Message: "${message}"`,
        }],
      }),
    });

    const data = await response.json();
    const text = data.content[0].text.trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const tx = { id: Date.now(), ...parsed, source: "whatsapp" };
    db.transactions.push(tx);
    saveDB();
    console.log("✅ Transaction saved:", tx);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
});

// ── HEALTH CHECK ──────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "online", transactions: db.transactions.length, time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 FinVault server running at http://localhost:${PORT}`);
  console.log(`📡 Webhook: http://localhost:${PORT}/webhook`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}/finvault_v3.html`);
});
