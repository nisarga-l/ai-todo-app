# 🚀 Deployment Guide — AI Todo App

This guide takes the app from your laptop to a live, shareable URL — all on free tiers.

The stack:

- **Database** → MongoDB Atlas (free)
- **Backend** → Render (free web service)
- **Frontend** → Vercel (free static hosting)

---

## 0. Before you start

You'll need free accounts on:

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
- [Google AI Studio](https://aistudio.google.com/apikey) (for the Gemini API key)
- [Render](https://render.com)
- [Vercel](https://vercel.com)
- A GitHub account with this project pushed to a repo

---

## 1. Get a free Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Click **Create API key** and copy it.
3. You'll paste this into the backend's `GEMINI_API_KEY` env var.

The free tier has rate limits (requests per minute / per day) but is plenty for
this app. Current limits: https://ai.google.dev/gemini-api/docs/rate-limits

---

## 2. Set up MongoDB Atlas

1. Create a free **M0 cluster**.
2. Under **Database Access**, create a database user with a username and a
   *strong* password.
3. Under **Network Access**, add IP `0.0.0.0/0` (allow from anywhere) so Render
   can reach it.
4. Click **Connect → Drivers** and copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/aitodo?retryWrites=true&w=majority
   ```
   Add a database name (e.g. `aitodo`) before the `?`.

---

## 3. Deploy the backend to Render

1. Push your code to GitHub.
2. On Render: **New → Web Service**, connect the repo.
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add **Environment Variables** (from your `.env`, but with production values):
   | Key | Value |
   | --- | --- |
   | `MONGO_URI` | your Atlas connection string |
   | `JWT_SECRET` | a long random string (see note below) |
   | `GEMINI_API_KEY` | your Gemini key |
   | `GEMINI_MODEL` | `gemini-3.6-flash` |
   | `CLIENT_URL` | your Vercel URL (add after step 4, e.g. `https://your-app.vercel.app`) |
5. Deploy. Note the backend URL, e.g. `https://ai-todo-api.onrender.com`.

> **Note:** Render's free web services sleep after inactivity, so the first
> request after a while may take ~30s to wake up.

---

## 4. Deploy the frontend to Vercel

1. On Vercel: **Add New → Project**, import the same repo.
2. Settings:
   - **Root Directory**: `frontendd`
   - Framework preset: **Vite** (auto-detected)
3. Add an **Environment Variable**:
   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://ai-todo-api.onrender.com/api` (your Render URL + `/api`) |
4. Deploy. You'll get a URL like `https://your-app.vercel.app`.
5. **Go back to Render** and set `CLIENT_URL` to that Vercel URL, then redeploy
   the backend so CORS allows your frontend.

---

## 5. Test it

Open your Vercel URL, sign up, add a task, and try the ✨ AI features. Done! 🎉

---

## 🔒 Security checklist before going live

- **Rotate your secrets.** The `JWT_SECRET` in local dev (`mysecretkey123`) is
  weak — generate a strong one, e.g.:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- **Use a strong MongoDB password**, and never commit `.env` (it's already
  gitignored). If credentials were ever committed, rotate them in Atlas.
- Set `CLIENT_URL` in production so CORS is restricted to your frontend.
- Keep your `GEMINI_API_KEY` server-side only (it already is — the frontend
  never sees it).
