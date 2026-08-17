# 🌾 KisanMitra — Smart Crop Advisory System

A complete full-stack web application for small and marginal Indian farmers.
Real weather, real market prices, real database — no fake functionality.

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | Vanilla HTML/CSS/JS (single-page app)           |
| Backend     | Node.js + Express.js                            |
| Database    | SQLite via sql.js (zero-dependency, persisted)  |
| Auth        | JWT (30-day tokens) + bcrypt password hashing   |
| Weather     | Open-Meteo API (free, no key required)          |
| Geocoding   | OpenStreetMap Nominatim (free, no key required) |
| Market Data | AGMARKNET / data.gov.in API (optional key)      |

---

## Quick Start

### 1. Install dependencies
```bash
cd kisanmitra
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — at minimum set a strong JWT_SECRET
```

### 3. Run the server
```bash
npm start
# Server starts at http://localhost:3000
```

### 4. Open in browser
```
http://localhost:3000
```

---

## Environment Variables

| Variable            | Required | Description                                              |
|---------------------|----------|----------------------------------------------------------|
| `PORT`              | No       | Server port (default: 3000)                              |
| `JWT_SECRET`        | **Yes**  | Strong random string for JWT signing                     |
| `JWT_EXPIRES_IN`    | No       | Token expiry (default: 30d)                              |
| `DB_PATH`           | No       | SQLite file path (default: ./db/kisanmitra.db)           |
| `DATA_GOV_API_KEY`  | No       | data.gov.in key for live AGMARKNET prices                |
| `NODE_ENV`          | No       | `development` = OTP shown in response; `production` = SMS only |

---

## Getting a data.gov.in API Key (for live market prices)

1. Visit https://data.gov.in
2. Click "Register" → create a free account
3. Go to your profile → "API Key" → copy your key
4. Paste into `.env` as `DATA_GOV_API_KEY=your_key_here`

Without this key, the app uses realistic estimated mandi prices based on actual MSP data.

---

## Project Structure

```
kisanmitra/
├── server/
│   └── index.js          # Express server entry point
├── routes/
│   ├── auth.js           # Register, OTP login, password login, logout
│   ├── users.js          # Profile CRUD, location, password change
│   └── api.js            # Weather, market, crops, soil, tasks, notifications, chat
├── services/
│   ├── weather.js        # Open-Meteo integration + agricultural alerts
│   ├── market.js         # AGMARKNET API + estimated price fallback
│   └── crops.js          # AI crop recommendations + soil analysis + irrigation
├── middleware/
│   └── auth.js           # JWT verification middleware
├── db/
│   ├── database.js       # sql.js SQLite setup + schema + persistence
│   └── kisanmitra.db     # Auto-created SQLite database file
├── public/
│   └── index.html        # Complete single-page frontend
├── .env                  # Environment config (DO NOT COMMIT)
├── .env.example          # Safe template to commit
└── package.json
```

---

## API Endpoints

### Authentication
| Method | Endpoint                    | Description                        |
|--------|-----------------------------|------------------------------------|
| POST   | `/api/auth/register`        | Create account with password       |
| POST   | `/api/auth/login`           | Login with mobile + password       |
| POST   | `/api/auth/otp/send`        | Send/generate OTP for mobile       |
| POST   | `/api/auth/otp/verify`      | Verify OTP, login/create account   |
| POST   | `/api/auth/logout`          | Invalidate session cookie          |
| GET    | `/api/auth/me`              | Get current user from token        |

### User / Profile
| Method | Endpoint                    | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | `/api/users/profile`        | Full profile                       |
| PATCH  | `/api/users/profile`        | Update profile fields              |
| PATCH  | `/api/users/password`       | Change password (requires current) |
| PATCH  | `/api/users/location`       | Save GPS/manual location           |
| DELETE | `/api/users/account`        | Delete account (requires password) |

