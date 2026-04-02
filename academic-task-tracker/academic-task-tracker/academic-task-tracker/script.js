 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/academic-task-tracker/script.js b/academic-task-tracker/script.js
new file mode 100644
index 0000000000000000000000000000000000000000..13f168565bc1dfe09a2acdccb006cf1ea67116c1
--- /dev/null
+++ b/academic-task-tracker/script.js
@@ -0,0 +1,367 @@
+const STORAGE_KEY = "academic-task-tracker-v1";
+const THEME_KEY = "academic-task-tracker-theme";
+const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
+
+const taskForm = document.getElementById("taskForm");
+const subjectInput = document.getElementById("subject");
+const titleInput = document.getElementById("title");
+const categoryInput = document.getElementById("category");
+const dateInput = document.getElementById("date");
+const statusInput = document.getElementById("status");
+const durationMinutesInput = document.getElementById("durationMinutes");
+const notesInput = document.getElementById("notes");
+
+const viewModeInput = document.getElementById("viewMode");
+const weekPicker = document.getElementById("weekPicker");
+const semesterPicker = document.getElementById("semesterPicker");
+
+const taskList = document.getElementById("taskList");
+const emptyState = document.getElementById("emptyState");
+const stats = document.getElementById("stats");
+const dashboardStats = document.getElementById("dashboardStats");
+const themeToggle = document.getElementById("themeToggle");
+const exportBackupBtn = document.getElementById("exportBackupBtn");
+const importBackupBtn = document.getElementById("importBackupBtn");
+const importFileInput = document.getElementById("importFileInput");
+
+let tasks = [];
+
+function initTheme() {
+  const storedTheme = localStorage.getItem(THEME_KEY);
+  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
+  const useDark = storedTheme ? storedTheme === "dark" : prefersDark;
+
+  if (useDark) {
+    document.body.classList.add("dark-mode");
+  } else {
+    document.body.classList.remove("dark-mode");
+  }
+
+  themeToggle.textContent = useDark ? "☀️ Light Mode" : "🌙 Dark Mode";
+}
+
+function toggleTheme() {
+  const isDark = document.body.classList.toggle("dark-mode");
+  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
+  themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
+}
+
+function loadTasks() {
+  const raw = localStorage.getItem(STORAGE_KEY);
+  tasks = raw ? JSON.parse(raw) : [];
+  tasks = tasks.filter((t) => Date.now() - new Date(t.date).getTime() <= ONE_YEAR_MS);
+  saveTasks();
+}
+
+function saveTasks() {
+  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
+}
+
+function getISOWeek(dateString) {
+  const date = new Date(dateString);
+  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
+  const dayNum = tempDate.getUTCDay() || 7;
+  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
+  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
+  const weekNum = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
+  return `${tempDate.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
+}
+
+function getSemesterLabel(dateString) {
+  const date = new Date(dateString);
+  const year = date.getFullYear();
+  const month = date.getMonth() + 1;
+  return month <= 6 ? `${year} - Semester 1` : `${year} - Semester 2`;
+}
+
+function refreshSemesterOptions() {
+  const semesters = [...new Set(tasks.map((t) => getSemesterLabel(t.date)))].sort();
+  semesterPicker.innerHTML = "";
+
+  if (semesters.length === 0) {
+    const option = document.createElement("option");
+    option.textContent = "No semesters yet";
+    option.value = "";
+    semesterPicker.appendChild(option);
+    return;
+  }
+
+  semesters.forEach((sem) => {
+    const option = document.createElement("option");
+    option.textContent = sem;
+    option.value = sem;
+    semesterPicker.appendChild(option);
+  });
+}
+
+function getFilteredTasks() {
+  const mode = viewModeInput.value;
+
+  if (mode === "week") {
+    if (!weekPicker.value) return [];
+    return tasks.filter((t) => getISOWeek(t.date) === weekPicker.value);
+  }
+
+  if (mode === "semester") {
+    if (!semesterPicker.value) return [];
+    return tasks.filter((t) => getSemesterLabel(t.date) === semesterPicker.value);
+  }
+
+  return [...tasks];
+}
+
+function renderStats(filteredTasks) {
+  const completed = filteredTasks.filter((t) => t.completed).length;
+  const pending = filteredTasks.length - completed;
+
+  stats.innerHTML = `
+    <div class="stat"><small>Total</small><strong>${filteredTasks.length}</strong></div>
+    <div class="stat"><small>Completed</small><strong>${completed}</strong></div>
+    <div class="stat"><small>Pending</small><strong>${pending}</strong></div>
+  `;
+}
+
+function calculateStreakDays(items) {
+  const completedDays = new Set(
+    items.filter((task) => task.completed).map((task) => task.date)
+  );
+
+  if (completedDays.size === 0) return 0;
+
+  let streak = 0;
+  const cursor = new Date();
+  cursor.setHours(0, 0, 0, 0);
+
+  while (true) {
+    const dateKey = cursor.toISOString().slice(0, 10);
+    if (!completedDays.has(dateKey)) break;
+    streak += 1;
+    cursor.setDate(cursor.getDate() - 1);
+  }
+
+  return streak;
+}
+
+function getUserStats(items) {
+  const completedCount = items.filter((task) => task.completed).length;
+  const totalStudyTime = items.reduce(
+    (sum, task) => sum + Number(task.durationMinutes || 0),
+    0
+  );
+  const completionRate = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);
+  const streakDays = calculateStreakDays(items);
+
+  const subjectMap = new Map();
+  items.forEach((task) => {
+    const key = task.subject || "General";
+    if (!subjectMap.has(key)) {
+      subjectMap.set(key, { total: 0, completed: 0 });
+    }
+    const entry = subjectMap.get(key);
+    entry.total += 1;
+    if (task.completed) {
+      entry.completed += 1;
+    }
+  });
+
+  const weakSubjects = [...subjectMap.entries()]
+    .map(([subject, metrics]) => ({
+      subject,
+      rate: metrics.total === 0 ? 0 : metrics.completed / metrics.total,
+    }))
+    .filter((entry) => entry.rate < 0.6)
+    .sort((a, b) => a.rate - b.rate)
+    .map((entry) => entry.subject);
+
+  return {
+    totalStudyTime,
+    streakDays,
+    completionRate,
+    weakSubjects,
+  };
+}
+
+function renderDashboardEngine(items) {
+  const userStats = getUserStats(items);
+  const weakSubjectsText = userStats.weakSubjects.length
+    ? userStats.weakSubjects.join(", ")
+    : "No weak subjects detected";
+
+  dashboardStats.innerHTML = `
+    <div class="stat"><small>Total Study Time</small><strong>${userStats.totalStudyTime} min</strong></div>
+    <div class="stat"><small>Streak Days</small><strong>${userStats.streakDays}</strong></div>
+    <div class="stat"><small>Completion Rate</small><strong>${userStats.completionRate}%</strong></div>
+    <div class="stat weak-subjects-stat"><small>Weak Subjects</small><strong>${weakSubjectsText}</strong></div>
+  `;
+}
+
+function renderTasks() {
+  refreshSemesterOptions();
+  const filteredTasks = getFilteredTasks().sort((a, b) => new Date(b.date) - new Date(a.date));
+  renderStats(filteredTasks);
+  renderDashboardEngine(filteredTasks);
+
+  taskList.innerHTML = "";
+
+  if (filteredTasks.length === 0) {
+    emptyState.classList.remove("hidden");
+    return;
+  }
+
+  emptyState.classList.add("hidden");
+
+  filteredTasks.forEach((task) => {
+    const li = document.createElement("li");
+    li.className = "task-item";
+
+    const statusClass = task.completed ? "done" : "pending";
+    const statusText = task.completed ? "Completed" : "Not Completed";
+
+    li.innerHTML = `
+      <div>
+        <h3>${task.title}</h3>
+        <div class="meta">${task.subject || "General"} • ${task.category} • ${task.date} • ${getSemesterLabel(task.date)} • ${getISOWeek(task.date)}</div>
+        <div class="meta">Study time: ${task.durationMinutes || 0} min</div>
+        ${task.notes ? `<div class="meta">Note: ${task.notes}</div>` : ""}
+      </div>
+      <div class="task-actions">
+        <span class="badge ${statusClass}">${statusText}</span>
+        <button data-id="${task.id}" class="toggle-btn">Toggle</button>
+      </div>
+    `;
+
+    taskList.appendChild(li);
+  });
+
+  document.querySelectorAll(".toggle-btn").forEach((btn) => {
+    btn.addEventListener("click", () => {
+      const id = btn.getAttribute("data-id");
+      const task = tasks.find((t) => t.id === id);
+      if (task) {
+        task.completed = !task.completed;
+        saveTasks();
+        renderTasks();
+      }
+    });
+  });
+}
+
+function getDefaultWeek() {
+  const now = new Date();
+  const day = now.getUTCDay() || 7;
+  now.setUTCDate(now.getUTCDate() + 4 - day);
+  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
+  const weekNo = Math.ceil((((now - yearStart) / 86400000) + 1) / 7);
+  return `${now.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
+}
+
+function exportBackup() {
+  const payload = {
+    app: "academic-task-tracker",
+    version: 1,
+    exportedAt: new Date().toISOString(),
+    tasks,
+  };
+
+  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
+  const url = URL.createObjectURL(blob);
+  const a = document.createElement("a");
+  const dateStamp = new Date().toISOString().slice(0, 10);
+  a.href = url;
+  a.download = `academic-task-backup-${dateStamp}.json`;
+  document.body.appendChild(a);
+  a.click();
+  a.remove();
+  URL.revokeObjectURL(url);
+}
+
+function sanitizeImportedTasks(input) {
+  if (!Array.isArray(input)) return [];
+
+  return input
+    .filter((task) => task && typeof task === "object")
+    .map((task) => ({
+      id: typeof task.id === "string" && task.id ? task.id : crypto.randomUUID(),
+      subject: typeof task.subject === "string" && task.subject.trim() ? task.subject.trim() : "General",
+      title: typeof task.title === "string" ? task.title.trim() : "",
+      category: typeof task.category === "string" && task.category ? task.category : "Academic Task",
+      date: typeof task.date === "string" ? task.date : "",
+      completed: Boolean(task.completed),
+      durationMinutes: Number.isFinite(Number(task.durationMinutes)) ? Math.max(0, Number(task.durationMinutes)) : 0,
+      notes: typeof task.notes === "string" ? task.notes.trim() : "",
+    }))
+    .filter((task) => task.title && task.date);
+}
+
+function importBackupFile(file) {
+  const reader = new FileReader();
+
+  reader.onload = () => {
+    try {
+      const parsed = JSON.parse(reader.result);
+      const importedTasks = sanitizeImportedTasks(parsed.tasks ?? parsed);
+
+      if (importedTasks.length === 0) {
+        alert("No valid tasks found in the selected backup file.");
+        return;
+      }
+
+      tasks = importedTasks.filter((t) => Date.now() - new Date(t.date).getTime() <= ONE_YEAR_MS);
+      saveTasks();
+      refreshSemesterOptions();
+      renderTasks();
+      alert(`Imported ${tasks.length} task(s) successfully.`);
+    } catch {
+      alert("Invalid backup file. Please select a valid JSON backup.");
+    } finally {
+      importFileInput.value = "";
+    }
+  };
+
+  reader.readAsText(file);
+}
+
+taskForm.addEventListener("submit", (event) => {
+  event.preventDefault();
+
+  const task = {
+    id: crypto.randomUUID(),
+    subject: subjectInput.value.trim(),
+    title: titleInput.value.trim(),
+    category: categoryInput.value,
+    date: dateInput.value,
+    completed: statusInput.value === "true",
+    durationMinutes: Math.max(0, Number(durationMinutesInput.value) || 0),
+    notes: notesInput.value.trim(),
+  };
+
+  if (!task.title || !task.date || !task.subject) return;
+
+  tasks.push(task);
+  tasks = tasks.filter((t) => Date.now() - new Date(t.date).getTime() <= ONE_YEAR_MS);
+  saveTasks();
+
+  taskForm.reset();
+  dateInput.valueAsDate = new Date();
+  statusInput.value = "false";
+  durationMinutesInput.value = "25";
+  renderTasks();
+});
+
+viewModeInput.addEventListener("change", renderTasks);
+weekPicker.addEventListener("change", renderTasks);
+semesterPicker.addEventListener("change", renderTasks);
+themeToggle.addEventListener("click", toggleTheme);
+exportBackupBtn.addEventListener("click", exportBackup);
+importBackupBtn.addEventListener("click", () => importFileInput.click());
+importFileInput.addEventListener("change", (event) => {
+  const file = event.target.files?.[0];
+  if (!file) return;
+  importBackupFile(file);
+});
+
+initTheme();
+loadTasks();
+dateInput.valueAsDate = new Date();
+weekPicker.value = getDefaultWeek();
+renderTasks();
 
EOF
)
