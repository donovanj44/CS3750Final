import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

import RoundBox from '@/components/round-box';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FEED_PAGE_SIZE, useFeedPage } from '@/constants/round-feed';
import { useCompletedRounds } from '@/constants/round-storage';
import { BottomTabInset, createStyles, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  const [page, setPage] = useState(0);
  const { data: feed, loading, errorMsg, refreshFeed } = useFeedPage(page);
  const totalCount = feed?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / FEED_PAGE_SIZE));
  const isFirstPage = page === 0;
  const isLastPage = page >= totalPages - 1;

  useFocusEffect(
    useCallback(() => {
      refreshRounds();
      refreshFeed();
    }, [refreshRounds, refreshFeed]),
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
        key={page}
        data={feed?.rounds ?? []}
        keyExtractor={(round) => round.id}
        renderItem={({ item }) => (
          <RoundBox round={item} theme={colorScheme} playerName={item.playerName} />
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <Text style={[sharedStyles.text, sharedStyles.centeredText]}>
              {errorMsg ?? 'No rounds yet.'}
            </Text>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pager}>
              <Pressable
                accessibilityRole="button"
                disabled={isFirstPage}
                onPress={() => setPage((current) => current - 1)}
                style={({ pressed }) => [
                  sharedStyles.button,
                  pressed && sharedStyles.pressed,
                  isFirstPage && sharedStyles.disabled,
                ]}>
                <Text style={sharedStyles.buttonText}>‹ Prev</Text>
              </Pressable>
              <Text style={sharedStyles.secondaryText}>
                Page {page + 1} of {totalPages}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={isLastPage}
                onPress={() => setPage((current) => current + 1)}
                style={({ pressed }) => [
                  sharedStyles.button,
                  pressed && sharedStyles.pressed,
                  isLastPage && sharedStyles.disabled,
                ]}>
                <Text style={sharedStyles.buttonText}>Next ›</Text>
              </Pressable>
            </View>
          ) : undefined
        }
        refreshing={loading}
        onRefresh={refreshFeed}
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
  pager: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
