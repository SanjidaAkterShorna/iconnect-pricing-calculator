/**
 * iConnect Static Config Loader
 *
 * Replaces all server API calls with localStorage + bundled config.json.
 * - Settings page saves config to localStorage
 * - All pages read from localStorage first, fall back to bundled config.json
 * - BroadcastChannel notifies other tabs when config changes
 * - Quotes stored in localStorage
 */

const ICONNECT_CONFIG_KEY = 'iconnect-config';
const ICONNECT_QUOTES_KEY = 'iconnect-quotes';
const ICONNECT_CONFIG_CHANNEL = 'config-updated';

// ── Load Config ──
// Returns the full raw config (equivalent to /api/pricing/internal and /api/admin/config)
async function loadStaticConfig() {
  // 1. Check localStorage first
  const saved = localStorage.getItem(ICONNECT_CONFIG_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }

  // 2. Fall back to bundled config.json
  try {
    const basePath = getBasePath();
    const res = await fetch(basePath + 'data/config.json');
    if (res.ok) {
      const config = await res.json();
      return config;
    }
  } catch {}

  // 3. Last resort — return empty config
  console.warn('Could not load config from localStorage or config.json');
  return {};
}

// ── Save Config ──
// Equivalent to PUT /api/admin/config
function saveStaticConfig(config) {
  localStorage.setItem(ICONNECT_CONFIG_KEY, JSON.stringify(config));
  // Notify other tabs
  try { new BroadcastChannel(ICONNECT_CONFIG_CHANNEL).postMessage('refresh'); } catch {}
  return config;
}

// ── Reset Config ──
// Clears localStorage, next load will use bundled config.json
function resetStaticConfig() {
  localStorage.removeItem(ICONNECT_CONFIG_KEY);
}

// ── Compute Public Pricing ──
// Equivalent to GET /api/pricing — computes client-safe pricing from raw config
function computePublicPricing(config) {
  const rate     = config.enterpriseRate || 0.08;
  const overhead = (config.defaultOverhead || 0) / 100;
  const margin   = Math.min((config.defaultProfitMargin || 0) / 100, 0.99);
  const discount = (config.defaultAnnualDiscount || 0) / 100;

  const plans = (config.plans || [])
    .filter(p => p.enabled)
    .map(p => {
      if (p.isCustom) {
        return {
          key: p.key, name: p.name, minutes: 0,
          popular: p.popular || false, features: p.features || [],
          isCustom: true,
          monthlyPrice: 0, annualMonthly: 0, annualTotal: 0,
          annualSavings: 0, annualDiscount: 0, overageRate: 0, setupFee: 0,
        };
      }

      const baseCost     = rate * (p.multiplier || 1) * (p.minutes || 0);
      const totalCost    = baseCost * (1 + overhead);
      const monthlyPrice = totalCost / (1 - margin);
      const annualTotal  = monthlyPrice * 12 * (1 - discount);
      const annualMonthly = annualTotal / 12;
      const savings       = (monthlyPrice * 12) - annualTotal;

      return {
        key:            p.key,
        name:           p.name,
        minutes:        p.minutes || 0,
        outboundMinutes: p.outboundMinutes || 0,
        popular:        p.popular || false,
        features:       p.features || [],
        monthlyPrice:   Math.round(monthlyPrice * 100) / 100,
        annualMonthly:  Math.round(annualMonthly * 100) / 100,
        annualTotal:    Math.round(annualTotal * 100) / 100,
        annualSavings:  Math.round(savings * 100) / 100,
        annualDiscount: config.defaultAnnualDiscount || 0,
        overageRate:    config.defaultOverageRate || 0,
        setupFee:       config.defaultSetupFee || 0,
      };
    });

  const addOns = {
    monthly: (config.addOns || []).filter(a => a.type === 'monthly').map(a => ({
      id: a.id, name: a.name, desc: a.desc || '', price: a.price, icon: a.icon
    })),
    oneTime: (config.addOns || []).filter(a => a.type === 'one-time').map(a => ({
      id: a.id, name: a.name, desc: a.desc || '', price: a.price, icon: a.icon
    }))
  };

  let carrier = null;
  const cp = config.carrierPricing;
  if (cp && cp.enabled) {
    const enabledCarriers = (cp.carriers || []).filter(c => c.enabled).map(c => ({
      id: c.id, name: c.name,
      numberTypes: (c.numberTypes || []).map(t => ({
        id: t.id, name: t.name,
        inboundPerMin: t.inboundPerMin, outboundPerMin: t.outboundPerMin, numberMonthly: t.numberMonthly
      }))
    }));
    if (enabledCarriers.length) {
      carrier = {
        enabled: true, showBreakdown: cp.showBreakdown,
        markupPct: cp.defaultMarkupPct, setupFee: cp.defaultSetupFee,
        supportFee: cp.defaultSupportFee, annualDiscount: cp.defaultAnnualDiscount || 15,
        carriers: enabledCarriers
      };
    }
  }

  let numberActivation = null;
  const na = config.numberActivation;
  if (na && na.enabled) {
    numberActivation = {
      enabled: true, feePerNumber: na.feePerNumber, includedMinutes: na.includedMinutes,
      outboundMinutes: na.outboundMinutes || 0, inboundRate: na.inboundRate || 0.0085,
      outboundRate: na.outboundRate || 0.014,
      overageRate: na.overageRate || 0.05, annualDiscount: na.annualDiscount || 15, setupFee: na.setupFee || 0,
    };
  }

  return {
    companyName: config.companyName, tagline: config.tagline, poweredBy: config.poweredBy,
    plans, addOns, carrier, numberActivation
  };
}

// ── Quotes (localStorage) ──
function loadQuotes() {
  try { return JSON.parse(localStorage.getItem(ICONNECT_QUOTES_KEY) || '[]'); } catch { return []; }
}

function saveQuote(quote) {
  const quotes = loadQuotes();
  quote._id = quote._id || 'q_' + Date.now();
  quote.createdAt = quote.createdAt || new Date().toISOString();
  quote.status = quote.status || 'new';
  quotes.push(quote);
  localStorage.setItem(ICONNECT_QUOTES_KEY, JSON.stringify(quotes));
  return quote;
}

function updateQuoteStatus(id, status) {
  const quotes = loadQuotes();
  const q = quotes.find(q => q._id === id);
  if (q) { q.status = status; localStorage.setItem(ICONNECT_QUOTES_KEY, JSON.stringify(quotes)); }
  return q;
}

// ── Helper: detect base path ──
function getBasePath() {
  const path = window.location.pathname;
  // If hosted in a subdirectory (e.g., GitHub Pages /repo-name/)
  // detect by checking if we're in /admin/ or /client/ and go up
  if (path.includes('/admin/')) return path.substring(0, path.indexOf('/admin/')) + '/';
  if (path.includes('/client/')) return path.substring(0, path.indexOf('/client/')) + '/';
  // Root level
  const lastSlash = path.lastIndexOf('/');
  return path.substring(0, lastSlash + 1);
}

// ── Listen for config changes from other tabs ──
function onConfigChange(callback) {
  try {
    new BroadcastChannel(ICONNECT_CONFIG_CHANNEL).onmessage = () => callback();
  } catch {}
}
