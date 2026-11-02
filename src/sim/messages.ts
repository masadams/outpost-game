export function notify(world: { notice: { message: string; time: number } }, message: string): void {
  world.notice = { message, time: 3 };
}
