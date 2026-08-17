'use strict';
const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const requireAuth = require('../middleware/auth');
const { getDb } = require('../db/database');

/* All routes require auth */
router.use(requireAuth);

/* ── GET /api/users/profile ──────────────────────── */
router.get('/profile', (req, res) => {
  const db  = getDb();
  const user = db.get(
    `SELECT id, mobile, name, fname, lname, village, district, state,
            land_acres, crops, lang, avatar_b64, lat, lon,
            location_city, location_district, location_state, joined_at
     FROM users WHERE id = ?`,
    [req.userId]
  );
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

/* ── PATCH /api/users/profile ────────────────────── */
router.patch('/profile', (req, res) => {
  const allowed = ['fname','lname','name','village','district','state',
                   'land_acres','crops','lang','avatar_b64',
                   'lat','lon','location_city','location_district','location_state'];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  /* Recompute name if fname/lname updated */
  if (updates.fname !== undefined || updates.lname !== undefined) {
    const db2 = getDb();
    const cur = db2.get('SELECT fname, lname FROM users WHERE id = ?', [req.userId]);
    const fname = updates.fname ?? cur.fname ?? '';
    const lname = updates.lname ?? cur.lname ?? '';
    updates.name = (fname + ' ' + lname).trim();
  }

  /* Mobile validation if provided */
  if (req.body.mobile) {
    const m = req.body.mobile.replace(/\D/g,'');
    if (!/^\d{10}$/.test(m))
      return res.status(400).json({ error: 'Valid 10-digit mobile number required.' });
    updates.mobile = m;
  }

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: 'No valid fields to update.' });

  updates.updated_at = new Date().toISOString();

  const db = getDb();
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), req.userId];

  db.run(`UPDATE users SET ${setClauses} WHERE id = ?`, values);

  const user = db.get(
    `SELECT id, mobile, name, fname, lname, village, district, state,
            land_acres, crops, lang, avatar_b64, lat, lon,
            location_city, location_district, location_state, joined_at
     FROM users WHERE id = ?`,
    [req.userId]
  );

  res.json({ user });
});

/* ── PATCH /api/users/password ───────────────────── */
router.patch('/password', async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    if (new_password.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });

    const db = getDb();
    const user = db.get('SELECT password_hash FROM users WHERE id = ?', [req.userId]);

    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 12);
    db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
           [hash, new Date().toISOString(), req.userId]);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

/* ── DELETE /api/users/account ───────────────────── */
router.delete('/account', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ error: 'Password required to delete account.' });

    const db = getDb();
    const user = db.get('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Incorrect password.' });

    db.run('DELETE FROM users WHERE id = ?', [req.userId]);
    res.clearCookie('km_token');
    res.json({ message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

/* ── PATCH /api/users/location ───────────────────── */
router.patch('/location', (req, res) => {
  const { lat, lon, city, district, state } = req.body;
  const db = getDb();
  db.run(
    `UPDATE users SET lat=?, lon=?, location_city=?, location_district=?, location_state=?, updated_at=? WHERE id=?`,
    [lat || null, lon || null, city || '', district || '', state || '', new Date().toISOString(), req.userId]
  );
  const user = db.get(
    'SELECT id, lat, lon, location_city, location_district, location_state FROM users WHERE id = ?',
    [req.userId]
  );
  res.json({ user });
});

module.exports = router;
