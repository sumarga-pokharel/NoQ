# NoQ Backend — Setup Guide

Node.js + Express + MongoDB Atlas backend for NoQ, plus a Socket.io layer for
live queue updates (ticket position, wait estimate, dashboard, display board).

---

## 1. Create your MongoDB Atlas database

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Click **Build a Database** → choose the **M0 Free** tier → pick a cloud
   provider/region close to Nepal (e.g. AWS `ap-south-1`, Mumbai) → **Create**.
3. **Database Access** (left sidebar) → **Add New Database User**:
   - Authentication method: Password
   - Username/password: pick something (save it, you'll need it below)
   - Role: "Read and write to any database"
4. **Network Access** (left sidebar) → **Add IP Address**:
   - While developing, click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Before going to production, replace this with your actual server's IP.
5. **Database** (left sidebar) → **Connect** on your cluster → **Drivers** →
   copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
6. Add your database name right after `.net/`, e.g. `.../noq?retryWrites=true...`
   (Atlas creates the `noq` database automatically the first time data is written.)

---

## 2. Configure the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:

```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/noq?retryWrites=true&w=majority
JWT_SECRET=<any long random string — e.g. output of `openssl rand -hex 32`>
CLIENT_ORIGIN=http://localhost:5173
```

Leave the Twilio variables blank for now — SMS reminders will just log to the
console instead of actually sending until you add real Twilio credentials.

---

## 3. Run it

```bash
npm run dev        # nodemon, auto-restarts on file changes
# or
npm start          # plain node
```

You should see:
```
MongoDB connected: <cluster host>
NoQ backend running on port 5000
```

Sanity check: `curl http://localhost:5000/api/health` → `{"status":"ok",...}`

### Optional: seed a demo office

```bash
npm run seed
```

Creates a demo government office ("Ward 16 Office, Lalitpur") with 3 services,
3 counters and 2 required documents, and prints the login email/password and
the public join-link slug it generated.

---

## 4. Connect the React frontend

In `frontend/`, create `.env`:
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Then wire up API calls where the frontend currently uses mock/local state:

| Frontend screen | Replace mock data with |
|---|---|
| `SignupPage.jsx` | `POST /api/auth/signup` |
| `LoginPage.jsx` | `POST /api/auth/login` |
| `SetupPage.jsx` (finish) | `PUT /api/provider/setup` |
| `JoinPage.jsx` (submit) | `GET /api/public/offices/:slug` to load services/docs, then `POST /api/public/offices/:slug/tickets` to join |
| `TicketPage.jsx` | `GET /api/public/tickets/:id` (poll every few seconds) **and/or** listen for the `ticket:update` / `queue:update` Socket.io events |
| `DashboardPage.jsx` | `GET /api/tickets/dashboard`, `POST /api/counters/:id/call-next`, `POST /api/counters/:id/skip`, `POST /api/tickets/walk-in` |
| `DisplayPage.jsx` | `GET /api/public/offices/:slug/display`, refreshed via the `queue:update` socket event |

Store the JWT from signup/login in memory or `sessionStorage` and send it as
`Authorization: Bearer <token>` on every `/api/provider`, `/api/services`,
`/api/counters` and `/api/tickets` request. `/api/public/*` needs no token —
that's the whole point, consumers never create an account.

### Socket.io (live updates)

```js
import { io } from 'socket.io-client'
const socket = io(import.meta.env.VITE_SOCKET_URL)
socket.emit('office:join', officeId) // officeId = provider._id, from /api/public/offices/:slug
socket.on('queue:update', (snapshot) => { /* refresh dashboard/board state */ })
socket.on('ticket:update', (ticket) => { /* refresh a single visitor's ticket page */ })
```

---

## 5. API reference (quick)

**Auth** (`/api/auth`)
- `POST /signup` — `{ officeName, sector, email, phone, password }` → `{ token, provider }`
- `POST /login` — `{ email, password }` → `{ token, provider }`
- `GET /me` — 🔒 → `{ provider }`

**Provider setup** (`/api/provider`, 🔒 = requires `Authorization: Bearer <token>`)
- `PUT /setup` — `{ sector, requiredDocuments: string[], services: [{name, minutes, prefix}] }`
- `PUT /me` — `{ officeName, address, location, phone, isAcceptingJoins }`
- `PUT /documents` — `{ requiredDocuments: string[] }`

**Services** (`/api/services`, 🔒)
- `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`

**Counters** (`/api/counters`, 🔒)
- `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`
- `POST /:id/call-next` — pulls the next compatible waiting ticket
- `POST /:id/skip` — marks current ticket no-show, frees the counter

**Tickets — provider side** (`/api/tickets`, 🔒)
- `GET /dashboard` — stats + counters + waiting list
- `POST /walk-in` — `{ serviceId, priority }` — staff issues a token manually

**Public — consumer side, no auth** (`/api/public`)
- `GET /offices/:slug` — office info, active services, required documents
- `POST /offices/:slug/tickets` — `{ serviceId, priority, documents, phone, notifyBrowser, notifySms }` → `{ ticket, position, estimate }`
- `GET /offices/:slug/display` — data for the waiting-room screen
- `GET /tickets/:id` — live position + wait estimate for one ticket
- `PATCH /tickets/:id/hold` — "hold my place"
- `PATCH /tickets/:id/leave` — leave the queue
- `PATCH /tickets/:id/location` — `{ lat, lng }`, powers the travel-time estimate

---

## 6. Notes on things you'll likely want to extend

- **Push notifications**: `pushSubscription` is stored on the ticket already;
  wire up the Web Push API (VAPID keys) server-side to actually send them —
  currently only the data model and the `notifyBrowser` flag exist.
- **SMS**: `utils/sms.js` logs to console until you `npm install twilio` and
  fill in the `TWILIO_*` env vars.
- **Travel-time ETA**: `PATCH /tickets/:id/location` stores the visitor's
  coordinates; combine with a maps/directions API (e.g. Google Distance
  Matrix, OpenRouteService) to turn that into the "leave by" time shown on
  `TicketPage`.
- **Daily reset**: token numbering already resets automatically each day
  (see `utils/queueEstimator.js`); if you want old tickets archived/cleared,
  add a small daily cron (e.g. `node-cron`) that marks stale `waiting` tickets
  as `no-show` after hours.
- **Rate limiting** is on `/api/public` and `/api/auth` already, tune the
  numbers in `app.js` for your expected traffic.
