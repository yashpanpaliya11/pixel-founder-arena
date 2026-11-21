export type RoastLanguage = 'en' | 'hinglish';
export type Intensity = 'chill' | 'funny' | 'savage';
export type ErrorCategory = 'syntax' | 'reference' | 'type' | 'module' | 'test' | 'range' | 'generic';
export interface CustomFounder { id: string; name: string; company: string; specialty: string; color?: string; roasts?: Partial<Record<RoastLanguage, string[]>> }
export interface Founder extends CustomFounder { archetype: string; custom?: boolean; sheet?: string; column?: number; row?: number; rows?: number }
export interface Settings { language: RoastLanguage; intensity: Intensity; sound: boolean; paused: boolean; cooldown: number; dialogueInterval: number; animationSpeed: number; selected: string[] }
export interface Project { name: string; audience: string; description: string }
export interface ErrorGuide { title: string; meaning: string; hints: string[]; example: string }
export interface ClassifiedError { category: ErrorCategory; message: string; location: { file: string; line: number; column: number | null } | null; guide: ErrorGuide }
export interface Debate { topic: string; project: string; lines: { founderId: string; targetId: string; roast: string; text: string }[]; takeaway: string; note: string }
export interface ArenaEvent { id: string; type: string; time: number; founderId?: string; roast?: string; error?: ClassifiedError; debate?: Debate; text?: string; demo?: boolean; suppressed?: boolean; exitCode?: number; signal?: string | null }
export interface Task { id: string; text: string; done: boolean; rewarded?: boolean }
export interface Snapshot { founders: Founder[]; settings: Settings; project: Project; tasks: Task[]; stats: { xp: number; errors: number; successes: number; completedTasks: number; categories: Partial<Record<ErrorCategory, number>> }; status: { running: boolean; command: string | null; exitCode: number | null }; events: ArenaEvent[]; warning: string | null }
export interface ArenaOptions { stateFile?: string; customFounders?: CustomFounder[]; persist?: boolean }
export class Arena {
  constructor(options?: ArenaOptions);
  founders: Founder[]; settings: Settings; project: Project; tasks: Task[]; stats: Snapshot['stats']; status: Snapshot['status']; events: ArenaEvent[];
  snapshot(): Snapshot;
  updateSettings(patch: Partial<Settings>, save?: boolean): void;
  updateProject(project: Partial<Project>, save?: boolean): void;
  activeFounders(): Founder[];
  reportError(output: string, options?: { demo?: boolean; force?: boolean }): ArenaEvent | null;
  success(options?: { demo?: boolean }): ArenaEvent;
  debate(topic?: string): ArenaEvent;
  task(action: 'add' | 'toggle' | 'delete', payload: { text?: string; id?: string }): Task[];
  save(): void;
  broadcast(type: string, data?: Partial<ArenaEvent>): ArenaEvent;
  on(event: 'event', listener: (event: ArenaEvent) => void): this;
  on(event: 'state', listener: () => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
}
export function createArena(options?: ArenaOptions): Arena;
export const founders: Founder[];
export function validateCustomFounders(input: CustomFounder[]): Founder[];
export function classifyError(output: string): ClassifiedError | null;
export const errorGuides: Record<ErrorCategory, ErrorGuide>;
export function chooseRoast(options: { founder?: Founder; category?: ErrorCategory; language?: RoastLanguage; intensity?: Intensity; previous?: string; random?: () => number }): string;
export const topics: string[];
export function createDebate(options: { topic?: string; project?: Partial<Project>; cast?: Founder[]; language?: RoastLanguage; intensity?: Intensity; random?: () => number }): Debate;
export function startServer(arena: Arena, options?: { port?: number }): Promise<{ url: string; token: string; server: unknown; close(): Promise<void> }>;
export function runCommand(arena: Arena, command: string, args?: string[], options?: { cwd?: string; stdout?: { write(chunk: unknown): unknown } | null; stderr?: { write(chunk: unknown): unknown } | null }): { child: unknown; completion: Promise<number>; stop(signal?: string): void };
