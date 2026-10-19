# VoiceShop Backend

Express + MongoDB REST API powering the Voice Enabled Online Shopping System.

## Setup
```powershell
npm install
copy .env.example .env
npm run seed
npm run dev
```

Server runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

## Scripts
- `npm run dev` — start with nodemon (auto-restart)
- `npm start` — start in production mode
- `npm run seed` — wipe & repopulate the database with demo data

## Structure
```
src/
├── config/db.js          MongoDB connection
├── models/                Mongoose schemas
├── controllers/           Business logic
├── routes/                Express routers
├── middleware/            auth, error handling, async wrapper
├── seed/seed.js           Database seeding script
└── server.js              App entry point
```

See the root README.md for full environment variable and API documentation.