### Data APIs (all require Authorization: Bearer token)
| Method | Endpoint                        | Description                         |
|--------|---------------------------------|-------------------------------------|
| GET    | `/api/weather`                  | Live weather from Open-Meteo        |
| GET    | `/api/geocode/reverse`          | Coordinates → place name            |
| GET    | `/api/geocode/forward`          | Place name → coordinates            |
| GET    | `/api/market`                   | Mandi prices (live or estimated)    |
| POST   | `/api/crops/recommend`          | AI crop recommendations             |
| GET    | `/api/soil`                     | Saved soil data + analysis          |
| PUT    | `/api/soil`                     | Save soil test values               |
| GET    | `/api/irrigation`               | Weather-aware irrigation schedule   |
| GET    | `/api/tasks`                    | All calendar tasks                  |
| POST   | `/api/tasks`                    | Create task                         |
| PATCH  | `/api/tasks/:id`                | Update / mark done                  |
| DELETE | `/api/tasks/:id`                | Delete task                         |
| GET    | `/api/notifications`            | All notifications                   |
| PATCH  | `/api/notifications/:id/read`   | Mark one as read                    |
| POST   | `/api/notifications/read-all`   | Mark all as read                    |
| DELETE | `/api/notifications/:id`        | Delete one notification             |
| DELETE | `/api/notifications`            | Clear all notifications             |
| GET    | `/api/experts`                  | Expert directory                    |
| GET    | `/api/chat/:expertIdx`          | Load chat history with expert       |
| POST   | `/api/chat/:expertIdx`          | Send message, get AI response       |

---

## Database Schema

- **users** — mobile, hashed password, name, location, land, crops, avatar, language
- **notifications** — type, severity, title, body, read status, per-user
- **tasks** — name, due_date, category, notes, done status, per-user
- **soil_data** — OC, N, P, K, pH, Zn values per user (one record per user)
- **chat_messages** — role, message, expert_idx, per-user

---

## Security

- Passwords hashed with **bcrypt** (12 salt rounds) — never stored in plain text
- JWT tokens signed with a strong secret — verify on every protected request
- Auth tokens accepted via **Bearer header** or **HttpOnly cookie**
- Rate limiting: 20 requests / 15 min on auth routes; 120 req / min on API routes
- Helmet.js for secure HTTP headers
- All SQL uses **parameterized queries** — no injection possible
- User data access is always scoped to `req.userId` from verified JWT

---

## Features

| Feature                  | Implementation                                                    |
|--------------------------|-------------------------------------------------------------------|
| OTP Login                | Real OTP generation; demo_otp returned in development mode        |
| Password Login           | bcrypt verify, JWT issue                                          |
| Session Persistence      | 30-day JWT stored in localStorage + HttpOnly cookie               |
| Edit Profile             | Full PATCH with validation, avatar as base64                      |
| Location Detection       | Browser Geolocation → Nominatim reverse geocode → saved to DB     |
| Real Weather             | Open-Meteo: temperature, humidity, wind, UV, 10-day forecast      |
| Agricultural Alerts      | Auto-generated from real forecast (heavy rain >50mm, heat >40°C) |
| Market Prices            | AGMARKNET via data.gov.in; deterministic daily variation fallback |
| Crop Recommendations     | Soil × Season × Water → scored crop list with MSP data           |
| Soil Analysis            | NPK/pH/Zn gauges + contextual fertilizer recommendations          |
| Irrigation Advisory      | Weather-aware schedule per crop based on user profile             |
| Pest Detection           | Photo upload → simulated AI (real ML model can be plugged in)     |
| Calendar / Tasks         | Full CRUD with done/undo, categories, export to text file         |
| Expert Chat              | Keyword-aware responses; full history persisted in DB             |
| Notifications            | Weather alerts auto-created from forecast; read/delete/clear all  |
| Delete Account           | Password-confirmed hard delete with cascade                       |
| Live Clock               | IST time shown in topnav, updated every second                    |
| Knowledge Hub            | Searchable + filterable article grid                              |
| Finance / Cost Estimator | Scheme details + itemized cost-profit calculator                  |
| Offline-friendly         | JWT in localStorage; fails gracefully on network loss             |

---

## Production Deployment Checklist

- [ ] Change `JWT_SECRET` to a strong random value (32+ chars)
- [ ] Set `NODE_ENV=production` (hides demo OTP from API response)
- [ ] Add `DATA_GOV_API_KEY` for live mandi prices
- [ ] Set up a proper SMS gateway (Twilio / Fast2SMS) in `routes/auth.js`
- [ ] Mount `DB_PATH` on persistent volume (not ephemeral storage)
- [ ] Add HTTPS (use Nginx + Let's Encrypt or a platform like Railway/Render)
- [ ] Set a `trust proxy` value in Express if behind a reverse proxy
- [ ] Consider a cron job to `saveDb()` every 5 minutes for durability
