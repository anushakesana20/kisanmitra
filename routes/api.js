'use strict';
const router      = require('express').Router();
const requireAuth = require('../middleware/auth');
const { getDb }   = require('../db/database');
const weatherSvc  = require('../services/weather');
const marketSvc   = require('../services/market');
const cropsSvc    = require('../services/crops');

router.use(requireAuth);

/* ════════════════════════════════════════════
   WEATHER
════════════════════════════════════════════ */
router.get('/weather', async (req, res) => {
  try {
    const u = req.user;
    const lat = parseFloat(req.query.lat || u.lat);
    const lon = parseFloat(req.query.lon || u.lon);

    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Location not set. Please set your location first.' });
    }

    const weather = await weatherSvc.fetchWeather(lat, lon);
    const alerts  = weatherSvc.deriveAlerts(weather);

    /* Auto-save weather alerts as notifications */
    if (alerts.length) {
      const db = getDb();
      /* Delete old weather alerts */
      db.run(`DELETE FROM notifications WHERE user_id = ? AND type = 'alert'`, [req.userId]);
      for (const a of alerts) {
        db.run(
          `INSERT INTO notifications (user_id, type, severity, icon, title, body) VALUES (?,?,?,?,?,?)`,
          [req.userId, a.type, a.severity, a.icon, a.title, a.body]
        );
      }
    }

    res.json({ weather, alerts });
  } catch (err) {
    console.error('Weather error:', err.message);
    res.status(502).json({ error: 'Unable to fetch weather data. Please try again.' });
  }
});

/* ── Geocode ─────────────────────────────────────── */
router.get('/geocode/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required.' });
    const result = await weatherSvc.reverseGeocode(lat, lon);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Geocoding failed.' });
  }
});

router.get('/geocode/forward', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query q is required.' });
    const result = await weatherSvc.forwardGeocode(q);
    if (!result) return res.status(404).json({ error: 'Location not found. Try a different name.' });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Geocoding failed.' });
  }
});

/* ════════════════════════════════════════════
   MARKET PRICES
════════════════════════════════════════════ */
router.get('/market', async (req, res) => {
  try {
    const u        = req.user;
    const state    = req.query.state    || u.location_state || u.state || '';
    const district = req.query.district || u.location_district || u.district || '';
    const prices   = await marketSvc.getMarketPrices(state, district);
    res.json({ prices, state, district, date: new Date().toISOString().split('T')[0] });
  } catch (err) {
    console.error('Market error:', err.message);
    res.status(502).json({ error: 'Unable to fetch market prices.' });
  }
});

/* ════════════════════════════════════════════
   CROP RECOMMENDATIONS
════════════════════════════════════════════ */
router.post('/crops/recommend', (req, res) => {
  try {
    const { soil_type, season, water_source, land_acres, district, state } = req.body;
    if (!soil_type || !season) {
      return res.status(400).json({ error: 'soil_type and season are required.' });
    }
    const result = cropsSvc.getCropRecommendations({ soil_type, season, water_source, land_acres, district, state });
    res.json(result);
  } catch (err) {
    console.error('Crop rec error:', err.message);
    res.status(500).json({ error: 'Failed to generate recommendations.' });
  }
});

/* ════════════════════════════════════════════
   SOIL DATA
════════════════════════════════════════════ */
router.get('/soil', (req, res) => {
  const db   = getDb();
  const soil = db.get('SELECT * FROM soil_data WHERE user_id = ?', [req.userId]);
  if (!soil) return res.json({ soil: null });

  const analysis = cropsSvc.analyzeSoil({
    oc:         soil.oc,
    nitrogen:   soil.nitrogen,
    phosphorus: soil.phosphorus,
    potassium:  soil.potassium,
    ph:         soil.ph,
    zinc:       soil.zinc
  });
  res.json({ soil, analysis });
});

router.put('/soil', (req, res) => {
  const { oc, nitrogen, phosphorus, potassium, ph, zinc } = req.body;
  const db = getDb();

  const existing = db.get('SELECT id FROM soil_data WHERE user_id = ?', [req.userId]);
  if (existing) {
    db.run(
      `UPDATE soil_data SET oc=?, nitrogen=?, phosphorus=?, potassium=?, ph=?, zinc=?, updated_at=datetime('now') WHERE user_id=?`,
      [oc ?? null, nitrogen ?? null, phosphorus ?? null, potassium ?? null, ph ?? null, zinc ?? null, req.userId]
    );
  } else {
    db.run(
      `INSERT INTO soil_data (user_id, oc, nitrogen, phosphorus, potassium, ph, zinc) VALUES (?,?,?,?,?,?,?)`,
      [req.userId, oc ?? null, nitrogen ?? null, phosphorus ?? null, potassium ?? null, ph ?? null, zinc ?? null]
    );
  }

  const soil = db.get('SELECT * FROM soil_data WHERE user_id = ?', [req.userId]);
  const analysis = cropsSvc.analyzeSoil({ oc: soil.oc, nitrogen: soil.nitrogen, phosphorus: soil.phosphorus, potassium: soil.potassium, ph: soil.ph, zinc: soil.zinc });
  res.json({ soil, analysis });
});

