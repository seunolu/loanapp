export function withRequestId<T>(logger: T, requestId: string): T {
  const maybeLogger = logger as { child?: (bindings: Record<string, unknown>) => unknown };
  if (typeof maybeLogger.child === 'function') {
    return maybeLogger.child({ requestId }) as T;
  }
  return logger;
}
