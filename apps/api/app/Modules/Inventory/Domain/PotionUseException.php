<?php

namespace App\Modules\Inventory\Domain;

use Illuminate\Contracts\Debug\ShouldntReport;
use RuntimeException;

class PotionUseException extends RuntimeException implements ShouldntReport
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 409,
    ) {
        parent::__construct($message);
    }

    public static function unavailable(): self
    {
        return new self('POTION_UNAVAILABLE', 'Você não possui uma poção disponível.');
    }

    public static function alreadyArmed(): self
    {
        return new self('STREAK_FREEZE_ALREADY_ARMED', 'Já existe um Congelamento de streak ativo.');
    }

    public static function blockedByGroupChallenge(): self
    {
        return new self(
            'POTION_USAGE_BLOCKED_BY_GROUP_CHALLENGE',
            'Poções não podem ser usadas durante um desafio de grupo ativo.',
        );
    }

    public static function noRecoverableBreak(): self
    {
        return new self(
            'NO_RECOVERABLE_STREAK_BREAK',
            'Não existe uma quebra de streak recuperável nas últimas 48 horas.',
        );
    }

    public static function alreadyConsumed(): self
    {
        return new self('POTION_EFFECT_ALREADY_CONSUMED', 'Esta poção já foi consumida.');
    }

    public static function effectNotFound(): self
    {
        return new self('RESOURCE_NOT_FOUND', 'Recurso não encontrado.', 404);
    }

    public static function idempotencyKeyReused(): self
    {
        return new self(
            'IDEMPOTENCY_KEY_REUSED',
            'Este identificador já foi usado em outra ação de poção.',
        );
    }

    public static function proGrantUnavailable(): self
    {
        return new self(
            'VIP_MONTHLY_GRANT_NOT_ELIGIBLE',
            'A cota mensal exige um plano Pro ativo e verificado.',
        );
    }
}
