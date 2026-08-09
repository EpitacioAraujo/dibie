<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTotalTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $extra = []): Product
    {
        return Product::create(array_merge([
            'slug' => Product::generateSlug(),
            'name' => 'Caneca',
            'price_cents' => 4590,
            'cat' => 'canecas',
            'active' => true,
        ], $extra));
    }

    /** O caso que quebrava: 45,90 x 3 dava 137.70000000000002 em float. */
    public function test_total_e_exato_com_preco_quebrado(): void
    {
        $p = $this->product();

        $code = $this->postJson('/api/orders', [
            'items' => [['slug' => $p->slug, 'qty' => 3]],
        ])->assertCreated()->json('code');

        $order = Order::where('code', $code)->with('items')->firstOrFail();

        $this->assertSame(13770, $order->total_cents);
        $this->assertSame(4590, $order->items->first()->price_cents);
    }

    public function test_soma_varios_itens(): void
    {
        $a = $this->product(['price_cents' => 4590]);
        $b = $this->product(['price_cents' => 1099]);

        $code = $this->postJson('/api/orders', [
            'items' => [
                ['slug' => $a->slug, 'qty' => 2],
                ['slug' => $b->slug, 'qty' => 3],
            ],
        ])->assertCreated()->json('code');

        // 4590*2 + 1099*3 = 9180 + 3297
        $this->assertSame(12477, Order::where('code', $code)->value('total_cents'));
    }

    /** Preço é do banco: o que o cliente mandar é recusado, não aproveitado. */
    public function test_preco_do_cliente_e_recusado(): void
    {
        $p = $this->product();

        $this->postJson('/api/orders', [
            'items' => [['slug' => $p->slug, 'qty' => 1, 'price_cents' => 1]],
            'total_cents' => 1,
        ])->assertStatus(422);

        $this->assertSame(0, Order::count());
    }

    public function test_slug_inexistente_e_ignorado(): void
    {
        $p = $this->product();

        $code = $this->postJson('/api/orders', [
            'items' => [
                ['slug' => $p->slug, 'qty' => 1],
                ['slug' => 'nao-existe', 'qty' => 9],
            ],
        ])->assertCreated()->json('code');

        $order = Order::where('code', $code)->with('items')->firstOrFail();

        $this->assertSame(4590, $order->total_cents);
        $this->assertCount(1, $order->items);
    }

    public function test_pedido_so_com_slug_invalido_falha(): void
    {
        $this->postJson('/api/orders', [
            'items' => [['slug' => 'nao-existe', 'qty' => 1]],
        ])->assertStatus(422);
    }
}
