'use strict';
const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { getDb } = require('../db/database');
const requireAuth = require('../middleware/auth');

/* ── helpers ─────────────────────────────────────── */
function signToken (userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
}

function setCookie (res, token) {
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  res.cookie('km_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge,
    secure: process.env.NODE_ENV === 'production'
  });
}

function safeUser (row) {
  /* Never send password_hash to client */
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}

/* ── POST /api/auth/register ─────────────────────── */
router.post('/register', async (req, res) => {
  try {
    const { mobile, password, name, state, land_acres } = req.body;

    /* Validate */
    if (!mobile || !/^\d{10}$/.test(mobile))
      return res.status(400).json({ error: 'Valid 10-digit mobile number required.' });
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (!name || name.trim().length < 2)
      return res.status(400).json({ error: 'Full name is required.' });
    if (!state)
      return res.status(400).json({ error: 'State is required.' });

    const db = getDb();

    /* Duplicate check */
    const existing = db.get('SELECT id FROM users WHERE mobile = ?', [mobile]);
    if (existing)
      return res.status(409).json({ error: 'Mobile number already registered. Please login.' });

    /* Hash password */
    const password_hash = await bcrypt.hash(password, 12);

    const nameParts = name.trim().split(' ');
    const fname = nameParts[0];
    const lname = nameParts.slice(1).join(' ');

    db.run(
      `INSERT INTO users (mobile, password_hash, name, fname, lname, state, land_acres)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [mobile, password_hash, name.trim(), fname, lname, state, parseFloat(land_acres) || 0]
    );

    const user = db.get('SELECT * FROM users WHERE mobile = ?', [mobile]);
    const token = signToken(user.id);
    setCookie(res, token);

    /* Seed default notifications */
    db.run(
      `INSERT INTO notifications (user_id, type, severity, icon, title, body)
       VALUES (?, 'info', 'low', '🎉', 'Welcome to KisanMitra!', 'Your smart crop advisory account is ready. Start by setting your location for accurate weather and crop advice.')`,
      [user.id]
    );

    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/* ── POST /api/auth/login ────────────────────────── */
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password)
      return res.status(400).json({ error: 'Mobile and password are required.' });

    const db = getDb();
    const user = db.get('SELECT * FROM users WHERE mobile = ?', [mobile.replace(/\D/g, '')]);

    if (!user)
      return res.status(401).json({ error: 'Mobile number not found. Please register first.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });

    const token = signToken(user.id);
    setCookie(res, token);

    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/* ── POST /api/auth/otp/send ─────────────────────── */
/* For demo: generates OTP and returns it (in production, send via SMS) */

/* ── POST /api/auth/otp/send ─────────────────────── */
/* Demo OTP login */

const otpStore = new Map();

router.post('/otp/send', (req, res) => {
  try {
    const mobile = String(req.body.mobile || '').replace(/\D/g, '');

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        error: 'Valid 10-digit mobile number required.'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(mobile, {
      otp: otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    console.log(`[OTP] Mobile: ${mobile} -> OTP: ${otp}`);

    res.json({
      message: 'OTP sent successfully.',
      demo_otp: otp
    });

  } catch (err) {
    console.error('OTP send error:', err);

    res.status(500).json({
      error: 'Failed to send OTP. Please try again.'
    });
  }
});


/* ── POST /api/auth/otp/verify ───────────────────── */

router.post('/otp/verify', async (req, res) => {
  try {
    const mobile = String(req.body.mobile || '').replace(/\D/g, '');
    const otp = String(req.body.otp || '').trim();

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        error: 'Valid 10-digit mobile number required.'
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        error: 'Enter the 6-digit OTP.'
      });
    }

    const stored = otpStore.get(mobile);

    if (!stored) {
      return res.status(400).json({
        error: 'No OTP found for this number. Please request again.'
      });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(mobile);

      return res.status(400).json({
        error: 'OTP expired. Please request a new one.'
      });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({
        error: 'Incorrect OTP. Please try again.'
      });
    }

    // OTP is correct
    otpStore.delete(mobile);

    const db = getDb();

    let user = db.get(
      'SELECT * FROM users WHERE mobile = ?',
      [mobile]
    );

    // Create account automatically if user does not exist
    if (!user) {
      const autoName = req.body.name || 'Farmer';
      const state = req.body.state || '';
      const landAcres = parseFloat(req.body.land_acres) || 0;

      const tempHash = await bcrypt.hash(
        Math.random().toString(36),
        12
      );

      db.run(
        `INSERT INTO users
        (mobile, password_hash, name, fname, lname, state, land_acres)
        VALUES (?, ?, ?, ?, '', ?, ?)`,
        [
          mobile,
          tempHash,
          autoName,
          autoName,
          state,
          landAcres
        ]
      );

      user = db.get(
        'SELECT * FROM users WHERE mobile = ?',
        [mobile]
      );

      if (user) {
        db.run(
          `INSERT INTO notifications
          (user_id, type, severity, icon, title, body)
          VALUES (?, 'info', 'low', '🎉', 'Welcome to KisanMitra!',
          'Your account is ready. Set your location to get personalised weather and crop advice.')`,
          [user.id]
        );
      }
    }

    if (!user) {
      return res.status(500).json({
        error: 'Unable to create or find your account.'
      });
    }

    const token = signToken(user.id);

    setCookie(res, token);

    res.json({
      message: 'OTP verified successfully.',
      token: token,
      user: safeUser(user)
    });

  } catch (err) {
    console.error('OTP verify error:', err);

    res.status(500).json({
      error: 'Verification failed. Please try again.'
    });
  }
});
/* ── POST /api/auth/logout ───────────────────────── */
router.post('/logout', requireAuth, (req, res) => {
  res.clearCookie('km_token');
  res.json({ message: 'Logged out successfully.' });
});

/* ── GET /api/auth/me ────────────────────────────── */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
