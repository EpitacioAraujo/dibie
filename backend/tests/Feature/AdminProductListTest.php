<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AdminProductListTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('products.view', 'web');
        $user = User::factory()->create();
        $user->givePermissionTo('products.view');
        $this->actingAs($user, 'sanctum');
    }

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

    public function test_busca_filtra_ordena_e_pagina(): void
    {
        $this->product(['name' => 'Caneca Zebra', 'cat' => 'canecas', 'price' => 30]);
        $this->product(['name' => 'Caneca Alfa', 'cat' => 'canecas', 'price' => 20]);
        $this->product(['name' => 'Camiseta Alfa', 'cat' => 'camisetas', 'price' => 10]);

        // busca por trecho do nome, ignorando caixa
        $data = $this->getJson('/api/admin/products?q=ZEBRA&per_page=10')->assertOk()->json('data');
        $this->assertSame(['Caneca Zebra'], array_column($data, 'name'));

        // filtro por categoria + ordenação por nome
        $res = $this->getJson('/api/admin/products?cat=canecas&sort=name&dir=asc&per_page=10')->assertOk();
        $this->assertSame(['Caneca Alfa', 'Caneca Zebra'], array_column($res->json('data'), 'name'));
        $this->assertSame(2, $res->json('total'));

        // paginação: 1 por página, segunda página traz o segundo item da ordem
        $res = $this->getJson('/api/admin/products?sort=name&dir=asc&per_page=1&page=2')->assertOk();
        $this->assertSame(['Caneca Alfa'], array_column($res->json('data'), 'name'));
        $this->assertSame(3, $res->json('last_page'));
    }

    public function test_sort_invalido_e_ignorado(): void
    {
        $this->product(['name' => 'A']);

        $this->getJson('/api/admin/products?sort=price;drop&per_page=10')->assertOk();
    }

    public function test_sem_per_page_devolve_lista_inteira(): void
    {
        $this->product();
        $this->product();

        $this->getJson('/api/admin/products')->assertOk()->assertJsonCount(2);
    }

    public function test_categorias_incluem_produtos_inativos(): void
    {
        $this->product(['cat' => 'canecas']);
        $this->product(['cat' => 'camisetas', 'active' => false]);

        $this->getJson('/api/admin/products-cats')->assertOk()
            ->assertExactJson(['camisetas', 'canecas']);
    }
}
