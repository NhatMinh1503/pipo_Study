import { getGardenStatus } from "@/server/queries/garden";

import { PomodoroTimer } from "./pomodoro-timer";

/** Loads the garden status (growing tree, seeds) the timer needs to offer a tree. */
export async function PomodoroLoader() {
  return <PomodoroTimer garden={await getGardenStatus()} />;
}
