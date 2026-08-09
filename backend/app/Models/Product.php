<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = ['slug', 'name', 'price_cents', 'cat', 'active', 'featured', 'position', 'mockup'];

    protected $casts = [
        // Centavos inteiros: o cast decimal:2 entregava string ao front e cada
        // consumidor convertia por conta própria — era metade do bug de preço.
        'price_cents' => 'integer',
        'active' => 'boolean',
        'featured' => 'boolean',
        'mockup' => 'array',
    ];

    protected $appends = ['image_url', 'mockup_art_url'];

    /** Alfabeto sem 0/o/1/l/i: o código é para ser lido e digitado por gente. */
    private const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

    /** Código de 8 caracteres, único na tabela. */
    public static function generateSlug(): string
    {
        do {
            $slug = '';
            for ($i = 0; $i < 8; $i++) {
                $slug .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
        } while (self::where('slug', $slug)->exists());

        return $slug;
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('position')->orderBy('id');
    }

    /** URL da capa (primeira imagem da galeria) — consumida pelo front. */
    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn () => $this->images->first()?->image_url);
    }

    /**
     * URL da arte estampada na caneca 3D. O JSON guarda só o path: URL absoluta
     * no banco quebraria ao trocar de domínio. Aponta para a rota de API, não
     * para o /storage, porque o three.js precisa dos cabeçalhos CORS de lá.
     */
    protected function mockupArtUrl(): Attribute
    {
        return Attribute::get(fn () => isset($this->mockup['art'])
            ? url("/api/products/{$this->slug}/art")
            : null);
    }
}
