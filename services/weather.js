'use strict';
const axios = require('axios');

const BASE = 'https://api.open-meteo.com/v1/forecast';
const GEO  = 'https://nominatim.openstreetmap.org';

/* ── In-memory cache (5 min TTL) ─────────────────── */
const cache = new Map();
function cacheKey (lat, lon) { return `${(+lat).toFixed(3)},${(+lon).toFixed(3)}`; }
function fromCache (lat, lon) {
  const k = cacheKey(lat, lon);
  const entry = cache.get(k);
  if (!entry) return null;
  if (Date.now() - entry.ts > 5 * 60 * 1000) { cache.delete(k); return null; }
  return entry.data;
}
function toCache (lat, lon, data) {
  cache.set(cacheKey(lat, lon), { ts: Date.now(), data });
}

/* ── Fetch live weather from Open-Meteo ─────────── */
async function fetchWeather (lat, lon) {
  const cached = fromCache(lat, lon);
  if (cached) return cached;

  const params = {
    latitude:  lat,
    longitude: lon,
    current: [
      'temperature_2m','relative_humidity_2m','apparent_temperature',
      'precipitation','weather_code','wind_speed_10m','wind_direction_10m',
      'uv_index','surface_pressure','visibility'
    ].join(','),
    daily: [
      'weather_code','temperature_2m_max','temperature_2m_min',
      'precipitation_sum','precipitation_probability_max',
      'wind_speed_10m_max','uv_index_max','sunrise','sunset'
    ].join(','),
    hourly: ['temperature_2m','precipitation_probability','weather_code'].join(','),
    timezone:     'Asia/Kolkata',
    forecast_days: 10
  };

  const resp = await axios.get(BASE, { params, timeout: 10_000 });
  const data = resp.data;
  toCache(lat, lon, data);
  return data;
}

/* ── Reverse geocode (coord → place name) ────────── */
async function reverseGeocode (lat, lon) {
  try {
    const resp = await axios.get(`${GEO}/reverse`, {
      params: { format: 'json', lat, lon, zoom: 10, addressdetails: 1 },
      headers: { 'User-Agent': 'KisanMitra/1.0 (farm advisory app)' },
      timeout: 8_000
    });
    const a = resp.data.address || {};
    return {
      city:     a.city || a.town || a.village || a.county || a.suburb || '',
      district: a.county || a.state_district || a.district || '',
      state:    a.state || '',
      country:  a.country || 'India'
    };
  } catch {
    return { city: '', district: '', state: '', country: 'India' };
  }
}

/* ── Forward geocode (text → coords) ─────────────── */
async function forwardGeocode (query) {
  try {
    const resp = await axios.get(`${GEO}/search`, {
      params: { format: 'json', q: query + ', India', limit: 1, addressdetails: 1 },
      headers: { 'User-Agent': 'KisanMitra/1.0' },
      timeout: 8_000
    });
    if (!resp.data.length) return null;
    const r = resp.data[0];
    const a = r.address || {};
    return {
      lat:      parseFloat(r.lat),
      lon:      parseFloat(r.lon),
      city:     a.city || a.town || a.village || a.county || '',
      district: a.county || a.state_district || '',
      state:    a.state || ''
    };
  } catch {
    return null;
  }
}

/* ── Derive agricultural alerts from weather ─────── */
function deriveAlerts (weather) {
  const alerts = [];
  const daily = weather.daily;
  const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  for (let i = 0; i < (daily.time || []).length; i++) {
    const d    = new Date(daily.time[i] + 'T00:00:00+05:30');
    const dayN = DAYS[d.getDay()];
    const rain = daily.precipitation_sum[i];
    const tmax = daily.temperature_2m_max[i];

    if (rain >= 50) {
      alerts.push({
        type: 'alert', severity: 'high', icon: '⛈️',
        title: `Heavy Rain Warning — ${dayN}`,
        body:  `${rain.toFixed(0)}mm expected. Prepare field drainage, avoid pesticide spraying, and harvest any ripe produce before then.`
      });
    } else if (rain >= 20) {
      alerts.push({
        type: 'alert', severity: 'medium', icon: '🌧️',
        title: `Moderate Rain Forecast — ${dayN}`,
        body:  `${rain.toFixed(0)}mm expected. Skip irrigation for 2 days after rain. Check for waterlogging.`
      });
    }
    if (tmax >= 40) {
      alerts.push({
        type: 'alert', severity: 'high', icon: '🌡️',
        title: `Extreme Heat Advisory — ${dayN}`,
        body:  `Temperature may reach ${Math.round(tmax)}°C. Irrigate early morning/evening. Mulch to retain soil moisture. Avoid working in fields during peak heat.`
      });
    } else if (tmax >= 37) {
      alerts.push({
        type: 'alert', severity: 'medium', icon: '☀️',
        title: `Heat Alert — ${dayN}`,
        body:  `${Math.round(tmax)}°C expected. Ensure adequate irrigation. Monitor heat-sensitive crops.`
      });
    }
  }

  const cur = weather.current;
  if (cur && cur.relative_humidity_2m > 80) {
    alerts.push({
      type: 'alert', severity: 'medium', icon: '💧',
      title: 'High Humidity — Fungal Disease Risk',
      body:  `Humidity at ${cur.relative_humidity_2m}%. Monitor crops for fungal diseases like rust and blight. Improve field ventilation.`
    });
  }

  return alerts.slice(0, 5); // max 5 alerts
}

module.exports = { fetchWeather, reverseGeocode, forwardGeocode, deriveAlerts };
