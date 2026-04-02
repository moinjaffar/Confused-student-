 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/academic-task-tracker/README.md b/academic-task-tracker/README.md
new file mode 100644
index 0000000000000000000000000000000000000000..236fc41bab94cd75880aa62205644befc601b97d
--- /dev/null
+++ b/academic-task-tracker/README.md
@@ -0,0 +1,35 @@
+# Academic Task Tracker
+
+A lightweight app for tracking your day-to-day academic work:
+
+- academic tasks
+- lectures attended
+- topics learned
+
+## Features
+
+- Add tasks with date, category, notes, and completion status.
+- Add tasks with subject and study time (minutes) to measure learning effort.
+- Mark tasks completed/not completed at any time.
+- **Week-wise view** using ISO week picker.
+- **Semester-wise view** (Semester 1 = Jan–Jun, Semester 2 = Jul–Dec).
+- **Dashboard Engine (UserStats)** with:
+  - `totalStudyTime`
+  - `streakDays`
+  - `completionRate`
+  - `weakSubjects[]`
+- Built-in **dark mode / light mode** toggle with saved preference.
+- **Backup tools** to export/import task data as JSON.
+- Local browser storage with **one-year retention** (older items are auto-pruned).
+
+## Run
+
+Open `index.html` directly in your browser.
+
+For local server (optional):
+
+```bash
+python3 -m http.server 8000
+```
+
+Then visit `http://localhost:8000/academic-task-tracker/`.
 
EOF
)
