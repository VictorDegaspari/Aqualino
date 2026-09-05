<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Hydration logs already have deleted_at. Framework credentials, caches and queues
    // retain their own expiry / consumption lifecycle.
    private const TABLES = [
        'users', 'user_profiles', 'hydration_goals', 'daily_user_stats', 'user_streaks',
        'inventory_balances', 'inventory_transactions', 'streak_potion_effects',
        'potion_usage_blocks', 'groups', 'group_memberships', 'user_achievements', 'outbox_events',
    ];

    private const REUSABLE_KEYS = [
        ['users', ['email'], 'users_email_unique'],
        ['user_profiles', ['username'], 'user_profiles_username_unique'],
        ['group_memberships', ['user_id'], 'group_memberships_user_id_unique'],
        ['group_memberships', ['group_id', 'slot'], 'group_memberships_group_id_slot_unique'],
    ];

    public function up(): void
    {
        foreach (self::TABLES as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->softDeletes();
            });
        }

        // PostgreSQL and SQLite enforce these keys only among active records.
        // A normal UNIQUE including deleted_at would allow duplicate NULL values.
        foreach (self::REUSABLE_KEYS as [$name, $columns, $index]) {
            Schema::table($name, fn (Blueprint $table) => $table->dropUnique($index));
            DB::statement('CREATE UNIQUE INDEX '.$index.' ON '.$name.' ('.implode(', ', $columns).') WHERE deleted_at IS NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Never silently reactivate accounts or discard their deletion history.
        foreach (self::TABLES as $name) {
            if (DB::table($name)->whereNotNull('deleted_at')->exists()) {
                throw new RuntimeException('Cannot remove soft deletes while deleted records exist. Use a forward migration to preserve deletion history.');
            }
        }

        foreach (self::REUSABLE_KEYS as [$name, $columns, $index]) {
            DB::statement('DROP INDEX '.$index);
            Schema::table($name, fn (Blueprint $table) => $table->unique($columns, $index));
        }

        foreach (array_reverse(self::TABLES) as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropSoftDeletes());
        }
    }
};
