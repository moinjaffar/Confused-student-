 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/studyos/app/api/ai-insights/route.ts b/studyos/app/api/ai-insights/route.ts
new file mode 100644
index 0000000000000000000000000000000000000000..dfa614ef1ddf94630b5ba682fef75936979ab011
--- /dev/null
+++ b/studyos/app/api/ai-insights/route.ts
@@ -0,0 +1,106 @@
+import { NextRequest, NextResponse } from "next/server";
+import {
+  analyzeStudyData,
+  generateNaturalLanguageInsights,
+  type StudySession,
+  type StudyTask,
+} from "../../../lib/aiInsights";
+
+export const runtime = "nodejs";
+
+type CachedEntry = {
+  expiresAt: number;
+  payload: unknown;
+};
+
+const CACHE_TTL_MS = 5 * 60 * 1000;
+const insightCache = new Map<string, CachedEntry>();
+
+function createCacheKey(tasks: StudyTask[], sessions: StudySession[]): string {
+  // Stable cache key from normalized payload.
+  const compact = JSON.stringify({ tasks, sessions });
+  return Buffer.from(compact).toString("base64");
+}
+
+function validateTasks(input: unknown): StudyTask[] {
+  if (!Array.isArray(input)) return [];
+
+  return input
+    .filter((item) => item && typeof item === "object")
+    .map((item) => {
+      const task = item as Record<string, unknown>;
+      return {
+        subject: String(task.subject ?? "").trim(),
+        status: String(task.status ?? "pending").trim(),
+        deadline: String(task.deadline ?? "").trim(),
+      };
+    })
+    .filter((task) => task.subject && task.deadline);
+}
+
+function validateSessions(input: unknown): StudySession[] {
+  if (!Array.isArray(input)) return [];
+
+  return input
+    .filter((item) => item && typeof item === "object")
+    .map((item) => {
+      const session = item as Record<string, unknown>;
+      return {
+        subject: String(session.subject ?? "").trim(),
+        duration: Number(session.duration ?? 0),
+        date: String(session.date ?? "").trim(),
+      };
+    })
+    .filter((session) => session.subject && session.date && Number.isFinite(session.duration));
+}
+
+export async function POST(request: NextRequest) {
+  try {
+    const body = await request.json();
+
+    const tasks = validateTasks(body?.tasks);
+    const sessions = validateSessions(body?.sessions);
+
+    if (tasks.length === 0 && sessions.length === 0) {
+      return NextResponse.json(
+        { error: "Provide at least one valid task or session record." },
+        { status: 400 }
+      );
+    }
+
+    const cacheKey = createCacheKey(tasks, sessions);
+    const now = Date.now();
+    const cached = insightCache.get(cacheKey);
+
+    if (cached && cached.expiresAt > now) {
+      return NextResponse.json({ ...cached.payload, cached: true }, { status: 200 });
+    }
+
+    const insightPayload = analyzeStudyData(tasks, sessions);
+
+    // Optional advanced AI layer: convert structured metrics to friendlier copy.
+    const narrative = await generateNaturalLanguageInsights(
+      insightPayload,
+      process.env.OPENAI_API_KEY
+    );
+
+    const payload = {
+      ...insightPayload,
+      narrative,
+      cached: false,
+      generatedAt: new Date().toISOString(),
+    };
+
+    insightCache.set(cacheKey, {
+      expiresAt: now + CACHE_TTL_MS,
+      payload,
+    });
+
+    return NextResponse.json(payload, { status: 200 });
+  } catch {
+    return NextResponse.json(
+      { error: "Unable to generate insights. Check request payload format." },
+      { status: 500 }
+    );
+  }
+}
 
EOF
)
