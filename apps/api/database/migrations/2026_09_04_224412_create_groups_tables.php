<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('groups', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 60);
            $table->string('timezone', 64);
            $table->text('invite_code');
            $table->string('invite_code_hash', 64)->unique();
            $table->timestampTz('invite_expires_at');
            $table->timestamps();
        });

        Schema::create('group_memberships', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('group_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('user_id')->unique()->constrained()->cascadeOnDelete();
            // Five unique, constrained slots also enforce capacity at database level.
            $table->enum('slot', ['1', '2', '3', '4', '5']);
            $table->timestamps();
            $table->unique(['group_id', 'slot']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_memberships');
        Schema::dropIfExists('groups');
    }
};
