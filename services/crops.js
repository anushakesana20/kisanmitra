'use strict';

/* ── Crop database ────────────────────────────────── */
const CROP_DB = {
  'Black Cotton': {
    Kharif: [
      { name:'Cotton (BT)',   emoji:'🌾', dur:'175–185d', yield_range:'8–12 qtl/ac', msp:6620, score:98, water:'High',    notes:'Best crop for black soil. Deep root system utilises subsoil moisture.' },
      { name:'Hybrid Maize',  emoji:'🌽', dur:'85–95d',   yield_range:'20–28 qtl/ac',msp:1962, score:94, water:'Medium', notes:'Short-duration intercrop option with cotton.' },
      { name:'Soybean',       emoji:'🫘', dur:'105–115d', yield_range:'12–16 qtl/ac',msp:4600, score:91, water:'Medium', notes:'Improves soil nitrogen. Good rotation with cotton.' },
    ],
    Rabi: [
      { name:'Wheat',         emoji:'🌾', dur:'115–125d', yield_range:'18–24 qtl/ac',msp:2275, score:92, water:'Medium', notes:'Well-suited for black soils with retained moisture.' },
      { name:'Bengal Gram',   emoji:'🫘', dur:'105–115d', yield_range:'8–12 qtl/ac', msp:5440, score:90, water:'Low',    notes:'Excellent nitrogen fixer. Ideal after cotton.' },
      { name:'Onion',         emoji:'🧅', dur:'110–120d', yield_range:'80–100 qtl/ac',msp:null,score:85, water:'Medium', notes:'Good returns. Requires well-drained black soil.' },
    ],
    Zaid: [
      { name:'Sunflower',     emoji:'🌻', dur:'85–95d',   yield_range:'8–12 qtl/ac', msp:6760, score:83, water:'Medium', notes:'Tolerates moderate drought. Good summer crop.' },
      { name:'Green Chilli',  emoji:'🌶️', dur:'90–100d',  yield_range:'40–60 qtl/ac',msp:null, score:80, water:'Medium', notes:'High-value crop for summer season.' },
    ]
  },
  'Red Laterite': {
    Kharif: [
      { name:'Groundnut',     emoji:'🥜', dur:'115–125d', yield_range:'10–14 qtl/ac',msp:5850, score:95, water:'Low',    notes:'Ideal for red laterite soils. Good drought tolerance.' },
      { name:'Finger Millet', emoji:'🌾', dur:'105–115d', yield_range:'10–15 qtl/ac',msp:3846, score:88, water:'Low',    notes:'Drought-hardy. Excellent for food security.' },
      { name:'Sunflower',     emoji:'🌻', dur:'90–100d',  yield_range:'8–12 qtl/ac', msp:6760, score:85, water:'Medium', notes:'Good oil crop for laterite soils.' },
    ],
    Rabi: [
      { name:'Bengal Gram',   emoji:'🫘', dur:'105–115d', yield_range:'8–12 qtl/ac', msp:5440, score:89, water:'Low',    notes:'Low water requirement. Thrives in laterite.' },
      { name:'Wheat',         emoji:'🌾', dur:'115–125d', yield_range:'14–18 qtl/ac',msp:2275, score:82, water:'Medium', notes:'Moderate yield on laterite with good management.' },
    ],
    Zaid: [
      { name:'Tomato',        emoji:'🍅', dur:'85–95d',   yield_range:'100–150 qtl/ac',msp:null,score:85, water:'Medium', notes:'High value. Requires good drainage.' },
      { name:'Hybrid Maize',  emoji:'🌽', dur:'85–95d',   yield_range:'18–24 qtl/ac',msp:1962, score:80, water:'Medium', notes:'Good summer option for laterite regions.' },
    ]
  },
  'Sandy Loam': {
    Kharif: [
      { name:'Groundnut',     emoji:'🥜', dur:'115–125d', yield_range:'10–14 qtl/ac',msp:5850, score:94, water:'Low',    notes:'Best soil type for groundnut. Excellent aeration.' },
      { name:'Tomato',        emoji:'🍅', dur:'85–95d',   yield_range:'120–160 qtl/ac',msp:null,score:89, water:'Medium', notes:'Sandy loam gives best quality fruits.' },
      { name:'Chilli',        emoji:'🌶️', dur:'145–155d', yield_range:'15–20 qtl/ac', msp:null, score:86, water:'Medium', notes:'Excellent drainage ideal for chilli roots.' },
    ],
    Rabi: [
      { name:'Wheat',         emoji:'🌾', dur:'115–125d', yield_range:'16–20 qtl/ac',msp:2275, score:85, water:'Medium', notes:'Good yield with proper irrigation management.' },
      { name:'Potato',        emoji:'🥔', dur:'85–95d',   yield_range:'120–160 qtl/ac',msp:null,score:88, water:'Medium', notes:'Ideal soil for potato — easy harvest.' },
    ],
    Zaid: [
      { name:'Sunflower',     emoji:'🌻', dur:'85–95d',   yield_range:'8–12 qtl/ac', msp:6760, score:83, water:'Low',    notes:'Drought tolerant. Good for summer on sandy loam.' },
      { name:'Cucumber',      emoji:'🥒', dur:'55–65d',   yield_range:'80–120 qtl/ac',msp:null, score:79, water:'Medium', notes:'Fast crop. Good returns in summer market.' },
    ]
  },
  'Alluvial': {
    Kharif: [
      { name:'Paddy (Rice)',  emoji:'🍚', dur:'125–135d', yield_range:'20–30 qtl/ac',msp:2300, score:97, water:'High',   notes:'Alluvial plains are ideal for paddy cultivation.' },
      { name:'Sugarcane',     emoji:'🎋', dur:'295–305d', yield_range:'300–400 qtl/ac',msp:315,score:90, water:'High',  notes:'Long-term high-revenue crop for alluvial soils.' },
      { name:'Hybrid Maize',  emoji:'🌽', dur:'85–95d',   yield_range:'22–30 qtl/ac',msp:1962, score:92, water:'Medium', notes:'High yield potential on fertile alluvial soil.' },
    ],
    Rabi: [
      { name:'Wheat',         emoji:'🌾', dur:'115–125d', yield_range:'22–28 qtl/ac',msp:2275, score:96, water:'Medium', notes:'Best yields on alluvial — the wheat belt.' },
      { name:'Mustard',       emoji:'🟡', dur:'105–115d', yield_range:'8–12 qtl/ac', msp:5650, score:92, water:'Low',   notes:'Well-adapted to alluvial plains of north India.' },
      { name:'Potato',        emoji:'🥔', dur:'85–95d',   yield_range:'120–160 qtl/ac',msp:null,score:88, water:'Medium', notes:'High yield on fertile alluvial plains.' },
    ],
    Zaid: [
      { name:'Hybrid Maize',  emoji:'🌽', dur:'85–95d',   yield_range:'20–26 qtl/ac',msp:1962, score:88, water:'Medium', notes:'Good summer crop utilising residual moisture.' },
      { name:'Watermelon',    emoji:'🍉', dur:'70–80d',   yield_range:'150–200 qtl/ac',msp:null,score:82, water:'Medium', notes:'High market demand in summer months.' },
    ]
  },
  'Clay': {
    Kharif: [
      { name:'Paddy (Rice)',  emoji:'🍚', dur:'125–135d', yield_range:'18–26 qtl/ac',msp:2300, score:95, water:'High',   notes:'Clay soils retain water well — ideal for paddy.' },
      { name:'Soybean',       emoji:'🫘', dur:'105–115d', yield_range:'10–14 qtl/ac',msp:4600, score:87, water:'Medium', notes:'Tolerates clay when drainage is managed.' },
    ],
    Rabi: [
      { name:'Wheat',         emoji:'🌾', dur:'115–125d', yield_range:'16–22 qtl/ac',msp:2275, score:88, water:'Medium', notes:'Moderate yield. Add gypsum to improve structure.' },
      { name:'Bengal Gram',   emoji:'🫘', dur:'105–115d', yield_range:'6–10 qtl/ac', msp:5440, score:84, water:'Low',    notes:'Improves clay soil structure over seasons.' },
    ],
    Zaid: [
      { name:'Hybrid Maize',  emoji:'🌽', dur:'85–95d',   yield_range:'16–22 qtl/ac',msp:1962, score:80, water:'Medium', notes:'Possible with good drainage channels.' },
    ]
  }
};

