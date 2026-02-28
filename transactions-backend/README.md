# Excel Analyzer Backend

REST API backend for the Excel transaction analysis system.
Built with Node.js + Express + MongoDB.

## Stack
- **Runtime**: Node.js v20+ (ESM — `type: module`)
- **Framework**: Express 4
- **Database**: MongoDB Atlas via Mongoose 8
- **Auth**: JWT + bcrypt
- **Security**: Helmet, CORS, Rate Limiting

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Run

```bash
npm run dev    # development (nodemon)
npm start      # production
```

Server starts on `http://localhost:3000` by default.

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | HTTP port | `3000` |
| `NODE_ENV` | No | `development` or `production` | `production` |
| `MONGO_URL` | ✅ | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | ✅ | Secret for signing JWT (min 32 chars) | `z9vK3m...` |
| `JWT_EXPIRES_IN` | No | Token TTL | `7d` |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed frontend origins | `http://localhost:5173,https://app.vercel.app` |

### Notes on `NODE_ENV`
- `development` (default) — error details + stack traces returned in responses, all CORS origins allowed if `ALLOWED_ORIGINS` is empty
- `production` — error details hidden (only `message`), stack never leaked, CORS blocked if `ALLOWED_ORIGINS` is empty

### Notes on `ALLOWED_ORIGINS`
- Comma-separated list: `http://localhost:5173,https://myapp.com`
- If empty in **development** → all origins allowed (convenient for local work)
- If empty in **production** → all cross-origin requests blocked

---

## Security

### Helmet
All HTTP security headers set automatically (CSP, HSTS, X-Frame-Options, etc.).

### Rate Limiting
| Route | Limit |
|-------|-------|
| `POST /api/auth/*` | 10 req/min per IP |
| All `/api/*` | 120 req/min per IP |

Exceeded requests receive `429 Too Many Requests` with body:
```json
{ "message": "יותר מדי בקשות. נסה שוב עוד רגע.", "details": null }
```

### File Upload
- Only `.xlsx` files accepted (extension + MIME type validated)
- Max file size: 10MB

---

## API Reference

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/health` | ❌ | `{ status: "ok" }` |

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | ❌ | `{ name, email, password }` → `{ token, user }` |
| POST | `/api/auth/login` | ❌ | `{ email, password }` → `{ token, user }` |

### Dictionary Rules
All require `Authorization: Bearer <token>`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dictionary` | All rules for logged-in user |
| POST | `/api/dictionary` | Create rule |
| PUT | `/api/dictionary/:id` | Update rule |
| DELETE | `/api/dictionary/:id` | Delete rule |

### Imports
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/imports` | Upload xlsx (`multipart/form-data`: `file` + `sourceType`) |
| GET | `/api/imports` | List batches (paginated) |
| GET | `/api/imports/:id/transactions` | Transactions of a batch |
| POST | `/api/imports/:id/recategorize` | Re-run categorization (`?force=true`) |
| DELETE | `/api/imports/:id` | Delete batch + all its transactions |
| GET | `/api/imports/:id/export` | Export (`?format=csv\|xlsx`) |

### Transactions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions/uncategorized` | Uncategorized transactions |
| PATCH | `/api/transactions/:id/categorize` | Manually categorize |

### Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/summary` | Spending summary (`groupBy=category\|month\|category_month`) |
| GET | `/api/reports/top-merchants` | Top merchants by amount |

### Error Format
```json
{
  "message": "Human readable message",
  "details": null
}
```
In `development` mode, `details` may contain additional debug info.

---

## Project Structure

```
src/
├── server.js
├── app.js                    ← Express app + security + routes
├── controllers/
├── dal/                      ← Mongoose queries
├── middlewares/
│   ├── auth.middleware.js
│   ├── error.middleware.js   ← prod/dev error split
│   └── security.middleware.js ← helmet + cors + rate limiters
├── models/
├── routes/
├── services/
└── utils/
```
