<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table): void {
            $table->foreignUlid('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->string('display_name', 80);
            $table->string('username', 24)->unique();
            $table->string('avatar_url')->nullable();
            $table->string('timezone', 64)->default('UTC');
            $table->string('locale', 12)->default('pt-BR');
            $table->json('favorite_volumes_ml')->nullable();
            $table->timestamp('onboarding_completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('hydration_goals', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('daily_goal_ml');
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->string('source', 32)->default('onboarding');
            $table->timestamps();
            $table->index(['user_id', 'starts_on', 'ends_on']);
        });

        Schema::create('hydration_logs', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('amount_ml');
            $table->timestampTz('occurred_at');
            $table->date('local_date');
            $table->string('timezone_at_event', 64);
            $table->string('source', 16);
            $table->uuid('client_event_id');
            $table->unsignedInteger('xp_awarded')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['user_id', 'client_event_id']);
            $table->index(['user_id', 'occurred_at']);
            $table->index(['user_id', 'local_date']);
        });

        Schema::create('daily_user_stats', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->date('local_date');
            $table->unsignedInteger('total_ml')->default(0);
            $table->unsignedInteger('goal_ml_snapshot');
            $table->timestampTz('goal_achieved_at')->nullable();
            $table->unsignedInteger('xp_earned')->default(0);
            $table->unsignedInteger('record_xp_earned')->default(0);
            $table->unsignedInteger('log_count')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'local_date']);
            $table->index(['local_date', 'total_ml']);
        });

        Schema::create('user_streaks', function (Blueprint $table): void {
            $table->foreignUlid('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('current_streak')->default(0);
            $table->unsignedInteger('longest_streak')->default(0);
            $table->date('last_goal_date')->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        Schema::create('outbox_events', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('type', 100);
            $table->ulid('aggregate_id');
            $table->json('payload');
            $table->timestampTz('available_at');
            $table->timestampTz('processed_at')->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamps();
            $table->index(['processed_at', 'available_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outbox_events');
        Schema::dropIfExists('user_streaks');
        Schema::dropIfExists('daily_user_stats');
        Schema::dropIfExists('hydration_logs');
        Schema::dropIfExists('hydration_goals');
        Schema::dropIfExists('user_profiles');
    }
};
