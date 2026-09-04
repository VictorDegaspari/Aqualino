import React, {useCallback} from 'react';
import {Alert} from 'react-native';
import {useSessionStore} from '../../auth/application/sessionStore';
import {GroupsView} from './GroupsView';

export function GroupsScreen(): React.JSX.Element {
  const user = useSessionStore(state => state.user);

  const showPendingIntegration = useCallback((action: 'criar' | 'entrar em') => {
    Alert.alert(
      'Recurso em preparação',
      `A opção de ${action} um grupo será liberada assim que o serviço seguro de convites estiver disponível.`,
    );
  }, []);
  const createGroup = useCallback(() => showPendingIntegration('criar'), [showPendingIntegration]);
  const joinGroup = useCallback(() => showPendingIntegration('entrar em'), [showPendingIntegration]);

  return (
    <GroupsView
      displayName={user?.profile.display_name ?? 'Você'}
      avatarId={user?.profile.avatar_url}
      onCreateGroup={createGroup}
      onJoinGroup={joinGroup}
    />
  );
}
