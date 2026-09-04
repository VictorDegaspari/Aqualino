<?php

namespace App\Modules\Group\Domain;

use Illuminate\Contracts\Debug\ShouldntReport;
use RuntimeException;

final class GroupException extends RuntimeException implements ShouldntReport
{
    public function __construct(public readonly string $errorCode, string $message, public readonly int $status = 409)
    {
        parent::__construct($message);
    }
}
