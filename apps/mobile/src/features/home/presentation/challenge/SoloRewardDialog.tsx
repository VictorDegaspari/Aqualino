import {useTranslation} from '../../../../shared/i18n/useTranslation';
import React from 'react';
import type {HydrationChallenge} from '@aqualino/contracts';
import {AppDialog} from '../../../../shared/components/AppDialog';
import {RewardChestIcon} from './RewardChestIcon';

export function SoloRewardDialog({challenge, onClaim, onClose}: {
  challenge: HydrationChallenge;
  onClaim: (id: string) => Promise<unknown>;
  onClose: () => void;
}): React.JSX.Element {
  const {t} = useTranslation();
  const reward = challenge.reward;
  const available = reward?.state === 'available';
  const claimed = reward?.state === 'claimed';
  const prize = reward?.type === 'xp' ? `${reward.amount} XP` : reward?.type === 'streak_freeze' ? t("uma poção de congelamento da sequência", "a streak freeze potion", "una poción para congelar la racha") : t("uma poção de recuperação da sequência", "a streak revival potion", "una poción para recuperar la racha");
  return <AppDialog
    title={claimed ? t("Sua recompensa chegou!", "Your reward is here!", "¡Tu recompensa ha llegado!") : t("Baú do desafio solo", "Solo challenge chest", "Cofre del desafío individual")}
    illustration={<RewardChestIcon size={110} opened={claimed} />}
    message={reward?.state === 'reviewing' ? t("Suas metas foram atingidas. O baú será liberado quando as votações das marcações forem encerradas, em até 12 horas após a sincronização.", "You reached your goals. The chest will be unlocked when voting ends, up to 12 hours after syncing.", "Has alcanzado tus metas. El cofre se desbloqueará cuando terminen las votaciones, hasta 12 horas después de la sincronización.") : claimed ? t(`Você ganhou ${prize}! A recompensa já está na sua conta.`, `You won ${prize}! The reward is in your account.`, `¡Has ganado ${prize}! La recompensa ya está en tu cuenta.`) : available
      ? t("Você cumpriu as 7 metas! Abra o baú para sortear XP ou uma poção para o inventário.", "You reached all 7 goals! Open the chest to draw XP or a potion for your inventory.", "¡Has cumplido las 7 metas! Abre el cofre para obtener XP o una poción para tu inventario.")
      : t(`Cumpra as 7 metas diárias para liberar XP ou uma poção aleatória. Você já completou ${challenge.progress.completed_goal_days} de 7.`, `Reach all 7 daily goals to unlock XP or a random potion. You have completed ${challenge.progress.completed_goal_days} of 7.`, `Cumple las 7 metas diarias para desbloquear XP o una poción aleatoria. Has completado ${challenge.progress.completed_goal_days} de 7.`)}
    confirmLabel={available ? t("Abrir baú", "Open chest", "Abrir cofre") : t("Entendi", "Got it", "Entendido")}
    onConfirm={available ? async () => {await onClaim(challenge.id); return false;} : undefined}
    onClose={onClose}
  />;
}
