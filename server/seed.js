const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('./models/Admin');
const PricingConfig = require('./models/PricingConfig');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Create default admin
  const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_DEFAULT_EMAIL });
  if (!existingAdmin) {
    await Admin.create({
      email: process.env.ADMIN_DEFAULT_EMAIL,
      password: process.env.ADMIN_DEFAULT_PASSWORD,
      name: 'Admin'
    });
    console.log('Default admin created:', process.env.ADMIN_DEFAULT_EMAIL);
  } else {
    console.log('Admin already exists');
  }

  // Create default pricing config
  const existingConfig = await PricingConfig.findOne({ isActive: true });
  if (!existingConfig) {
    await PricingConfig.create({
      enterpriseRate: 0.08,
      plans: [
        {
          key: 'starter', name: 'Starter', minutes: 1000, multiplier: 1.050, enabled: true, popular: false,
          features: ['1,000 AI calling minutes/mo', '1 AI agent', 'Basic CRM sync', 'Call recording & transcripts', 'Email support', 'Standard voice library']
        },
        {
          key: 'growth', name: 'Growth', minutes: 10000, multiplier: 1.025, enabled: true, popular: true,
          features: ['10,000 AI calling minutes/mo', '5 AI agents', 'Advanced CRM integration', 'Real-time analytics dashboard', 'Priority support (4hr SLA)', 'Custom voice cloning', 'A/B script testing', 'Webhook & API access']
        },
        {
          key: 'enterprise', name: 'Enterprise', minutes: 50000, multiplier: 1.000, enabled: true, popular: false,
          features: ['50,000 AI calling minutes/mo', 'Unlimited AI agents', 'Full CRM + ERP integration', 'Dedicated account manager', 'Custom AI model training', 'White-label option', 'SLA guarantee (99.9%)', 'SSO & compliance (SOC2)', 'Quarterly business reviews']
        }
      ],
      defaultProfitMargin:   60,
      defaultOverhead:       15,
      defaultSetupFee:       499,
      defaultOverageRate:    0.05,
      defaultAnnualDiscount: 15,
      addOns: [
        { id: 'crm',        name: 'CRM Integration',             desc: 'Auto-sync contacts and call outcomes to HubSpot, Salesforce, or GoHighLevel.',          price: 49,  type: 'monthly',  icon: '🔗' },
        { id: 'analytics',  name: 'Analytics Dashboard',         desc: 'Real-time call metrics, conversion rates, and agent performance insights.',              price: 29,  type: 'monthly',  icon: '📊' },
        { id: 'api',        name: 'API Access',                  desc: 'Full REST API to integrate iConnect data with your own tools and workflows.',            price: 79,  type: 'monthly',  icon: '⚙️' },
        { id: 'support',    name: 'Priority Support',            desc: 'Jump to the front of the queue with a guaranteed 4-hour response SLA.',                 price: 39,  type: 'monthly',  icon: '🛡️' },
        { id: 'manager',    name: 'Dedicated Account Manager',   desc: 'A certified success manager to review campaigns and optimize strategy monthly.',        price: 199, type: 'monthly',  icon: '👤' },
        { id: 'voice',      name: 'Custom Voice & Script Setup', desc: 'Professional voice selection and script writing by our AI content specialists.',        price: 299, type: 'one-time', icon: '🎙️' },
        { id: 'whitelabel', name: 'White-Label Branding',        desc: 'Remove iConnect branding and deploy under your own brand identity.',                    price: 499, type: 'one-time', icon: '🏷️' },
        { id: 'onboarding', name: 'Dedicated Onboarding Session',desc: 'Live 1-on-1 onboarding call with a certified implementation engineer.',                 price: 399, type: 'one-time', icon: '🎓' },
        { id: 'custom',     name: 'Custom Integration Build',    desc: 'We build a custom integration with any tool in your tech stack — any API.',             price: 699, type: 'one-time', icon: '🔧' }
      ],
      carrierPricing: {
        enabled: true,
        showBreakdown: true,
        defaultMarkupPct: 20,
        defaultSetupFee: 50,
        defaultSupportFee: 25,
        carriers: [{
          id: 'twilio',
          name: 'Twilio',
          enabled: true,
          numberTypes: [
            { id: 'local',    name: 'Local Number',     inboundPerMin: 0.0085, outboundPerMin: 0.0140, numberMonthly: 1.15 },
            { id: 'tollfree', name: 'Toll-Free Number',  inboundPerMin: 0.0220, outboundPerMin: 0.0140, numberMonthly: 2.15 }
          ]
        }]
      },
      companyName: 'iConnect',
      tagline: 'AI Calling Agents That Close Deals While You Sleep',
      poweredBy: 'Powered by Technuf',
      isActive: true
    });
    console.log('Default pricing config created');
  } else {
    console.log('Pricing config already exists');
  }

  await mongoose.disconnect();
  console.log('Seed complete');
}

seed().catch(err => { console.error(err); process.exit(1); });
