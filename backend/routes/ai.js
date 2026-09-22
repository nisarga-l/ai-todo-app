const express = require("express");
const auth = require("../middleware/auth");
const Task = require("../models/Task");
const { callGemini } = require("../utils/gemini");

const router = express.Router();

// All AI routes require login
router.use(auth);

// Today's date as YYYY-MM-DD, used to resolve relative dates like "tomorrow"
function today() {
  return new Date().toISOString().split("T")[0];
}

const PRIORITIES = ["High", "Medium", "Low"];

function safePriority(value) {
  return PRIORITIES.includes(value) ? value : "Medium";
}

// 1) NATURAL-LANGUAGE ENTRY: free text -> { text, priority, dueDate }
router.post("/parse", async (req, res) => {
  try {
    const { input } = req.body;

    if (!input || !input.trim()) {
      return res.status(400).json({ message: "input is required" });
    }

    const prompt = `You are a task parser for a todo app. Today's date is ${today()}.
Convert the user's note into a single JSON object with EXACTLY these keys:
- "text": a short, clean task title (string)
- "priority": one of "High", "Medium", "Low"
- "dueDate": a date in YYYY-MM-DD format if the note implies one, otherwise an empty string ""

Rules:
- Interpret relative dates ("tomorrow", "next friday", "in 3 days") relative to today's date.
- If urgency words like "urgent", "asap", "important" appear, set priority to "High".
- Return ONLY the JSON object, nothing else.

User note: "${input.trim()}"`;

    const result = await callGemini(prompt, { json: true });

    res.json({
      text:
        typeof result.text === "string" && result.text.trim()
          ? result.text.trim()
          : input.trim(),
      priority: safePriority(result.priority),
      dueDate:
        typeof result.dueDate === "string" ? result.dueDate : "",
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message });
  }
});

// 2) AUTO-PRIORITIZE: task text -> { priority }
router.post("/prioritize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "text is required" });
    }

    const prompt = `Classify the priority of this todo task as exactly one of "High", "Medium", or "Low".
Consider urgency, consequences, and any deadline implied by the wording.
Return ONLY JSON: {"priority":"High|Medium|Low"}.

Task: "${text.trim()}"`;

    const result = await callGemini(prompt, { json: true });

    res.json({ priority: safePriority(result.priority) });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message });
  }
});

// 3) BREAK INTO SUBTASKS: task text -> { subtasks: [string] }
router.post("/subtasks", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "text is required" });
    }

    const prompt = `Break the following task into 3 to 6 concrete, actionable subtasks.
Return ONLY JSON: {"subtasks": ["step 1", "step 2", ...]}.
Keep each step short (max ~8 words).

Task: "${text.trim()}"`;

    const result = await callGemini(prompt, { json: true });

    const subtasks = Array.isArray(result.subtasks)
      ? result.subtasks
          .filter((s) => typeof s === "string" && s.trim())
          .map((s) => s.trim())
          .slice(0, 8)
      : [];

    res.json({ subtasks });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message });
  }
});

// 4) DAILY ASSISTANT: summarize the user's tasks and suggest a focus
router.post("/assistant", async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.userId }).sort({
      createdAt: -1,
    });

    if (tasks.length === 0) {
      return res.json({
        summary:
          "You have no tasks yet. Add your first task to get started! 🌸",
      });
    }

    const taskLines = tasks
      .map(
        (t) =>
          `- ${t.text} [${t.priority}]` +
          `${t.completed ? " (done)" : ""}` +
          `${t.dueDate ? " due " + t.dueDate : ""}`
      )
      .join("\n");

    const prompt = `You are a friendly productivity assistant. Today is ${today()}.
Here are the user's current tasks:
${taskLines}

Write a short, encouraging daily briefing (3-5 sentences, plain text, NO markdown headers or bullet points).
Mention how many tasks are done vs pending, call out anything high-priority or overdue, and suggest what to focus on first.`;

    const summary = await callGemini(prompt, { json: false });

    res.json({ summary: summary.trim() });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message });
  }
});

module.exports = router;
