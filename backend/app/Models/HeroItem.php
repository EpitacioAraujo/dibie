<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class HeroItem extends Model
{
    /** Faixas aceitas: o carrossel e as quatro fileiras do mosaico da hero. */
    public const LANES = ['slide', 'top', 'midLeft', 'midRight', 'bottom'];

    protected $fillable = ['lane', 'position', 'path', 'title', 'sub', 'alt'];

    protected $appends = ['image_url'];

    /** URL pública da imagem (disco public) — consumida pelo front. */
    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn () => Storage::disk('public')->url($this->path));
    }
}
