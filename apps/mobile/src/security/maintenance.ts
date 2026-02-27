type MaintenanceListener = () => void;

const listeners = new Set<MaintenanceListener>();
let isMaintenanceActive = false;

export function subscribeMaintenanceMode(listener: MaintenanceListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isMaintenanceError(status: number, payload: unknown): boolean {
  if (status === 503) {
    return true;
  }
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const code = ((payload as { error?: { code?: string }; code?: string }).error?.code ??
    (payload as { code?: string }).code ??
    '')
    .toString()
    .toUpperCase();
  return code === 'MAINTENANCE_MODE' || code === 'SERVICE_UNAVAILABLE';
}

export function activateMaintenanceMode(): void {
  if (isMaintenanceActive) {
    return;
  }
  isMaintenanceActive = true;
  listeners.forEach((listener) => listener());
}

export function getMaintenanceModeState(): boolean {
  return isMaintenanceActive;
}

