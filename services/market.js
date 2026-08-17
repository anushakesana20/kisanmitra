'use strict';
const axios = require('axios');

/* ── Cache ────────────────────────────────────────── */
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function cached (key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { cache.delete(key); return null; }
  return e.data;
}
function store (key, data) { cache.set(key, { ts: Date.now(), data }); }

/* ── Realistic base prices (updated periodically) ── */
const BASE_PRICES = [
  { crop:'Cotton (Long Staple)', emoji:'🌾', category:'fibre',     base:7200, msp:6620  },
  { crop:'Hybrid Maize',         emoji:'🌽', category:'cereal',    base:1900, msp:1962  },
  { crop:'Tomato',               emoji:'🍅', category:'vegetable', base:1600, msp:null  },
  { crop:'Red Chilli',           emoji:'🌶️', category:'spice',    base:14200,msp:null  },
  { crop:'Soybean',              emoji:'🫘', category:'oilseed',   base:4300, msp:4600  },
  { crop:'Groundnut',            emoji:'🥜', category:'oilseed',   base:5750, msp:5850  },
  { crop:'Onion',                emoji:'🧅', category:'vegetable', base:2000, msp:null  },
  { crop:'Turmeric',             emoji:'🟡', category:'spice',     base:16500,msp:null  },
  { crop:'Paddy (Raw)',          emoji:'🍚', category:'cereal',    base:2200, msp:2300  },
  { crop:'Wheat',                emoji:'🌾', category:'cereal',    base:2320, msp:2275  },
  { crop:'Bengal Gram (Chana)',  emoji:'🫘', category:'pulse',     base:5300, msp:5440  },
  { crop:'Mustard',              emoji:'🟡', category:'oilseed',   base:5500, msp:5650  },
  { crop:'Sunflower Seed',       emoji:'🌻', category:'oilseed',   base:6200, msp:6760  },
  { crop:'Jowar',                emoji:'🌾', category:'cereal',    base:2980, msp:3180  },
  { crop:'Bajra (Pearl Millet)', emoji:'🌾', category:'cereal',    base:2300, msp:2500  },
];

/* ── Deterministic daily variation using date seed ── */
function dailyVariation (cropName, date) {
  const dateStr = date || new Date().toISOString().split('T')[0];
  let hash = 0;
  for (const ch of cropName + dateStr) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  /* Variation ±6% of base, seeded by crop+date so it's stable within the day */
  return ((hash % 1200) - 600) / 10000; // returns small fraction
}

/* ── Try live data.gov.in AGMARKNET API ─────────── */
async function fetchLiveMarket (state) {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey) return null; // no key configured

  try {
    const resp = await axios.get(
      'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
      {
        params: {
          'api-key': apiKey,
          format:    'json',
          limit:     100,
          'filters[State]': state || 'Telangana'
        },
        timeout: 12_000,
        headers: { 'User-Agent': 'KisanMitra/1.0' }
      }
    );

    const records = resp.data?.records || [];
    if (!records.length) return null;

    return records.map(r => ({
      crop:     r.Commodity     || r.commodity     || 'Unknown',
      emoji:    '🌾',
      mandi:    r.Market        || r.market        || r.District || '',
      district: r.District      || r.district      || '',
      state:    r.State         || r.state         || state,
      price:    parseFloat(r.Modal_Price || r.modal_price || 0),
      min:      parseFloat(r.Min_Price   || r.min_price   || 0),
      max:      parseFloat(r.Max_Price   || r.max_price   || 0),
      date:     r.Arrival_Date  || r.arrival_date  || new Date().toISOString().split('T')[0],
      source:   'agmarknet'
    })).filter(r => r.price > 0);
  } catch (err) {
    console.warn('AGMARKNET API error:', err.message);
    return null;
  }
}

/* ── Build realistic prices (fallback) ─────────── */
function buildRealisticPrices (state, district) {
  const today = new Date().toISOString().split('T')[0];
  const mandiName = district ? `${district} APMC` : `${state || 'Local'} Market`;

  return BASE_PRICES.map(c => {
    const variation = dailyVariation(c.crop, today);
    const price     = Math.round(c.base * (1 + variation));
    const prevPrice = Math.round(c.base * (1 + dailyVariation(c.crop, getPrevDay(today))));
    const change    = price - prevPrice;
    const pct       = prevPrice > 0 ? ((change / prevPrice) * 100) : 0;

    return {
      crop:     c.crop,
      emoji:    c.emoji,
      mandi:    mandiName,
      district: district || '',
      state:    state || 'India',
      price,
      change:   Math.round(change),
      pct:      parseFloat(pct.toFixed(2)),
      min:      Math.round(price * 0.92),
      max:      Math.round(price * 1.08),
      msp:      c.msp,
      vs_msp:   c.msp ? Math.round(price - c.msp) : null,
      category: c.category,
      date:     today,
      source:   'estimated'
    };
  });
}

function getPrevDay (dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/* ── Public API ─────────────────────────────────── */
async function getMarketPrices (state, district) {
  const key = `market_${state || 'all'}_${district || 'all'}`;
  const hit  = cached(key);
  if (hit) return hit;

  /* Try live API first */
  const live = await fetchLiveMarket(state);
  if (live && live.length > 5) {
    const today = new Date().toISOString().split('T')[0];
    /* Enrich live data with change/pct */
    const enriched = live.map(r => ({
      ...r,
      change: 0,
      pct:    0,
      category: 'commodity',
      source: 'agmarknet'
    }));
    store(key, enriched);
    return enriched;
  }

  /* Fallback: realistic estimated prices */
  const prices = buildRealisticPrices(state, district);
  store(key, prices);
  return prices;
}

module.exports = { getMarketPrices };
