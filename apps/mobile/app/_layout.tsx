import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppQueryProvider } from "../src/providers/query-provider";
import { AuthProvider } from "../src/providers/auth-provider";
import { KycProvider } from "../src/providers/kyc-provider";

export default function RootLayout() {
  return (
    <AppQueryProvider>
      <AuthProvider>
        <KycProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </KycProvider>
      </AuthProvider>
    </AppQueryProvider>
  );
}
