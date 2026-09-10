import React from 'react';
import {Text, View} from 'react-native';
import type {FriendshipStatus} from '@aqualino/contracts';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {useTranslation} from '../../../shared/i18n/useTranslation';
import type {FriendshipAction} from '../data/friendshipRepository';
import {friendshipStyles as styles} from './friendshipStyles';

export function FriendshipButtons({status, busy, onAction}: {status: FriendshipStatus; busy: boolean; onAction: (action: FriendshipAction) => void}): React.JSX.Element | null {
  const {t} = useTranslation();
  if (status === 'self') return null;
  const buttons: Array<{action: FriendshipAction; label: string; secondary?: boolean}> = status === 'none'
    ? [{action: 'request', label: t('Adicionar amizade', 'Add friend', 'Añadir amistad')}]
    : status === 'incoming' ? [{action: 'accept', label: t('Aceitar pedido', 'Accept request', 'Aceptar solicitud')}, {action: 'remove', label: t('Recusar', 'Decline', 'Rechazar'), secondary: true}]
      : [{action: 'remove', label: status === 'outgoing' ? t('Cancelar pedido', 'Cancel request', 'Cancelar solicitud') : t('Remover amizade', 'Remove friend', 'Eliminar amistad'), secondary: true}];
  return <View style={styles.section}>
    {status === 'outgoing' ? <Text style={styles.muted}>{t('Pedido enviado', 'Request sent', 'Solicitud enviada')}</Text> : null}
    <View style={styles.actions}>{buttons.map(button => <RaisedButton
      key={button.action}
      label={button.label}
      disabled={busy}
      tone={button.action === 'accept' ? 'success' : button.action === 'remove' ? 'danger' : 'aqua'}
      variant={button.secondary ? 'outlined' : 'filled'}
      onPress={() => onAction(button.action)}
    />)}</View>
  </View>;
}
