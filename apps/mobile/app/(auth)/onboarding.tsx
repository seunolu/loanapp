import * as React from 'react';
import { Image, ListRenderItemInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';
import { brand } from '../../src/brand';
import { setOnboardingSeen } from '../../src/lib/storage';
import { Box, Button, Pressable, Text, useTheme } from '../../src/ui';

type Slide = {
  key: string;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    key: 'clarity',
    title: 'Borrow With Full Clarity',
    subtitle: 'See your offer, repayment schedule, and fees before you commit to anything.'
  },
  {
    key: 'speed',
    title: 'Apply In Minutes',
    subtitle: 'Complete onboarding quickly and track your application status in real time.'
  },
  {
    key: 'control',
    title: 'Stay In Control',
    subtitle: 'Manage repayments, profile updates, and support requests in one secure app.'
  }
];

function Dot({
  index,
  pageWidth,
  progress
}: {
  index: number;
  pageWidth: number;
  progress: SharedValue<number>;
}): React.JSX.Element {
  const t = useTheme();
  const animatedStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
    const scale = interpolate(progress.value, input, [1, 1.4, 1], Extrapolation.CLAMP);
    const opacity = interpolate(progress.value, input, [0.35, 1, 0.35], Extrapolation.CLAMP);
    return {
      transform: [{ scale }],
      opacity
    };
  }, [index, pageWidth]);

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedStyle,
        {
          backgroundColor: t.colors.text
        }
      ]}
    />
  );
}

function SlideCard({
  item,
  index,
  pageWidth,
  progress
}: {
  item: Slide;
  index: number;
  pageWidth: number;
  progress: SharedValue<number>;
}): React.JSX.Element {
  const t = useTheme();
  const cardStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
    return {
      transform: [{ scale: interpolate(progress.value, input, [0.96, 1, 0.96], Extrapolation.CLAMP) }],
      opacity: interpolate(progress.value, input, [0.75, 1, 0.75], Extrapolation.CLAMP)
    };
  }, [index, pageWidth]);

  return (
    <View style={{ width: pageWidth, paddingHorizontal: t.spacing.lg }}>
      <Animated.View
        style={[
          styles.card,
          cardStyle,
          {
            borderRadius: t.radius.lg,
            backgroundColor: t.colors.surface,
            borderColor: t.colors.border,
            shadowColor: t.colors.text
          }
        ]}
      >
        <View style={[styles.heroBlock, { backgroundColor: brand.colors.primary }]}>
          <View style={[styles.heroAccent, { backgroundColor: brand.colors.accent }]} />
          <Image source={brand.logo} style={styles.heroLogo} resizeMode="contain" />
        </View>
        <Text variant="h2" style={styles.title}>
          {item.title}
        </Text>
        <Text variant="bodyMuted" style={styles.subtitle}>
          {item.subtitle}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen(): React.JSX.Element {
  const router = useRouter();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);
  const listRef = React.useRef<any>(null);
  const [page, setPage] = React.useState(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      progress.value = event.contentOffset.x;
    },
    onMomentumEnd: (event) => {
      const nextPage = Math.round(event.contentOffset.x / width);
      runOnJS(setPage)(nextPage);
    }
  });

  const markSeenAndGoLogin = React.useCallback(async () => {
    await setOnboardingSeen(true);
    router.replace('/(auth)/login');
  }, [router]);

  const goNext = React.useCallback(() => {
    const next = Math.min(page + 1, SLIDES.length - 1);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  }, [page]);

  const renderItem = React.useCallback(
    ({ item, index }: ListRenderItemInfo<Slide>) => (
      <SlideCard item={item} index={index} pageWidth={width} progress={progress} />
    ),
    [progress, width]
  );

  return (
    <Box flex={1} bg="background" pt="md">
      <Box row justify="space-between" align="center" px="lg" py="sm">
        <Text variant="subtitle" style={{ color: brand.colors.primary }}>
          {brand.appName}
        </Text>
        <Pressable accessibilityLabel="Skip onboarding" onPress={markSeenAndGoLogin}>
          <Text variant="button" color="textMuted">
            Skip
          </Text>
        </Pressable>
      </Box>

      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        snapToInterval={width}
        decelerationRate="fast"
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />

      <Box px="lg" pb="lg" pt="sm" gap="md">
        <Box row justify="center" align="center" gap="sm">
          {SLIDES.map((slide, index) => (
            <Dot key={slide.key} index={index} pageWidth={width} progress={progress} />
          ))}
        </Box>
        <Button
          fullWidth
          accessibilityLabel={page === SLIDES.length - 1 ? 'Get started' : 'Next onboarding page'}
          label={page === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={page === SLIDES.length - 1 ? markSeenAndGoLogin : goNext}
          style={{ backgroundColor: brand.colors.primary, marginBottom: t.spacing.sm }}
        />
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    padding: 20,
    justifyContent: 'center',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  heroBlock: {
    height: 180,
    borderRadius: 20,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  heroAccent: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    opacity: 0.28,
    top: -80,
    right: -60
  },
  heroLogo: {
    width: 68,
    height: 68
  },
  title: {
    marginBottom: 10
  },
  subtitle: {
    lineHeight: 22
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999
  }
});
