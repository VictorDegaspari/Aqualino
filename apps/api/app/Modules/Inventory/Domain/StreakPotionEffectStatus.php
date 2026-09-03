<?php

namespace App\Modules\Inventory\Domain;

enum StreakPotionEffectStatus: string
{
    case Armed = 'armed';
    case Consumed = 'consumed';
    case Released = 'released';
}
