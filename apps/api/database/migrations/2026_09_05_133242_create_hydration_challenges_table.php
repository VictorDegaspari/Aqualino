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
        Schema::create('hydration_challenges', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignUlid('group_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('mode', 8);
            $table->string('timezone', 64);
            $table->timestampTz('starts_at');
            $table->timestampTz('ends_at');
            $table->string('reward_type', 32)->nullable();
            $table->unsignedInteger('reward_amount')->nullable();
            $table->timestampTz('reward_claimed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['user_id', 'starts_at']);
            $table->index(['group_id', 'starts_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hydration_challenges');
    }
};
