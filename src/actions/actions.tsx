import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Button, Page, Section, Text } from '../components/primitives';
import { useDebugTheme } from '../theme/ThemeContext';
import type { DebugPlugin } from '../types';

export type DebugAction = {
  label: string;
  onPress: () => void | Promise<void>;
  destructive?: boolean;
  /** Button background color, e.g. a warning orange. Wins over `destructive`. */
  color?: string;
  confirm?: string | boolean;
};

export type DebugActionSection = {
  title?: string;
  note?: string;
  actions: DebugAction[];
};

export type ActionsPluginOptions = {
  id?: string;
  title?: string;
  section?: string;
  order?: number;
  /** Shown above the sections. */
  note?: string;
} & (
  | { actions: DebugAction[]; sections?: never }
  | { sections: DebugActionSection[]; actions?: never }
);

export function actionsPlugin(options: ActionsPluginOptions): DebugPlugin {
  const sections: DebugActionSection[] = options.sections ?? [
    { actions: options.actions ?? [] },
  ];

  function ActionsPage() {
    const theme = useDebugTheme();
    const [pending, setPending] = useState<DebugAction | null>(null);

    const run = async (action: DebugAction) => {
      await action.onPress();
      setPending(null);
    };

    return (
      <Page title={options.title ?? 'Actions'}>
        {options.note ? <Section note={options.note} /> : null}
        {sections.map((section, index) => (
          <Section
            key={section.title ?? index}
            title={section.title}
            note={section.note}
          >
            {section.actions.map((action) => (
              <Button
                key={action.label}
                label={action.label}
                destructive={action.destructive}
                color={action.color}
                onPress={() => {
                  if (action.confirm) {
                    setPending(action);
                    return;
                  }
                  void run(action);
                }}
              />
            ))}
          </Section>
        ))}

        <Modal visible={pending != null} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                borderRadius: 12,
                padding: 20,
                gap: 16,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700' }}>Confirm</Text>
              <Text muted>
                {typeof pending?.confirm === 'string'
                  ? pending.confirm
                  : `Run "${pending?.label}"?`}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 16,
                }}
              >
                <Pressable onPress={() => setPending(null)}>
                  <Text>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (pending) void run(pending);
                  }}
                >
                  <Text
                    style={{ color: theme.colors.danger, fontWeight: '700' }}
                  >
                    Confirm
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </Page>
    );
  }

  return {
    id: options.id ?? 'actions',
    title: options.title ?? 'Actions',
    section: options.section ?? 'Controls',
    order: options.order ?? 60,
    component: ActionsPage,
  };
}
