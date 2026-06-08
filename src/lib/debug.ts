// Tiny on-device debug log visible on screen. Logs stored on window so
// any component can write without prop-drilling.
// Production-safe: noop when window is undefined.

export interface DebugEntry { ts: number; msg: string; }

function store(): DebugEntry[] {
  if (typeof window === 'undefined') return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (!w.__debug_logs) w.__debug_logs = [];
  return w.__debug_logs as DebugEntry[];
}

export function dlog(msg: string) {
  if (typeof window === 'undefined') return;
  store().push({ ts: Date.now(), msg });
  // Keep last 50 entries
  const s = store();
  if (s.length > 50) s.splice(0, s.length - 50);
  // Notify listeners
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__debug_listeners?.forEach((fn: () => void) => fn());
}

export function onDebugChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (!w.__debug_listeners) w.__debug_listeners = [];
  w.__debug_listeners.push(cb);
  return () => {
    w.__debug_listeners = w.__debug_listeners.filter((f: unknown) => f !== cb);
  };
}

export function getLogs(): DebugEntry[] {
  return [...store()];
}
