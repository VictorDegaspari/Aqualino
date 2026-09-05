import React from 'react';
import type {HydrationChallenge} from '@aqualino/contracts';
import {AppDialog} from '../../../../shared/components/AppDialog';
import {RewardChestIcon} from './RewardChestIcon';

export function SoloRewardDialog({challenge, onClaim, onClose}: {
  challenge: HydrationChallenge;
  onClaim: (id: string) => Promise<unknown>;
  onClose: () => void;
}): React.JSX.Element {
  const reward = challenge.reward;
  const available = reward?.state === 'available';
  const claimed = reward?.state === 'claimed';
  const prize = reward?.type === 'xp' ? `${reward.amount} XP` : reward?.type === 'streak_freeze' ? 'uma poção de congelamento da sequência' : 'uma poção de recuperação da sequência';
  return <AppDialog
    title={claimed ? 'Sua recompensa chegou!' : 'Baú do desafio solo'}
    illustration={<RewardChestIcon size={110} opened={claimed} />}
    message={claimed ? `Você ganhou ${prize}! A recompensa já está na sua conta.` : available
      ? 'Você cumpriu as 7 metas! Abra o baú para sortear XP ou uma poção para o inventário.'
      : `Cumpra as 7 metas diárias para liberar XP ou uma poção aleatória. Você já completou ${challenge.progress.completed_goal_days} de 7.`}
    confirmLabel={available ? 'Abrir baú' : 'Entendi'}
    onConfirm={available ? async () => {await onClaim(challenge.id); return false;} : undefined}
    onClose={onClose}
  />;
}
