<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductCatalogTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $extra = []): Product
    {
        return Product::create(array_merge([
            'slug' => Product::generateSlug(),
            'name' => 'Caneca',
            'price' => 10,
            'cat' => 'canecas',
            'active' => true,
        ], $extra));
    }

    public function test_filtra_por_categoria(): void
    {
        $this->product(['name' => 'Caneca A', 'cat' => 'canecas']);
        $this->product(['name' => 'Camiseta B', 'cat' => 'camisetas']);

        $data = $this->getJson('/api/products?cat=camisetas')->assertOk()->json('data');

        $this->assertSame(['Camiseta B'], array_column($data, 'name'));
    }

    public function test_busca_por_trecho_do_nome_ignorando_caixa(): void
    {
        $this->product(['name' => 'Caneca do Pai Pescador']);
        $this->product(['name' => 'Kit Aniversário']);

        $data = $this->getJson('/api/products?q=PESCADOR')->assertOk()->json('data');

        $this->assertSame(['Caneca do Pai Pescador'], array_column($data, 'name'));
    }

    public function test_busca_pelo_codigo_do_slug(): void
    {
        $alvo = $this->product(['slug' => 'ab12cd34', 'name' => 'Caneca X']);
        $this->product(['name' => 'Caneca Y']);

        $data = $this->getJson('/api/products?q=ab12cd34')->assertOk()->json('data');

        $this->assertSame([$alvo->id], array_column($data, 'id'));
    }

    public function test_pagina_o_catalogo(): void
    {
        foreach (range(1, 5) as $i) {
            $this->product(['name' => "Caneca $i"]);
        }

        $primeira = $this->getJson('/api/products?per_page=2')->assertOk()->json();
        $ultima = $this->getJson('/api/products?per_page=2&page=3')->assertOk()->json();

        $this->assertCount(2, $primeira['data']);
        $this->assertSame(5, $primeira['total']);
        $this->assertSame(3, $primeira['last_page']);
        $this->assertCount(1, $ultima['data']);
    }

    public function test_produto_inativo_nao_entra_no_catalogo_nem_nas_categorias(): void
    {
        $this->product(['name' => 'Some', 'cat' => 'secreta', 'active' => false]);
        $this->product(['name' => 'Aparece', 'cat' => 'canecas']);

        $this->assertSame(['Aparece'], array_column(
            $this->getJson('/api/products')->assertOk()->json('data'), 'name'
        ));
        $this->assertSame(['canecas'], $this->getJson('/api/categories')->assertOk()->json());
    }

    public function test_categorias_vem_sem_repeticao_e_ordenadas(): void
    {
        $this->product(['cat' => 'canecas']);
        $this->product(['cat' => 'canecas']);
        $this->product(['cat' => 'almofadas']);

        $this->assertSame(
            ['almofadas', 'canecas'],
            $this->getJson('/api/categories')->assertOk()->json()
        );
    }
}
