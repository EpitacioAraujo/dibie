<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = ['slug', 'name', 'price', 'cat', 'active'];

    protected $casts = [
        'price' => 'decimal:2',
        'active' => 'boolean',
    ];

    protected $appends = ['image_url'];

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('position');
    }

    /** URL da capa (primeira imagem da galeria) — consumida pelo front. */
    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn () => $this->images->first()?->image_url);
    }
}
