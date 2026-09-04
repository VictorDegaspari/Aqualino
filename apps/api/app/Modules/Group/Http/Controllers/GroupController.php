<?php

namespace App\Modules\Group\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Group\Application\GroupService;
use App\Modules\Group\Http\Requests\CreateGroupRequest;
use App\Modules\Group\Http\Requests\GroupInviteRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    public function show(Request $request, GroupService $groups): JsonResponse
    {
        return response()->json(['data' => $groups->current($request->user())]);
    }

    public function store(CreateGroupRequest $request, GroupService $groups): JsonResponse
    {
        return response()->json(['data' => $groups->create($request->user(), $request->validated('name'))], 201);
    }

    public function preview(GroupInviteRequest $request, GroupService $groups): JsonResponse
    {
        return response()->json(['data' => $groups->preview($request->validated('code'))]);
    }

    public function accept(GroupInviteRequest $request, GroupService $groups): JsonResponse
    {
        return response()->json(['data' => $groups->accept($request->user(), $request->validated('code'))]);
    }

    public function renewInvite(Request $request, GroupService $groups): JsonResponse
    {
        return response()->json(['data' => $groups->renewInvite($request->user())]);
    }

    public function leave(Request $request, GroupService $groups): JsonResponse
    {
        $groups->leave($request->user());

        return response()->json(['data' => null]);
    }
}
