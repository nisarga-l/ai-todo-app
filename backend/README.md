# 🌸 AI Todo App — Backend

Express + MongoDB API for a full-stack MERN todo app with JWT authentication and
Google Gemini–powered AI features.

## Tech stack

- **Express 5** — web server
- **MongoDB + Mongoose** — database
- **bcryptjs** — password hashing
- **jsonwebtoken (JWT)** — authentication
- **Google Gemini** (REST, via built-in `fetch`) — AI features

## Features

- Email/password **signup & login** with hashed passwords and JWT tokens
- **Per-user tasks** — every task belongs to the user who created it, and routes
  are protected so you can only see and edit your own
- Full task **CRUD** with priority, due date, and subtasks
- **AI endpoints** (Gemini):
  - Natural-language → structured task
  - Auto-prioritize a task
  - Break a task into subtasks
  - A daily "assistant" briefing over your tasks

## Folder structure

```
backend/
├── middleware/
│   └── auth.js         # JWT verification, sets req.userId
├── models/
│   ├── User.js
│   └── Task.js         # includes `user` ref + `subtasks`
├── routes/
│   ├── auth.js         # /api/auth
│   ├── tasks.js        # /api/tasks (protected)
│   └── ai.js           # /api/ai   (protected)
├── utils/
│   └── gemini.js       # Gemini REST helper
├── server.js           # entry point
├── .env                # your secrets (gitignored)
└── .env.example        # template
```

## Environment variables

Copy `.env.example` to `.env` and fill it in:

| Variable         | What it is                                                        |
| ---------------- | ----------------------------------------------------------------- |
| `MONGO_URI`      | MongoDB connection string (MongoDB Atlas is free)                 |
| `JWT_SECRET`     | Long random string used to sign tokens                            |
| `PORT`           | Port to listen on (default 5000)                                  |
| `CLIENT_URL`     | Allowed frontend origin(s) for CORS. Blank = allow all (dev only) |
| `GEMINI_API_KEY` | Free key from https://aistudio.google.com/apikey                  |
| `GEMINI_MODEL`   | Gemini model name (default `gemini-3.6-flash`)                    |

## Run locally

Requires **Node 18+** (for the built-in `fetch` used by the AI helper).

```bash
cd backend
npm install
npm run dev      # starts with nodemon on http://localhost:5000
```

## API reference

All `/api/tasks` and `/api/ai` routes require an `Authorization: Bearer <token>` header.

| Method | Route                | Description                     |
| ------ | -------------------- | ------------------------------- |
| POST   | `/api/auth/signup`   | Create account, returns token   |
| POST   | `/api/auth/login`    | Log in, returns token           |
| GET    | `/api/auth/me`       | Current user (from token)       |
| GET    | `/api/tasks`         | List your tasks                 |
| POST   | `/api/tasks`         | Create a task                   |
| PUT    | `/api/tasks/:id`     | Update one of your tasks        |
| DELETE | `/api/tasks/:id`     | Delete one of your tasks        |
| POST   | `/api/ai/parse`      | `{input}` → `{text, priority, dueDate}` |
| POST   | `/api/ai/prioritize` | `{text}` → `{priority}`         |
| POST   | `/api/ai/subtasks`   | `{text}` → `{subtasks: []}`     |
| POST   | `/api/ai/assistant`  | → `{summary}` briefing          |

See **DEPLOYMENT.md** for how to put this online for free.