/* ════════════════════════════════════════════
   IRRIGATION
════════════════════════════════════════════ */
router.get('/irrigation', async (req, res) => {
  try {
    const u  = req.user;
    let weather = null;
    if (u.lat && u.lon) {
      try { weather = await weatherSvc.fetchWeather(u.lat, u.lon); } catch {}
    }
    const schedule = cropsSvc.getIrrigationSchedule({
      crops:      u.crops,
      land_acres: u.land_acres,
      weather
    });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate irrigation schedule.' });
  }
});

/* ════════════════════════════════════════════
   TASKS / CALENDAR
════════════════════════════════════════════ */
router.get('/tasks', (req, res) => {
  const db = getDb();
  const tasks = db.all(
    'SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC',
    [req.userId]
  );
  res.json({ tasks });
});

router.post('/tasks', (req, res) => {
  const { name, due_date, category, notes } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Task name is required.' });
  if (!due_date)             return res.status(400).json({ error: 'Due date is required.' });

  const db = getDb();
  db.run(
    `INSERT INTO tasks (user_id, name, due_date, category, notes) VALUES (?,?,?,?,?)`,
    [req.userId, name.trim(), due_date, category || 'other', notes || '']
  );
  const task = db.get('SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.userId]);
  res.status(201).json({ task });
});

router.patch('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { is_done, name, due_date, category, notes } = req.body;
  const db = getDb();

  /* Verify ownership */
  const task = db.get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const updates = {};
  if (is_done !== undefined) updates.is_done = is_done ? 1 : 0;
  if (name)     updates.name     = name.trim();
  if (due_date) updates.due_date = due_date;
  if (category) updates.category = category;
  if (notes !== undefined) updates.notes = notes;

  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update.' });

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.run(`UPDATE tasks SET ${setClauses} WHERE id = ? AND user_id = ?`,
         [...Object.values(updates), id, req.userId]);

  const updated = db.get('SELECT * FROM tasks WHERE id = ?', [id]);
  res.json({ task: updated });
});

router.delete('/tasks/:id', (req, res) => {
  const db = getDb();
  const task = db.get('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ message: 'Task deleted.' });
});

/* ════════════════════════════════════════════
   NOTIFICATIONS
════════════════════════════════════════════ */
router.get('/notifications', (req, res) => {
  const db = getDb();
  const notifs = db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.userId]
  );
  const unread = notifs.filter(n => !n.is_read).length;
  res.json({ notifications: notifs, unread });
});

router.patch('/notifications/:id/read', (req, res) => {
  const db = getDb();
  db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
         [req.params.id, req.userId]);
  res.json({ message: 'Marked as read.' });
});

router.post('/notifications/read-all', (req, res) => {
  const db = getDb();
  db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.userId]);
  res.json({ message: 'All notifications marked as read.' });
});

router.delete('/notifications/:id', (req, res) => {
  const db = getDb();
  const n = db.get('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!n) return res.status(404).json({ error: 'Notification not found.' });
  db.run('DELETE FROM notifications WHERE id = ?', [req.params.id]);
  res.json({ message: 'Notification deleted.' });
});

router.delete('/notifications', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM notifications WHERE user_id = ?', [req.userId]);
  res.json({ message: 'All notifications cleared.' });
});

/* ════════════════════════════════════════════
   EXPERT CHAT
════════════════════════════════════════════ */
const EXPERTS = [
  { idx:0, name:'Dr. Srinivas Reddy',  role:'Agronomist · Cotton & Oil Seeds', emoji:'👨‍🔬', status:'online' },
  { idx:1, name:'Dr. Meena Sharma',    role:'Soil Science & Horticulture',      emoji:'👩‍🌾', status:'online' },
  { idx:2, name:'Mr. Rajesh Kumar',    role:'Market Strategy & Finance',        emoji:'👨‍💼', status:'busy'   },
  { idx:3, name:'Dr. Priya Nair',      role:'Pest & Disease Management',        emoji:'👩‍🔬', status:'online' },
];

