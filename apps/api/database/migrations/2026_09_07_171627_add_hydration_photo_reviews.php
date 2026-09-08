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
        Schema::table('groups', function (Blueprint $table): void {
            $table->boolean('photo_review_enabled')->default(true);
        });
        Schema::table('hydration_logs', function (Blueprint $table): void {
            $table->foreignUlid('review_group_id')->nullable()->constrained('groups')->nullOnDelete();
            $table->json('eligible_voter_ids')->nullable();
            $table->timestampTz('review_expires_at')->nullable();
            $table->timestampTz('review_closed_at')->nullable();
            $table->timestampTz('invalidated_at')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('photo_mime', 32)->nullable();
            $table->index(['review_group_id', 'created_at']);
        });
        Schema::create('hydration_log_votes', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('hydration_log_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_valid');
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['hydration_log_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('groups', function (Blueprint $table): void {
            $table->dropColumn('photo_review_enabled');
        });
        Schema::dropIfExists('hydration_log_votes');
        Schema::table('hydration_logs', function (Blueprint $table): void {
            $table->dropIndex(['review_group_id', 'created_at']);
            $table->dropConstrainedForeignId('review_group_id');
            $table->dropColumn(['eligible_voter_ids', 'review_expires_at', 'review_closed_at', 'invalidated_at', 'photo_path', 'photo_mime']);
        });
    }
};
