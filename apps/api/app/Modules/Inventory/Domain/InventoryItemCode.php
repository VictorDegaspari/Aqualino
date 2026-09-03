<?php

namespace App\Modules\Inventory\Domain;

enum InventoryItemCode: string
{
    case StreakFreeze = 'streak_freeze';
    case StreakRevive = 'streak_revive';
}
