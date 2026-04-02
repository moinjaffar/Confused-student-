 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/studyos/components/AIInsights.tsx b/studyos/components/AIInsights.tsx
new file mode 100644
index 0000000000000000000000000000000000000000..fa41f6cb8708737b45cbe1a3962e61f2476a8fa2
--- /dev/null
+++ b/studyos/components/AIInsights.tsx
@@ -0,0 +1,148 @@
+"use client";
+
+import { useEffect, useMemo, useState } from "react";
+
+type TaskInput = {
+  subject: string;
+  status: string;
+  deadline: string;
+};
+
+type SessionInput = {
+  subject: string;
+  duration: number;
+  date: string;
+};
+
+type InsightsResponse = {
+  weakSubjects: string[];
+  strongSubjects: string[];
+  recommendations: string[];
+  warnings: string[];
+  narrative?: string | null;
+  generatedAt?: string;
+  cached?: boolean;
+};
+
+interface AIInsightsProps {
+  tasks: TaskInput[];
+  sessions: SessionInput[];
+}
+
+export default function AIInsights({ tasks, sessions }: AIInsightsProps) {
+  const [insights, setInsights] = useState<InsightsResponse | null>(null);
+  const [loading, setLoading] = useState(false);
+  const [error, setError] = useState<string | null>(null);
+
+  const canAnalyze = useMemo(() => tasks.length > 0 || sessions.length > 0, [tasks, sessions]);
+
+  useEffect(() => {
+    if (!canAnalyze) {
+      setInsights(null);
+      setError(null);
+      return;
+    }
+
+    const controller = new AbortController();
+
+    async function loadInsights() {
+      try {
+        setLoading(true);
+        setError(null);
+
+        const response = await fetch("/api/ai-insights", {
+          method: "POST",
+          headers: {
+            "Content-Type": "application/json",
+          },
+          body: JSON.stringify({ tasks, sessions }),
+          signal: controller.signal,
+        });
+
+        if (!response.ok) {
+          throw new Error("Failed to generate AI insights.");
+        }
+
+        const data = (await response.json()) as InsightsResponse;
+        setInsights(data);
+      } catch (fetchError) {
+        if (controller.signal.aborted) return;
+        const message = fetchError instanceof Error ? fetchError.message : "Unexpected error.";
+        setError(message);
+      } finally {
+        if (!controller.signal.aborted) {
+          setLoading(false);
+        }
+      }
+    }
+
+    loadInsights();
+    return () => controller.abort();
+  }, [tasks, sessions, canAnalyze]);
+
+  return (
+    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
+      <div className="mb-4 flex items-center justify-between">
+        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Insights</h2>
+        {insights?.cached ? (
+          <span className="text-xs text-slate-500 dark:text-slate-400">cached result</span>
+        ) : null}
+      </div>
+
+      {!canAnalyze ? (
+        <p className="text-sm text-slate-500 dark:text-slate-400">Add tasks or sessions to generate insights.</p>
+      ) : null}
+
+      {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Analyzing your study behavior...</p> : null}
+      {error ? <p className="text-sm text-red-600">{error}</p> : null}
+
+      {insights ? (
+        <div className="space-y-4">
+          <div>
+            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Weak Subjects</h3>
+            {insights.weakSubjects.length > 0 ? (
+              <div className="flex flex-wrap gap-2">
+                {insights.weakSubjects.map((subject) => (
+                  <span
+                    key={subject}
+                    className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
+                  >
+                    {subject}
+                  </span>
+                ))}
+              </div>
+            ) : (
+              <p className="text-sm text-slate-500 dark:text-slate-400">No weak subjects detected.</p>
+            )}
+          </div>
+
+          <div>
+            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Recommendations</h3>
+            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
+              {insights.recommendations.map((recommendation, index) => (
+                <li key={`${recommendation}-${index}`}>{recommendation}</li>
+              ))}
+            </ul>
+          </div>
+
+          {insights.warnings.length > 0 ? (
+            <div>
+              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Warnings</h3>
+              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-300">
+                {insights.warnings.map((warning, index) => (
+                  <li key={`${warning}-${index}`}>{warning}</li>
+                ))}
+              </ul>
+            </div>
+          ) : null}
+
+          {insights.narrative ? (
+            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
+              {insights.narrative}
+            </div>
+          ) : null}
+        </div>
+      ) : null}
+    </section>
+  );
+}
 
EOF
)
