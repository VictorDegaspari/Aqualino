import React, {useCallback, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {SwipeBackScreen} from '../../../shared/components/SwipeBackScreen';
import {useInventory} from './useInventory';
import {useInventoryActions} from './useInventoryActions';
import {InventoryView} from './InventoryView';
import {useSessionStore} from '../../auth/application/sessionStore';
import {useHomePreferencesStore} from '../../home/application/homePreferencesStore';
import {defaultHomeThemeId, type HomeThemeId} from '../../home/domain/homeThemes';

export function InventoryScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const onBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Home');
  }, [navigation]);
  const userId = useSessionStore(state => state.user?.id);
  const selectedThemeId = useHomePreferencesStore(state => userId ? state.themesByUser[userId] ?? defaultHomeThemeId : defaultHomeThemeId);
  const selectTheme = useHomePreferencesStore(state => state.selectTheme);
  const applyTheme = useCallback((themeId: HomeThemeId) => {
    if (!userId) throw new Error('Entre na sua conta para aplicar um tema.');
    selectTheme(userId, themeId);
  }, [selectTheme, userId]);
  const query = useInventory();
  const actions = useInventoryActions();
  const activateFreezeMutation = actions.activateFreeze.mutateAsync;
  const releaseFreezeMutation = actions.releaseFreeze.mutateAsync;
  const reviveStreakMutation = actions.reviveStreak.mutateAsync;
  const [feedback, setFeedback] = useState<{kind: 'success' | 'error'; message: string}>();

  const perform = useCallback(async (action: () => Promise<unknown>, successMessage: string) => {
    setFeedback(undefined);

    try {
      await action();
      setFeedback({kind: 'success', message: successMessage});
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível concluir a ação.',
      });
    }
  }, []);
  const activateFreeze = useCallback(() => perform(
    () => activateFreezeMutation(),
    'Congelamento ativado para sua sequência de hidratação.',
  ), [activateFreezeMutation, perform]);
  const releaseFreeze = useCallback((effectId: string) => perform(
    () => releaseFreezeMutation(effectId),
    'Congelamento devolvido ao inventário.',
  ), [perform, releaseFreezeMutation]);
  const reviveStreak = useCallback(() => perform(
    () => reviveStreakMutation(),
    'Sua quebra mais recente foi recuperada.',
  ), [perform, reviveStreakMutation]);

  return (
    <SwipeBackScreen testID="inventory" key={userId ?? 'guest'} onBack={onBack}>{close => (
      <InventoryView
        onBack={close}
        selectedThemeId={selectedThemeId}
        onSelectTheme={applyTheme}
        inventory={query.data}
        loading={query.isLoading}
        refreshing={query.isFetching}
        error={query.error instanceof Error ? query.error.message : undefined}
        actionFeedback={feedback}
        actionInProgress={actions.actionInProgress}
        onRetry={query.refetch}
        onActivateFreeze={activateFreeze}
        onReleaseFreeze={releaseFreeze}
        onReviveStreak={reviveStreak}
      />
    )}</SwipeBackScreen>
  );
}
