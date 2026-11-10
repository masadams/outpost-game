/** Shows one line to the player for a few seconds. A newer line replaces an older one. */
export function notify(world: { notice: { message: string; time: number } }, message: string, seconds = 3): void {
  world.notice = { message, time: seconds };
}
