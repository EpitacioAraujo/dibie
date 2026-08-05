<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HeroItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class HeroController extends Controller
{
    public function index()
    {
        return HeroItem::orderBy('lane')->orderBy('position')->orderBy('id')->get();
    }

    /** Sobe uma imagem nova no fim da faixa. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'lane' => ['required', Rule::in(HeroItem::LANES)],
            'image' => ['required', 'image', 'max:4096'],
            'title' => ['nullable', 'string', 'max:255'],
            'sub' => ['nullable', 'string', 'max:255'],
            'alt' => ['nullable', 'string', 'max:255'],
        ]);

        $item = HeroItem::create([
            'lane' => $data['lane'],
            'position' => HeroItem::where('lane', $data['lane'])->count(),
            'path' => $request->file('image')->store('hero', 'public'),
            'title' => $data['title'] ?? null,
            'sub' => $data['sub'] ?? null,
            'alt' => $data['alt'] ?? null,
        ]);

        return response()->json($item, 201);
    }

    /** Salva textos e ordem de todos os itens de uma vez. */
    public function update(Request $request)
    {
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer', 'exists:hero_items,id'],
            'items.*.lane' => ['required', Rule::in(HeroItem::LANES)],
            'items.*.position' => ['required', 'integer', 'min:0'],
            'items.*.title' => ['nullable', 'string', 'max:255'],
            'items.*.sub' => ['nullable', 'string', 'max:255'],
            'items.*.alt' => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($data['items'] as $row) {
            HeroItem::where('id', $row['id'])->update([
                'lane' => $row['lane'],
                'position' => $row['position'],
                'title' => $row['title'] ?? null,
                'sub' => $row['sub'] ?? null,
                'alt' => $row['alt'] ?? null,
            ]);
        }

        return $this->index();
    }

    public function destroy(HeroItem $hero)
    {
        Storage::disk('public')->delete($hero->path);
        $lane = $hero->lane;
        $hero->delete();

        HeroItem::where('lane', $lane)->orderBy('position')->orderBy('id')->get()->values()->each(
            fn ($item, $i) => $item->position === $i ? null : $item->update(['position' => $i])
        );

        return response()->noContent();
    }
}
