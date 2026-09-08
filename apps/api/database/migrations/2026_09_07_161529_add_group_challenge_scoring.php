<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hydration_challenges', function (Blueprint $table): void {
            $table->json('rules')->nullable();
            $table->timestampTz('roster_locked_at')->nullable();
            $table->timestampTz('finalized_at')->nullable();
            $table->timestampTz('cancelled_at')->nullable();
            $table->index(['mode', 'finalized_at', 'ends_at'], 'challenges_pending_finalization');
        });
        Schema::create('group_challenge_participants', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('challenge_id')->constrained('hydration_challenges')->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('goal_ml');
            $table->json('final_progress')->nullable();
            $table->unsignedInteger('points_hundredths')->nullable();
            $table->unsignedTinyInteger('rank')->nullable();
            $table->boolean('tied')->default(false);
            $table->string('medal', 12)->nullable();
            $table->string('reward_type', 32)->nullable();
            $table->unsignedInteger('reward_amount')->nullable();
            $table->timestampTz('reward_granted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['challenge_id', 'user_id']);
            $table->index(['user_id', 'challenge_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_challenge_participants');
        Schema::table('hydration_challenges', function (Blueprint $table): void {
            $table->dropIndex('challenges_pending_finalization');
            $table->dropColumn(['rules', 'roster_locked_at', 'finalized_at', 'cancelled_at']);
        });
    }
};
