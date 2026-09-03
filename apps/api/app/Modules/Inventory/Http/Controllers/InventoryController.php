<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Application\InventoryQuery;
use App\Modules\Inventory\Http\Resources\InventoryResource;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function show(Request $request, InventoryQuery $inventory): InventoryResource
    {
        return new InventoryResource($inventory->forUser($request->user()));
    }
}
