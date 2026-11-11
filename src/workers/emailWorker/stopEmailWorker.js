import { workerState } from './workerState.js';

export async function stopEmailWorker() {
  workerState.running = false;
  await workerState.loop;
}
