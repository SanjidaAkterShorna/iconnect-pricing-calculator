const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  clientName:    { type: String, required: true },
  clientEmail:   { type: String, required: true },
  clientCompany: { type: String, default: '' },

  planKey:       String,
  planName:      String,
  planMinutes:   Number,
  monthlyPrice:  Number,
  setupFee:      Number,
  overageRate:   Number,

  monthlyAddOns: [{ id: String, name: String, price: Number, type: String }],
  oneTimeAddOns: [{ id: String, name: String, price: Number, type: String }],

  carrier: {
    enabled:        { type: Boolean, default: false },
    carrierName:    String,
    numberType:     String,
    phoneCount:     Number,
    inboundMinutes: Number,
    outboundMinutes:Number,
    carrierMonthly: Number,
    carrierOneTime: Number,
  },

  monthlyTotal: Number,
  oneTimeTotal: Number,

  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'closed'],
    default: 'new'
  },

  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Quote', quoteSchema);
