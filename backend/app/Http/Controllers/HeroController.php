<?php

namespace App\Http\Controllers;

use App\Models\HeroItem;

class HeroController extends Controller
{
    /** Conteúdo da hero da home (slides do carrossel + tiles do mosaico). */
    public function index()
    {
        return HeroItem::orderBy('position')->orderBy('id')->get();
    }
}
