<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /** Cria o pedido a partir do carrinho (público). Recalcula o total
        a partir dos preços do banco — não confia no valor do cliente. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.slug' => ['required', 'string'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'contact' => ['nullable', 'string', 'max:255'],
            // Preço e total vêm do banco. Recusar em vez de ignorar em silêncio:
            // se um cliente mandar valor, é bug dele ou tentativa de fraude.
            'total' => ['prohibited'],
            'total_cents' => ['prohibited'],
            'items.*.price' => ['prohibited'],
            'items.*.price_cents' => ['prohibited'],
        ]);

        $prices = Product::whereIn('slug', collect($data['items'])->pluck('slug'))
            ->get()
            ->keyBy('slug');

        $total = 0;
        $rows = [];
        foreach ($data['items'] as $item) {
            $product = $prices->get($item['slug']);
            if (! $product) {
                continue; // slug inexistente/ inativo é ignorado
            }
            $total += $product->price_cents * $item['qty']; // int * int: exato
            $rows[] = [
                'product_slug' => $product->slug,
                'name' => $product->name,
                'price_cents' => $product->price_cents,
                'qty' => $item['qty'],
            ];
        }

        abort_if(empty($rows), 422, 'Nenhum item válido no pedido.');

        $order = Order::create([
            'code' => 'DB-'.Str::upper(Str::random(5)),
            'total_cents' => $total,
            'status' => 'novo',
            'contact' => $data['contact'] ?? null,
        ]);
        $order->items()->createMany($rows);

        return response()->json(['code' => $order->code], 201);
    }
}