const WATER_ADJUSTMENTS = {
  'Rain-fed':   { score_penalty:-10, prefer:['Groundnut','Finger Millet','Soybean','Jowar','Bajra'] },
  'Canal':      { score_penalty:0,   prefer:[] },
  'Borewell':   { score_penalty:-5,  prefer:['Wheat','Cotton (BT)','Maize'] },
  'Drip System':{ score_penalty:5,   prefer:['Tomato','Chilli','Onion','Groundnut'] }
};

function getCropRecommendations ({ soil_type, season, water_source, land_acres, district, state }) {
  const soilData  = CROP_DB[soil_type] || CROP_DB['Alluvial'];
  const seasonal  = soilData[season]   || soilData['Kharif'] || [];
  const waterAdj  = WATER_ADJUSTMENTS[water_source] || { score_penalty:0, prefer:[] };

  /* Score and sort */
  const scored = seasonal.map(c => {
    let score = c.score + waterAdj.score_penalty;
    if (waterAdj.prefer.some(p => c.name.includes(p))) score += 8;
    return { ...c, adjusted_score: Math.min(99, Math.max(50, score)) };
  }).sort((a, b) => b.adjusted_score - a.adjusted_score);

  /* Risk alternatives from other soil types */
  const allCrops = Object.values(CROP_DB)
    .flatMap(s => Object.values(s).flat())
    .filter(c => {
      if (water_source === 'Rain-fed') return c.water === 'Low';
      if (water_source === 'Drip System') return c.water !== 'High';
      return false;
    })
    .filter(c => !scored.find(s => s.name === c.name))
    .slice(0, 3)
    .map(c => ({ ...c, adjusted_score: Math.max(60, c.score - 15), is_alternative: true }));

  return {
    main:         scored,
    alternatives: allCrops,
    inputs: { soil_type, season, water_source, land_acres, district, state }
  };
}

