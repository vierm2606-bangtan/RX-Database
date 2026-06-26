const express = require('express');
const path = require('path');
const engine = require('./okt-engine.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/evaluate', (req, res) => {
  const { drug, context } = req.body;
  if (!drug || !drug.trim()) {
    return res.status(400).json({ error: 'Drug name is required' });
  }
  try {
    const result = engine.evaluateOKT(drug.trim(), context || 'auto');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drugs', (req, res) => {
  const db = engine.loadDB();
  const all = (db.drug_catalog.all_drugs || []).map(d => d.name);
  res.json(all);
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json([]);
  const db = engine.loadDB();
  const all = db.drug_catalog.all_drugs || [];
  const found = all.filter(d => d.name.toLowerCase().includes(q)).map(d => d.name);
  res.json(found);
});

app.listen(PORT, () => {
  console.log(`RX Database & OKT Engine running at http://localhost:${PORT}`);
});
