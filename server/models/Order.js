const mongoose = require('mongoose');

const orderAddonSchema = new mongoose.Schema({
  id:    String,
  name:  String,
  price: Number,
  type:  { type: String, enum: ['monthly', 'one-time'] }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientName:  String,
  clientEmail: String,

  // Plan details
  planKey:     { type: String, required: true },
  planName:    { type: String, required: true },
  planMinutes: Number,
  monthlyPrice: Number,
  setupFee:     Number,
  overageRate:  Number,

  // Selected add-ons
  monthlyAddOns: [orderAddonSchema],
  oneTimeAddOns: [orderAddonSchema],

  // Phone carrier (optional)
  carrier: {
    enabled:       { type: Boolean, default: false },
    carrierName:   String,
    numberType:    String,
    numberTypeName:String,
    phoneCount:    Number,
    inboundMinutes:  Number,
    outboundMinutes: Number,
    numberCost:    Number,  // monthly
    usageCost:     Number,  // monthly
    markupPct:     Number,
    markupAmount:  Number,
    setupFee:      Number,
    supportFee:    Number,
    carrierMonthly:Number,  // total carrier monthly
    carrierOneTime:Number   // total carrier one-time
  },

  // Totals
  monthlyTotal:  Number,
  oneTimeTotal:  Number,

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'active', 'cancelled'],
    default: 'pending'
  },

  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
