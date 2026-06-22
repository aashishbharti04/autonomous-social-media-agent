import type { AgentRunRecord, ContentBrief } from '../types.js';

/**
 * Blackboard shared between agents during a single orchestration. This is the
 * "agents share memory" mechanism: each agent reads what previous agents wrote
 * and contributes its own output for downstream agents.
 */
export interface SharedContext {
  brief: ContentBrief;
  blackboard: Record<string, unknown>;
  events: { agent: string; message: string; at: string }[];
  timeline: AgentRunRecord[];
}

export function createContext(brief: ContentBrief): SharedContext {
  return { brief, blackboard: {}, events: [], timeline: [] };
}

export interface AgentMeta {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'error';
  runs: number;
  lastRunAt?: string;
}

/**
 * Base class for all six agents. Subclasses implement `handle()`; `run()` wraps
 * it with timing, status tracking and event logging onto the shared context.
 */
export abstract class BaseAgent<TInput, TOutput> {
  abstract readonly id: string;
  abstract readonly name: string;

  status: 'idle' | 'running' | 'error' = 'idle';
  runs = 0;
  lastRunAt?: string;

  protected abstract handle(input: TInput, ctx: SharedContext): Promise<TOutput>;

  /** Short human-readable summary of the output, shown in the run timeline. */
  protected abstract summarize(output: TOutput, ctx: SharedContext): string;

  async run(input: TInput, ctx: SharedContext): Promise<TOutput> {
    this.status = 'running';
    const start = Date.now();
    try {
      const output = await this.handle(input, ctx);
      const ms = Date.now() - start;
      this.runs += 1;
      this.lastRunAt = new Date().toISOString();
      this.status = 'idle';

      const summary = this.summarize(output, ctx);
      ctx.timeline.push({ agent: this.id, ms, summary });
      ctx.events.push({ agent: this.id, message: summary, at: this.lastRunAt });
      return output;
    } catch (err) {
      this.status = 'error';
      ctx.events.push({
        agent: this.id,
        message: `error: ${(err as Error).message}`,
        at: new Date().toISOString(),
      });
      throw err;
    }
  }

  meta(): AgentMeta {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      runs: this.runs,
      lastRunAt: this.lastRunAt,
    };
  }
}
