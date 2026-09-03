<?php

namespace App\Modules\Inventory\Application;

use App\Models\User;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\InventoryTransactionSource;
use App\Modules\Inventory\Infrastructure\Models\InventoryBalance;
use App\Modules\Inventory\Infrastructure\Models\InventoryTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class CreditInventoryItem
{
    /**
     * @param  array<string, mixed>  $metadata
     * @return array{balance: InventoryBalance, transaction: InventoryTransaction, idempotent_replay: bool}
     */
    public function handle(
        User $user,
        InventoryItemCode $itemCode,
        int $quantity,
        InventoryTransactionSource $source,
        string $sourceId,
        array $metadata = [],
    ): array {
        if ($quantity < 1) {
            throw new InvalidArgumentException('Inventory credit quantity must be positive.');
        }

        if ($sourceId === '' || mb_strlen($sourceId) > 100) {
            throw new InvalidArgumentException('Inventory credit source ID must contain between 1 and 100 characters.');
        }

        return DB::transaction(function () use ($user, $itemCode, $quantity, $source, $sourceId, $metadata): array {
            $balance = InventoryBalance::query()->firstOrCreate(
                ['user_id' => $user->id, 'item_code' => $itemCode->value],
                ['quantity' => 0, 'reserved_quantity' => 0],
            );

            $balance = InventoryBalance::query()
                ->whereKey($balance->id)
                ->lockForUpdate()
                ->firstOrFail();

            $timestamp = now();
            $transactionId = (string) Str::ulid();
            $wasInserted = InventoryTransaction::query()->insertOrIgnore([
                'id' => $transactionId,
                'user_id' => $user->id,
                'item_code' => $itemCode->value,
                'quantity_delta' => $quantity,
                'source_type' => $source->value,
                'source_id' => $sourceId,
                'metadata' => $metadata === [] ? null : json_encode($metadata, JSON_THROW_ON_ERROR),
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ]) === 1;

            $transaction = InventoryTransaction::query()
                ->where('user_id', $user->id)
                ->where('item_code', $itemCode->value)
                ->where('source_type', $source->value)
                ->where('source_id', $sourceId)
                ->firstOrFail();

            if ($wasInserted) {
                $balance->increment('quantity', $quantity);
                $balance->refresh();
            }

            return [
                'balance' => $balance,
                'transaction' => $transaction,
                'idempotent_replay' => ! $wasInserted,
            ];
        }, attempts: 3);
    }
}
