<?php

namespace App\Http\Controllers;

use App\Models\Product;

class ProductController extends Controller
{
    /** Lista pública: só produtos ativos. */
    public function index()
    {
        return Product::with('images')->where('active', true)->orderBy('id')->get();
    }

    public function show(string $slug)
    {
        return Product::with('images')->where('slug', $slug)->where('active', true)->firstOrFail();
    }
}
