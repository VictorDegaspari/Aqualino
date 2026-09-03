<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('user_streaks', function (Blueprint $table): void {
            $table->renameColumn('last_goal_date', 'last_hydration_date');
        });

        Schema::create('streak_potion_effects', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('item_code', 32);
            $table->string('scope_type', 32);
            $table->string('scope_id', 64)->nullable();
            $table->string('scope_key', 100);
            $table->uuid('client_action_id');
            $table->string('status', 16);
            $table->string('active_key', 100)->nullable();
            $table->date('eligible_from')->nullable();
            $table->date('target_local_date')->nullable();
            $table->timestampTz('consumed_at')->nullable();
            $table->timestampTz('released_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'client_action_id']);
            $table->unique(['user_id', 'active_key']);
            $table->unique(
                ['user_id', 'item_code', 'scope_key', 'target_local_date'],
                'streak_potion_effects_target_unique',
            );
            $table->index(['user_id', 'status', 'scope_type']);
        });

        Schema::create('potion_usage_blocks', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('reason', 32);
            $table->string('context_id', 100);
            $table->timestampTz('starts_at');
            $table->timestampTz('ends_at');
            $table->timestamps();

            $table->unique(['user_id', 'reason', 'context_id']);
            $table->index(['user_id', 'starts_at', 'ends_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('potion_usage_blocks');
        Schema::dropIfExists('streak_potion_effects');

        Schema::table('user_streaks', function (Blueprint $table): void {
            $table->renameColumn('last_hydration_date', 'last_goal_date');
        });
    }
};
