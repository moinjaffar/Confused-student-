 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/studyos/app/page.tsx b/studyos/app/page.tsx
new file mode 100644
index 0000000000000000000000000000000000000000..feabf618a4097344973ff97ecf2daf619cfe0c4f
--- /dev/null
+++ b/studyos/app/page.tsx
@@ -0,0 +1,23 @@
+import AIInsights from "../components/AIInsights";
+
+// Replace these with DB-fetched values in your real dashboard loader.
+const demoTasks = [
+  { subject: "Mathematics", status: "pending", deadline: "2026-03-25" },
+  { subject: "English", status: "completed", deadline: "2026-03-20" },
+  { subject: "Physics", status: "pending", deadline: "2026-03-26" },
+];
+
+const demoSessions = [
+  { subject: "Mathematics", duration: 30, date: "2026-03-24" },
+  { subject: "English", duration: 75, date: "2026-03-25" },
+  { subject: "Physics", duration: 20, date: "2026-03-26" },
+];
+
+export default function DashboardPage() {
+  return (
+    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 bg-slate-100 px-4 py-8 dark:bg-slate-950">
+      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">StudyOS Dashboard</h1>
+      <AIInsights tasks={demoTasks} sessions={demoSessions} />
+    </main>
+  );
+}
 
EOF
)
