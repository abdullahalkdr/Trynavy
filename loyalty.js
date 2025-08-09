// loyalty.js — Navy Points Core

const Loyalty = (() => {
  const POINTS_PER_KWD = 100; // 1 د.ك = 100 نقطة
  const MONTHLY_CAPS = { Bronze: 0, Silver: 10, Gold: 20, Platinum: 35, Diamond: 50 }; // سقف خصم شهري (د.ك)
  const MAX_DISCOUNT_PER_ORDER_KWD = { Bronze: 0, Silver: 5, Gold: 8, Platinum: 12, Diamond: 15 }; // سقف خصم للطلب الواحد

  const TIERS = [
    { name: 'Diamond', min: 50000, color:'#60a5fa', discountPct: 20 },
    { name: 'Platinum', min: 25000, color:'#94a3b8', discountPct: 15 },
    { name: 'Gold',     min: 10000, color:'#f59e0b', discountPct: 10 },
    { name: 'Silver',   min: 2500,  color:'#9ca3af', discountPct: 5  },
    { name: 'Bronze',   min: 0,     color:'#b45309', discountPct: 0  },
  ];

  const db = { customers: new Map() };

  const monthKey = () => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
  };
  const getTier = (points) => TIERS.find(t => points >= t.min) || TIERS[TIERS.length-1];
  const customerKey = ({email, phone}) => `${(email||'').trim().toLowerCase()}|${(phone||'').trim()}`;

  const getOrCreateCustomer = ({email, phone}) => {
    const key = customerKey({email, phone});
    if (!db.customers.has(key)) {
      db.customers.set(key, { email, phone, points: 0, usedDiscount: {}, sizeHistory: {} });
    }
    return db.customers.get(key);
  };

  const topSizes = (cust, limit=3) => {
    const entries = Object.entries(cust.sizeHistory);
    if (entries.length === 0) return [];
    entries.sort((a,b) => b[1]-a[1]);
    return entries.slice(0, limit).map(([size]) => size);
  };

  const accruePoints = (customer, orderKwd, items) => {
    const pts = Math.floor(orderKwd * POINTS_PER_KWD);
    customer.points += pts;
    (items||[]).forEach(it => {
      const s = (it.size||'').toUpperCase();
      if (!s) return;
      customer.sizeHistory[s] = (customer.sizeHistory[s]||0) + (Number(it.qty)||1);
    });
    return pts;
  };

  const computeDiscount = (customer, cart) => {
    const tier = getTier(customer.points);
    const pct = tier.discountPct;
    if (pct <= 0) return { tier, pct, eligibleSubtotal:0, discountKwd:0, reason:'Bronze (no discount)' };

    const allowedSizes = new Set(topSizes(customer));
    let eligibleSubtotal = 0;
    for (const line of (cart||[])) {
      const s = (line.size||'').toUpperCase();
      const lineTotal = Number(line.priceKwd||0) * Number(line.qty||1);
      if (allowedSizes.size === 0 || allowedSizes.has(s)) eligibleSubtotal += lineTotal;
    }
    if (eligibleSubtotal <= 0) {
      return { tier, pct, eligibleSubtotal:0, discountKwd:0, reason:'No items in preferred sizes' };
    }

    let discountKwd = (eligibleSubtotal * pct) / 100;

    // سقف الطلب الواحد
    discountKwd = Math.min(discountKwd, MAX_DISCOUNT_PER_ORDER_KWD[tier.name] ?? Infinity);

    // سقف شهري
    const mk = monthKey();
    const usedThisMonth = customer.usedDiscount[mk] || 0;
    const monthlyCap = MONTHLY_CAPS[tier.name] ?? 0;
    const remainingThisMonth = Math.max(0, monthlyCap - usedThisMonth);
    discountKwd = Math.min(discountKwd, remainingThisMonth);

    return { tier, pct, eligibleSubtotal, discountKwd, reason: remainingThisMonth === 0 ? 'Monthly cap reached' : 'OK' };
  };

  const applyDiscount = (customer, discountKwd) => {
    if (discountKwd <= 0) return;
    const mk = monthKey();
    customer.usedDiscount[mk] = (customer.usedDiscount[mk]||0) + discountKwd;
  };

  return { getOrCreateCustomer, accruePoints, computeDiscount, applyDiscount, getTier, topSizes, __db: db };
})();
