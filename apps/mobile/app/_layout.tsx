import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppQueryProvider } from "../src/providers/query-provider";
import { TenantProvider } from "../src/tenant/tenant-context";

export default function RootLayout() {
  return (
    <AppQueryProvider>
      <TenantProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </TenantProvider>
    </AppQueryProvider>
  );
}
