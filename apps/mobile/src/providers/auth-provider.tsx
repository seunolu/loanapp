import { hydrateStoredSession } from '../auth/auth-service';

export { AuthProvider, useAuth, type AuthStatus } from '../auth';

export async function hydrateAuth(): Promise<void> {
  await hydrateStoredSession();
}
