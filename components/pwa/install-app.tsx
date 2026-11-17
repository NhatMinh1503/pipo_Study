"use client";

import { Download, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** Chrome / Edge / Android fire this before showing their own install prompt. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isBeforeInstallPrompt(event: Event): event is BeforeInstallPromptEvent {
  return "prompt" in event && typeof event.prompt === "function";
}

type InstallState = "installed" | "prompt" | "ios" | "other";

/**
 * "Install pipo on this device". Uses the browser's install prompt where there is one; on
 * iPhone / iPad (no prompt) explains Share → Add to Home Screen. Hidden once installed.
 */
export function InstallApp() {
  const t = useTranslations("pwa");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<InstallState>("other");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && navigator.standalone === true);
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // Reading the platform once after mount; the server render always starts as "other"
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(standalone ? "installed" : ios ? "ios" : "other");

    const onPrompt = (event: Event) => {
      if (!isBeforeInstallPrompt(event)) return;
      event.preventDefault();
      setDeferred(event);
      setState("prompt");
    };
    const onInstalled = () => setState("installed");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (state === "installed") return null;

  return (
    <section className="sheet-tight space-y-3 p-4" aria-labelledby="install-app-heading">
      <h2 id="install-app-heading" className="font-heading font-semibold">
        {t("title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      {state === "prompt" && deferred ? (
        <Button
          onClick={async () => {
            await deferred.prompt();
            const choice = await deferred.userChoice;
            if (choice.outcome === "accepted") setState("installed");
            setDeferred(null);
          }}
        >
          <Download aria-hidden />
          {t("install")}
        </Button>
      ) : state === "ios" ? (
        <p className="flex items-center gap-2 text-sm">
          <Share className="size-4 shrink-0" aria-hidden />
          {t("ios")}
        </p>
      ) : (
        <p className="text-sm">{t("other")}</p>
      )}
    </section>
  );
}
