<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table): void {
            $table->json('achievement_highlights')->nullable();
        });
        Schema::create('friendships', function (Blueprint $table): void {
            $table->foreignUlid('user_low')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('user_high')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('requested_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
            $table->primary(['user_low', 'user_high']);
            $table->index('user_high');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('friendships');
        Schema::table('user_profiles', function (Blueprint $table): void {
            $table->dropColumn('achievement_highlights');
        });
    }
};
