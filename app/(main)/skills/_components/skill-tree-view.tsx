import { Check, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { computeSkillTree, SKILL_TREE } from "@/lib/skills/tree";
import { cn } from "@/lib/utils";
import { getLearnerStats } from "@/server/queries/learner-stats";

export async function SkillTreeView() {
  const [stats, t] = await Promise.all([getLearnerStats(), getTranslations("skills")]);
  const tree = computeSkillTree(stats);

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {tree.map((nodes, branchIndex) => {
        const branch = SKILL_TREE[branchIndex];
        if (!branch) return null;
        return (
          <section key={branch.id} className="space-y-3">
            <h2 className="mono-label">{t(`branches.${branch.id}.title`)}</h2>
            <ol className="relative space-y-3 before:absolute before:top-3 before:bottom-3 before:left-5 before:border-l-2 before:border-dashed before:border-border/40">
              {nodes.map((node) => (
                <li
                  key={node.tier}
                  aria-label={t("nodeLabel", {
                    goal: t(`branches.${branch.id}.goal`, { count: node.threshold }),
                    state: t(`state.${node.state}`),
                  })}
                  className={cn(
                    "relative flex items-center gap-3 border-2 bg-card p-3",
                    node.state === "done" && "border-border",
                    node.state === "open" &&
                      "border-primary shadow-[3px_3px_0_0_var(--shadow-ink)]",
                    node.state === "locked" && "border-dashed border-border/40 opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "z-10 flex size-8 shrink-0 items-center justify-center border-2 text-xs",
                      node.state === "done"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background",
                    )}
                    aria-hidden
                  >
                    {node.state === "done" ? (
                      <Check className="size-4" />
                    ) : node.state === "locked" ? (
                      <Lock className="size-3.5" />
                    ) : (
                      node.tier + 1
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {t(`branches.${branch.id}.goal`, { count: node.threshold })}
                    </p>
                    {node.state === "open" && (
                      <p className="mono-value text-xs text-muted-foreground">
                        {node.progress}/{node.threshold}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
