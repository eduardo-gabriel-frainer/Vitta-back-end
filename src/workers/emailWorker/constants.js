export const POLL_INTERVAL_MS = 1000;
export const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
export const LOCK_HEARTBEAT_MS = 60 * 1000;
export const RECLAIM_INTERVAL_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;

export const lockReleased = {
  bloqueado_em: null,
  token_bloqueio: null,
};
