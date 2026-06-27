/**
 * Subscription plan catalog.
 * Prices are in the smallest currency unit (paise) for Razorpay. INR is used
 * because the app targets Indian institutions; change currency/amounts freely.
 */

const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'INR',
    interval: 'month',
    tagline: 'Get started',
    limits: { papers: 5 },
    features: [
      'Up to 5 papers',
      'AI summaries & keywords',
      'Research chat',
      'Open-access discovery',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49900, // ₹499 / month
    currency: 'INR',
    interval: 'month',
    tagline: 'For active researchers',
    popular: true,
    limits: { papers: 200 },
    features: [
      'Up to 200 papers',
      'Everything in Free',
      'Priority AI analysis',
      'Bulk import from Discover',
      'Export summaries',
    ],
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 149900, // ₹1,499 / month
    currency: 'INR',
    interval: 'month',
    tagline: 'For labs & groups',
    limits: { papers: 2000 },
    features: [
      'Up to 2,000 papers',
      'Everything in Pro',
      'Shared library (coming soon)',
      'Dedicated support',
    ],
  },
};

const PUBLIC_PLANS = Object.values(PLANS).map(({ limits, ...p }) => ({ ...p, limits }));

module.exports = { PLANS, PUBLIC_PLANS };
