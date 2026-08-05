<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    private const PER_PAGE = 12;

    /** Lista pública paginada: só produtos ativos, com busca e filtro por categoria. */
    public function index(Request $request)
    {
        // LOWER + LIKE em vez de ILIKE: o app roda em Postgres e os testes em sqlite.
        $term = '%'.mb_strtolower($request->string('q')).'%';

        return Product::with('images')->where('active', true)
            ->when($request->filled('cat'), fn ($q) => $q->where('cat', $request->string('cat')))
            ->when($request->filled('q'), fn ($q) => $q->where(
                fn ($w) => $w->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(slug) LIKE ?', [$term])
            ))
            ->when($request->boolean('featured'), fn ($q) => $q->where('featured', true))
            // destaques primeiro, na ordem definida no admin; o resto por id
            ->orderByDesc('featured')->orderBy('position')->orderBy('id')
            ->paginate(min((int) $request->input('per_page', self::PER_PAGE), 48));
    }

    /** Categorias em uso, para o filtro do catálogo. */
    public function categories()
    {
        return Product::where('active', true)->distinct()->orderBy('cat')->pluck('cat');
    }

    public function show(string $slug)
    {
        return Product::with('images')->where('slug', $slug)->where('active', true)->firstOrFail();
    }
}
