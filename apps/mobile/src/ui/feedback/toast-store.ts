export type ToastType = 'success' | 'error' | 'info';

export type ToastInput = {
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
};

export type ToastRecord = ToastInput & {
  id: number;
};

type ToastState = {
  current: ToastRecord | null;
};

type ToastListener = (state: ToastState) => void;

const listeners = new Set<ToastListener>();
const queue: ToastRecord[] = [];
let nextId = 1;
let current: ToastRecord | null = null;

function emit(): void {
  const state: ToastState = { current };
  listeners.forEach((listener) => {
    listener(state);
  });
}

function promoteNextIfIdle(): void {
  if (current || queue.length === 0) {
    return;
  }
  current = queue.shift() ?? null;
  emit();
}

export function showToast(input: ToastInput): number {
  const record: ToastRecord = {
    ...input,
    id: nextId++
  };
  queue.push(record);
  promoteNextIfIdle();
  return record.id;
}

export function dismissToast(id?: number): void {
  if (!current) {
    return;
  }
  if (typeof id === 'number' && current.id !== id) {
    return;
  }
  current = null;
  emit();
  promoteNextIfIdle();
}

export function subscribeToast(listener: ToastListener): () => void {
  listeners.add(listener);
  listener({ current });
  return () => {
    listeners.delete(listener);
  };
}

