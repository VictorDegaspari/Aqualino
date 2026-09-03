import React from 'react';
import {useState} from 'react';
import {InventoryView} from './InventoryView';
import {useInventory} from './useInventory';
import {useInventoryActions} from './useInventoryActions';

export function InventoryScreen(): React.JSX.Element {
  const query = useInventory();
  const actions = useInventoryActions();
  const [feedback, setFeedback] = useState<{kind: 'success' | 'error'; message: string}>();

  const perform = async (action: () => Promise<unknown>, successMessage: string) => {
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
  };

  return (
    <InventoryView
      inventory={query.data}
      loading={query.isLoading}
      refreshing={query.isFetching}
      error={query.error instanceof Error ? query.error.message : undefined}
      actionFeedback={feedback}
      actionInProgress={actions.actionInProgress}
      onRetry={query.refetch}
      onActivateFreeze={() => perform(
        () => actions.activateFreeze.mutateAsync(),
        'Congelamento ativado para sua sequência de hidratação.',
      )}
      onReleaseFreeze={effectId => perform(
        () => actions.releaseFreeze.mutateAsync(effectId),
        'Congelamento devolvido ao inventário.',
      )}
      onReviveStreak={() => perform(
        () => actions.reviveStreak.mutateAsync(),
        'Sua quebra mais recente foi recuperada.',
      )}
    />
  );
}
