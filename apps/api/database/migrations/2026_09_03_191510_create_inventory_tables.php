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
        Schema::create('inventory_balances', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('item_code', 32);
            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('reserved_quantity')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'item_code']);
        });

        Schema::create('inventory_transactions', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('item_code', 32);
            $table->integer('quantity_delta');
            $table->string('source_type', 40);
            $table->string('source_id', 100);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(
                ['user_id', 'item_code', 'source_type', 'source_id'],
                'inventory_transactions_source_unique',
            );
            $table->index(['user_id', 'item_code', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');
        Schema::dropIfExists('inventory_balances');
    }
};
