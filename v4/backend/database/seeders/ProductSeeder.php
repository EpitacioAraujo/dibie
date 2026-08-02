<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /** Migra os produtos que estavam fixos no front (v3/v4). */
    public const PRODUCTS = [
        ['slug' => 'flora', 'name' => 'Flora', 'price' => 49, 'cat' => 'Caneca', 'image_path' => 'products/tile-01.webp'],
        ['slug' => 'sol', 'name' => 'Sol', 'price' => 45, 'cat' => 'Caneca', 'image_path' => 'products/tile-02.webp'],
        ['slug' => 'mare', 'name' => 'Maré', 'price' => 52, 'cat' => 'Caneca', 'image_path' => 'products/tile-03.webp'],
        ['slug' => 'aurora', 'name' => 'Aurora', 'price' => 59, 'cat' => 'Caneca personalizada', 'image_path' => 'products/tile-04.webp'],
        ['slug' => 'luar', 'name' => 'Luar', 'price' => 49, 'cat' => 'Caneca', 'image_path' => 'products/tile-05.webp'],
        ['slug' => 'brisa', 'name' => 'Brisa', 'price' => 45, 'cat' => 'Caneca', 'image_path' => 'products/tile-06.webp'],
        ['slug' => 'terra', 'name' => 'Terra', 'price' => 55, 'cat' => 'Caneca', 'image_path' => 'products/tile-07.webp'],
        ['slug' => 'festa', 'name' => 'Festa', 'price' => 62, 'cat' => 'Kit', 'image_path' => 'products/tile-08.webp'],
    ];

    public function run(): void
    {
        foreach (self::PRODUCTS as $p) {
            $imagePath = $p['image_path'];
            unset($p['image_path']);

            $product = Product::updateOrCreate(['slug' => $p['slug']], $p + ['active' => true]);

            if (!$product->images()->exists()) {
                $product->images()->create(['path' => $imagePath, 'position' => 0]);
            }
        }
    }
}
