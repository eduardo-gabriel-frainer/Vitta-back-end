import { workerState } from './workerState.js';
import { runWorker } from './runWorker.js';

export function startEmailWorker() {
  if (workerState.running) return;
  workerState.running = true;
  workerState.loop = runWorker();
}
