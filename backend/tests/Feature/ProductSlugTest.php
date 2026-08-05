<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProductSlugTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): void
    {
        foreach (['products.create', 'products.update'] as $name) {
            Permission::findOrCreate($name, 'web');
        }
        $user = User::factory()->create();
        $user->givePermissionTo(['products.create', 'products.update']);

        $this->actingAs($user, 'sanctum');
    }

    private function create(array $extra = []): string
    {
        return $this->postJson('/api/admin/products', array_merge([
            'name' => 'Caneca teste',
            'price' => '49.90',
            'cat' => 'canecas',
            'active' => 1,
        ], $extra))->assertCreated()->json('slug');
    }

    public function test_sem_slug_o_backend_gera_um_codigo_de_8(): void
    {
        $this->actingAsAdmin();

        $this->assertMatchesRegularExpression('/^[23456789a-hjkmnp-z]{8}$/', $this->create());
    }

    public function test_cadastros_seguidos_com_o_mesmo_nome_geram_codigos_diferentes(): void
    {
        $this->actingAsAdmin();

        $this->assertNotSame($this->create(), $this->create());
    }

    public function test_slug_enviado_e_respeitado_e_o_update_sem_slug_o_mantem(): void
    {
        $this->actingAsAdmin();

        $this->assertSame('caneca-do-pai', $this->create(['slug' => 'caneca-do-pai']));

        $product = Product::first();
        $this->putJson("/api/admin/products/{$product->id}", [
            'name' => 'Outro nome',
            'price' => '10.00',
            'cat' => 'canecas',
            'active' => 1,
        ])->assertOk();

        $this->assertSame('caneca-do-pai', Product::first()->slug);
    }
}
