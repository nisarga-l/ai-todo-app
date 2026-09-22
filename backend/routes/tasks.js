const express = require("express");
const Task = require("../models/Task");
const auth = require("../middleware/auth");

const router = express.Router();

// Every task route requires a valid token.
// After this, req.userId is guaranteed to be set.
router.use(auth);

// GET ALL TASKS (only the logged-in user's)
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.userId }).sort({
      createdAt: -1,
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE TASK
router.post("/", async (req, res) => {
  try {
    const { text, priority, dueDate, subtasks } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Task text is required",
      });
    }

    const newTask = new Task({
      text: text.trim(),
      priority: priority || "Medium",
      dueDate: dueDate || "",
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      completed: false,
      user: req.userId,
    });

    await newTask.save();

    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE TASK (only if it belongs to the user)
router.put("/:id", async (req, res) => {
  try {
    // Whitelist the fields a client is allowed to change.
    // Notably, "user" can never be reassigned.
    const { text, priority, completed, dueDate, subtasks } =
      req.body;

    const update = {};
    if (text !== undefined) update.text = text;
    if (priority !== undefined) update.priority = priority;
    if (completed !== undefined) update.completed = completed;
    if (dueDate !== undefined) update.dueDate = dueDate;
    if (subtasks !== undefined) update.subtasks = subtasks;

    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      update,
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE TASK (only if it belongs to the user)
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
