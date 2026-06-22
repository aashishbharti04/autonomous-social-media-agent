import { config } from './config.js';
import { store } from './db/index.js';
import { orchestrator } from './orchestrator/orchestrator.js';

let timer: NodeJS.Timeout | undefined;
let running = false;

/**
 * Background scheduler. Periodically finds `scheduled` posts whose time has
 * arrived and publishes them via the orchestrator (which then runs Analytics +
 * Recommendation). This is what makes scheduled/"waiting" posts go out on time.
 */
export function startScheduler(): void {
  if (timer) return;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const due = await store.listDuePosts(new Date().toISOString());
      for (const post of due) {
        // eslint-disable-next-line no-console
        console.log(`⏱️  Publishing scheduled post ${post.id} (${post.platform})`);
        await orchestrator.finalizeScheduledPost(post);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Scheduler tick failed:', (err as Error).message);
    } finally {
      running = false;
    }
  };

  timer = setInterval(tick, config.schedulerIntervalMs);
  // eslint-disable-next-line no-console
  console.log(`⏰ Scheduler started (every ${config.schedulerIntervalMs}ms)`);
}

export function stopScheduler(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}
