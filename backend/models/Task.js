const mongoose = require("mongoose");

const subtaskSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      default: "Medium",
    },
    completed: {
      type: Boolean,
      default: false,
    },
    dueDate: {
      type: String,
    },
    // AI-generated (or manual) breakdown of the task into smaller steps
    subtasks: {
      type: [subtaskSchema],
      default: [],
    },
    // Every task belongs to the user who created it
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
