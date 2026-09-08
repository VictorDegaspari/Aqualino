import React, {useEffect, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {AppDialog} from '../../../shared/components/AppDialog';
import {hydrationService} from '../application/hydrationService';
import {useSyncStatusStore} from '../application/syncStatusStore';

export function LegacyHydrationRecovery({userId, displayName, enabled}: {userId: string; displayName: string; enabled: boolean}): React.JSX.Element | null {
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const client = useQueryClient();
  const setPending = useSyncStatusStore(state => state.setPending);
  useEffect(() => {
    if (!enabled || dismissed) return;
    let active = true;
    hydrationService.legacyPendingCount().then(value => {if (active) setCount(value);}).catch(() => undefined);
    return () => {active = false;};
  }, [enabled, dismissed]);
  if (!enabled || dismissed || count === 0) return null;
  return <AppDialog title="Recuperar marcações antigas" icon="history"
    message={`Há ${count} marcação(ões) não sincronizada(s) de uma versão anterior neste aparelho. Elas ainda não identificam a conta. Vincule apenas se pertencerem ao perfil ${displayName}. O reenvio preserva as datas e está sujeito às regras atuais de registro.`}
    confirmLabel={`Vincular a ${displayName}`} cancelLabel="Agora não"
    onClose={() => setDismissed(true)}
    onConfirm={async () => {
      await hydrationService.recoverLegacy(userId);
      await hydrationService.flush();
      setPending(await hydrationService.pendingCount());
      await client.invalidateQueries({queryKey: ['hydration']});
      client.invalidateQueries({queryKey: ['groups']});
    }} />;
}
