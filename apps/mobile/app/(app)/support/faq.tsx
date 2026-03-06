import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSupportFaq } from '../../../src/features/support/support.queries';
import { Card, Pressable, Screen, Text, TopNav, colors, spacing, typography } from '../../../src/ui';

export default function SupportFaqScreen() {
  const faqQuery = useSupportFaq();
  const [openId, setOpenId] = useState<string | null>(faqQuery.data?.[0]?.id ?? null);

  return (
    <Screen>
      <TopNav title="FAQ" subtitle="Common questions and practical answers." onBack={() => router.back()} />
      <View style={styles.list}>
        {(faqQuery.data ?? []).map((item) => {
          const isOpen = openId === item.id;
          return (
            <Pressable key={item.id} onPress={() => setOpenId(isOpen ? null : item.id)}>
              <Card style={styles.card}>
                <Text style={styles.question}>{item.question}</Text>
                {isOpen ? <Text style={styles.answer}>{item.answer}</Text> : null}
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm
  },
  card: {
    gap: spacing.sm
  },
  question: {
    ...typography.subtitle,
    color: colors.text
  },
  answer: {
    ...typography.body,
    color: colors.textMuted
  }
});
