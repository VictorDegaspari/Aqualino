import React, {useCallback, useState} from 'react';
import {useInventory} from './useInventory';
import {useInventoryActions} from './useInventoryActions';
import {InventoryView} from './InventoryView';

export function InventoryScreen(): React.JSX.Element {
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
    <InventoryView
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
  );
}