/* ── Soil analysis & fertilizer tips ─────────────── */
function analyzeSoil ({ oc, nitrogen, phosphorus, potassium, ph, zinc }) {
  const tips = [];
  const gauges = [];

  if (oc !== null && oc !== undefined) {
    const status = oc >= 0.75 ? 'Good' : oc >= 0.5 ? 'Medium' : 'Low';
    gauges.push({ label:'Organic Carbon', value:`${oc}%`, status, pct: Math.min((oc/1.5)*100, 100), color:'green' });
    if (oc < 0.5)
      tips.push({ type:'action', icon:'🌱', title:'Critical: Low Organic Matter', detail:'Add 5–6 tonnes FYM or compost per acre before sowing. Consider green manuring with Dhaincha (Sesbania). This will improve soil structure, water retention and nutrient availability over 2–3 seasons.' });
    else if (oc < 0.75)
      tips.push({ type:'action', icon:'🌿', title:'Improve Organic Carbon', detail:'Apply 3–4 tonnes compost or FYM per acre. Incorporate crop residues instead of burning. Target OC > 0.75% for optimal productivity.' });
  }

  if (nitrogen !== null && nitrogen !== undefined) {
    const status = nitrogen >= 400 ? 'High' : nitrogen >= 280 ? 'Medium' : 'Low';
    gauges.push({ label:'Nitrogen (N)', value:`${nitrogen} kg/ha`, status, pct: Math.min((nitrogen/500)*100, 100), color: nitrogen < 280 ? 'red' : 'amber' });
    if (nitrogen < 200)
      tips.push({ type:'urgent', icon:'🚨', title:'Very Low Nitrogen — Urgent', detail:`Apply 120 kg Urea/acre as basal dose + 60 kg at 45 DAS (top dressing). For organic option: 10 bags vermicompost + 2 kg Azospirillum seed treatment.` });
    else if (nitrogen < 280)
      tips.push({ type:'action', icon:'🌿', title:'Apply Nitrogen Fertilizer', detail:'Apply 80 kg Urea/acre as basal + 40 kg top dressing at 30–45 DAS. Use neem-coated urea for 10–15% better nitrogen use efficiency.' });
  }

  if (phosphorus !== null && phosphorus !== undefined) {
    const status = phosphorus >= 25 ? 'Good' : phosphorus >= 15 ? 'Medium' : 'Low';
    gauges.push({ label:'Phosphorus (P)', value:`${phosphorus} kg/ha`, status, pct: Math.min((phosphorus/60)*100, 100), color: phosphorus < 15 ? 'red' : 'green' });
    if (phosphorus < 15)
      tips.push({ type:'action', icon:'☀️', title:'Phosphorus Deficiency', detail:'Apply 100 kg Single Super Phosphate (SSP) per acre or 50 kg DAP as basal dose. PSB (Phosphate Solubilizing Bacteria) inoculant can enhance availability by 20–30%.' });
  }

  if (potassium !== null && potassium !== undefined) {
    const status = potassium >= 300 ? 'High' : potassium >= 150 ? 'Medium' : 'Low';
    gauges.push({ label:'Potassium (K)', value:`${potassium} kg/ha`, status, pct: Math.min((potassium/500)*100, 100), color: potassium >= 300 ? 'blue' : 'amber' });
    if (potassium < 150)
      tips.push({ type:'action', icon:'💪', title:'Low Potassium', detail:'Apply 50 kg Muriate of Potash (MOP) per acre. Potassium improves drought tolerance, disease resistance and grain quality. Split 50% basal + 50% at flowering.' });
  }

  if (ph !== null && ph !== undefined) {
    const status = ph >= 6.5 && ph <= 7.5 ? 'Optimal' : ph < 6.0 ? 'Acidic' : ph < 6.5 ? 'Slightly Acidic' : ph <= 8.0 ? 'Slightly Alkaline' : 'Alkaline';
    gauges.push({ label:'pH Level', value:ph.toFixed(1), status, pct: Math.min((ph/14)*100, 100), color: status === 'Optimal' ? 'green' : 'amber' });
    if (ph < 6.0)
      tips.push({ type:'urgent', icon:'⚠️', title:'Acidic Soil — Action Needed', detail:'Apply 2–4 tonnes of agricultural limestone per acre. Retest after 6 weeks. Acidic soils lock up phosphorus and create aluminium toxicity for most crops.' });
    else if (ph > 8.0)
      tips.push({ type:'action', icon:'📏', title:'Highly Alkaline Soil', detail:'Apply 600 kg Gypsum per acre + incorporate sulphur 20 kg/acre. Grow acid-tolerant crops like rice or sorghum until pH is corrected.' });
    else if (ph > 7.5)
      tips.push({ type:'info', icon:'📏', title:'Slightly Alkaline — Manage Nutrients', detail:'Apply 400 kg Gypsum per acre to slightly reduce pH. Use acidifying fertilizers like ammonium sulphate instead of urea. Iron and zinc may become deficient.' });
  }

  if (zinc !== null && zinc !== undefined) {
    const status = zinc >= 1.5 ? 'Good' : zinc >= 0.6 ? 'Marginal' : 'Deficient';
    gauges.push({ label:'Zinc (Zn)', value:`${zinc} ppm`, status, pct: Math.min((zinc/3)*100, 100), color: zinc < 0.6 ? 'red' : 'green' });
    if (zinc < 0.6)
      tips.push({ type:'urgent', icon:'⚠️', title:'Zinc Deficiency Detected', detail:'Spray Zinc Sulphate @0.5g/L water as foliar spray twice — at 25–30 DAS and 50–55 DAS. Also apply 25 kg Zinc Sulphate per acre to soil before sowing for lasting correction.' });
    else if (zinc < 1.5)
      tips.push({ type:'info', icon:'🔬', title:'Marginal Zinc — Monitor Closely', detail:'Apply 15 kg Zinc Sulphate per acre as soil treatment. Monitor for yellowing of young leaves (interveinal chlorosis) — early sign of deficiency.' });
  }

  return { gauges, tips };
}

