const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security headers (relaxed CSP for inline scripts/styles)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors());

// Body parsing
app.use(express.json({ limit: '1mb' }));

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Root redirect
app.get('/', (req, res) => res.redirect('/admin/'));

// Serve static files
app.use('/',      express.static(path.join(__dirname, '..', 'client')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// API routes
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/quotes',  require('./routes/quotes'));

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// 404 handler for pages
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'client', '404.html'));
});

// Start server (no database needed)
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Client:  http://localhost:${PORT}/`);
  console.log(`Admin:   http://localhost:${PORT}/admin/`);
});
