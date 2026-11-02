import { useState, useEffect } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Filler,
} from "chart.js";
import { Doughnut, Bar, Pie, Line, Radar, PolarArea } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale, Filler);

function Dashboard() {
  const { user, logout } = useAuth();
  const { pushToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [task, setTask] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const reminderStorageKey = `ai-todo-reminders-${user?._id || user?.id || user?.email || "default"}`;
  const [reminders, setReminders] = useState({});
  const [activeReminder, setActiveReminder] = useState(null);

  // Reminders are stored in this browser, not in MongoDB.
  useEffect(() => {
    try {
      setReminders(JSON.parse(localStorage.getItem(reminderStorageKey) || "{}"));
    } catch {
      setReminders({});
    }
  }, [reminderStorageKey]);

  const updateReminders = (change) => {
    setReminders((current) => {
      const next = change(current);
      localStorage.setItem(reminderStorageKey, JSON.stringify(next));
      return next;
    });
  };

  // Check every second while the dashboard is open.
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const due = tasks.find((t) => {
        const r = reminders[t._id];
        return !t.completed && r && !r.shown &&
          Number.isFinite(new Date(r.at).getTime()) &&
          new Date(r.at).getTime() <= now;
      });
      if (!due) return;
      setActiveReminder({ id: due._id, text: due.text });
      updateReminders((current) => ({
        ...current,
        [due._id]: { ...current[due._id], shown: true },
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [tasks, reminders, reminderStorageKey]);

  const [showReports, setShowReports] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  // "Midnight Focus" dark theme is the default; remember the user's choice.
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Busy flags so we can disable buttons / show progress
  const [adding, setAdding] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiAdding, setAiAdding] = useState(false);
  const [prioritizing, setPrioritizing] = useState(false);
  const [subtaskBusyId, setSubtaskBusyId] = useState(null);

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Apply the theme to <html> (light adds a class; dark is the default)
  // and remember the choice for next time.
  useEffect(() => {
    document.documentElement.classList.toggle("theme-light", !darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const response = await client.get("/tasks");
      setTasks(response.data);
    } catch (error) {
      pushToast(
        error.response?.data?.message || "Could not load tasks",
        "error"
      );
    } finally {
      setLoadingTasks(false);
    }
  };

  // --- Manual add ---
  const addTask = async () => {
    if (task.trim() === "") return;
    setAdding(true);
    try {
      const response = await client.post("/tasks", {
        text: task,
        priority,
        dueDate,
      });
      setTasks((prev) => [response.data, ...prev]);
      if (reminderTime) {
        updateReminders((prev) => ({
          ...prev,
          [response.data._id]: { at: reminderTime, shown: false },
        }));
      }
      setReminderTime("");
      setTask("");
      setPriority("Medium");
      setDueDate("");
      pushToast("Task added", "success");
    } catch (error) {
      pushToast(
        error.response?.data?.message || "Could not add task",
        "error"
      );
    } finally {
      setAdding(false);
    }
  };

  // --- AI: natural-language add ---
  const aiAddTask = async () => {
    if (aiInput.trim() === "") return;
    setAiAdding(true);
    try {
      const parsed = await client.post("/ai/parse", {
        input: aiInput,
      });
      const response = await client.post("/tasks", {
        text: parsed.data.text,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate,
      });
      setTasks((prev) => [response.data, ...prev]);
      setAiInput("");
      pushToast("✨ AI added your task", "success");
    } catch (error) {
      pushToast(
        error.response?.data?.message ||
          "AI couldn't understand that",
        "error"
      );
    } finally {
      setAiAdding(false);
    }
  };

  // --- AI: auto-prioritize the task being composed ---
  const autoPrioritize = async () => {
    if (task.trim() === "") {
      pushToast('Type a task in the "Enter task…" box first, then ✨ sets its priority', "info");
      return;
    }
    setPrioritizing(true);
    try {
      const response = await client.post("/ai/prioritize", {
        text: task,
      });
      setPriority(response.data.priority);
      pushToast(
        `AI set priority: ${response.data.priority}`,
        "success"
      );
    } catch (error) {
      pushToast(
        error.response?.data?.message || "AI failed",
        "error"
      );
    } finally {
      setPrioritizing(false);
    }
  };

  // --- Toggle complete ---
  const toggleComplete = async (t) => {
    try {
      const response = await client.put(`/tasks/${t._id}`, {
        completed: !t.completed,
      });
      setTasks((prev) =>
        prev.map((x) => (x._id === t._id ? response.data : x))
      );
    } catch (error) {
      pushToast("Could not update task", "error");
    }
  };

  // --- Delete (with confirmation) ---
  const deleteTask = async (t) => {
    if (!window.confirm(`Delete "${t.text}"?`)) return;
    try {
      await client.delete(`/tasks/${t._id}`);
      setTasks((prev) => prev.filter((x) => x._id !== t._id));
      updateReminders((prev) => {
        const next = { ...prev };
        delete next[t._id];
        return next;
      });
      pushToast("Task deleted", "success");
    } catch (error) {
      pushToast("Could not delete task", "error");
    }
  };

  // --- Save edit ---
  const saveEdit = async () => {
    if (!editingTask.text.trim()) {
      pushToast("Task text cannot be empty", "error");
      return;
    }
    setSavingEdit(true);
    try {
      const response = await client.put(
        `/tasks/${editingTask._id}`,
        {
          text: editingTask.text,
          priority: editingTask.priority,
          dueDate: editingTask.dueDate,
        }
      );
      setTasks((prev) =>
        prev.map((x) =>
          x._id === editingTask._id ? response.data : x
        )
      );
      updateReminders((prev) => {
        const next = { ...prev };
        if (editingTask.reminderTime) {
          if (prev[editingTask._id]?.at !== editingTask.reminderTime) {
            next[editingTask._id] = { at: editingTask.reminderTime, shown: false };
          }
        } else {
          delete next[editingTask._id];
        }
        return next;
      });
      setShowModal(false);
      setEditingTask(null);
      pushToast("Task updated", "success");
    } catch (error) {
      pushToast("Could not save changes", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // --- AI: break a task into subtasks ---
  const generateSubtasks = async (t) => {
    setSubtaskBusyId(t._id);
    try {
      const response = await client.post("/ai/subtasks", {
        text: t.text,
      });
      const subtasks = response.data.subtasks.map((s) => ({
        text: s,
        completed: false,
      }));
      const updated = await client.put(`/tasks/${t._id}`, {
        subtasks,
      });
      setTasks((prev) =>
        prev.map((x) => (x._id === t._id ? updated.data : x))
      );
      pushToast("✨ Subtasks generated", "success");
    } catch (error) {
      pushToast(
        error.response?.data?.message || "AI failed",
        "error"
      );
    } finally {
      setSubtaskBusyId(null);
    }
  };

  const toggleSubtask = async (t, index) => {
    const newSubtasks = t.subtasks.map((s, i) =>
      i === index ? { ...s, completed: !s.completed } : s
    );
    try {
      const response = await client.put(`/tasks/${t._id}`, {
        subtasks: newSubtasks,
      });
      setTasks((prev) =>
        prev.map((x) => (x._id === t._id ? response.data : x))
      );
    } catch (error) {
      pushToast("Could not update subtask", "error");
    }
  };

  // --- AI: daily briefing ---
  const runAssistant = async () => {
    setAssistantBusy(true);
    setAssistantOpen(true);
    try {
      const response = await client.post("/ai/assistant");
      setAssistantText(response.data.summary);
    } catch (error) {
      setAssistantText("");
      pushToast(
        error.response?.data?.message || "AI assistant failed",
        "error"
      );
    } finally {
      setAssistantBusy(false);
    }
  };

  // --- Derived data ---
  const completedTasks = tasks.filter((t) => t.completed).length;

  // Chart palette follows the active theme so the doughnuts stay legible.
  const chartInk = darkMode ? "#14171f" : "#ffffff";
  const chartLabel = darkMode ? "#8a91a2" : "#5a6172";
  const chartMuted = darkMode ? "#2e3440" : "#dfe3ec";
  const priorityColors = darkMode
    ? ["#ff6b81", "#ffb454", "#35e0c4"]
    : ["#e23a55", "#c97a18", "#10a892"];

  const chartOptions = {
    plugins: {
      legend: {
        labels: {
          color: chartLabel,
          font: { family: "Manrope", size: 13 },
          padding: 14,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
        },
      },
    },
    cutout: "62%",
  };

  const chartData = {
    labels: ["Completed", "Pending"],
    datasets: [
      {
        data: [completedTasks, tasks.length - completedTasks],
        backgroundColor: [darkMode ? "#35e0c4" : "#10a892", chartMuted],
        borderColor: chartInk,
        borderWidth: 2,
      },
    ],
  };

  const priorityChartData = {
    labels: ["High", "Medium", "Low"],
    datasets: [
      {
        data: [
          tasks.filter((t) => t.priority === "High").length,
          tasks.filter((t) => t.priority === "Medium").length,
          tasks.filter((t) => t.priority === "Low").length,
        ],
        backgroundColor: priorityColors,
        borderColor: chartInk,
        borderWidth: 2,
      },
    ],
  };

  // Report figures are calculated from the tasks returned by the backend.
  const reportPending = tasks.length - completedTasks;
  const reportCompletionRate = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const reportOverdue = tasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    const datePart = String(t.dueDate).slice(0, 10);
    const due = new Date(`${datePart}T00:00:00`);
    return !Number.isNaN(due.getTime()) && due < todayStart;
  }).length;
  const reportUpcoming = tasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    const due = new Date(`${String(t.dueDate).slice(0, 10)}T00:00:00`);
    const sevenDays = new Date(todayStart);
    sevenDays.setDate(sevenDays.getDate() + 7);
    return !Number.isNaN(due.getTime()) && due >= todayStart && due < sevenDays;
  }).length;
  const reportWeeklyLabels = [];
  const reportWeeklyCounts = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    reportWeeklyLabels.push(day.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }));
    reportWeeklyCounts.push(tasks.filter((t) => {
      // Only count tasks with a creation timestamp from MongoDB.
      if (!t.createdAt) return false;
      const created = new Date(t.createdAt);
      return !Number.isNaN(created.getTime()) && created >= day && created < next;
    }).length);
  }
  const reportBarOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: chartLabel }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: chartLabel, precision: 0 } },
    },
  };
  const reportCardStyle = {
    padding: "16px", borderRadius: "12px", background: darkMode ? "#202633" : "#f3f5f9",
    color: darkMode ? "#f5f6fb" : "#202633", flex: "1 1 150px",
  };
  const reportChartStyle = { ...reportCardStyle, flex: "1 1 300px", minWidth: 0 };

  const filteredTasks = tasks
    .filter((t) =>
      t.text.toLowerCase().includes(search.toLowerCase())
    )
    .filter((t) => {
      if (filter === "Completed") return t.completed;
      if (filter === "Pending") return !t.completed;
      return true;
    });

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>🌸 AI Todo 🚀</h1>
          <p className="greeting">
            Hi, {user?.name || "there"} 👋
          </p>
        </div>

        <div className="header-actions">
          <button
            className="dark-btn"
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle dark mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button
            className="logout-btn"
            onClick={logout}
            title="Log out"
          >
            Log out
          </button>
        </div>
      </div>

      {/* AI Daily Assistant */}
      <div className="assistant-bar">
        <button
          className="assistant-btn"
          onClick={runAssistant}
          disabled={assistantBusy}
        >
          🤖{" "}
          {assistantBusy
            ? "Thinking…"
            : "AI Daily Briefing"}
        </button>
      </div>

      {assistantOpen && (
        <div className="assistant-panel">
          <button
            className="assistant-close"
            onClick={() => setAssistantOpen(false)}
            title="Close"
          >
            ✕
          </button>
          {assistantBusy ? (
            <p>Analyzing your tasks…</p>
          ) : (
            <p>{assistantText}</p>
          )}
        </div>
      )}

      {/* Reports & Analytics: all counts come from the loaded tasks. */}
      <div style={{ margin: "18px 0" }}>
        <button
          type="button"
          className="assistant-btn"
          onClick={() => setShowReports((value) => !value)}
          aria-expanded={showReports}
        >
          📈 {showReports ? "Hide Reports & Analytics" : "View Reports & Analytics"}
        </button>
      </div>
      {showReports && (
        <section id="task-report" style={{ margin: "16px 0 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2>📊 Task Reports & Analytics</h2>
              <p>Live summary of your saved tasks</p>
            </div>
            <button type="button" className="add-btn" onClick={() => window.print()}>
              🖨️ Print / Save as PDF
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "18px 0" }}>
            {[
              ["Total Tasks", tasks.length],
              ["Completed", completedTasks],
              ["Pending", reportPending],
              ["Completion Rate", `${reportCompletionRate}%`],
              ["Overdue", reportOverdue],
              ["Due Next 7 Days", reportUpcoming],
            ].map(([label, value]) => (
              <div key={label} style={reportCardStyle}>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{label}</div>
                <strong style={{ fontSize: 28 }}>{value}</strong>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <div style={reportChartStyle}>
              <h3>Task Completion</h3>
              <div style={{ maxWidth: 290, margin: "auto" }}>
                <Doughnut data={chartData} options={chartOptions} />
              </div>
            </div>
            <div style={reportChartStyle}>
              <h3>Priority Breakdown</h3>
              <div style={{ maxWidth: 290, margin: "auto" }}>
                <Doughnut data={priorityChartData} options={chartOptions} />
              </div>
            </div>
            <div style={reportChartStyle}>
              <h3>Pie Chart — Completed vs Pending</h3>
              <div style={{ maxWidth: 290, margin: "auto" }}>
                <Pie data={chartData} options={chartOptions} />
              </div>
            </div>
            <div style={reportChartStyle}>
              <h3>Pie Chart — Task Priorities</h3>
              <div style={{ maxWidth: 290, margin: "auto" }}>
                <Pie data={priorityChartData} options={chartOptions} />
              </div>
            </div>
            <div style={reportChartStyle}>
              <h3>Polar Area — Task Priorities</h3>
              <div style={{ maxWidth: 290, margin: "auto" }}>
                <PolarArea data={priorityChartData} options={{ plugins: chartOptions.plugins, scales: { r: { ticks: { color: chartLabel, backdropColor: 'transparent' }, grid: { color: chartMuted } } } }} />
              </div>
            </div>
            <div style={reportChartStyle}>
              <h3>Radar Chart — Task Priorities</h3>
              <div style={{ maxWidth: 290, margin: "auto" }}>
                <Radar data={{ ...priorityChartData, datasets: priorityChartData.datasets.map((dataset) => ({ ...dataset, label: "Tasks by priority", backgroundColor: darkMode ? "rgba(53,224,196,0.2)" : "rgba(16,168,146,0.2)", borderColor: darkMode ? "#35e0c4" : "#10a892", pointBackgroundColor: darkMode ? "#35e0c4" : "#10a892" })) }} options={{ plugins: chartOptions.plugins, scales: { r: { beginAtZero: true, ticks: { color: chartLabel, precision: 0, backdropColor: 'transparent' }, pointLabels: { color: chartLabel }, grid: { color: chartMuted } } } }} />
              </div>
            </div>
            <div style={{ ...reportChartStyle, flex: "1 1 100%" }}>
              <h3>Line Graph — Tasks Created in Last 7 Days</h3>
              <Line
                data={{ labels: reportWeeklyLabels, datasets: [{ label: "Tasks created", data: reportWeeklyCounts, borderColor: darkMode ? "#35e0c4" : "#10a892", backgroundColor: darkMode ? "rgba(53,224,196,0.18)" : "rgba(16,168,146,0.18)", fill: true, tension: 0.3 }] }}
                options={reportBarOptions}
              />
            </div>
            <div style={{ ...reportChartStyle, flex: "1 1 100%" }}>
              <h3>Tasks Created — Last 7 Days</h3>
              <Bar
                data={{
                  labels: reportWeeklyLabels,
                  datasets: [{
                    label: "Tasks created",
                    data: reportWeeklyCounts,
                    backgroundColor: darkMode ? "#35e0c4" : "#10a892",
                    borderRadius: 5,
                  }],
                }}
                options={reportBarOptions}
              />
              <p style={{ fontSize: 12, opacity: 0.7 }}>
                Weekly chart uses task creation dates when available.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="charts-wrapper">
        <div className="chart-container">
          <h3>📊 Task Progress</h3>
          <Doughnut data={chartData} options={chartOptions} />
        </div>
        <div className="chart-container">
          <h3>🎯 Priority Breakdown</h3>
          <Doughnut data={priorityChartData} options={chartOptions} />
        </div>
      </div>

      <div className="stats">
        <div className="card">
          <span className="card-label">Total Tasks</span>
          <span className="card-num">{tasks.length}</span>
        </div>
        <div className="card">
          <span className="card-label">Completed</span>
          <span className="card-num">{completedTasks}</span>
        </div>
      </div>

      {/* AI natural-language entry */}
      <p className="ai-entry-label">
        ✨ Add a task with AI — just describe it in plain English:
      </p>
      <div className="ai-entry">
        <input
          type="text"
          placeholder="✨ Try: 'Submit report by Friday, urgent'"
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") aiAddTask();
          }}
        />
        <button
          className="ai-btn"
          onClick={aiAddTask}
          disabled={aiAdding}
        >
          {aiAdding ? "Thinking…" : "✨ AI Add"}
        </button>
      </div>

      <input
        type="text"
        placeholder="🔍 Search tasks..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-box"
      />

      <div className="filter-buttons">
        <button
          className={filter === "All" ? "filter-active" : ""}
          onClick={() => setFilter("All")}
        >
          All
        </button>
        <button
          className={filter === "Pending" ? "filter-active" : ""}
          onClick={() => setFilter("Pending")}
        >
          Pending
        </button>
        <button
          className={filter === "Completed" ? "filter-active" : ""}
          onClick={() => setFilter("Completed")}
        >
          Completed
        </button>
      </div>

      <p className="ai-entry-label">Or add one manually:</p>
      <div className="input-section">
        <input
          type="text"
          placeholder="Enter task..."
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <button
          className="ai-mini-btn"
          onClick={autoPrioritize}
          disabled={prioritizing}
          title="Let AI choose the priority for the task typed above"
        >
          {prioritizing ? "…" : "✨ Priority"}
        </button>

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          🔔 Reminder Date & Time
          <input
            type="datetime-local"
            aria-label="Reminder date and time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
          />
        </label>

        <button
          className="add-btn"
          onClick={addTask}
          disabled={adding}
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </div>

      {loadingTasks ? (
        <div className="tasks-loading">
          <div className="spinner" />
          <p>Loading your tasks…</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <p className="empty-state">
          {tasks.length === 0
            ? "No tasks yet. Add your first one above! 🌱"
            : "No tasks match your search/filter."}
        </p>
      ) : (
        <ul className="task-list">
          {filteredTasks.map((t) => (
            <li key={t._id} className="task-item">
              <div className="task-main">
                <span className={t.completed ? "completed" : ""}>
                  {t.text}
                </span>

                <p
                  className={`priority ${t.priority.toLowerCase()}`}
                >
                  {t.priority} Priority
                </p>

                {t.dueDate && (
                  <p className="due-date">📅 {t.dueDate}</p>
                )}
                {reminders[t._id] && (
                  <p className="due-date">
                    🔔 Reminder: {new Date(reminders[t._id].at).toLocaleString()}
                    {reminders[t._id].shown ? " (shown)" : ""}
                  </p>
                )}

                {t.subtasks && t.subtasks.length > 0 && (
                  <ul className="subtask-list">
                    {t.subtasks.map((s, i) => (
                      <li
                        key={s._id || i}
                        className="subtask-item"
                      >
                        <label>
                          <input
                            type="checkbox"
                            checked={s.completed}
                            onChange={() =>
                              toggleSubtask(t, i)
                            }
                          />
                          <span
                            className={
                              s.completed ? "completed" : ""
                            }
                          >
                            {s.text}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="buttons">
                <button
                  className="complete-btn"
                  onClick={() => toggleComplete(t)}
                >
                  {t.completed ? "Undo" : "Complete"}
                </button>

                <button
                  className="edit-btn"
                  onClick={() => {
                    setEditingTask({
                      ...t,
                      reminderTime: reminders[t._id]?.at || "",
                    });
                    setShowModal(true);
                  }}
                >
                  Edit
                </button>

                <button
                  className="subtask-btn"
                  onClick={() => generateSubtasks(t)}
                  disabled={subtaskBusyId === t._id}
                  title="Break into subtasks with AI"
                >
                  {subtaskBusyId === t._id
                    ? "…"
                    : "✨ Steps"}
                </button>

                <button
                  className="delete-btn"
                  onClick={() => deleteTask(t)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {activeReminder && (
        <div className="modal-overlay" role="alertdialog" aria-modal="true" aria-label="Task reminder">
          <div className="modal" style={{ textAlign: "center", maxWidth: 420 }}>
            <h2>🔔 Task Reminder!</h2>
            <p style={{ margin: "20px 0" }}>{activeReminder.text}</p>
            <p>Your scheduled reminder time has arrived.</p>
            <button className="save-btn" onClick={() => setActiveReminder(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Task</h2>

            <input
              type="text"
              value={editingTask?.text || ""}
              onChange={(e) =>
                setEditingTask({
                  ...editingTask,
                  text: e.target.value,
                })
              }
            />

            <select
              value={editingTask?.priority || "Medium"}
              onChange={(e) =>
                setEditingTask({
                  ...editingTask,
                  priority: e.target.value,
                })
              }
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <input
              type="date"
              value={editingTask?.dueDate || ""}
              onChange={(e) =>
                setEditingTask({
                  ...editingTask,
                  dueDate: e.target.value,
                })
              }
            />

            <label style={{ display: "block", marginBottom: 12 }}>
              🔔 Reminder Date & Time
              <input
                type="datetime-local"
                value={editingTask?.reminderTime || ""}
                onChange={(e) => setEditingTask({
                  ...editingTask,
                  reminderTime: e.target.value,
                })}
              />
            </label>

            <div className="modal-buttons">
              <button
                className="save-btn"
                onClick={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>

              <button
                className="cancel-btn"
                onClick={() => {
                  setShowModal(false);
                  setEditingTask(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
