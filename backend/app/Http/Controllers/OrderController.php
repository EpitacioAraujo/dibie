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
            $line = (float) $product->price * $item['qty'];
            $total += $line;
            $rows[] = [
                'product_slug' => $product->slug,
                'name' => $product->name,
                'price' => $product->price,
                'qty' => $item['qty'],
            ];
        }

        abort_if(empty($rows), 422, 'Nenhum item válido no pedido.');

        $order = Order::create([
            'code' => 'DB-'.Str::upper(Str::random(5)),
            'total' => $total,
            'status' => 'novo',
            'contact' => $data['contact'] ?? null,
        ]);
        $order->items()->createMany($rows);

        return response()->json(['code' => $order->code], 201);
    }
}
