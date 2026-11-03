import type { BuildType } from './colonyConfig';
export const CONSTRUCTION_SECONDS = 8;
export interface ConstructionOrder { id: number; kind: BuildType; angle: number; progress: number; paused: boolean; status: string }
export interface CommandState { queue: ConstructionOrder[]; nextId: number; elapsed: number }
export const createCommand = (): CommandState => ({ queue: [], nextId: 1, elapsed: 0 });
export type RemoteOperation = 'toggle' | 'recipe' | 'schedule' | 'auto' | 'service';
export type CommandAction = { type: 'remote'; id: number; operation: RemoteOperation } |
  { type: 'powerLimit'; id: number; percent: number } | { type: 'priority'; id: number; before: number | null } |
  { type: 'remoteTarget'; id: number; product: string; delta: number } |
  { type: 'queueBuild'; kind: BuildType; angle: number } | { type: 'queueControl'; id: number; operation: 'cancel' | 'pause' };
export const isCommandAction = (a: { type: string }): a is CommandAction => ['remote', 'powerLimit', 'priority', 'remoteTarget', 'queueBuild', 'queueControl'].includes(a.type);
