import { CircleAlert, CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getAppHealth } from "../_lib/get-app-health";

export async function HealthStatus() {
  const [health, t] = await Promise.all([getAppHealth(), getTranslations("home")]);

  if (!health.connected) {
    return (
      <p className="flex items-center gap-2 text-sm text-destructive">
        <CircleAlert className="size-4" aria-hidden />
        {t("healthError")}: {health.error}
      </p>
    );
  }

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <CircleCheck className="size-4 text-emerald-500" aria-hidden />
      {t("healthOk")}
    </p>
  );
}
