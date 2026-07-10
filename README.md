# Crate Pool

Group Discogs orders with friends. Replace the chat workflow:

1. Someone posts a seller in chat → **open a group order** in the app
2. Everyone joins the same order
3. **Connect Discogs** → see which wantlist items that seller has in stock
4. Still paste listing links when you find something manually

## Auth flow

- **Sign in with Google** (Gmail / Google account)
- **Connect Discogs** (OAuth) — per user, so each friend sees their own wantlist matches

## Quick start (demo mode)

```bash
cd discogs-orders-dashboard
npm install
npm run dev
```

Open http://localhost:5173 → **Try demo (no login)**

Demo mode uses sample seller inventory and wantlist data (`USE_MOCK_AUTH=true` by default).

## Production OAuth setup

### 1. Google (Gmail login)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client (Web)
2. Redirect URI: `http://localhost:3001/auth/google/callback`
3. Add to `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   USE_MOCK_AUTH=false
   ```

### 2. Discogs (wantlist + identity)

1. [Discogs Developer](https://www.discogs.com/settings/developers) → create application
2. Callback URL: `http://localhost:3001/auth/discogs/callback`
3. Add to `.env`:
   ```
   DISCOGS_CONSUMER_KEY=...
   DISCOGS_CONSUMER_SECRET=...
   ```

### 3. Session secret

```
SESSION_SECRET=long-random-string
CLIENT_URL=http://localhost:5173
```

## How wantlist matching works

For a group order with seller `@vinyl_japan_tokyo`:

1. Fetches seller **inventory** (for sale)
2. For each member with Discogs connected, fetches their **wantlist**
3. Matches by `release_id` — shows price, condition, direct listing link

Wantlists must be accessible (public, or private but authenticated as owner).

## API overview

| Endpoint | Description |
|----------|-------------|
| `GET /auth/google` | Start Google login |
| `GET /auth/discogs` | Connect Discogs to current user |
| `GET /api/sessions` | List open group orders |
| `POST /api/sessions` | Create order `{ sellerUsername, title? }` |
| `GET /api/sessions/:id` | Order detail + members + links |
| `POST /api/sessions/:id/links` | Add `{ url, note? }` |
| `GET /api/sessions/:id/matches` | Wantlist vs seller inventory |

Data is stored in SQLite (`data/app.db`).

## Stack

- React + Vite frontend
- Express API
- SQLite (swap for Azure SQL later)
- Google OAuth 2.0 + Discogs OAuth 1.0a
