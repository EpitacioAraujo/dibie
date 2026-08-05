<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hero_items', function (Blueprint $table) {
            $table->id();
            // slide = carrossel central; o resto são as faixas do mosaico
            $table->string('lane');
            $table->unsignedInteger('position')->default(0);
            $table->string('path');
            $table->string('title')->nullable();
            $table->string('sub')->nullable();
            $table->string('alt')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hero_items');
    }
};
