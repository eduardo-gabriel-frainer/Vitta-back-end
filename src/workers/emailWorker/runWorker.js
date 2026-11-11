import { POLL_INTERVAL_MS } from './constants.js';
import { workerState } from './workerState.js';
import { claimNextJob } from './claimNextJob.js';
import { processJob } from './processJob.js';
import { sleep } from './sleep.js';

export async function runWorker() {
  while (workerState.running) {
    try {
      const job = await claimNextJob();
      if (job) {
        await processJob(job);
      } else {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      console.error('Erro no worker de e-mails:', error);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}
