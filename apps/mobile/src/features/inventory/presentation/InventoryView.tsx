import type {Inventory, InventoryItem, InventoryItemCode} from '@aqualino/contracts';
import {tokens} from '@aqualino/design-tokens';
import React from 'react';
import {ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../../../shared/components/PrimaryButton';
import {Screen} from '../../../shared/components/Screen';

interface Props {
  inventory?: Inventory;
  loading: boolean;
  refreshing?: boolean;
  error?: string;
  actionFeedback?: {kind: 'success' | 'error'; message: string};
  actionInProgress?: boolean;
  onRetry: () => void;
  onActivateFreeze: () => void;
  onReleaseFreeze: (effectId: string) => void;
  onReviveStreak: () => void;
}

const itemContent: Record<InventoryItemCode, {icon: string; name: string; description: string}> = {
  streak_freeze: {
    icon: '❄️',
    name: 'Congelamento de streak',
    description: 'Protege a próxima falta elegível depois de ativado.',
  },
  streak_revive: {
    icon: '🧪',
    name: 'Poção de reacender',
    description: 'Recupera a quebra mais recente dentro da janela permitida.',
  },
};

export function InventoryView(props: Props): React.JSX.Element {
  if (props.loading && !props.inventory) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Carregando inventário" size="large" />
      </View>
    );
  }

  if (props.error && !props.inventory) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>{props.error}</Text>
        <PrimaryButton label="Tentar novamente" onPress={props.onRetry} />
      </View>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={Boolean(props.refreshing)} onRefresh={props.onRetry} />}>
      <View style={styles.intro}>
        <Text style={styles.title}>Seu inventário</Text>
        <Text style={styles.subtitle}>As poções são pessoais e não podem ser usadas durante desafios de grupo.</Text>
      </View>

      {props.inventory?.usage.blocked_by_group_challenge ? (
        <View accessibilityRole="alert" style={styles.blockedNotice}>
          <Text style={styles.blockedTitle}>Poções guardadas durante a batalha</Text>
          <Text style={styles.blockedText}>Seu saldo continua seguro e volta a ficar utilizável quando o desafio de grupo terminar.</Text>
        </View>
      ) : null}

      {props.actionFeedback ? (
        <Text
          accessibilityRole="alert"
          style={props.actionFeedback.kind === 'error' ? styles.feedbackError : styles.feedbackSuccess}>
          {props.actionFeedback.message}
        </Text>
      ) : null}

      <View style={styles.items}>
        {props.inventory?.items.map(item => (
          <InventoryItemCard
            actionInProgress={Boolean(props.actionInProgress)}
            blocked={props.inventory?.usage.blocked_by_group_challenge ?? false}
            freezeState={props.inventory?.usage.hydration_freeze}
            item={item}
            key={item.code}
            onActivateFreeze={props.onActivateFreeze}
            onReleaseFreeze={props.onReleaseFreeze}
            onReviveStreak={props.onReviveStreak}
          />
        ))}
      </View>
    </Screen>
  );
}

interface ItemCardProps {
  item: InventoryItem;
  freezeState?: Inventory['usage']['hydration_freeze'];
  blocked: boolean;
  actionInProgress: boolean;
  onActivateFreeze: () => void;
  onReleaseFreeze: (effectId: string) => void;
  onReviveStreak: () => void;
}

function InventoryItemCard(props: ItemCardProps): React.JSX.Element {
  const {item} = props;
  const content = itemContent[item.code];

  return (
    <View accessibilityLabel={`${content.name}: ${item.available_quantity} disponível`} style={styles.card}>
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}>{content.icon}</Text>
      <View style={styles.cardContent}>
        <Text style={styles.itemName}>{content.name}</Text>
        <Text style={styles.description}>{content.description}</Text>
        {item.reserved_quantity > 0 ? (
          <Text style={styles.reserved}>{item.reserved_quantity} reservada(s)</Text>
        ) : null}
      </View>
      <View style={styles.quantity}>
        <Text style={styles.quantityValue}>{item.available_quantity}</Text>
        <Text style={styles.quantityLabel}>disponível</Text>
      </View>
      <View style={styles.action}>
        {item.code === 'streak_freeze' && props.freezeState ? (
          <>
            <Text style={styles.activeState}>
              {props.freezeState.status === 'suspended' ? 'Suspensa durante a batalha' : 'Proteção ativa'}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={props.actionInProgress}
              onPress={() => props.onReleaseFreeze(props.freezeState?.id ?? '')}
              style={({pressed}) => [styles.secondaryButton, pressed && styles.secondaryPressed]}>
              <Text style={styles.secondaryLabel}>Cancelar proteção</Text>
            </Pressable>
          </>
        ) : (
          <PrimaryButton
            disabled={props.blocked || item.available_quantity < 1}
            label={item.code === 'streak_freeze' ? 'Ativar proteção' : 'Reacender streak'}
            loading={props.actionInProgress}
            onPress={item.code === 'streak_freeze' ? props.onActivateFreeze : props.onReviveStreak}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24},
  error: {color: tokens.color.danger, textAlign: 'center'},
  intro: {gap: tokens.spacing.xs},
  title: {fontSize: tokens.fontSize.xl, fontWeight: '800', color: tokens.color.text},
  subtitle: {fontSize: tokens.fontSize.md, color: tokens.color.textMuted, lineHeight: 22},
  items: {gap: tokens.spacing.md},
  card: {
    minHeight: 132,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
  },
  icon: {fontSize: 36},
  cardContent: {flex: 1, gap: 4},
  itemName: {fontSize: tokens.fontSize.lg, fontWeight: '800', color: tokens.color.text},
  description: {color: tokens.color.textMuted, lineHeight: 20},
  reserved: {color: tokens.color.primaryStrong, fontWeight: '700'},
  quantity: {alignItems: 'center', minWidth: 64},
  quantityValue: {fontSize: tokens.fontSize.xl, fontWeight: '900', color: tokens.color.primaryStrong},
  quantityLabel: {fontSize: tokens.fontSize.sm, color: tokens.color.textMuted},
  action: {width: '100%', gap: tokens.spacing.xs},
  activeState: {color: tokens.color.primaryStrong, fontWeight: '800', textAlign: 'center'},
  secondaryButton: {
    minHeight: 48,
    borderWidth: 2,
    borderColor: tokens.color.primary,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPressed: {opacity: 0.7},
  secondaryLabel: {color: tokens.color.primaryStrong, fontWeight: '800'},
  blockedNotice: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.surface,
    gap: tokens.spacing.xs,
  },
  blockedTitle: {color: tokens.color.warning, fontWeight: '800'},
  blockedText: {color: tokens.color.textMuted, lineHeight: 20},
  feedbackSuccess: {color: tokens.color.success, fontWeight: '700'},
  feedbackError: {color: tokens.color.danger, fontWeight: '700'},
});
