 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/studyos/README.md b/studyos/README.md
new file mode 100644
index 0000000000000000000000000000000000000000..58c959558d1414aef7a675742bc585e75354f8ed
--- /dev/null
+++ b/studyos/README.md
@@ -0,0 +1,37 @@
+# StudyOS - AI Insight Engine
+
+This adds an AI Insight Engine to a Next.js StudyOS dashboard.
+
+## Added modules
+
+- `app/api/ai-insights/route.ts` - POST API that analyzes tasks + sessions and returns structured insights.
+- `lib/aiInsights.ts` - reusable analysis and optional OpenAI narrative generation.
+- `components/AIInsights.tsx` - dashboard card component that fetches and displays insights.
+- `app/page.tsx` - sample integration usage.
+
+## API
+
+### `POST /api/ai-insights`
+
+Request body:
+
+```json
+{
+  "tasks": [{ "subject": "Math", "status": "pending", "deadline": "2026-03-28" }],
+  "sessions": [{ "subject": "Math", "duration": 45, "date": "2026-03-27" }]
+}
+```
+
+Response includes:
+
+- `weakSubjects`
+- `strongSubjects`
+- `recommendations`
+- `warnings`
+- `meta.subjectMetrics`
+- optional `narrative` when `OPENAI_API_KEY` is configured.
+
+## Notes
+
+- In-memory caching is enabled for 5 minutes per payload for faster repeat responses.
+- Replace `demoTasks` / `demoSessions` in `app/page.tsx` with data loaded from your Firebase/database layer.
 
EOF
)
