<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('products')->whereNotNull('image_path')->get()->each(function ($product) {
            DB::table('product_images')->insert([
                'product_id' => $product->id,
                'path' => $product->image_path,
                'position' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('image_path')->nullable();
        });

        foreach (DB::table('product_images')->orderBy('product_id')->orderBy('position')->get() as $image) {
            DB::table('products')
                ->where('id', $image->product_id)
                ->whereNull('image_path')
                ->update(['image_path' => $image->path]);
        }

        Schema::dropIfExists('product_images');
    }
};
