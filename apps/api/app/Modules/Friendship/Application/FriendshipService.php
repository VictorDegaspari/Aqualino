<?php

namespace App\Modules\Friendship\Application;

use App\Models\User;
use App\Modules\Achievement\Application\AchievementService;
use App\Modules\Group\Application\GroupChallengeService;
use App\Modules\Hydration\Application\WeeklyHydrationQuery;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class FriendshipService
{
    public function person(string $id): User
    {
        return User::query()->with('profile')->whereHas('profile')->findOrFail($id);
    }

    public function pair(string $first, string $second): Builder
    {
        $ids = [$first, $second];
        sort($ids, SORT_STRING);

        return DB::table('friendships')->where('user_low', $ids[0])->where('user_high', $ids[1]);
    }

    public function relationship(User $viewer, User $person): string
    {
        if ($viewer->is($person)) {
            return 'self';
        }
        $pair = $this->pair($viewer->id, $person->id)->first();
        if (! $pair) {
            return 'none';
        }

        return $pair->accepted_at ? 'friends' : ($pair->requested_by === $viewer->id ? 'outgoing' : 'incoming');
    }

    public function summary(User $person, string $relationship): array
    {
        return [
            'id' => $person->id, 'display_name' => $person->profile->display_name,
            'username' => $person->profile->username, 'avatar_url' => $person->profile->avatar_url,
            'level' => $person->level, 'relationship' => $relationship,
        ];
    }

    public function search(User $viewer, string $query): array
    {
        $prefix = str_replace('_', '!_', mb_strtolower(ltrim(trim($query), '@'))).'%';
        $people = User::query()->with('profile')->whereKeyNot($viewer->id)
            ->whereHas('profile', fn ($profile) => $profile->whereRaw("username LIKE ? ESCAPE '!'", [$prefix]))
            ->orderBy('id')->limit(20)->get();

        return $people->map(fn (User $person): array => $this->summary($person, $this->relationship($viewer, $person)))->all();
    }

    public function collection(User $viewer): array
    {
        $pairs = DB::table('friendships')->where(fn (Builder $query) => $query->where('user_low', $viewer->id)->orWhere('user_high', $viewer->id))
            ->orderByDesc('created_at')->get();
        $ids = $pairs->map(fn ($pair) => $pair->user_low === $viewer->id ? $pair->user_high : $pair->user_low);
        $people = User::query()->with('profile')->whereHas('profile')->whereIn('id', $ids)->get()->keyBy('id');
        $result = ['friends' => [], 'incoming' => [], 'outgoing' => []];
        foreach ($pairs as $pair) {
            $person = $people->get($pair->user_low === $viewer->id ? $pair->user_high : $pair->user_low);
            if (! $person) {
                continue;
            }
            $status = $pair->accepted_at ? 'friends' : ($pair->requested_by === $viewer->id ? 'outgoing' : 'incoming');
            $result[$status][] = $this->summary($person, $status);
        }

        return $result;
    }

    public function change(User $viewer, User $person, string $action): array
    {
        abort_if($viewer->is($person), 422, 'Você não pode adicionar a própria conta.');
        DB::transaction(function () use ($viewer, $person, $action): void {
            $ids = [$viewer->id, $person->id];
            sort($ids, SORT_STRING);
            abort_unless(User::query()->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->count() === 2, 404);
            $query = $this->pair(...$ids);
            $pair = $query->first();
            if ($action === 'remove') {
                $query->delete();
            } elseif ($action === 'accept') {
                abort_unless($pair && $pair->requested_by === $person->id, 403, 'Somente quem recebeu o pedido pode aceitar.');
                $query->whereNull('accepted_at')->update(['accepted_at' => now(), 'updated_at' => now()]);
            } elseif (! $pair) {
                DB::table('friendships')->insert([
                    'user_low' => $ids[0], 'user_high' => $ids[1], 'requested_by' => $viewer->id,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }, 3);

        return $this->summary($person, $this->relationship($viewer, $person));
    }

    public function profile(User $viewer, User $person, AchievementService $achievements, GroupChallengeService $challenges, WeeklyHydrationQuery $hydration): array
    {
        $collection = $achievements->collection($person);
        $earned = array_values(array_filter($collection['items'], fn (array $item): bool => $item['unlocked_at'] !== null));
        $codes = $collection['profile_highlights'];
        if ($codes === null) {
            $ranked = $earned;
            usort($ranked, fn (array $a, array $b): int => $b['rank'] <=> $a['rank']);
            $codes = array_column(array_slice($ranked, 0, 4), 'code');
        }
        $publicAchievements = array_map(fn (array $item): array => [...$item, 'celebrated_at' => null], $earned);

        $week = $hydration->forUser($person);
        $elapsed = array_values(array_filter($week['days'], fn (array $day): bool => $day['date'] <= $week['current_date']));
        $total = array_sum(array_column($elapsed, 'total_ml'));

        return [
            ...$this->summary($person, $this->relationship($viewer, $person)),
            'hydration_week' => [
                'starts_on' => $week['starts_on'],
                'ends_on' => $week['ends_on'],
                'current_date' => $week['current_date'],
                'total_ml' => $total,
                'average_daily_ml' => (int) round($total / max(1, count($elapsed))),
                'days' => array_map(fn (array $day): array => [
                    'date' => $day['date'],
                    'total_ml' => $day['date'] <= $week['current_date'] ? $day['total_ml'] : 0,
                ], $week['days']),
            ],
            'group_medals' => $challenges->medalCounts($person),
            'achievements' => $publicAchievements,
            'profile_highlights' => $codes,
        ];
    }
}
