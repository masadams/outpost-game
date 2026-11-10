/** The longest a notice may stay up, in seconds. Saves check against it. */
export const NOTICE_MAX_SECONDS = 10;

/** Shows one line to the player for a few seconds. A newer line replaces an older one. */
export function notify(world: { notice: { message: string; time: number } }, message: string, seconds = 3): void {
  world.notice = { message, time: Math.min(seconds, NOTICE_MAX_SECONDS) };
}
