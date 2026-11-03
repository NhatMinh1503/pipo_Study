import { CircleAlert, CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getAppHealth } from "../_lib/get-app-health";

export async function HealthStatus() {
  const [health, t] = await Promise.all([getAppHealth(), getTranslations("home")]);

  if (!health.connected) {
    return (
      <p className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.06em] text-destructive uppercase">
        <CircleAlert className="size-3.5 shrink-0" aria-hidden />
        {t("healthError")}: {health.error}
      </p>
    );
  }

  return (
    <p className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.06em] text-muted-foreground uppercase">
      <CircleCheck className="size-3.5 shrink-0 text-success" aria-hidden />
      {t("healthOk")}
    </p>
  );
}
