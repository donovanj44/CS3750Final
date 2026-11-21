import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCompletedRounds } from '@/constants/round-storage';
import { BottomTabInset, createStyles, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FeedItem = {
  id: string;
  title: string;
  description: string;
};

const DATA: FeedItem[] = [
  { id: '1', title: 'Box One', description: 'This is the first item.' },
  { id: '2', title: 'Box Two', description: 'This is the second item.' },
  { id: '3', title: 'Box Three', description: 'This is the third item.' },
  { id: '4', title: 'Box Four', description: 'This is the fourth item.' },
  { id: '5', title: 'Box Five', description: 'This is the fifth item.' },
  { id: '6', title: 'Box Six', description: 'This is the sixth item.' },
  { id: '7', title: 'Box Seven', description: 'This is the seventh item.' },
  { id: '8', title: 'Box Eight', description: 'This is the eighth item.' },
];

export default function FeedScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const colorScheme = useColorScheme() ?? 'dark';
  const sharedStyles = createStyles(colorScheme);
  const router = useRouter();
  const { data: rounds, refreshRounds } = useCompletedRounds();
  const roundCount = rounds?.length ?? 0;

  useFocusEffect(
    useCallback(() => {
      refreshRounds();
    }, [refreshRounds]),
  );

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left + Spacing.four,
      paddingRight: insets.right + Spacing.four,
      paddingBottom: insets.bottom,
    },
    ios: {
      paddingTop: insets.top,
      paddingLeft: insets.left + Spacing.four,
      paddingRight: insets.right + Spacing.four,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingHorizontal: Spacing.four,
      paddingBottom: Spacing.four,
    },
  });

  const renderItem = ({ item }: { item: FeedItem }) => (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{item.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {item.description}
      </ThemedText>
    </ThemedView>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Feed', headerShown: false }} />
      <ThemedView
        style={[
          styles.header,
          { paddingTop: Platform.OS === 'web' ? Spacing.four : insets.top },
        ]}>
        <ThemedText type="subtitle">Feed</ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/feed/my-rounds')}
          style={({ pressed }) => [sharedStyles.feedBar, pressed && sharedStyles.pressed]}>
          <Text style={sharedStyles.buttonText}>My Rounds</Text>
          <Text style={sharedStyles.secondaryText}>
            {roundCount} {roundCount === 1 ? 'round' : 'rounds'} ›
          </Text>
        </Pressable>
      </ThemedView>
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.contentContainer,
          contentPlatformStyle,
          { paddingTop: Spacing.three },
        ]}
        data={DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  list: {
    flex: 1,
  },
  contentContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
    minHeight: 240,
  },
});
