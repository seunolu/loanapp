import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../src/providers/auth-provider";

export default function Index() {
  const { status } = useAuth();
  if (status === 'unknown') {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <Redirect href={(status === 'authenticated' ? '/(app)/home' : '/(auth)/welcome') as any} />;
}
