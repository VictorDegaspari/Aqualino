<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->unsignedInteger('level')->default(1);
            $table->unsignedBigInteger('level_started_at_xp')->default(0);
        });

        // Preserve levels and partial progress earned under the previous 100 XP curve.
        DB::table('users')->select(['id', 'xp_total'])->chunkById(500, function ($users): void {
            foreach ($users as $user) {
                $completed = intdiv(max(0, (int) $user->xp_total), 100);
                DB::table('users')->where('id', $user->id)->update([
                    'level' => $completed + 1,
                    'level_started_at_xp' => $completed * 100,
                ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['level', 'level_started_at_xp']);
        });
    }
};
