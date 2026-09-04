import type {Inventory, InventoryItem, InventoryItemCode} from '@aqualino/contracts';
import React from 'react';
import {ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import {SafeAreaView} from 'react-native-safe-area-context';
import {mascotImages} from '../../../assets/mascot/mascotImages';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

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

interface PotionContent {
  name: string;
  description: string;
}

const potionContent: Record<InventoryItemCode, PotionContent> = {
  streak_freeze: {
    name: 'Congelamento de streak',
    description: 'Protege a próxima falta elegível depois de ativado.',
  },
  streak_revive: {
    name: 'Poção de reacender',
    description: 'Recupera a quebra mais recente dentro da janela permitida.',
  },
};

export function InventoryView(props: Props): React.JSX.Element {
  if (props.loading && !props.inventory) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Carregando inventário" color={challengeTheme.colors.cyanStrong} size="large" />
      </View>
    );
  }

  if (props.error && !props.inventory) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>{props.error}</Text>
        <Pressable accessibilityRole="button" onPress={props.onRetry} style={({pressed}) => [styles.retryButton, pressed && styles.buttonPressed]}>
          <Text style={styles.retryLabel}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const itemCount = props.inventory?.items.reduce((sum, item) => sum + item.available_quantity, 0) ?? 0;

  return (
    <View style={styles.page}>
      <Image
        pointerEvents="none"
        source={require('../../../assets/challenge/static/ocean-background.webp')}
        resizeMode="cover"
        style={styles.background}
      />
      <View pointerEvents="none" style={styles.backgroundOverlay} />

      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={Boolean(props.refreshing)} onRefresh={props.onRetry} tintColor={challengeTheme.colors.cyanStrong} />}
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.mascotOrb}>
              <Image source={mascotImages.happy} resizeMode="contain" style={styles.mascot} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>BOLSA DO AQUALINO</Text>
              <Text accessibilityRole="header" style={styles.title}>Inventário</Text>
              <Text style={styles.subtitle}>Guarde poções e mantenha sua sequência protegida.</Text>
            </View>
          </View>

          {props.inventory?.usage.blocked_by_group_challenge ? (
            <View accessibilityRole="alert" style={styles.blockedNotice}>
              <View style={styles.noticeIcon}><AqualinoIcon name="lock" size={18} color={challengeTheme.colors.gold} /></View>
              <View style={styles.noticeContent}>
                <Text style={styles.blockedTitle}>Poções guardadas durante a batalha</Text>
                <Text style={styles.blockedText}>Seu saldo fica seguro e volta a ficar utilizável quando o desafio de grupo terminar.</Text>
              </View>
            </View>
          ) : null}

          {props.actionFeedback ? (
            <View accessibilityRole="alert" style={props.actionFeedback.kind === 'error' ? styles.feedbackError : styles.feedbackSuccess}>
              <AqualinoIcon
                name={props.actionFeedback.kind === 'error' ? 'alert' : 'check'}
                size={17}
                color={props.actionFeedback.kind === 'error' ? challengeTheme.colors.danger : challengeTheme.colors.cyanStrong}
              />
              <Text style={props.actionFeedback.kind === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText}>
                {props.actionFeedback.message}
              </Text>
            </View>
          ) : null}

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Suas poções</Text>
              <Text style={styles.sectionSubtitle}>Use quando precisar de um reforço na jornada.</Text>
            </View>
            <View accessibilityLabel={`${itemCount} poções disponíveis`} style={styles.stockPill}>
              <Text style={styles.stockValue}>{itemCount}</Text>
              <Text style={styles.stockLabel}>{itemCount === 1 ? 'poção' : 'poções'}</Text>
            </View>
          </View>

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

          <View style={styles.storeSection}>
            <View style={styles.storeHeading}>
              <View style={styles.storeHeadingCopy}>
                <Text style={styles.sectionTitle}>Loja de poções</Text>
                <Text style={styles.sectionSubtitle}>Os preços oficiais aparecerão quando a loja for publicada.</Text>
              </View>
              <View style={styles.storeIcon}><AqualinoIcon name="star" size={23} color={challengeTheme.colors.gold} /></View>
            </View>

            <View style={styles.storeCards}>
              {(Object.keys(potionContent) as InventoryItemCode[]).map(code => (
                <StorePotionCard code={code} key={code} />
              ))}
            </View>

            <Text style={styles.storeFootnote}>Compra segura pela App Store ou Google Play.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
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
  const content = potionContent[item.code];
  const hasActiveFreeze = item.code === 'streak_freeze' && Boolean(props.freezeState);
  const actionDisabled = props.blocked || item.available_quantity < 1 || props.actionInProgress;

  return (
    <View accessibilityLabel={`${content.name}: ${item.available_quantity} disponível`} style={[styles.itemCard, hasActiveFreeze && styles.itemCardActive]}>
      <View style={styles.itemTop}>
        <PotionBottleIcon code={item.code} size={58} />
        <View style={styles.itemCopy}>
          <Text style={styles.itemEyebrow}>NO SEU ESTOQUE</Text>
          <Text style={styles.itemName}>{content.name}</Text>
        </View>
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityValue}>{item.available_quantity}</Text>
          <Text style={styles.quantityLabel}>x</Text>
        </View>
      </View>

      <Text style={styles.description}>{content.description}</Text>

      {item.reserved_quantity > 0 ? (
        <View style={styles.reservedPill}>
          <AqualinoIcon name="lock" size={13} color={challengeTheme.colors.cyanStrong} />
          <Text style={styles.reserved}>{item.reserved_quantity} reservada(s) para proteção ativa</Text>
        </View>
      ) : null}

      <View style={styles.action}>
        {hasActiveFreeze ? (
          <>
            <View style={styles.activeRow}>
              <AqualinoIcon name="check" size={16} color={challengeTheme.colors.cyanStrong} />
              <Text style={styles.activeState}>
                {props.freezeState?.status === 'suspended' ? 'Proteção suspensa durante a batalha' : 'Proteção ativa'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{disabled: props.actionInProgress, busy: props.actionInProgress}}
              disabled={props.actionInProgress}
              onPress={() => props.onReleaseFreeze(props.freezeState?.id ?? '')}
              style={({pressed}) => [styles.secondaryButton, pressed && !props.actionInProgress && styles.buttonPressed]}>
              {props.actionInProgress
                ? <ActivityIndicator color={challengeTheme.colors.cyanStrong} />
                : <Text style={styles.secondaryLabel}>Cancelar proteção</Text>}
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{disabled: actionDisabled, busy: props.actionInProgress}}
            disabled={actionDisabled}
            onPress={item.code === 'streak_freeze' ? props.onActivateFreeze : props.onReviveStreak}
            style={({pressed}) => [styles.actionButton, actionDisabled && styles.actionButtonDisabled, pressed && !actionDisabled && styles.buttonPressed]}>
            {props.actionInProgress
              ? <ActivityIndicator color={challengeTheme.colors.backgroundDeep} />
              : <Text style={styles.actionLabel}>{item.code === 'streak_freeze' ? 'Ativar proteção' : 'Reacender streak'}</Text>}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function StorePotionCard({code}: {code: InventoryItemCode}): React.JSX.Element {
  const content = potionContent[code];

  return (
    <View accessibilityLabel={`${content.name}, indisponível`} style={styles.storeCard}>
      <PotionBottleIcon code={code} size={49} />
      <View style={styles.storeCardContent}>
        <Text style={styles.storeItemName}>{content.name}</Text>
        <Text numberOfLines={2} style={styles.storeDescription}>{content.description}</Text>
      </View>
      <View style={styles.unavailableBadge}>
        <AqualinoIcon name="lock" size={13} color={challengeTheme.colors.muted} />
        <Text style={styles.unavailableLabel}>Em breve</Text>
      </View>
    </View>
  );
}

function PotionBottleIcon({code, size}: {code: InventoryItemCode; size: number}): React.JSX.Element {
  const isFreeze = code === 'streak_freeze';
  const fill = isFreeze ? '#25CDED' : '#D765CC';
  const highlight = isFreeze ? '#C4FAFF' : '#FFD1F2';
  const deep = isFreeze ? '#097B9F' : '#813274';

  return (
    <View style={[styles.potionIcon, {width: size, height: size, borderRadius: size / 2}]}>
      <Svg height={size} viewBox="0 0 64 64" width={size}>
        <Circle cx="32" cy="32" fill={isFreeze ? 'rgba(11, 225, 236, 0.16)' : 'rgba(215, 101, 204, 0.17)'} r="30" />
        <Rect fill={deep} height="11" rx="3" width="18" x="23" y="11" />
        <Path d="M25 20h14v8c0 3 10 8 10 17 0 8-7 12-17 12S15 53 15 45c0-9 10-14 10-17v-8Z" fill={fill} stroke={highlight} strokeWidth="2" />
        <Path d="M21 42c4-5 17-6 24-1 0 7-5 11-13 11-7 0-11-3-11-10Z" fill={deep} opacity="0.35" />
        {isFreeze ? (
          <Path d="M32 31v15M25.5 34.7l13 7.6M38.5 34.7l-13 7.6M32 29.5l-2.8 3.2M32 29.5l2.8 3.2M32 47.5l-2.8-3.2M32 47.5l2.8-3.2" fill="none" stroke="#F1FEFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
        ) : (
          <Path d="M32 31c3 4 6 6 6 10a6 6 0 1 1-12 0c0-3 2-6 6-10Zm0 5c-1 2-2 3-2 5a2 2 0 0 0 4 0c0-2-1-3-2-5Z" fill="#FFF4FC" />
        )}
        <Circle cx="26" cy="28" fill="#FFFFFF" opacity="0.58" r="2" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.65},
  backgroundOverlay: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 13, 32, 0.64)'},
  safeArea: {flex: 1},
  content: {paddingHorizontal: 20, paddingTop: 22, paddingBottom: 35, gap: 19},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, backgroundColor: challengeTheme.colors.background},
  error: {maxWidth: 300, color: challengeTheme.colors.danger, textAlign: 'center', fontSize: 15, lineHeight: 21},
  retryButton: {minHeight: 50, justifyContent: 'center', paddingHorizontal: 22, borderRadius: challengeTheme.radius.pill, backgroundColor: challengeTheme.colors.cyanStrong},
  retryLabel: {color: challengeTheme.colors.backgroundDeep, fontSize: 15, fontWeight: '900'},
  hero: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 2},
  mascotOrb: {width: 79, height: 79, borderRadius: 40, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(126, 246, 255, 0.66)', backgroundColor: 'rgba(4, 99, 143, 0.53)', shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: {width: 0, height: 3}, elevation: 8},
  mascot: {width: 80, height: 70},
  heroCopy: {flex: 1, gap: 2},
  eyebrow: {fontSize: 10, lineHeight: 14, letterSpacing: 1.05, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  title: {fontSize: 30, lineHeight: 37, fontWeight: '900', color: challengeTheme.colors.text},
  subtitle: {fontSize: 13, lineHeight: 18, color: '#C1E5F8'},
  blockedNotice: {flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 191, 35, 0.42)', backgroundColor: 'rgba(77, 52, 4, 0.54)'},
  noticeIcon: {width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(255, 191, 35, 0.12)'},
  noticeContent: {flex: 1, gap: 2},
  blockedTitle: {color: '#FFE4A5', fontSize: 14, lineHeight: 19, fontWeight: '900'},
  blockedText: {color: '#E8D8AD', fontSize: 12, lineHeight: 17},
  feedbackSuccess: {flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(11, 225, 236, 0.34)', backgroundColor: 'rgba(11, 225, 236, 0.1)'},
  feedbackError: {flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 148, 164, 0.36)', backgroundColor: 'rgba(137, 29, 53, 0.28)'},
  feedbackSuccessText: {flex: 1, color: '#BDF7FA', fontSize: 13, lineHeight: 18, fontWeight: '700'},
  feedbackErrorText: {flex: 1, color: '#FFD1D9', fontSize: 13, lineHeight: 18, fontWeight: '700'},
  sectionHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 2},
  sectionTitle: {color: challengeTheme.colors.text, fontSize: 21, lineHeight: 27, fontWeight: '900'},
  sectionSubtitle: {marginTop: 2, color: challengeTheme.colors.muted, fontSize: 13, lineHeight: 18},
  stockPill: {minWidth: 67, alignItems: 'center', paddingHorizontal: 11, paddingVertical: 8, borderRadius: challengeTheme.radius.pill, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: 'rgba(11, 225, 236, 0.11)'},
  stockValue: {color: challengeTheme.colors.cyanStrong, fontSize: 18, lineHeight: 21, fontWeight: '900'},
  stockLabel: {color: '#B9EAF0', fontSize: 10, lineHeight: 12, fontWeight: '700'},
  items: {gap: 12},
  itemCard: {gap: 13, padding: 16, borderRadius: challengeTheme.radius.panel, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panel},
  itemCardActive: {borderColor: 'rgba(51, 243, 250, 0.78)', shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.25, shadowRadius: 13, shadowOffset: {width: 0, height: 2}, elevation: 5},
  itemTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  potionIcon: {alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(151, 245, 252, 0.2)'},
  itemCopy: {flex: 1, gap: 1},
  itemEyebrow: {color: challengeTheme.colors.cyanStrong, fontSize: 9, lineHeight: 13, letterSpacing: 0.9, fontWeight: '900'},
  itemName: {color: challengeTheme.colors.text, fontSize: 17, lineHeight: 22, fontWeight: '900'},
  quantityBadge: {minWidth: 43, minHeight: 43, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, borderRadius: 14, backgroundColor: 'rgba(11, 225, 236, 0.13)', borderWidth: 1, borderColor: 'rgba(51, 243, 250, 0.3)'},
  quantityValue: {color: challengeTheme.colors.cyanStrong, fontSize: 20, lineHeight: 22, fontWeight: '900'},
  quantityLabel: {marginTop: -2, color: '#BAEFF4', fontSize: 11, lineHeight: 12, fontWeight: '900'},
  description: {color: '#C0D9E9', fontSize: 13, lineHeight: 19},
  reservedPill: {flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: challengeTheme.radius.pill, backgroundColor: 'rgba(11, 225, 236, 0.1)'},
  reserved: {color: '#AEEBF0', fontSize: 11, lineHeight: 15, fontWeight: '700'},
  action: {gap: 8, marginTop: 1},
  activeRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 22},
  activeState: {color: challengeTheme.colors.cyanStrong, fontSize: 12, lineHeight: 17, fontWeight: '900'},
  actionButton: {minHeight: 47, alignItems: 'center', justifyContent: 'center', borderRadius: challengeTheme.radius.pill, backgroundColor: challengeTheme.colors.cyanStrong, shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.26, shadowRadius: 8, shadowOffset: {width: 0, height: 3}, elevation: 4},
  actionButtonDisabled: {opacity: 0.38, shadowOpacity: 0},
  actionLabel: {color: challengeTheme.colors.backgroundDeep, fontSize: 14, lineHeight: 19, fontWeight: '900'},
  secondaryButton: {minHeight: 45, alignItems: 'center', justifyContent: 'center', borderRadius: challengeTheme.radius.pill, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: 'rgba(0, 28, 60, 0.68)'},
  secondaryLabel: {color: challengeTheme.colors.cyanStrong, fontSize: 13, lineHeight: 18, fontWeight: '900'},
  storeSection: {gap: 13, marginTop: 8, padding: 17, borderRadius: challengeTheme.radius.panel, borderWidth: 1, borderColor: 'rgba(27, 102, 143, 0.82)', backgroundColor: 'rgba(0, 20, 45, 0.91)'},
  storeHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  storeHeadingCopy: {flex: 1},
  storeIcon: {width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(255, 191, 35, 0.11)', borderWidth: 1, borderColor: 'rgba(255, 191, 35, 0.34)'},
  storeCards: {gap: 9},
  storeCard: {minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 16, borderWidth: 1, borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.panelSoft},
  storeCardContent: {flex: 1, gap: 2},
  storeItemName: {color: challengeTheme.colors.text, fontSize: 14, lineHeight: 19, fontWeight: '900'},
  storeDescription: {color: challengeTheme.colors.muted, fontSize: 11, lineHeight: 15},
  unavailableBadge: {flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: challengeTheme.radius.pill, backgroundColor: 'rgba(141, 171, 200, 0.12)', borderWidth: 1, borderColor: 'rgba(141, 171, 200, 0.22)'},
  unavailableLabel: {color: '#B7CCDB', fontSize: 11, lineHeight: 15, fontWeight: '900'},
  storeFootnote: {color: '#91B9D0', fontSize: 11, lineHeight: 16, textAlign: 'center'},
  buttonPressed: {opacity: 0.82, transform: [{scale: 0.985}]},
});