/* ── Irrigation schedule ──────────────────────────── */
function getIrrigationSchedule ({ crops, land_acres, weather }) {
  const todayRain = weather?.current?.precipitation || 0;
  const next3Rain = weather?.daily?.precipitation_sum?.slice(0, 3).reduce((a, b) => a + b, 0) || 0;

  const schedules = (crops || 'Cotton').split(',').map((crop, i) => {
    crop = crop.trim();
    const acresShare = (land_acres || 2) / ((crops || 'Cotton').split(',').length);
    const skipBecauseRain = next3Rain > 25;

    let method = 'Furrow';
    let duration = '3–4 hours';
    let dose = '40mm';
    let stage = 'Vegetative';
    let priority = 'Normal';

    if (crop.toLowerCase().includes('tomato') || crop.toLowerCase().includes('chilli') || crop.toLowerCase().includes('vegetable')) {
      method = 'Drip'; duration = '45 min'; dose = '20mm';
    } else if (crop.toLowerCase().includes('paddy') || crop.toLowerCase().includes('rice')) {
      method = 'Flood'; duration = 'Maintain 5cm standing water'; dose = '60mm'; priority = 'High';
    } else if (crop.toLowerCase().includes('wheat')) {
      method = 'Sprinkler / Furrow'; duration = '2–3 hours'; dose = '35mm';
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (skipBecauseRain ? 4 : 2));

    return {
      crop: crop || 'Field Crop',
      acres: acresShare.toFixed(1),
      next_date: nextDate.toISOString().split('T')[0],
      skip_reason: skipBecauseRain ? `Heavy rain (${next3Rain.toFixed(0)}mm) forecast in 3 days` : null,
      method, duration, dose, stage, priority
    };
  });

  return {
    schedules,
    today_rain: todayRain,
    next3_rain: next3Rain,
    soil_moisture_note: todayRain > 10 ? 'Soil moisture is adequate — skip today\'s irrigation.' : 'Check soil moisture before irrigating.'
  };
}

module.exports = { getCropRecommendations, analyzeSoil, getIrrigationSchedule };
