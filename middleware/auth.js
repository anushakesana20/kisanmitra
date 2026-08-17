'use strict';
const jwt    = require('jsonwebtoken');
const { getDb } = require('../db/database');

module.exports = function requireAuth (req, res, next) {
  try {
    /* Accept token from Authorization header OR cookie */
    let token = null;

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies && req.cookies.km_token) {
      token = req.cookies.km_token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDb();

    /* Verify user still exists */
    const user = db.get(
      'SELECT id, mobile, name, fname, lname, village, district, state, land_acres, crops, lang, avatar_b64, lat, lon, location_city, location_district, location_state FROM users WHERE id = ?',
      [payload.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found. Please login again.' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please login again.' });
  }
};
