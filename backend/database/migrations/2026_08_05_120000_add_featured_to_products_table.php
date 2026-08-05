<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('featured')->default(false);
            $table->unsignedInteger('position')->default(0);
        });

        // A home mostrava os 5 primeiros produtos ativos; preserva isso para o
        // catálogo já existente em vez de deixar a vitrine vazia após o deploy.
        DB::table('products')->whereIn(
            'id',
            DB::table('products')->where('active', true)->orderBy('id')->limit(5)->pluck('id')
        )->update(['featured' => true]);
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['featured', 'position']);
        });
    }
};
