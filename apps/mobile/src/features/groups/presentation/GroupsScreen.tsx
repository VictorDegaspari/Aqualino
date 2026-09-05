import React, {useState} from 'react';
import {Share} from 'react-native';
import {useSessionStore} from '../../auth/application/sessionStore';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {GroupsView} from './GroupsView';
import {groupsCopy} from './groupsCopy';
import {useGroups} from './useGroups';
import {AppDialog} from '../../../shared/components/AppDialog';

export function GroupsScreen(): React.JSX.Element {
  const user = useSessionStore(state => state.user);
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const copy = groupsCopy[locale];
  const groups = useGroups(user?.id, copy);
  const [shareError, setShareError] = useState(false);
  const [confirmation, setConfirmation] = useState<'renew' | 'leave' | null>(null);

  const share = async () => {
    const group = groups.group;
    if (!group?.invite || Date.parse(group.invite.expires_at) <= Date.now()) return;
    setShareError(false);
    try {
      await Share.share({message: copy.shareMessage(group.name, group.invite.code)});
    } catch {
      setShareError(true);
    }
  };
  const renew = () => {groups.clearError(); setConfirmation('renew');};
  const leave = () => {groups.clearError(); setConfirmation('leave');};

  return (
    <>
      <GroupsView
        displayName={user?.profile.display_name ?? copy.you} avatarId={user?.profile.avatar_url}
        userId={user?.id} locale={locale} group={groups.group}
        loading={groups.loading} refreshing={groups.refreshing} busy={groups.busy}
        loadError={groups.loadError} error={shareError ? copy.actionError : groups.error}
        onRefresh={groups.refresh} onClearError={() => {groups.clearError(); setShareError(false);}}
        onCreateGroup={groups.create} onPreviewInvite={groups.preview} onJoinGroup={groups.accept}
        onShare={share} onRenewInvite={renew} onLeave={leave}
      />
      {confirmation ? <AppDialog
        title={confirmation === 'renew' ? copy.renewTitle : copy.leaveTitle}
        message={confirmation === 'renew' ? copy.renewDescription : groups.group?.owner_id === user?.id ? copy.ownerLeaveDescription : copy.leaveDescription}
        icon={confirmation === 'renew' ? 'group' : 'logout'}
        confirmLabel={confirmation === 'renew' ? copy.renew : copy.leave}
        cancelLabel={copy.cancel}
        destructive={confirmation === 'leave'}
        error={groups.error}
        onConfirm={confirmation === 'renew' ? groups.renewInvite : groups.leave}
        onClose={() => setConfirmation(null)}
      /> : null}
    </>
  );
}
