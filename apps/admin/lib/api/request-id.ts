let sessionRequestId = '';

export function getRequestId(): string {
  if (!sessionRequestId) {
    sessionRequestId = crypto.randomUUID();
  }
  return `${sessionRequestId}:${crypto.randomUUID()}`;
}
