import React, {useState, useCallback} from 'react';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {SwipeBackScreen} from '../../../shared/components/SwipeBackScreen';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {PersonSummary} from '@aqualino/contracts';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {useTranslation} from '../../../shared/i18n/useTranslation';
import {UserAvatar} from '../../../shared/avatars/UserAvatar';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useFriendshipActions, useFriendships} from './useFriendships';
import {FriendshipButtons} from './FriendshipButtons';
import {friendshipStyles as styles} from './friendshipStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'Friends'> | NativeStackScreenProps<RootStackParamList, 'AddFriends'>;
export function FriendsScreen({navigation, route}: Props): React.JSX.Element {
  const adding = route.name === 'AddFriends';
  const focused = useIsFocused();
  const onBack = useCallback(() => navigation.goBack(), [navigation]);
  const {t} = useTranslation();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [invalidSearch, setInvalidSearch] = useState(false);
  const {list, people} = useFriendships(search);
  const actions = useFriendshipActions();
  const find = () => {
    const value = input.trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(value)) {setInvalidSearch(true); return;}
    setInvalidSearch(false);
    if (value === search) people.refetch();
    setSearch(value);
  };
  const renderPerson = (person: PersonSummary) => <View key={person.id} style={styles.panel}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${t('Ver perfil de', 'View profile of', 'Ver perfil de')} ${person.display_name}`} onPress={() => navigation.navigate('PersonProfile', {userId: person.id})} style={styles.person}>
      <UserAvatar avatarId={person.avatar_url} style={styles.avatar} />
      <View style={styles.identity}><Text style={styles.name}>{person.display_name}</Text><Text style={styles.muted}>@{person.username} · {t('Nível', 'Level', 'Nivel')} {person.level}</Text></View>
      <Text style={styles.muted}>›</Text>
    </Pressable>
    {person.relationship !== 'friends' ? <FriendshipButtons status={person.relationship} busy={actions.isPending} onAction={action => actions.mutate({personId: person.id, action})} /> : null}
  </View>;
  const failure = t('Não foi possível carregar. Tente novamente.', 'Could not load. Please try again.', 'No se pudo cargar. Inténtalo de nuevo.');
  return <SwipeBackScreen testID={adding ? "add-friends" : "friends"} active={focused} onBack={onBack}>{close => <SafeAreaView style={styles.page}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel={t('Voltar', 'Back', 'Volver')} testID={adding ? "add-friends-back" : "friends-back"} onPress={close} style={styles.back}><Text style={styles.backLabel}>‹</Text></Pressable><Text accessibilityRole="header" style={styles.title}>{adding ? t('Adicionar amigos', 'Add friends', 'Añadir amigos') : t('Amigos', 'Friends', 'Amigos')}</Text></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} refreshControl={<RefreshControl tintColor={challengeTheme.colors.cyanStrong} refreshing={adding ? Boolean(search) && people.isRefetching : list.isRefetching} onRefresh={() => {if (adding) {if (search) people.refetch();} else list.refetch();}} />}>
      {adding ? <View style={styles.section}>
        <Text style={styles.muted}>{t('Encontre amigos pelo nome de usuário.', 'Find friends by username.', 'Busca amigos por su nombre de usuario.')}</Text>
        <TextInput testID="friends-search-input" accessibilityLabel={t('Nome de usuário', 'Username', 'Nombre de usuario')} value={input} onChangeText={setInput} onSubmitEditing={find} autoCapitalize="none" autoCorrect={false} maxLength={25} returnKeyType="search" placeholder="@usuario" placeholderTextColor={challengeTheme.colors.muted} style={styles.input} />
        <View style={styles.actions}><RaisedButton testID="friends-search" onPress={find} label={t('Buscar', 'Search', 'Buscar')} tone="aqua" size="compact" />
          {search ? <RaisedButton
            onPress={() => {setSearch(''); setInput(''); setInvalidSearch(false);}}
            label={t('Limpar busca', 'Clear search', 'Limpiar búsqueda')}
            variant="outlined"
            tone="neutral"
            size="compact"
          /> : null}</View>
        {invalidSearch ? <Text accessibilityRole="alert" style={styles.error}>{t('Digite de 3 a 24 letras, números ou sublinhados.', 'Enter 3–24 letters, numbers or underscores.', 'Escribe de 3 a 24 letras, números o guiones bajos.')}</Text> : null}
      </View> : null}
      {actions.isError ? <Text accessibilityRole="alert" style={styles.error}>{t('Não foi possível atualizar a amizade. Tente novamente.', 'Could not update the friendship. Please try again.', 'No se pudo actualizar la amistad. Inténtalo de nuevo.')}</Text> : null}
      {adding && search ? <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>{t('Resultados', 'Results', 'Resultados')}</Text>
        {people.isPending ? <ActivityIndicator color={challengeTheme.colors.cyanStrong} /> : null}
        {people.isError ? <Pressable accessibilityRole="button" onPress={() => people.refetch()}><Text style={styles.error}>{failure}</Text></Pressable> : null}
        {people.data?.length === 0 ? <Text style={styles.muted}>{t('Nenhuma pessoa encontrada.', 'No people found.', 'No se encontraron personas.')}</Text> : null}
        {people.data?.map(renderPerson)}
      </View> : null}
      {!adding ? <>
        {list.isPending ? <ActivityIndicator color={challengeTheme.colors.cyanStrong} /> : null}
        {list.isError ? <Pressable accessibilityRole="button" onPress={() => list.refetch()}><Text style={styles.error}>{failure}</Text></Pressable> : null}
        {(['friends', 'incoming', 'outgoing'] as const).map(section => <View key={section} style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>{section === 'friends' ? t('Seus amigos', 'Your friends', 'Tus amigos') : section === 'incoming' ? t('Pedidos recebidos', 'Incoming requests', 'Solicitudes recibidas') : t('Pedidos enviados', 'Sent requests', 'Solicitudes enviadas')}</Text>
          {list.data?.[section].map(renderPerson)}
          {list.data?.[section].length === 0 ? <Text style={styles.muted}>{section === 'friends' ? t('Você ainda não tem amigos adicionados.', 'You have no friends yet.', 'Todavía no tienes amigos añadidos.') : t('Nenhum pedido por aqui.', 'No requests here.', 'No hay solicitudes.')}</Text> : null}
        </View>)}
      </> : null}
    </ScrollView>
  </SafeAreaView>}</SwipeBackScreen>;
}
