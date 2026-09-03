<?php

namespace App\Modules\Inventory\Domain;

enum InventoryTransactionSource: string
{
    case StorePurchase = 'store_purchase';
    case VipMonthlyGrant = 'vip_monthly_grant';
    case GroupFirstPlaceReward = 'group_first_place_reward';
    case PotionUse = 'potion_use';
    case Refund = 'refund';
    case Reversal = 'reversal';
}
