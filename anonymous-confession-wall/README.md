# Anonymous Confession Wall

A modern, anonymous social wall where users can post confessions, react with emojis, and report inappropriate content. Built with vanilla JS frontend and Node.js/Express/MongoDB backend.

## Features

- Post anonymous confessions
- React with emojis (❤️🔥💀😂)
- Report inappropriate content
- Sort by newest / most reacted / trending
- Dark/light mode with persistence
- Infinite scrolling
- Glassmorphism cyberpunk design
- Mobile responsive
- Rate limiting & anti-spam
- Profanity filtering
- Toast notifications
- Loading skeletons & empty states

## Tech Stack

**Frontend:** HTML, CSS, Vanilla JavaScript (deployed on GitHub Pages)

**Backend:** Node.js, Express.js, MongoDB + Mongoose (deployed on Render)

## Project Structure

```
├── frontend/
│   ├── index.html          Main HTML
│   ├── styles.css          All styles + themes
│   ├── app.js              All JavaScript logic
│   ├── manifest.json       PWA manifest
│   └── assets/             Static assets
├── backend/
│   ├── server.js           Express server entry
│   ├── package.json        Dependencies
│   ├── .env.example        Environment template
│   ├── models/
│   │   ├── Confession.js   Confession schema
│   │   └── ReportLog.js    Report log schema
│   ├── routes/
│   │   └── confessions.js  API route definitions
│   ├── controllers/
│   │   └── confessionController.js  Business logic
│   └── middleware/
│       ├── rateLimiter.js  Rate limiting
│       ├── sanitizer.js    Input sanitization
│       ├── profanityFilter.js  Bad word filter
│       └── errorHandler.js Global error handler
├── .gitignore
└── README.md
```

## Deployment

### Backend (Render)

1. Push to GitHub
2. Create a new Web Service on Render
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Add environment variables:
   - `PORT`: `5000`
   - `MONGODB_URI`: Your MongoDB connection string
   - `CORS_ORIGIN`: Your GitHub Pages URL

### Frontend (GitHub Pages)

1. In your repo Settings → Pages
2. Set source to deploy from `frontend/` folder
3. Update `API_BASE` in `frontend/app.js` to your Render URL

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Allowed CORS origin |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/confessions` | Get confessions (sort, page, limit) |
| POST | `/api/confessions` | Create confession |
| POST | `/api/confessions/:id/react` | Add reaction |
| POST | `/api/confessions/:id/report` | Report confession |
| GET | `/api/trending` | Get trending confessions |
| GET | `/api/health` | Health check |

## License

MIT