const AUTO_REPLIES = [
  'Good question! Based on your conditions, I recommend applying treatment early morning for best results.',
  'Can you share a clearer photo of the affected area? That will help me give a more precise diagnosis.',
  'This is common during this season. The solution I mentioned should show results within 7–10 days.',
  'You can also contact the Krishi Vigyan Kendra (KVK) in your district for free field visits.',
  'Combining bio-fertilizers with targeted chemical treatment gives the best long-term outcome.',
  'Soil pH plays a major role here. What are your latest soil test values?',
  'Monitor closely for 3 days. If it worsens, escalate to chemical treatment — wear proper PPE.',
  'Based on current weather, delay spraying until after the rain clears for better absorption.',
  'I would recommend a soil test before applying more fertilizers — it saves costs and avoids over-application.',
  'The crop stage matters here. At squaring stage, avoid high-nitrogen push — focus on potassium.'
];

router.get('/experts', (req, res) => {
  res.json({ experts: EXPERTS });
});

router.get('/chat/:expertIdx', (req, res) => {
  const db = getDb();
  const idx = parseInt(req.params.expertIdx);
  const messages = db.all(
    'SELECT * FROM chat_messages WHERE user_id = ? AND expert_idx = ? ORDER BY created_at ASC LIMIT 100',
    [req.userId, idx]
  );
  if (!messages.length) {
    const expert = EXPERTS[idx] || EXPERTS[0];
    const greeting = `నమస్కారం! I'm ${expert.name}. How can I help with your farm today? Ask me anything about crops, soil, pests or weather.`;
    db.run(
      'INSERT INTO chat_messages (user_id, expert_idx, role, message) VALUES (?,?,?,?)',
      [req.userId, idx, 'bot', greeting]
    );
    messages.push({ role:'bot', message: greeting, created_at: new Date().toISOString() });
  }
  res.json({ messages });
});

router.post('/chat/:expertIdx', (req, res) => {
  const db  = getDb();
  const idx = parseInt(req.params.expertIdx);
  const { message } = req.body;

  if (!message || !message.trim())
    return res.status(400).json({ error: 'Message cannot be empty.' });

  /* Save user message */
  db.run(
    'INSERT INTO chat_messages (user_id, expert_idx, role, message) VALUES (?,?,?,?)',
    [req.userId, idx, 'user', message.trim()]
  );

  /* Generate contextual auto-reply */
  const msgLower = message.toLowerCase();
  let reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];

  /* Keyword-aware responses */
  if (msgLower.includes('bollworm') || msgLower.includes('pest') || msgLower.includes('insect'))
    reply = 'For bollworm: apply Emamectin Benzoate 0.5g/L or use Pheromone traps (5/acre). Neem oil spray (5ml/L) works well for early-stage control. Check at dusk when larvae are active.';
  else if (msgLower.includes('yellow') || msgLower.includes('yellowing'))
    reply = 'Yellowing can indicate Nitrogen deficiency, Zinc deficiency, or Magnesium deficiency. If older leaves yellow first → N deficiency. If new leaves yellow with green veins → Zinc/Iron deficiency. Share a photo for accurate diagnosis.';
  else if (msgLower.includes('rain') || msgLower.includes('flood') || msgLower.includes('waterlog'))
    reply = 'After heavy rain: open drainage channels immediately, do not apply fertilizers for 5–7 days, spray potassium nitrate (1%) to recover stressed plants. Monitor for root rot symptoms.';
  else if (msgLower.includes('price') || msgLower.includes('sell') || msgLower.includes('market'))
    reply = 'For best price realisation: check mandi prices across 2–3 markets before selling, sell after post-harvest period when seasonal lows pass, use FPO (Farmer Producer Organisation) for collective bargaining power.';
  else if (msgLower.includes('loan') || msgLower.includes('kcc') || msgLower.includes('insurance'))
    reply = 'KCC (Kisan Credit Card) at 4% interest is the most farmer-friendly option. Apply at your nearest bank with Aadhaar + land records. PMFBY crop insurance should be enrolled before sowing deadline.';
  else if (msgLower.includes('soil') || msgLower.includes('fertilizer') || msgLower.includes('nutrient'))
    reply = 'Always do a soil test before applying fertilizers — it saves 20–30% on fertilizer costs. The Soil Health Card scheme provides free testing at KVK centres. Share your soil test report and I can give specific fertilizer doses.';
  else if (msgLower.includes('drip') || msgLower.includes('irrigation') || msgLower.includes('water'))
    reply = 'Drip irrigation saves 50% water vs flood irrigation. Under PM-KUSUM scheme, 90% subsidy is available. For vegetables and horticulture, drip is almost always recommended. Fertigation (fertilizer through drip) further improves efficiency.';

  /* Save bot reply */
  db.run(
    'INSERT INTO chat_messages (user_id, expert_idx, role, message) VALUES (?,?,?,?)',
    [req.userId, idx, 'bot', reply]
  );

  res.json({
    user_msg: { role:'user', message: message.trim() },
    bot_reply: { role:'bot', message: reply }
  });
});

module.exports = router;
