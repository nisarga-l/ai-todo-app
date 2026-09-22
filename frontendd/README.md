# 🌸 AI Todo App — Frontend

React + Vite frontend for the AI Todo App. Talks to the Express/MongoDB backend
in the sibling `backend/` folder.

## Features

- Login / signup (JWT auth, session restored from `localStorage`)
- Add, edit, complete, delete tasks — scoped to your account
- Search, filter, priority levels, due dates, dark mode
- Progress & priority **charts** (Chart.js)
- **AI features** (via the backend + Google Gemini):
  - ✨ **Natural-language entry** — type "submit report by friday, urgent"
  - ✨ **Auto-prioritize** — let AI pick High/Medium/Low
  - ✨ **Break into subtasks** — AI generates a checklist
  - 🤖 **AI Daily Briefing** — a summary of what to focus on

## Environment variables

Copy `.env.example` to `.env`:

```
VITE_API_URL=http://localhost:5000/api
```

Point this at your deployed backend (`https://.../api`) in production.

## Run locally

```bash
cd frontendd
npm install
npm run dev      # http://localhost:5173
```

Make sure the **backend is running** on port 5000 first (see `backend/README.md`).

## Project structure

```
src/
├── api/client.js          # axios instance + JWT interceptor
├── context/
│   ├── AuthContext.jsx     # login/signup/logout + session
│   └── ToastContext.jsx    # toast notifications
├── components/
│   ├── AuthPage.jsx        # login / signup screen
│   └── Dashboard.jsx       # the todo app + AI features
├── App.jsx                 # providers + auth-based routing
├── App.css
└── main.jsx
```
