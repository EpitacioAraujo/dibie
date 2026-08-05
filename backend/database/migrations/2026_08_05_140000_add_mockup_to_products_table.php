<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Arte + medidas da caneca 3D: o que o front precisa para remontar a
            // cena. Nulo em produto que não veio da tela de mockups.
            $table->json('mockup')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('mockup');
        });
    }
};
