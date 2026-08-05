<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = ['slug', 'name', 'price', 'cat', 'active', 'featured', 'position'];

    protected $casts = [
        'price' => 'decimal:2',
        'active' => 'boolean',
        'featured' => 'boolean',
    ];

    protected $appends = ['image_url'];

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
}
