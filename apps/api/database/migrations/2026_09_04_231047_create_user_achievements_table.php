<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_achievements', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('code', 48);
            $table->timestampTz('unlocked_at');
            $table->timestampTz('celebrated_at')->nullable();
            $table->unique(['user_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_achievements');
    }
};
