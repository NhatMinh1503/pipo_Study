import { GAME } from "@/lib/game/config";

/**
 * Client-side timers for battle presence. The server decides every outcome; these values
 * mirror supabase/migrations/20261105053847_battle_presence_timeout.sql and must change
 * together with it.
 */
export const HEARTBEAT_INTERVAL_SECONDS = GAME.battle.heartbeatSeconds;
export const OPPONENT_TIMEOUT_SECONDS = GAME.battle.opponentTimeoutSeconds;

/**
 * Whether it is worth asking the server to close the battle: the opponent has looked
 * offline (no realtime presence) for at least the timeout. The server still checks the
 * opponent's last heartbeat, so a wrong guess here only costs one request.
 */
export function shouldClaimTimeout(offlineSinceMs: number | null, nowMs: number): boolean {
  return offlineSinceMs !== null && nowMs - offlineSinceMs >= OPPONENT_TIMEOUT_SECONDS * 1000;
}
