import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function LoanScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Loan</Text>
        <Text style={styles.text}>Active loan and schedule placeholder.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  container: { flex: 1, padding: 20, gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#0b1720' },
  text: { color: '#374151' }
});
