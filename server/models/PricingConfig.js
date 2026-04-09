const mongoose = require('mongoose');

const addOnSchema = new mongoose.Schema({
  id:    { type: String, required: true },
  name:  { type: String, required: true },
  desc:  { type: String, default: '' },
  price: { type: Number, required: true },
  type:  { type: String, enum: ['monthly', 'one-time'], required: true },
  icon:  { type: String, default: '⚡' }
});

const planSchema = new mongoose.Schema({
  key:        { type: String, required: true },
  name:       { type: String, required: true },
  minutes:    { type: Number, required: true },
  multiplier: { type: Number, required: true },
  enabled:    { type: Boolean, default: true },
  popular:    { type: Boolean, default: false },
  features:   [{ type: String }]
});

const pricingConfigSchema = new mongoose.Schema({
  // Base rate
  enterpriseRate: { type: Number, default: 0.08 },

  // Plans
  plans: [planSchema],

  // Default margins / fees (shown as defaults on client, admin can change)
  defaultProfitMargin:  { type: Number, default: 60 },
  defaultOverhead:      { type: Number, default: 15 },
  defaultSetupFee:      { type: Number, default: 499 },
  defaultOverageRate:   { type: Number, default: 0.05 },
  defaultAnnualDiscount:{ type: Number, default: 15 },

  // Add-ons
  addOns: [addOnSchema],

  // Phone Carrier Pricing (extensible for multiple carriers)
  carrierPricing: {
    enabled:           { type: Boolean, default: false },
    showBreakdown:     { type: Boolean, default: true },  // show full breakdown to client or just total
    defaultMarkupPct:  { type: Number, default: 20 },
    defaultSetupFee:   { type: Number, default: 0 },
    defaultSupportFee: { type: Number, default: 0 },
    defaultAnnualDiscount: { type: Number, default: 15 },
    carriers: [{
      id:      { type: String, required: true },  // e.g. 'twilio'
      name:    { type: String, required: true },
      enabled: { type: Boolean, default: true },
      numberTypes: [{
        id:               { type: String, required: true },  // e.g. 'local', 'tollfree'
        name:             { type: String, required: true },
        inboundPerMin:    { type: Number, required: true },
        outboundPerMin:   { type: Number, required: true },
        numberMonthly:    { type: Number, required: true },
      }]
    }]
  },

  // Branding
  companyName: { type: String, default: 'iConnect' },
  tagline:     { type: String, default: 'AI Calling Agents That Close Deals While You Sleep' },
  poweredBy:   { type: String, default: 'Powered by Technuf' },

  // Singleton flag
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('PricingConfig', pricingConfigSchema);
