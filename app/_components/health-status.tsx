import { CircleAlert, CircleCheck } from "lucide-react";

import { getAppHealth } from "../_lib/get-app-health";

export async function HealthStatus() {
  const health = await getAppHealth();

  if (!health.connected) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <CircleAlert className="mt-0.5 text-destructive" aria-hidden />
        <div>
          <p className="font-medium">Chưa kết nối được Supabase</p>
          <p className="text-muted-foreground">{health.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm">
      <CircleCheck className="mt-0.5 text-emerald-500" aria-hidden />
      <div>
        <p className="font-medium">{health.message}</p>
        <p className="text-muted-foreground">status: {health.status}</p>
      </div>
    </div>
  );
}
