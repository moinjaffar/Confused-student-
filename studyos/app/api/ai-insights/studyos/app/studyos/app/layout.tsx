 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/studyos/app/layout.tsx b/studyos/app/layout.tsx
new file mode 100644
index 0000000000000000000000000000000000000000..b68f1d7aab569d9b6dcda4d00b4e20abe86b8d56
--- /dev/null
+++ b/studyos/app/layout.tsx
@@ -0,0 +1,10 @@
+import type { ReactNode } from "react";
+import "./globals.css";
+
+export default function RootLayout({ children }: { children: ReactNode }) {
+  return (
+    <html lang="en">
+      <body>{children}</body>
+    </html>
+  );
+}
 
EOF
)
