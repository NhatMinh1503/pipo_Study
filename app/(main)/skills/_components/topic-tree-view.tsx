import { Check, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";
import { getSkillTree } from "@/server/queries/skill-tree";

import { StartNodeButton } from "./start-node-button";

/** Topic × level skill tree (PRD F): pass a node's lesson to open the next level. */
export async function TopicTreeView() {
  const [tree, t] = await Promise.all([getSkillTree(), getTranslations("skills.tree")]);
  if (!tree) return null;

  return (
    <section className="space-y-4" aria-labelledby="topic-tree-heading">
      <div>
        <h2 id="topic-tree-heading" className="font-heading text-lg font-bold">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tree.branches.map((nodes) => {
          const topic = nodes[0]?.topic;
          if (!topic) return null;
          return (
            <section key={topic} className="space-y-3">
              <h3 className="mono-label">{t(`topics.${topic}`)}</h3>
              <ol className="relative space-y-2 before:absolute before:top-3 before:bottom-3 before:left-5 before:border-l-2 before:border-dashed before:border-border/40">
                {nodes.map((node) => (
                  <li
                    key={node.id}
                    aria-label={t("nodeLabel", {
                      topic: t(`topics.${topic}`),
                      level: node.level,
                      state: t(`state.${node.state}`),
                    })}
                    className={cn(
                      "relative flex items-center gap-3 border-2 bg-card p-2.5",
                      node.state === "done" && "border-border",
                      node.state === "open" &&
                        "border-primary shadow-[3px_3px_0_0_var(--shadow-ink)]",
                      node.state === "locked" && "border-dashed border-border/40 opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "z-10 flex size-8 shrink-0 items-center justify-center border-2 font-mono text-[0.625rem] font-bold",
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
                        node.level
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{node.level}</p>
                      {node.bestAccuracy !== null && (
                        <p className="mono-value text-xs text-muted-foreground">
                          {t("best", { percent: Math.round(node.bestAccuracy * 100) })}
                        </p>
                      )}
                    </div>
                    {node.state !== "locked" && (
                      <StartNodeButton nodeId={node.id} again={node.state === "done"} />
                    )}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </section>
  );
}
