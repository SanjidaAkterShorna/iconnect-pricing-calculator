const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

// INTERNAL — full config (used by admin internal calculator)
router.get('/internal', (req, res) => {
  try {
    const config = readConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// PUBLIC — client-safe pre-calculated pricing (no internal costs/margins exposed)
router.get('/', (req, res) => {
  try {
    const config = readConfig();

    const rate     = config.enterpriseRate;
    const overhead = config.defaultOverhead / 100;
    const margin   = Math.min(config.defaultProfitMargin / 100, 0.99);
    const discount = config.defaultAnnualDiscount / 100;

    const plans = (config.plans || [])
      .filter(p => p.enabled)
      .map(p => {
        if (p.isCustom) {
          return {
            key:            p.key,
            name:           p.name,
            minutes:        0,
            popular:        p.popular || false,
            features:       p.features || [],
            isCustom:       true,
            monthlyPrice:   0,
            annualMonthly:  0,
            annualTotal:    0,
            annualSavings:  0,
            annualDiscount: 0,
            overageRate:    0,
            setupFee:       0,
          };
        }

        const baseCost   = rate * p.multiplier * p.minutes;
        const totalCost  = baseCost * (1 + overhead);
        const monthlyPrice = totalCost / (1 - margin);
        const annualTotal  = monthlyPrice * 12 * (1 - discount);
        const annualMonthly = annualTotal / 12;
        const savings      = (monthlyPrice * 12) - annualTotal;

        return {
          key:            p.key,
          name:           p.name,
          minutes:        p.minutes,
          popular:        p.popular || false,
          features:       p.features || [],
          monthlyPrice:   Math.round(monthlyPrice * 100) / 100,
          annualMonthly:  Math.round(annualMonthly * 100) / 100,
          annualTotal:    Math.round(annualTotal * 100) / 100,
          annualSavings:  Math.round(savings * 100) / 100,
          annualDiscount: config.defaultAnnualDiscount,
          overageRate:    config.defaultOverageRate,
          setupFee:       config.defaultSetupFee,
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

    // Build carrier config for client (only if enabled)
    let carrier = null;
    const cp = config.carrierPricing;
    if (cp && cp.enabled) {
      const enabledCarriers = (cp.carriers || []).filter(c => c.enabled).map(c => ({
        id: c.id,
        name: c.name,
        numberTypes: c.numberTypes.map(t => ({
          id: t.id, name: t.name,
          inboundPerMin: t.inboundPerMin,
          outboundPerMin: t.outboundPerMin,
          numberMonthly: t.numberMonthly
        }))
      }));
      if (enabledCarriers.length) {
        carrier = {
          enabled: true,
          showBreakdown: cp.showBreakdown,
          markupPct: cp.defaultMarkupPct,
          setupFee: cp.defaultSetupFee,
          supportFee: cp.defaultSupportFee,
          annualDiscount: cp.defaultAnnualDiscount || 15,
          carriers: enabledCarriers
        };
      }
    }

    // Build activation fee config for client (only if enabled)
    let activationFee = null;
    const af = config.activationFee;
    if (af && af.enabled) {
      activationFee = {
        enabled: true,
        feePerNumber: af.feePerNumber,
        minutesPerDollar: af.minutesPerDollar,
        annualDiscount: af.annualDiscount || 15,
        overageRate: af.overageRate || 0.05,
      };
    }

    // Build number activation config (only if enabled)
    let numberActivation = null;
    const na = config.numberActivation;
    if (na && na.enabled) {
      numberActivation = {
        enabled: true,
        feePerNumber: na.feePerNumber,
        includedMinutes: na.includedMinutes,
        overageRate: na.overageRate || 0.05,
        annualDiscount: na.annualDiscount || 15,
        setupFee: na.setupFee || 0,
      };
    }

    res.json({
      companyName: config.companyName,
      tagline:     config.tagline,
      poweredBy:   config.poweredBy,
      plans,
      addOns,
      carrier,
      activationFee,
      numberActivation
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
