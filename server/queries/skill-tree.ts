import "server-only";

import { computeTopicTree, type TopicNode } from "@/lib/skills/topics";
import type { LearningLanguage } from "@/lib/schemas/common";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardedProfile } from "@/server/profile";

export interface SkillTreeData {
  language: LearningLanguage;
  branches: TopicNode[][];
}

/** The learner's topic × level tree, with node states decided from finished lessons. */
export async function getSkillTree(): Promise<SkillTreeData | null> {
  const profile = await requireOnboardedProfile();
  if (!profile.learning_language || !profile.level) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("skill_tree_progress");
  return {
    language: profile.learning_language,
    branches: computeTopicTree(profile.learning_language, profile.level, data ?? []),
  };
}
