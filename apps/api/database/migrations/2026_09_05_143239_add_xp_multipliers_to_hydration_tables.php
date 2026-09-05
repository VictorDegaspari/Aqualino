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
        Schema::table('daily_user_stats', function (Blueprint $table): void {
            $table->unsignedSmallInteger('xp_multiplier')->nullable();
        });
        Schema::table('hydration_logs', function (Blueprint $table): void {
            $table->unsignedSmallInteger('xp_multiplier')->default(100);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hydration_logs', function (Blueprint $table): void {
            $table->dropColumn('xp_multiplier');
        });
        Schema::table('daily_user_stats', function (Blueprint $table): void {
            $table->dropColumn('xp_multiplier');
        });
    }
};
