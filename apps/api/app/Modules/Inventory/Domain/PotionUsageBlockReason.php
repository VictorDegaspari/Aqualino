<?php

namespace App\Modules\Inventory\Domain;

enum PotionUsageBlockReason: string
{
    case GroupChallenge = 'group_challenge';
}
