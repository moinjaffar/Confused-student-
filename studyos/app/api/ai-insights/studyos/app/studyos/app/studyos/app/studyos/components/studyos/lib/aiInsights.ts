 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/studyos/lib/aiInsights.ts b/studyos/lib/aiInsights.ts
new file mode 100644
index 0000000000000000000000000000000000000000..fe5bea59b383c2e76a1e0ebfc23b78424c3c6bef
--- /dev/null
+++ b/studyos/lib/aiInsights.ts
@@ -0,0 +1,223 @@
+export type TaskStatus = "pending" | "completed" | "in-progress" | string;
+
+export interface StudyTask {
+  subject: string;
+  status: TaskStatus;
+  deadline: string;
+}
+
+export interface StudySession {
+  subject: string;
+  duration: number;
+  date: string;
+}
+
+export interface SubjectMetrics {
+  totalStudyTime: number;
+  completionRate: number;
+  totalTasks: number;
+  completedTasks: number;
+}
+
+export interface InsightsResult {
+  weakSubjects: string[];
+  strongSubjects: string[];
+  recommendations: string[];
+  warnings: string[];
+  meta: {
+    missedDeadlines: number;
+    inconsistentPatternDetected: boolean;
+    subjectMetrics: Record<string, SubjectMetrics>;
+  };
+}
+
+const MS_IN_DAY = 24 * 60 * 60 * 1000;
+
+function normalizeSubject(subject: string): string {
+  const trimmed = String(subject || "").trim();
+  return trimmed || "General";
+}
+
+function isCompleted(status: string): boolean {
+  return String(status).toLowerCase() === "completed";
+}
+
+function median(values: number[]): number {
+  if (values.length === 0) return 0;
+  const sorted = [...values].sort((a, b) => a - b);
+  const middle = Math.floor(sorted.length / 2);
+  return sorted.length % 2 === 0
+    ? (sorted[middle - 1] + sorted[middle]) / 2
+    : sorted[middle];
+}
+
+function buildSubjectMetrics(tasks: StudyTask[], sessions: StudySession[]): Record<string, SubjectMetrics> {
+  const subjects = new Set<string>();
+
+  tasks.forEach((task) => subjects.add(normalizeSubject(task.subject)));
+  sessions.forEach((session) => subjects.add(normalizeSubject(session.subject)));
+
+  const metrics: Record<string, SubjectMetrics> = {};
+
+  subjects.forEach((subject) => {
+    const subjectTasks = tasks.filter((task) => normalizeSubject(task.subject) === subject);
+    const subjectSessions = sessions.filter((session) => normalizeSubject(session.subject) === subject);
+
+    const completedTasks = subjectTasks.filter((task) => isCompleted(task.status)).length;
+    const totalTasks = subjectTasks.length;
+    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
+
+    const totalStudyTime = subjectSessions.reduce((sum, session) => {
+      const minutes = Number(session.duration);
+      return Number.isFinite(minutes) ? sum + Math.max(0, minutes) : sum;
+    }, 0);
+
+    metrics[subject] = {
+      totalStudyTime,
+      completionRate,
+      totalTasks,
+      completedTasks,
+    };
+  });
+
+  return metrics;
+}
+
+function countMissedDeadlines(tasks: StudyTask[], now: Date): number {
+  return tasks.filter((task) => {
+    if (isCompleted(task.status)) return false;
+    const deadline = new Date(task.deadline);
+    return !Number.isNaN(deadline.getTime()) && deadline.getTime() < now.getTime();
+  }).length;
+}
+
+function detectInconsistentPattern(sessions: StudySession[], now: Date): boolean {
+  // We use a 14-day window and expect activity on at least 60% of days.
+  const lookbackDays = 14;
+  const activeDays = new Set<string>();
+
+  sessions.forEach((session) => {
+    const date = new Date(session.date);
+    if (Number.isNaN(date.getTime())) return;
+    const ageInDays = (now.getTime() - date.getTime()) / MS_IN_DAY;
+    if (ageInDays >= 0 && ageInDays <= lookbackDays) {
+      activeDays.add(date.toISOString().slice(0, 10));
+    }
+  });
+
+  return activeDays.size < Math.ceil(lookbackDays * 0.6);
+}
+
+function buildRecommendations(
+  weakSubjects: string[],
+  strongSubjects: string[],
+  subjectMetrics: Record<string, SubjectMetrics>,
+  missedDeadlines: number,
+  inconsistentPatternDetected: boolean
+): string[] {
+  const recommendations: string[] = [];
+
+  weakSubjects.forEach((subject) => {
+    recommendations.push(`Increase study time for ${subject} by 30% next week.`);
+    if ((subjectMetrics[subject]?.completionRate ?? 0) < 0.5) {
+      recommendations.push(`Focus more on completing pending ${subject} tasks.`);
+    }
+  });
+
+  if (strongSubjects.length > 0) {
+    recommendations.push(`Use your ${strongSubjects[0]} strategy as a template for weaker subjects.`);
+  }
+
+  if (missedDeadlines > 0) {
+    recommendations.push("Split upcoming deadlines into smaller daily tasks to avoid misses.");
+  }
+
+  if (inconsistentPatternDetected) {
+    recommendations.push("Schedule fixed study blocks across at least 5 days each week.");
+  }
+
+  return [...new Set(recommendations)];
+}
+
+export function analyzeStudyData(tasks: StudyTask[], sessions: StudySession[], now = new Date()): InsightsResult {
+  const subjectMetrics = buildSubjectMetrics(tasks, sessions);
+  const metricsList = Object.entries(subjectMetrics);
+
+  const timeMedian = median(metricsList.map(([, metric]) => metric.totalStudyTime));
+
+  const weakSubjects = metricsList
+    .filter(([, metric]) => metric.totalStudyTime <= timeMedian && metric.completionRate < 0.6)
+    .map(([subject]) => subject);
+
+  const strongSubjects = metricsList
+    .filter(([, metric]) => metric.totalStudyTime > timeMedian && metric.completionRate >= 0.75)
+    .map(([subject]) => subject);
+
+  const missedDeadlines = countMissedDeadlines(tasks, now);
+  const inconsistentPatternDetected = detectInconsistentPattern(sessions, now);
+
+  const warnings: string[] = [];
+  if (missedDeadlines > 0) {
+    warnings.push(`You missed ${missedDeadlines} deadline${missedDeadlines === 1 ? "" : "s"} recently.`);
+  }
+  if (inconsistentPatternDetected) {
+    warnings.push("Your study pattern is inconsistent in the last 14 days.");
+  }
+
+  const recommendations = buildRecommendations(
+    weakSubjects,
+    strongSubjects,
+    subjectMetrics,
+    missedDeadlines,
+    inconsistentPatternDetected
+  );
+
+  return {
+    weakSubjects,
+    strongSubjects,
+    recommendations,
+    warnings,
+    meta: {
+      missedDeadlines,
+      inconsistentPatternDetected,
+      subjectMetrics,
+    },
+  };
+}
+
+export async function generateNaturalLanguageInsights(
+  insights: InsightsResult,
+  openAiApiKey?: string
+): Promise<string | null> {
+  if (!openAiApiKey) return null;
+
+  try {
+    const response = await fetch("https://api.openai.com/v1/responses", {
+      method: "POST",
+      headers: {
+        "Content-Type": "application/json",
+        Authorization: `Bearer ${openAiApiKey}`,
+      },
+      body: JSON.stringify({
+        model: "gpt-4.1-mini",
+        input: [
+          {
+            role: "system",
+            content:
+              "You are a study coach. Convert structured analytics into concise actionable advice in 4-6 lines.",
+          },
+          {
+            role: "user",
+            content: JSON.stringify(insights),
+          },
+        ],
+      }),
+    });
+
+    if (!response.ok) return null;
+    const payload = await response.json();
+    return payload?.output_text ?? null;
+  } catch {
+    return null;
+  }
+}
 
EOF
)
