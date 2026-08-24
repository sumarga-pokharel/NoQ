# NoQ

Virtual queue management for places in Nepal where people still stand in line —
government offices, hospitals, banks, and anywhere else that hands out a
token number. Visitors join a queue from their phone (no app, no account),
watch their position update live, and get a nudge when it's time to leave so
they can wait wherever they want instead of standing in a hallway. Staff get
a dashboard to call the next token, skip no-shows, and balance load across
counters.

Built with Nepal's connectivity in mind: SMS fallback for visitors without
data, offline-tolerant ticket pages, and Nepali/English throughout.

## Why

Queue tokens exist mostly to make people physically wait near the counter so
they don't lose their place. NoQ replaces the physical wait with a live
position + estimate on the visitor's own phone, so the queue keeps moving
without needing everyone standing in the room.

## How it works

1. An office signs up, picks a sector (government / hospital / bank / other),
   and defines its services, counters, and any documents visitors need to
   bring.
2. A QR code or link is put up at the office. Visitors scan it, pick a
   service, and join — no signup required.
3. The visitor's ticket page shows live position, estimated wait, and
   (optionally) a travel-aware "leave by" time based on their location.
4. Staff work from a dashboard: call the next compatible ticket per counter,
   skip no-shows, and see live queue stats.
5. A display board (for a TV/monitor in the waiting area) shows what's
   currently being served at each counter.

Everything updates in real time over Socket.io — dashboard, ticket page, and
display board all reflect the same queue state as it changes.

## Features

- **Live position & ETA** — visitors see where they stand without asking
  anyone
- **Travel-aware estimate** — combines queue wait with travel time (via
  Google Routes, when configured) to suggest when to actually leave
- **Document checklist** — visitors confirm they have what's needed before
  they're called; staff see readiness at a glance
- **Priority queue** — senior citizens, pregnant visitors, people with
  disabilities, and emergencies are weighted into the ordering, visibly
- **SMS + browser notifications** — browser push when available, plain SMS
  when it isn't (via Twilio)
- **No-show handling** — a call, a grace window, then auto-skip, with an easy
  way to rejoin near the front
- **Multi-counter load balancing** — counters can be restricted to specific
  services or serve anything; idle counters pull from the shared queue
- **English and नेपाली** — visitor pages, SMS, and the display board switch
  language in one tap

## Stack

- **Backend** — Node.js, Express, MongoDB (Mongoose), Socket.io for realtime,
  JWT auth for staff, Twilio for SMS, Nodemailer for email
- **Frontend** — React 19, Vite, React Router, Leaflet (maps), socket.io-client

## Project structure

```
NoQ/
├── backend/
│   ├── controllers/   # auth, provider setup, services, counters, tickets, public API
│   ├── models/        # Provider, Service, Counter, Ticket (Mongoose schemas)
│   ├── routes/
│   ├── sockets/       # Socket.io event handlers (queue:update, ticket:update)
│   ├── utils/         # queue position/ETA math, travel estimate, SMS, seed script
│   └── tests/         # integration tests against an in-memory MongoDB
└── frontend/
    └── src/
        ├── pages/      # Landing, Signup/Login, Setup, Join, Ticket, Dashboard, Display...
        ├── context/    # auth + language context
        ├── layouts/
        └── lib/
```

## Getting started

Requires Node 18+ and a MongoDB Atlas connection string (a free M0 cluster is
enough to develop against).

```bash
# backend
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, CLIENT_ORIGIN
npm run dev

# frontend, in another terminal
cd frontend
npm install
npm run dev
```

Seed a demo office (with sample services, counters, and a join link) with:

```bash
cd backend
npm run seed
```

Full setup instructions — Atlas setup, env vars, the public/staff API
reference, and Socket.io usage — are in [`backend/SETUP.md`](backend/SETUP.md).

Run the backend's integration test suite (spins up an in-memory MongoDB, no
effect on real data) with:

```bash
cd backend
pnpm test
```

## Deployment

`render.yaml` deploys the backend as a web service and the frontend as a
static site on [Render](https://render.com), including the SPA rewrite rule
the frontend needs and the env vars each service expects. Backend and
frontend can also be deployed separately behind a reverse proxy — see the
"Production API and Socket.IO configuration" section in `backend/SETUP.md`
for both layouts.

## Status

Backend API and realtime layer are functional and tested. Frontend pages are
built against the same API but some screens still use local/mock state where
noted in `backend/SETUP.md` — that file also lists what's stubbed (push
notification delivery, SMS/email providers without credentials configured)
versus what's wired end-to-end.