export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to optional Expo clipboard support.
  }

  try {
    const Clipboard = require('expo-clipboard') as { setStringAsync?: (text: string) => Promise<void> };
    if (typeof Clipboard.setStringAsync === 'function') {
      await Clipboard.setStringAsync(value);
      return true;
    }
  } catch {
    // Clipboard dependency is optional in this workspace.
  }

  return false;
}
