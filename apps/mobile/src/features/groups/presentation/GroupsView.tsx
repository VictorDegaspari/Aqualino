import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getAvatarSource} from '../../../shared/avatars/avatarOptions';
import {AqualinoIcon, type AqualinoIconName} from '../../../shared/components/AqualinoIcon';
import {TabScreenHeader} from '../../../shared/components/TabScreenHeader';
import {haptics} from '../../../shared/device/haptics';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

interface Props {
  displayName: string;
  avatarId?: string | null;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export function GroupsView({displayName, avatarId, onCreateGroup, onJoinGroup}: Props): React.JSX.Element {
  const runAction = (action: () => void) => {
    haptics.selection();
    action();
  };

  return (
    <View style={styles.page}>
      <Image
        pointerEvents="none"
        source={require('../../../assets/challenge/static/ocean-background.webp')}
        resizeMode="cover"
        style={styles.background}
      />
      <View pointerEvents="none" style={styles.backgroundOverlay} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TabScreenHeader
            title="Grupos"
            subtitle="Crie uma maré de constância com quem você gosta."
            icon={<AqualinoIcon name="group" size={34} color={challengeTheme.colors.cyanStrong} />}
          />

          <View style={styles.invitationCard}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusLabel}>NENHUM GRUPO ATIVO</Text>
            </View>

            <Text style={styles.cardTitle}>Sua equipe começa aqui</Text>
            <Text style={styles.cardDescription}>
              Convide até quatro amigos e acompanhem juntos um desafio privado de sete dias.
            </Text>

            <View accessibilityLabel={`${displayName} e quatro vagas disponíveis`} style={styles.membersPreview}>
              <View style={styles.memberPreview}>
                <View style={styles.avatarRing}>
                  <Image source={getAvatarSource(avatarId)} resizeMethod="resize" resizeMode="cover" style={styles.avatar} />
                </View>
                <Text numberOfLines={1} style={styles.memberName}>{displayName}</Text>
              </View>
              {Array.from({length: 4}, (_, index) => (
                <View key={index} style={styles.memberPreview}>
                  <View style={styles.openSlot}>
                    <AqualinoIcon name="plus" size={17} color={challengeTheme.colors.cyanStrong} />
                  </View>
                  <Text style={styles.openSlotLabel}>Vaga</Text>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => runAction(onCreateGroup)}
              style={({pressed}) => [styles.primaryButton, pressed && styles.buttonPressed]}>
              <AqualinoIcon name="plus" size={20} color={challengeTheme.colors.backgroundDeep} />
              <Text style={styles.primaryButtonLabel}>Criar grupo</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => runAction(onJoinGroup)}
              style={({pressed}) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <AqualinoIcon name="group" size={20} color={challengeTheme.colors.cyanStrong} />
              <Text style={styles.secondaryButtonLabel}>Entrar com código</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Como funciona</Text>
            <View style={styles.facts}>
              <Fact icon="group" value="2–5" label="pessoas" />
              <Fact icon="history" value="7" label="dias" />
              <Fact icon="star" value="700" label="pontos" />
            </View>
            <View style={styles.steps}>
              <Step number="1" title="Forme sua equipe" description="Crie um grupo ou aceite um convite privado." />
              <Step number="2" title="Bebam no próprio ritmo" description="Cada pessoa mantém sua meta diária individual." />
              <Step number="3" title="Subam no placar" description="Cada dia vale até 100 pontos durante o desafio." last />
            </View>
          </View>

          <View style={styles.privacyCard}>
            <View style={styles.privacyIcon}>
              <AqualinoIcon name="lock" size={21} color={challengeTheme.colors.cyanStrong} />
            </View>
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Privado por padrão</Text>
              <Text style={styles.privacyText}>Somente integrantes aceitos podem ver o progresso e o placar do grupo.</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Fact({icon, value, label}: {icon: AqualinoIconName; value: string; label: string}): React.JSX.Element {
  return (
    <View style={styles.fact}>
      <AqualinoIcon name={icon} size={23} color={challengeTheme.colors.cyanStrong} />
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

function Step({number, title, description, last = false}: {number: string; title: string; description: string; last?: boolean}): React.JSX.Element {
  return (
    <View style={styles.step}>
      <View style={styles.stepRail}>
        <View style={styles.stepNumber}><Text style={styles.stepNumberLabel}>{number}</Text></View>
        {!last ? <View style={styles.stepLine} /> : null}
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.62},
  backgroundOverlay: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 13, 32, 0.64)'},
  safeArea: {flex: 1},
  content: {paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30, gap: 18},
  invitationCard: {
    alignItems: 'center', padding: 20, borderRadius: challengeTheme.radius.panel,
    borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panel,
    shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: {width: 0, height: 8}, elevation: 7,
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: challengeTheme.radius.pill, backgroundColor: 'rgba(51, 243, 250, 0.08)',
    borderWidth: 1, borderColor: 'rgba(51, 243, 250, 0.25)',
  },
  statusDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: challengeTheme.colors.muted},
  statusLabel: {fontSize: 10, lineHeight: 13, letterSpacing: 0.7, fontWeight: '900', color: challengeTheme.colors.muted},
  cardTitle: {marginTop: 13, fontSize: 22, lineHeight: 28, fontWeight: '900', color: challengeTheme.colors.text, textAlign: 'center'},
  cardDescription: {marginTop: 5, maxWidth: 300, fontSize: 14, lineHeight: 20, color: challengeTheme.colors.muted, textAlign: 'center'},
  membersPreview: {width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 18},
  memberPreview: {flex: 1, minWidth: 0, alignItems: 'center', gap: 5},
  avatarRing: {
    width: 52, height: 52, borderRadius: 26, padding: 3, overflow: 'hidden',
    borderWidth: 2, borderColor: challengeTheme.colors.cyanStrong, backgroundColor: challengeTheme.colors.cyanStrong,
  },
  avatar: {width: '100%', height: '100%', borderRadius: 23},
  memberName: {maxWidth: 58, fontSize: 9, lineHeight: 12, fontWeight: '800', color: challengeTheme.colors.text},
  openSlot: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: challengeTheme.colors.borderStrong, backgroundColor: 'rgba(15, 60, 91, 0.55)',
  },
  openSlotLabel: {fontSize: 9, lineHeight: 12, fontWeight: '700', color: challengeTheme.colors.muted},
  primaryButton: {
    width: '100%', minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: challengeTheme.radius.pill, backgroundColor: challengeTheme.colors.cyanStrong,
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.46, shadowRadius: 11, shadowOffset: {width: 0, height: 4}, elevation: 6,
  },
  primaryButtonLabel: {fontSize: 16, lineHeight: 21, fontWeight: '900', color: challengeTheme.colors.backgroundDeep},
  secondaryButton: {
    width: '100%', minHeight: 50, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: challengeTheme.radius.pill, borderWidth: 1.5, borderColor: challengeTheme.colors.cyanStrong, backgroundColor: 'rgba(11, 225, 236, 0.06)',
  },
  secondaryButtonLabel: {fontSize: 15, lineHeight: 20, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  buttonPressed: {opacity: 0.82, transform: [{scale: 0.985}]},
  section: {
    padding: 18, borderRadius: challengeTheme.radius.panel, borderWidth: 1,
    borderColor: challengeTheme.colors.border, backgroundColor: 'rgba(0, 22, 49, 0.88)',
  },
  sectionTitle: {fontSize: 19, lineHeight: 25, fontWeight: '900', color: challengeTheme.colors.text},
  facts: {flexDirection: 'row', gap: 9, marginTop: 14},
  fact: {
    flex: 1, minHeight: 94, alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 16,
    borderWidth: 1, borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.panelSoft,
  },
  factValue: {marginTop: 5, fontSize: 20, lineHeight: 25, fontWeight: '900', color: challengeTheme.colors.text},
  factLabel: {fontSize: 10, lineHeight: 13, fontWeight: '700', color: challengeTheme.colors.muted},
  steps: {marginTop: 18},
  step: {minHeight: 68, flexDirection: 'row', gap: 12},
  stepRail: {width: 28, alignItems: 'center'},
  stepNumber: {width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: challengeTheme.colors.cyanStrong},
  stepNumberLabel: {fontSize: 13, lineHeight: 17, fontWeight: '900', color: challengeTheme.colors.backgroundDeep},
  stepLine: {flex: 1, width: 2, marginVertical: 4, backgroundColor: challengeTheme.colors.borderStrong},
  stepContent: {flex: 1, paddingBottom: 15},
  stepTitle: {fontSize: 14, lineHeight: 19, fontWeight: '900', color: challengeTheme.colors.text},
  stepDescription: {marginTop: 2, fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
  privacyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(51, 243, 250, 0.25)', backgroundColor: 'rgba(6, 45, 76, 0.84)',
  },
  privacyIcon: {width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(51, 243, 250, 0.1)'},
  privacyContent: {flex: 1},
  privacyTitle: {fontSize: 14, lineHeight: 19, fontWeight: '900', color: challengeTheme.colors.text},
  privacyText: {marginTop: 2, fontSize: 11, lineHeight: 16, color: challengeTheme.colors.muted},
});
