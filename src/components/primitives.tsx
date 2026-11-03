import React, { type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useDebugTheme } from '../theme/ThemeContext';
import { useDebugMenu } from '../menuContext';
import { useSafeInsets } from '../optional';
import type { DebugThemeTokens } from '../types';

type Weight = 'regular' | 'medium' | 'bold';

const WEIGHTS: Record<Weight, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  bold: '700',
};

// A custom family already encodes its weight; only the system font gets fontWeight.
function fontFor(theme: DebugThemeTokens, weight: Weight): TextStyle {
  const family = theme.fonts[weight] ?? theme.fonts.regular;
  return family === 'System'
    ? { fontWeight: WEIGHTS[weight] }
    : { fontFamily: family };
}

export function Text({
  children,
  muted,
  mono,
  weight = 'regular',
  style,
  numberOfLines,
  selectable,
}: {
  children: ReactNode;
  muted?: boolean;
  mono?: boolean;
  weight?: Weight;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const theme = useDebugTheme();
  return (
    <RNText
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[
        {
          color: muted ? theme.colors.textMuted : theme.colors.text,
          fontSize: 15,
        },
        mono ? { fontFamily: theme.fonts.mono } : fontFor(theme, weight),
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

/** Left arrow drawn with views, so the core needs no SVG dependency. */
function BackIcon({ color }: { color: string }) {
  return (
    <View style={styles.icon}>
      <View style={[styles.iconShaft, { backgroundColor: color }]} />
      <View
        style={[styles.iconHead, styles.iconHeadUp, { backgroundColor: color }]}
      />
      <View
        style={[
          styles.iconHead,
          styles.iconHeadDown,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

export function Header({ title, right }: { title: string; right?: ReactNode }) {
  const theme = useDebugTheme();
  const menu = useDebugMenu();

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={menu.back}
        hitSlop={8}
        style={({ pressed }) => [
          styles.backButton,
          { backgroundColor: theme.colors.surface, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <BackIcon color={theme.colors.text} />
      </Pressable>
      <RNText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[
          styles.headerTitle,
          { color: theme.colors.text },
          fontFor(theme, 'medium'),
        ]}
      >
        {title}
      </RNText>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function Page({
  title,
  right,
  children,
  scroll = true,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
}) {
  const theme = useDebugTheme();
  const insets = useSafeInsets();

  return (
    <View
      style={[
        styles.page,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <Header title={title} right={right} />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.pageContent,
            { paddingBottom: 20 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.flex,
            styles.pageContent,
            { paddingBottom: insets.bottom },
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

export function Section({
  title,
  note,
  children,
}: {
  title?: string;
  note?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title ? (
        <Text muted weight="bold" style={styles.sectionTitle}>
          {title}
        </Text>
      ) : null}
      {note ? (
        <Text muted style={styles.note}>
          {note}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export function ListItem({
  title,
  subtitle,
  right,
  onPress,
  destructive,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const theme = useDebugTheme();
  const content = (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.rowBody}>
        <Text
          weight="medium"
          numberOfLines={1}
          style={destructive ? { color: theme.colors.danger } : undefined}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text muted numberOfLines={2} style={styles.rowSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}

export const Row = ListItem;

export function Button({
  label,
  onPress,
  destructive,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useDebugTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: destructive
            ? theme.colors.danger
            : theme.colors.action,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text style={{ color: theme.colors.onAction, textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1 },
  pageContent: { padding: 20, gap: 24 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, marginEnd: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // 24x24 box: shaft (5,12)->(19,12), head strokes (5,12)->(10,7) and (10,17).
  icon: { width: 24, height: 24 },
  iconShaft: {
    position: 'absolute',
    left: 4,
    top: 11,
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  iconHead: {
    position: 'absolute',
    left: 2.97,
    width: 9.07,
    height: 2,
    borderRadius: 1,
  },
  iconHeadUp: { top: 8.5, transform: [{ rotate: '-45deg' }] },
  iconHeadDown: { top: 13.5, transform: [{ rotate: '45deg' }] },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  note: { fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowBody: { flex: 1 },
  rowSubtitle: { marginTop: 4, fontSize: 12 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});
