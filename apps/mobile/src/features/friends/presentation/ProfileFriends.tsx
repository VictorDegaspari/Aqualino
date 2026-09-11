import React, {useEffect} from 'react';
import {Text, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {useTranslation} from '../../../shared/i18n/useTranslation';
import {useSessionStore} from '../../auth/application/sessionStore';
import {useFriendships} from './useFriendships';
import {friendshipStyles as styles} from './friendshipStyles';

export function ProfileFriends({onOpen, onAdd}: {onOpen: () => void; onAdd: () => void}): React.JSX.Element {
  const {t} = useTranslation();
  const userId = useSessionStore(state => state.user?.id);
  const {list} = useFriendships('');
  const focused = useIsFocused();
  const {refetch} = list;
  useEffect(() => {if (focused && userId) {refetch();}}, [focused, userId, refetch]);
  const count = list.data?.friends.length;
  return <View style={styles.panel}>
    <View style={styles.actions}>
      <RaisedButton
        testID="profile-friends"
        accessibilityLabel={count === undefined ? t('Ver amigos', 'View friends', 'Ver amigos') : `${count} ${t('amigos', 'friends', 'amigos')}`}
        onPress={onOpen}
        label={`${count ?? '—'} ${t('amigos', 'friends', 'amigos')}`}
        variant="outlined"
        tone="neutral"
      />
      <RaisedButton tone="aqua" testID="profile-add-friends" label={t('Adicionar amigos', 'Add friends', 'Añadir amigos')} onPress={onAdd} />
    </View>
    {list.isError ? <Text accessibilityRole="alert" style={styles.error}>{t('Não foi possível atualizar seus amigos.', 'Could not refresh your friends.', 'No se pudieron actualizar tus amigos.')}</Text> : null}
  </View>;
}
