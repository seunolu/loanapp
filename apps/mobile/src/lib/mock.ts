export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';

export function shouldUseMockApi(): boolean {
  return USE_MOCK_API;
}
