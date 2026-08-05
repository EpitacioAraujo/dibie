<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Passa os slugs antigos (derivados do nome) para o código de 8 caracteres.
     * O slug é a URL pública do produto: links antigos deixam de resolver.
     */
    public function up(): void
    {
        Product::all()->each(fn (Product $p) => $p->update(['slug' => Product::generateSlug()]));
    }

    public function down(): void
    {
        // Os slugs antigos não são recuperáveis a partir do código.
    }
};
