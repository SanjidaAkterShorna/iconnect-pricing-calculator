const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const QUOTES_PATH = path.join(__dirname, '..', 'data', 'quotes.json');

function readQuotes() {
  return JSON.parse(fs.readFileSync(QUOTES_PATH, 'utf8'));
}

function writeQuotes(quotes) {
  fs.writeFileSync(QUOTES_PATH, JSON.stringify(quotes, null, 2), 'utf8');
}

// PUBLIC — submit a quote request
router.post('/', (req, res) => {
  try {
    const { clientName, clientEmail } = req.body;
    if (!clientName || !clientEmail) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    const quotes = readQuotes();
    const quote = {
      ...req.body,
      _id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    quotes.unshift(quote);
    writeQuotes(quotes);
    res.status(201).json({ message: 'Quote request submitted', id: quote._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit quote' });
  }
});

// Get all quotes
router.get('/all', (req, res) => {
  try {
    const quotes = readQuotes();
    res.json(quotes);
  } catch {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Update quote status
router.put('/:id', (req, res) => {
  try {
    const { status, notes } = req.body;
    const quotes = readQuotes();
    const idx = quotes.findIndex(q => q._id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Quote not found' });
    if (status) quotes[idx].status = status;
    if (notes) quotes[idx].notes = notes;
    writeQuotes(quotes);
    res.json(quotes[idx]);
  } catch {
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

module.exports = router;
