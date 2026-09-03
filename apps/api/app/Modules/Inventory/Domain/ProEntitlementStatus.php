<?php

namespace App\Modules\Inventory\Domain;

enum ProEntitlementStatus: string
{
    case Free = 'free';
    case ProActive = 'pro_active';
    case GracePeriod = 'grace_period';
    case Expired = 'expired';
    case Revoked = 'revoked';
}
